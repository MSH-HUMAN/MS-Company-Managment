import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(user, "reports", "view"))) {
      await createAuditLog(user, "Status Changed", "reports", null, "Unauthorized attempt to view activity logs", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";

    const tenantFilter = getTenantScopeFilter(user, "company", "branch");
    const filter = {
      ...tenantFilter,
      archived
    };

    const logs = await prisma.activityLog.findMany({
      where: filter,
      orderBy: { dateTime: "desc" },
      take: 200 // Limit to last 200 audits for performance
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error("GET activity logs error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "Super Admin" && !(await hasPermissionBackend(user, "reports", "edit"))) {
      await createAuditLog(user, "Status Changed", "reports", null, "Unauthorized attempt to archive/restore activity logs", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const { action } = await request.json(); // "archive" | "restore"
    if (action === "archive") {
      await prisma.activityLog.updateMany({
        where: { archived: false },
        data: { archived: true }
      });
      return NextResponse.json({ success: true, message: "Logs archived" });
    } else if (action === "restore") {
      await prisma.activityLog.updateMany({
        where: { archived: true },
        data: { archived: false }
      });
      return NextResponse.json({ success: true, message: "Logs restored" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PUT activity log error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    if (!data.action || !data.module) {
      return NextResponse.json(
        { error: "Action and module are required" },
        { status: 400 }
      );
    }

    const log = await prisma.activityLog.create({
      data: {
        dateTime: data.dateTime || new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: user.name,
        role: user.role,
        company: user.company,
        branch: user.branch,
        action: data.action,
        module: data.module,
        oldValue: data.oldValue ? String(data.oldValue) : null,
        newValue: data.newValue ? String(data.newValue) : null,
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1"
      }
    });

    return NextResponse.json(log);
  } catch (error: any) {
    console.error("POST activity log error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
