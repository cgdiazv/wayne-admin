import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// If cached client was created before the User or PettyCash models were loaded, reset it
if (globalForPrisma.prisma && (!(globalForPrisma.prisma as any).user || !(globalForPrisma.prisma as any).pettyCashFund)) {
  globalForPrisma.prisma = undefined;
}

// Ensure environment variables are loaded if not already present in the current process
if (!process.env.DATABASE_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { loadEnvConfig } = require("@next/env");
    loadEnvConfig(process.cwd());
  } catch {
    // Ignore error if not in Next.js environment
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

