import rateLimit from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redis, isUsingRedisMock } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

// Per Part F.5.1 - sliding-window counters backed by Redis (INCR + EXPIRE),
// never a database write. Applied to the auth endpoints most exposed to
// credential-stuffing, SMS-bombing, and account-enumeration abuse (Part
// D.1.3/D.1.5), so a burst of requests degrades gracefully into a 429
// rather than hammering bcrypt or the database.
//
// passOnStoreError: true is deliberate: per Part 19.2/K.1's graceful-degradation posture, Redis is ephemeral infrastructure whose outage must
// never take down a primary path like login - if the rate-limit store
// itself is unreachable, the request is let through (logged) rather than
// every login/checkout in the platform failing closed behind a 500.
function createAuthRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    logger: {
      error: (error, message) => logger.error({ msg: message ?? "express-rate-limit error", err: error }),
      warn: (error, message) => logger.warn({ msg: message ?? "express-rate-limit warning", err: error }),
    },
    // The real (production) path: Redis-backed, shared across every API
    // process. The dev-only in-memory fallback client (see lib/redis.ts)
    // doesn't support the Lua scripting (SCRIPT/EVALSHA) this store relies
    // on for its sliding window, so local dev without Redis falls through
    // to express-rate-limit's own built-in in-process MemoryStore instead -
    // still real rate limiting, just not shared across processes or
    // restarts, which is fine for a single local API instance.
    ...(isUsingRedisMock
      ? {}
      : {
          store: new RedisStore({
            sendCommand: (...args: string[]) => {
              const [command, ...rest] = args;
              return redis.call(command, ...rest) as Promise<RedisReply>;
            },
            prefix: `ratelimit:${options.keyPrefix}:`,
          }),
        }),
    message: { error: { code: "RATE_LIMITED", message: "Too many requests - please try again shortly" } },
  });
}

// Per Part D.1.3 - blunts credential-stuffing without punishing normal typos.
export const loginRateLimiter = createAuthRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: "login" });

// Per Part D.1.5 - identical limit for request and confirm, matching Login's
// own OTP/credential rate-limiting posture.
export const passwordResetRateLimiter = createAuthRateLimiter({ windowMs: 60_000, max: 5, keyPrefix: "password-reset" });

// Per Part D.1.1 - bounds guessing attempts against a single-use invite token.
export const inviteRedeemRateLimiter = createAuthRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: "invite-redeem" });
