import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawUrl = process.env.DATABASE_URL || "NOT SET";
  const hostingerUrl = process.env.HOSTINGER_DATABASE_URL || "NOT SET";
  
  // Show what host is being used (mask password)
  const maskUrl = (url: string) => {
    try {
      return url.replace(/:([^@]+)@/, ":***@");
    } catch {
      return url;
    }
  };

  return NextResponse.json({
    platform: process.platform,
    isVercel: !!process.env.VERCEL,
    user: process.env.USER || "NOT SET",
    home: process.env.HOME || "NOT SET",
    pwd: process.env.PWD || "NOT SET",
    nodeEnv: process.env.NODE_ENV,
    DATABASE_URL: maskUrl(rawUrl),
    HOSTINGER_DATABASE_URL: maskUrl(hostingerUrl),
    cwd: process.cwd(),
  });
}
