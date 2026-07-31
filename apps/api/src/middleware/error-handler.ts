import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

// Per SRS Part O.8 - unexpected errors are logged with enough context to
// diagnose but never expose a stack trace or internal detail to the client.
// This is the single place every route's thrown error is translated into the
// { error: { code, message, details } } shape - no route formats its own
// error response.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({
    msg: "Unhandled error",
    method: req.method,
    path: req.path,
    storeId: req.params.storeId,
    actorId: req.user?.id,
    err,
  });

  // TEMPORARY (dev only) - pino-http's own auto-generated response log never
  // sees this error (the error-handling middleware resolves the response
  // normally, so no stream 'error' event fires for pino-http to hook into),
  // and the structured log above JSON-escapes the stack onto one line, which
  // is easy to miss in a terminal. Remove once the underlying bug is fixed.
  if (process.env.NODE_ENV !== "production") {
    console.error(`\n[UNHANDLED ERROR] ${req.method} ${req.path}\n`, err instanceof Error ? err.stack : err, "\n");
  }

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}

// Wraps an async route handler so a rejected promise reaches errorHandler
// instead of crashing the process (Express 4 does not catch async errors).
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
