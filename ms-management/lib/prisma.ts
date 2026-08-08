import { PrismaClient } from "@prisma/client";

const getDatabaseUrl = (): string | undefined => {
  // Auto-detect Hostinger (Linux, not Vercel)
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
    console.log("[Prisma] Hostinger environment detected — using localhost MySQL database URL.");
    return "mysql://u568514543_Mshorizon2026:MSHorizon2026!@localhost:3306/u568514543_ms_company_db";
  }

  // PRIORITY 1: HOSTINGER_DATABASE_URL env var
  if (process.env.HOSTINGER_DATABASE_URL) {
    console.log("[Prisma] Using HOSTINGER_DATABASE_URL.");
    return process.env.HOSTINGER_DATABASE_URL;
  }

  // PRIORITY 2: Read DATABASE_URL directly from .env FILE on disk.
  try {
    const fs = require("fs");
    const path = require("path");
    for (const dir of [process.cwd(), __dirname, path.join(__dirname, "..")]) {
      const envPath = path.join(dir, ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        const match = content.match(/^DATABASE_URL=["']?([^"'\n]+)["']?/m);
        if (match && match[1]) {
          const fileUrl = match[1].trim();
          console.log(`[Prisma] Read DATABASE_URL from ${envPath}: host=${new URL(fileUrl).hostname}`);
          return fileUrl;
        }
      }
    }
  } catch (e: any) {
    console.warn("[Prisma] Could not read .env file:", e.message);
  }

  return process.env.DATABASE_URL;
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
