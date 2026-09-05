import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// If cached client was created before newer models were loaded, reset it
if (
  globalForPrisma.prisma &&
  (
    !(globalForPrisma.prisma as any).user ||
    !(globalForPrisma.prisma as any).pettyCashFund ||
    !(globalForPrisma.prisma as any).taxRetention ||
    !(globalForPrisma.prisma as any).vendorPayment ||
    !(globalForPrisma.prisma as any).purchaseOrder
  )
) {
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

function createClient(): PrismaClient {
  try {
    const dynamicRequire = eval("require");
    // Clear node require cache for prisma
    for (const key of Object.keys(dynamicRequire.cache || {})) {
      if (key.includes(".prisma") || key.includes("@prisma")) {
        delete dynamicRequire.cache[key];
      }
    }
    const { PrismaClient: FreshClient } = dynamicRequire("@prisma/client");
    return new FreshClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  } catch {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (
      !globalForPrisma.prisma ||
      !(globalForPrisma.prisma as any).taxRetention ||
      !(globalForPrisma.prisma as any).user ||
      !(globalForPrisma.prisma as any).pettyCashFund ||
      !(globalForPrisma.prisma as any).vendorPayment ||
      !(globalForPrisma.prisma as any).purchaseOrder
    ) {
      globalForPrisma.prisma = createClient();
    }
    return (globalForPrisma.prisma as any)[prop];
  },
});

export default prisma;

