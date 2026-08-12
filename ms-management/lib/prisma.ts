import { PrismaClient } from "@prisma/client";

const getDatabaseUrl = (): string | undefined => {
  // Auto-detect Hostinger production environment (Linux server under /home/u... directory)
  const isHostinger =
    typeof process !== "undefined" &&
    (
      (process.env.USER && /^u\d+$/.test(process.env.USER)) ||
      (process.env.HOME && /\/home\/u\d+/.test(process.env.HOME)) ||
      (process.cwd && /\/home\/u\d+/.test(process.cwd())) ||
      (typeof __dirname !== "undefined" && /\/home\/u\d+/.test(__dirname)) ||
      (process.platform === "linux" && !process.env.VERCEL)
    );

  if (isHostinger) {
    console.log("[Prisma] Hostinger production environment detected — using localhost MySQL connection.");
    return "mysql://u568514543_Mshorizon2026:MSHorizon2026!@localhost:3306/u568514543_ms_company_db";
  }

  // For Local Dev / Vercel / Remote: use DATABASE_URL if available
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fallback to HOSTINGER_DATABASE_URL if explicitly provided and not localhost on local machine
  if (process.env.HOSTINGER_DATABASE_URL) {
    return process.env.HOSTINGER_DATABASE_URL;
  }

  return undefined;
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
