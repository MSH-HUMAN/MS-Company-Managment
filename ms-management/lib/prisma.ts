import { PrismaClient } from "./generated/client";

/**
 * Build the correct DATABASE_URL for the current runtime environment.
 *
 * Priority:
 *  1. Hostinger VPS (Linux, not Vercel) → localhost MySQL with tight timeouts
 *  2. DATABASE_URL env variable (Vercel / local dev)
 *  3. HOSTINGER_DATABASE_URL env variable
 */
const getDatabaseUrl = (): string => {
  const url =
    process.env.HOSTINGER_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  return url;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: "warn", emit: "stdout" },
      { level: "error", emit: "stdout" },
    ],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
