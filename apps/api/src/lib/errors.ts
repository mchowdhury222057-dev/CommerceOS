// Per SRS Part O.8 - every API error response follows one consistent shape
// across the entire backend, with HTTP status codes used correctly, so a
// frontend error handler is written once against this shape, not per-endpoint.
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static notFound(message: string, code = "NOT_FOUND") {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code = "CONFLICT", details?: unknown) {
    return new AppError(409, code, message, details);
  }

  static validation(message: string, code = "VALIDATION", details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unprocessable(message: string, code = "UNPROCESSABLE") {
    return new AppError(422, code, message);
  }

  static forbidden(message: string, code = "FORBIDDEN") {
    return new AppError(403, code, message);
  }

  static unauthorized(message: string, code = "UNAUTHORIZED") {
    return new AppError(401, code, message);
  }
}
