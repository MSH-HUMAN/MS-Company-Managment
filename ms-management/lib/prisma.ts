import { PrismaClient } from "@prisma/client";

const getDatabaseUrl = (): string | undefined => {
  // PRIORITY 1: HOSTINGER_DATABASE_URL env var (set manually in Hostinger panel)
  if (process.env.HOSTINGER_DATABASE_URL) {
    console.log("[Prisma] Using HOSTINGER_DATABASE_URL.");
    return process.env.HOSTINGER_DATABASE_URL;
  }

  // PRIORITY 2: Read DATABASE_URL directly from .env FILE on disk.
  // This bypasses Hostinger's panel env var injection which can corrupt
  // special characters like %40 (the @ in the password Mshorizon@2026).
  // The .env file on disk is written correctly with Node.js fs.writeFileSync.
  try {
    const fs = require("fs");
    const path = require("path");
    // Check CWD and __dirname for .env file
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

  // PRIORITY 3: Fall back to process.env.DATABASE_URL with host rewrite for Hostinger
  let url = process.env.DATABASE_URL;
  if (!url) return url;

  // Auto-detect Hostinger (Linux, not Vercel) and rewrite public IP to localhost
  const isHostinger =
    typeof process !== "undefined" &&
    (
      (process.env.USER && /^u\d+$/.test(process.env.USER)) ||
      (process.env.HOME && /\/home\/u\d+/.test(process.env.HOME)) ||
      (process.cwd && /\/home\/u\d+/.test(process.cwd())) ||
      (typeof __dirname !== "undefined" && /\/home\/u\d+/.test(__dirname)) ||
      (process.platform === "linux" && !process.env.VERCEL)
    );

  if (isHostinger && url.includes("193.203.184.121")) {
    console.log("[Prisma] Hostinger detected — rewriting DB host to localhost.");
    url = url.replace("193.203.184.121", "localhost");
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
