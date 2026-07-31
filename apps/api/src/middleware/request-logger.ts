import crypto from "node:crypto";
import type { Request } from "express";
import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

// Per Part J.6 - every log line captures a request ID propagated through the
// request, the authenticated actor's id/role, the resolved store_id, and
// method/route/status/duration - the minimum needed to verify the Part 19.1
// interaction-latency targets in production and to reconstruct a request's
// full trail. This is deliberately lighter than, and distinct from, the
// AuditLog table (Part 15.3): a log line is an operational/debugging tool
// with a short rotation window, never a substitute for an audit entry.
export const requestLogger = pinoHttp<Request>({
  logger,
  genReqId: (req) => (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID(),
  customProps: (req) => ({
    actorId: req.user?.id,
    actorRole: req.user?.role,
    storeId: req.params?.storeId ?? req.user?.storeId ?? undefined,
  }),
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
  autoLogging: {
    ignore: (req) => req.url === "/api/health",
  },
});
