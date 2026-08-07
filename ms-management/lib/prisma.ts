import { PrismaClient } from "@prisma/client";

const getDatabaseUrl = () => {
  // Option 1: HOSTINGER_DATABASE_URL — set this directly in Hostinger Node.js
  // app manager environment variables with localhost as the host.
  // This is the most reliable approach and takes highest priority.
  if (process.env.HOSTINGER_DATABASE_URL) {
    console.log("[Prisma] Using HOSTINGER_DATABASE_URL.");
    return process.env.HOSTINGER_DATABASE_URL;
  }

  let url = process.env.DATABASE_URL;
  if (!url) return url;

  // Option 2: Auto-detect Hostinger environment and rewrite the host.
  // Hostinger Node.js apps run on Linux, Vercel sets process.env.VERCEL.
  // Path patterns like /home/u568514543 are unique to Hostinger cPanel.
  const isHostinger =
    typeof process !== "undefined" &&
    (
      (process.env.USER && /^u\d+$/.test(process.env.USER)) ||
      (process.env.HOME && /\/home\/u\d+/.test(process.env.HOME)) ||
      (process.env.PWD && /\/home\/u\d+/.test(process.env.PWD)) ||
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
