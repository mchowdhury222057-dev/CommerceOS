// Per SRS Part 15.2 / 15.3
export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  targetStoreId: string | null;
  targetResource: string | null;
  impersonationSessionId: string | null;
  createdAt: string;
}

export interface ImpersonationSession {
  id: string;
  masterAdminUserId: string;
  targetStoreId: string;
  startedAt: string;
  endedAt: string | null;
}
