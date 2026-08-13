import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostic: any = {
    platform: process.platform,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
    }
  };

  try {
    diagnostic.step = "importing_prisma_client";
    const prismaClientModule = await import("@prisma/client");
    diagnostic.prismaClientImported = true;

    diagnostic.step = "instantiating_prisma_client";
    const testClient = new prismaClientModule.PrismaClient();
    diagnostic.prismaClientInstantiated = true;

    diagnostic.step = "importing_shared_prisma_lib";
    const prismaSharedModule = await import("@/lib/prisma");
    diagnostic.sharedPrismaImported = true;

    return NextResponse.json({
      ok: true,
      message: "Prisma loaded successfully!",
      diagnostic
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message || String(err),
      stack: err?.stack,
      diagnostic
    }, { status: 500 });
  }
}

