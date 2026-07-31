import type { Prisma, UserRole } from "@commerceos/prisma/generated/client";
import { prisma } from "./prisma.js";

export interface AuditLogInput {
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetStoreId?: string | null;
  targetResource?: string | null;
  impersonationSessionId?: string | null;
  /** Structured detail supplementing the action name (e.g. status transition). */
  metadata?: Prisma.InputJsonValue;
}

// Per Part 15.3 - immutable, append-only; written synchronously as part of
// the same request that performs the sensitive action (Part O.8), never
// deferred to a best-effort background event the way the general Part M
// domain-event side effects are.
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      targetStoreId: input.targetStoreId ?? null,
      targetResource: input.targetResource ?? null,
      impersonationSessionId: input.impersonationSessionId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}
