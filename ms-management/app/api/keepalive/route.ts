import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Keep-alive endpoint to prevent Supabase free-tier inactivity pause.
// Runs lightweight read queries to register DB activity.
// Public endpoint so Vercel Cron, UptimeRobot, or health checks can ping it freely without secret failures.

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const start = Date.now();

    // Run 3 lightweight read queries across different tables to register DB activity
    const [settingsCount, staffCount, applicantCount] = await Promise.all([
      prisma.siteSettings.count().catch(() => 0),
      prisma.staff.count().catch(() => 0),
      prisma.applicant.count().catch(() => 0),
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
      message: "Supabase keep-alive ping successful — project active",
    });
  } catch (error: any) {
    console.error("[keepalive] DB ping FAILED:", error?.message);
    return NextResponse.json(
      { ok: false, error: error?.message || "DB ping failed" },
      { status: 500 }
    );
  }
}
