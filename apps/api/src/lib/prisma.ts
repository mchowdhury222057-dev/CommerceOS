import { PrismaClient } from "@commerceos/prisma/generated/client";

// Single shared client per process, per standard Prisma guidance - avoids
// exhausting the Postgres connection pool under tsx's hot-reload in dev.
export const prisma = new PrismaClient();
