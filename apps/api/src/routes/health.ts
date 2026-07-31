import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

// Phase 0 checkpoint per SRS Part 24: "All four apps run locally".
healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});
