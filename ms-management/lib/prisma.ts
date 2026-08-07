import { PrismaClient } from "@prisma/client";

const getDatabaseUrl = () => {
  let url = process.env.DATABASE_URL;
  if (!url) return url;

  // Detect if we are running in Hostinger hosting environment.
  // 1. Path/username patterns match Hostinger format (u followed by digits)
  // 2. Or we are on a Linux production environment but NOT on Vercel.
  const isHostinger = 
    typeof process !== "undefined" && (
      (process.env.USER && /^u\d+$/.test(process.env.USER)) ||
      (process.env.HOME && /\/home\/u\d+/.test(process.env.HOME)) ||
      (process.env.PWD && /\/home\/u\d+/.test(process.env.PWD)) ||
      (process.cwd && /\/home\/u\d+/.test(process.cwd())) ||
      (typeof __dirname !== "undefined" && /\/home\/u\d+/.test(__dirname)) ||
      (process.platform === "linux" && !process.env.VERCEL)
    );

  if (isHostinger && url.includes("193.203.184.121")) {
    console.log("[Prisma] Hostinger environment detected. Rewriting database host to localhost.");
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
