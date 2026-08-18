import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, computeAttendanceMetrics, recalculateMonthlyPayroll } from "@/lib/auth-helpers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.attendanceCorrection.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }

    // Tenancy Check
    if (user.role !== "Super Admin" && existing.company !== user.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Permissions check
    const canApprove = user.role === "Super Admin" || 
                       (await hasPermissionBackend(user, "attendance", "edit")) ||
                       (await hasPermissionBackend(user, "attendance", "create")) ||
                       (await hasPermissionBackend(user, "attendance", "approve"));

    const staffMember = await prisma.staff.findFirst({ where: { email: user.email } });
    const isSelf = staffMember ? (existing.staffId === staffMember.id) : false;

    const isStatusChange = data.status !== undefined && data.status !== existing.status;
    if (isStatusChange && !canApprove) {
      return NextResponse.json({ error: "Forbidden: Cannot change status of correction request" }, { status: 403 });
    }
    if (!canApprove && !isSelf) {
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }
    if (!canApprove && existing.status !== "Pending") {
      return NextResponse.json({ error: "Forbidden: Cannot modify a processed correction request" }, { status: 403 });
    }

    // Update correction request
    const updated = await prisma.attendanceCorrection.update({
      where: { id },
      data: {
        requestedClockIn: data.requestedClockIn ?? undefined,
        requestedClockOut: data.requestedClockOut ?? undefined,
        reason: data.reason ?? undefined,
        status: data.status ?? undefined
      }
    });

    // Handle approval transition
    if (isStatusChange && data.status === "Approved") {
      const targetStaff = await prisma.staff.findUnique({
        where: { id: existing.staffId }
      });
      if (targetStaff) {
        const shift = targetStaff.shiftId ? await prisma.shift.findUnique({ where: { id: targetStaff.shiftId } }) : null;
        
        const metrics = computeAttendanceMetrics(
          data.requestedClockIn || existing.requestedClockIn,
          data.requestedClockOut || existing.requestedClockOut,
          shift
        );

        // Parse date to month and year (e.g. "2026-07-18" -> "Jul", 2026)
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const dateParts = existing.date.split("-");
        const year = parseInt(dateParts[0]);
        const monthIndex = parseInt(dateParts[1]) - 1;
        const month = MONTHS[monthIndex];

        const newRecord = {
          date: existing.date,
          status: metrics.lateArrival > 0 ? "Late" as const : "Present" as const,
          checkIn: data.requestedClockIn || existing.requestedClockIn,
          checkOut: data.requestedClockOut || existing.requestedClockOut,
          workingHours: metrics.workingHours,
          overtime: metrics.overtime,
          lateArrival: metrics.lateArrival,
          earlyLeaving: metrics.earlyLeaving,
          breakHours: metrics.breakHours,
          notes: `Approved correction: ${existing.reason || ""}`
        };

        const existingAttendance = await prisma.staffAttendance.findFirst({
          where: {
            staffId: existing.staffId,
            month,
            year
          }
        });

        let updatedRecordsList = [newRecord];
        if (existingAttendance) {
          const recordsList = typeof existingAttendance.records === "string"
            ? JSON.parse(existingAttendance.records)
            : (existingAttendance.records as any[]);

          const filtered = recordsList.filter((r: any) => r.date !== existing.date);
          updatedRecordsList = [...filtered, newRecord];

          await prisma.staffAttendance.update({
            where: { id: existingAttendance.id },
            data: {
            records: JSON.stringify(updatedRecordsList)
            }
          });
        } else {
          await prisma.staffAttendance.create({
            data: {
              staffId: existing.staffId,
              staffName: targetStaff.name,
              month,
              year,
              records: JSON.stringify(updatedRecordsList),
              company: targetStaff.company,
              branch: targetStaff.branch
            }
          });
        }

        // Recalculate Payroll
        await recalculateMonthlyPayroll(existing.staffId, month, year);
      }
    }

    // Log Activity log
    await createAuditLog(
      user,
      isStatusChange ? "Status Changed" : "Edited",
      "Correction",
      existing.status,
      data.status || existing.status,
      request.headers.get("x-forwarded-for")
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT correction error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.attendanceCorrection.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Correction request not found" }, { status: 404 });
    }

    // Tenancy Check
    if (user.role !== "Super Admin" && existing.company !== user.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Permission Check
    const canDelete = user.role === "Super Admin" || 
                      (await hasPermissionBackend(user, "attendance", "delete")) ||
                      (await hasPermissionBackend(user, "attendance", "edit"));

    const staffMember = await prisma.staff.findFirst({ where: { email: user.email } });
    const isSelf = staffMember ? (existing.staffId === staffMember.id) : false;

    if (!canDelete && !isSelf) {
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    if (!canDelete && existing.status !== "Pending") {
      return NextResponse.json({ error: "Forbidden: Cannot delete a processed correction request" }, { status: 403 });
    }

    await prisma.attendanceCorrection.delete({
      where: { id }
    });

    // Log activity
    await createAuditLog(
      user,
      "Deleted",
      "Correction",
      `Staff: ${existing.staffName}, Date: ${existing.date}`,
      null,
      request.headers.get("x-forwarded-for")
    );

    return NextResponse.json({ success: true, message: "Correction request deleted" });
  } catch (error: any) {
    console.error("DELETE correction error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
