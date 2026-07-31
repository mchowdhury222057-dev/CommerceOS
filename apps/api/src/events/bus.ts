import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import type { DomainEvent, EventName, EventPayloadMap } from "@commerceos/types";

// In-process domain event bus per SRS Part M.1 - conceptually a typed pub/sub
// registry living inside the single Express process. This is explicitly NOT a
// message queue: no Redis Streams, no broker, no separate worker process.
// Part M.6 documents the additive path to a BullMQ-backed emit() once a real
// async workload (a plugin ecosystem, or notification volume) justifies it -
// the call sites in every service function never change.

type Handler<TName extends EventName> = (
  event: DomainEvent<TName, EventPayloadMap[TName]>,
) => void | Promise<void>;

const handlers = new Map<EventName, Handler<EventName>[]>();

// Per Part M.5.1 - a subscriber that throws is retried with short backoff
// before its failure is written to EventFailureLog (V1's dead-letter table).
const RETRY_BACKOFFS_MS = [1000, 5000, 15000];

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function dispatchWithRetry<TName extends EventName>(
  event: DomainEvent<TName, EventPayloadMap[TName]>,
  handler: Handler<TName>,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
    try {
      await handler(event);
      return;
    } catch (error) {
      lastError = error;
      const nextBackoff = RETRY_BACKOFFS_MS[attempt];
      if (nextBackoff !== undefined) {
        await sleep(nextBackoff);
      }
    }
  }

  // Retries exhausted - per Part M.5, a subscriber's failure must never undo
  // the primary transaction that emitted the event; it is logged, never thrown.
  try {
    await prisma.eventFailureLog.create({
      data: {
        storeId: event.storeId,
        eventName: event.eventName,
        payload: event.payload as object,
        errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        attemptCount: RETRY_BACKOFFS_MS.length + 1,
      },
    });
  } catch (logError) {
    // The failure log itself is best-effort; a database outage here must
    // never crash the process that raised the original event.
    logger.error({ msg: "Failed to write EventFailureLog", eventName: event.eventName, err: logError });
  }
}

/** Registers a subscriber for a cataloged domain event (Part M.3). */
export function on<TName extends EventName>(eventName: TName, handler: Handler<TName>): void {
  const list = (handlers.get(eventName) ?? []) as Handler<TName>[];
  list.push(handler);
  handlers.set(eventName, list as Handler<EventName>[]);
}

interface EmitParams<TName extends EventName> {
  storeId: string | null;
  actorId: string | null;
  payload: EventPayloadMap[TName];
}

// Per Part M.5 - emit() is fire-and-forget from the publisher's perspective:
// it is called synchronously after the emitting service function's transaction
// commits, and every subscriber invocation is dispatched via a microtaskqueued call so a slow/failing subscriber never adds latency to, or rolls
// back, the request that raised the event.
export function emit<TName extends EventName>(eventName: TName, params: EmitParams<TName>): void {
  const event: DomainEvent<TName, EventPayloadMap[TName]> = {
    eventName,
    occurredAt: new Date().toISOString(),
    storeId: params.storeId,
    actorId: params.actorId,
    payload: params.payload,
  };

  const subscribers = (handlers.get(eventName) ?? []) as Handler<TName>[];
  for (const handler of subscribers) {
    queueMicrotask(() => {
      void dispatchWithRetry(event, handler);
    });
  }
}
