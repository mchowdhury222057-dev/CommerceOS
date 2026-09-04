import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.routes.js";
import { storefrontRouter } from "./routes/storefront.routes.js";
import { storeRouter } from "./routes/store.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { verificationRouter } from "./routes/verification.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";

export const app = express();

// Per SRS Part J.1.1 - the allow-list is explicit and never a wildcard outside
// local development, since a wildcard origin on an authenticated API would let
// any site read a signed-in user's responses via a cross-origin request.
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174,http://localhost:5175")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(requestLogger);
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/storefront", storefrontRouter);
app.use("/api/store", storeRouter);
app.use("/api/admin", adminRouter);
app.use("/api/verification", verificationRouter);

// Must be registered after every route (Express convention for error-handling
// middleware) - see Part O.8's single-shape error contract.
app.use(errorHandler);
