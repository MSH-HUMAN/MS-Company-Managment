import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const isHostinger =
    process.platform === "linux" &&
    !process.env.VERCEL &&
    !process.env.NEXT_PUBLIC_VERCEL_URL;

  const dbUrl = isHostinger
    ? "mysql://u568514543_Mshorizon2026:MSHorizon2026!@localhost:3306/u568514543_ms_company_db?connect_timeout=5"
    : process.env.DATABASE_URL || "NOT SET";

  const maskedUrl = dbUrl.replace(/:([^@]+)@/, ":***@");

  let dbStatus = "unknown";
  let dbError = "";
  let userCount = 0;

  try {
    const testClient = new PrismaClient({
      datasources: { db: { url: dbUrl + (dbUrl.includes("?") ? "&" : "?") + "connect_timeout=5&pool_timeout=5" } },
    });
    userCount = await testClient.user.count();
    await testClient.$disconnect();
    dbStatus = "connected";
  } catch (e: any) {
    dbStatus = "failed";
    dbError = e?.message || String(e);
  }

  return NextResponse.json({
    platform: process.platform,
    isVercel: !!process.env.VERCEL,
    isHostinger,
    user: process.env.USER || "NOT SET",
    home: process.env.HOME || "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    DATABASE_URL: maskedUrl,
    dbStatus,
    dbError,
    userCount,
    cwd: process.cwd(),
  });
}
