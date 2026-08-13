import { PrismaClient } from "@prisma/client";

/**
 * Build the correct DATABASE_URL for the current runtime environment.
 *
 * Priority:
 *  1. Hostinger VPS (Linux, not Vercel) → localhost MySQL with tight timeouts
 *  2. DATABASE_URL env variable (Vercel / local dev)
 *  3. HOSTINGER_DATABASE_URL env variable
 */
const getDatabaseUrl = (): string => {
  // ── Hostinger detection ──────────────────────────────────────────────────
  // Hostinger Node.js hosting runs on Linux and is NOT Vercel.
  // On Hostinger, MySQL must use localhost (not the public IP).
  const isHostinger =
    typeof process !== "undefined" &&
    process.platform === "linux" &&
    !process.env.VERCEL &&
    !process.env.NEXT_PUBLIC_VERCEL_URL;

  if (isHostinger) {
    console.log("[Prisma] Hostinger detected → using localhost MySQL.");
    // Add connection timeouts so a misconfigured DB fails fast (5 s) instead
    // of hanging for 30+ seconds and causing an empty-body 500 response.
    return (
      "mysql://u568514543_Mshorizon2026:MSHorizon2026!@localhost:3306/u568514543_ms_company_db" +
      "?connection_limit=5&pool_timeout=10&connect_timeout=5&socket_timeout=10"
    );
  }

  // ── Vercel / local dev ───────────────────────────────────────────────────
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.HOSTINGER_DATABASE_URL) {
    return process.env.HOSTINGER_DATABASE_URL;
  }

  // Last-resort fallback (should never be reached in production)
  console.warn("[Prisma] WARNING: No DATABASE_URL found — using fallback localhost.");
  return "mysql://u568514543_Mshorizon2026:MSHorizon2026!@localhost:3306/u568514543_ms_company_db";
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
