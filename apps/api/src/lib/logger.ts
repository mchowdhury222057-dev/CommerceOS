import pino from "pino";

// Per Part J.6 - structured JSON written to stdout/stderr, never to a file
// inside the process; Docker's own json-file log driver (with size-based
// rotation) captures and rotates it in production with no additional
// logging infrastructure needed at this stage.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
});
