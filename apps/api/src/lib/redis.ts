import Redis from "ioredis";
import RedisMock from "ioredis-mock";
import { logger } from "./logger.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const isProduction = process.env.NODE_ENV === "production";

// Per Part F.5.1 - Redis is the sole source of truth for session/refresh-token
// state, rate-limit counters, and impersonation state.
function createRealClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    // Connected explicitly below (awaited) rather than on first command, so
    // a failed attempt is resolved once, up front, instead of racing every
    // module that imports `redis` and issues its own first command.
    lazyConnect: true,
    // Commands issued while disconnected reject immediately instead of
    // queueing and waiting through reconnection attempts - critical for Part
    // 19.2's graceful-degradation posture: a session check or a rate-limit
    // increment must fail fast during a Redis outage, never hang the request
    // for several seconds per retry cycle.
    enableOfflineQueue: false,
    // Capped exponential backoff rather than ioredis's default rapid retry -
    // keeps a Redis outage from flooding logs while still reconnecting
    // automatically the moment it comes back.
    retryStrategy: (attempt: number) => Math.min(attempt * 500, 10_000),
  });

  let lastLoggedErrorAt = 0;
  client.on("error", (err) => {
    const now = Date.now();
    if (now - lastLoggedErrorAt > 10_000) {
      logger.error({ msg: "Redis connection error", err });
      lastLoggedErrorAt = now;
    }
  });

  return client;
}

async function resolveClient(): Promise<{ client: Redis; usingMock: boolean }> {
  const realClient = createRealClient();
  try {
    await realClient.connect();
    logger.info({ msg: "Connected to Redis", url: REDIS_URL });
    return { client: realClient, usingMock: false };
  } catch (err) {
    // In production a failed connection is fatal: session revocation,
    // refresh-token reuse detection, and rate limiting all depend on Redis
    // being real shared state (Part D.1.4), and silently swapping in a
    // per-process in-memory store there would let a compromised session
    // survive a server-side "revoke all sessions" call.
    if (isProduction) {
      logger.error({ msg: "Redis connection failed - refusing to start in production", err });
      throw err;
    }
    // Outside production, a missing local Redis is a missing dev dependency,
    // not a security posture - fall back to an in-memory, ioredis-API-
    // compatible mock so session/impersonation code (plain SET/GET/SADD/
    // EXPIRE/SMEMBERS - see rate-limit.ts for why the rate limiter itself
    // needs a separate carve-out) keeps running exactly as written, with no
    // fail-open branches added to that business logic. Scoped to a single
    // process: state won't survive a restart and isn't shared across
    // multiple `npm run dev` processes, which is irrelevant for solo local
    // development.
    logger.warn({
      msg:
        "Redis unreachable - falling back to an in-memory store for local development. " +
        "Sessions, rate limits, and impersonation state are process-local and will not survive a restart. " +
        "Start Redis (docker compose -f docker-compose.dev.yml up -d redis) for real persistence.",
      err,
    });
    realClient.disconnect();
    return { client: new RedisMock() as unknown as Redis, usingMock: true };
  }
}

// Top-level await, deliberately: every consumer of `redis` (rate-limit.ts,
// session.service.ts, impersonation.service.ts) imports it, and ESM
// guarantees an imported module's top-level code finishes running before
// the importing module's own top-level code runs. That ordering is what
// makes this safe - nothing can issue a command, or even construct a
// RedisStore, against a half-decided client.
const { client, usingMock } = await resolveClient();

export const redis: Redis = client;

// rate-limit-redis's sliding window is implemented as a Lua script
// (SCRIPT LOAD + EVALSHA), which ioredis-mock does not support ("Unsupported
// command: script") even though it supports the plain commands session/
// impersonation state relies on. rate-limit.ts reads this flag to swap to
// express-rate-limit's built-in in-process MemoryStore instead, purely for
// local dev - the production path (real Redis) never sees this flag.
export const isUsingRedisMock = usingMock;
