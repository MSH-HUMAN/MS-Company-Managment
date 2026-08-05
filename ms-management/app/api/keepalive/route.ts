import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// This endpoint is called daily by a Vercel cron job to prevent
// the Supabase free-tier project from being paused due to inactivity.
// Supabase pauses free projects that have no DB activity for 7+ days.
//
// Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
// Set CRON_SECRET in Vercel Environment Variables dashboard.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // Support both Vercel's Authorization header and ?secret= query param
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && querySecret === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const start = Date.now();

    // Run 3 lightweight queries across different tables to generate real activity
    const [settingsCount, staffCount, applicantCount] = await Promise.all([
      prisma.siteSettings.count(),
      prisma.staff.count(),
      prisma.applicant.count(),
    ]);

    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();

    console.log(
      `[keepalive] DB ping OK — ${duration}ms at ${timestamp} | ` +
      `settings:${settingsCount} staff:${staffCount} applicants:${applicantCount}`
    );

    return NextResponse.json({
      ok: true,
      timestamp,
      durationMs: duration,
      counts: { settingsCount, staffCount, applicantCount },
      message: "Supabase keep-alive ping successful — project will not be paused",
    });
  } catch (error: any) {
    console.error("[keepalive] DB ping FAILED:", error?.message);
    return NextResponse.json(
      { ok: false, error: error?.message || "DB ping failed" },
      { status: 500 }
    );
  }
}
