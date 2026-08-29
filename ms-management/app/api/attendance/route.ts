import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog, computeAttendanceMetrics, recalculateMonthlyPayroll, getPermissionScopedFilter } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "attendance", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "attendance", null, "Unauthorized attempt to view attendance", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const attendance = await prisma.staffAttendance.findMany({
      where: filter,
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

   const normalizedAttendance = attendance.map((item: any) => {
  let records: any[] = [];

  if (Array.isArray(item.records)) {
    records = item.records;
  } else if (typeof item.records === "string") {
    try {
      const parsed = JSON.parse(item.records);
      records = Array.isArray(parsed) ? parsed : [];
    } catch {}
  }

  return { ...item, records };
});

return NextResponse.json(normalizedAttendance); 
  } catch (error: any) {
    console.error("GET attendance error:", error);
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

    if (!data.staffId || !data.month || data.year === undefined || !data.records) {
      return NextResponse.json(
        { error: "StaffId, month, year, and records are required" },
        { status: 400 }
      );
    }

    const targetStaff = await prisma.staff.findUnique({
      where: { id: data.staffId }
    });
    if (!targetStaff) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const isSelf = targetStaff.email?.toLowerCase() === user.email?.toLowerCase();

    // Check permissions: Only administrators/managers with editAll can bypass daily limits and edit other staff's records
    const hasAdminPermission = user.role === "Super Admin" ||
                               (await hasPermissionBackend(user, "attendance", "editAll"));

    if (!hasAdminPermission) {
      // Must have base permission to check-in/out
      const hasBasePermission = (await hasPermissionBackend(user, "attendance", "edit")) ||
                                 (await hasPermissionBackend(user, "attendance", "create"));
      if (!hasBasePermission || !isSelf) {
        return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
      }

      // Daily check-in/out validations for self-service employees
      const todayStr = new Date().toISOString().slice(0, 10);
      
      const existingDoc = await prisma.staffAttendance.findFirst({
        where: {
          staffId: data.staffId,
          month: data.month,
          year: Number(data.year)
        }
      });

      // 1. Strict diff validation to prevent modifying other dates
      if (existingDoc && Array.isArray(existingDoc.records)) {
        const existingRecords = existingDoc.records as any[];
        const existingOtherDays = existingRecords.filter(r => r.date !== todayStr);
        const incomingRecords = data.records as any[];
        const incomingOtherDays = incomingRecords.filter(r => r.date !== todayStr);

        if (existingOtherDays.length !== incomingOtherDays.length) {
          return NextResponse.json({ error: "Forbidden: Cannot edit or delete historical records." }, { status: 403 });
        }

        for (const existingRec of existingOtherDays) {
          const incomingRec = incomingOtherDays.find(r => r.date === existingRec.date);
          if (!incomingRec) {
            return NextResponse.json({ error: "Forbidden: Cannot delete historical records." }, { status: 403 });
          }
          if (
            incomingRec.status !== existingRec.status ||
            incomingRec.checkIn !== existingRec.checkIn ||
            incomingRec.checkOut !== existingRec.checkOut ||
            incomingRec.workingHours !== existingRec.workingHours ||
            incomingRec.overtime !== existingRec.overtime ||
            incomingRec.notes !== existingRec.notes
          ) {
            return NextResponse.json({ error: "Forbidden: Cannot modify historical records." }, { status: 403 });
          }
        }
      } else if (!existingDoc && data.records.length > 1) {
        const otherDays = data.records.filter((r: any) => r.date !== todayStr);
        if (otherDays.length > 0) {
          return NextResponse.json({ error: "Forbidden: Cannot create historical records." }, { status: 403 });
        }
      }

      // 2. Validate daily state transitions for todayStr
      const incomingToday = data.records.find((r: any) => r.date === todayStr);
      if (!incomingToday) {
        return NextResponse.json({ error: "Invalid request: Today's record is required." }, { status: 400 });
      }

      const existingRecords = existingDoc ? (existingDoc.records as unknown as any[]) : [];
      const existingToday = existingRecords.find(r => r.date === todayStr);

      let logAction = "Created";
      let logNewValue = "";
      let logOldValue = "";

      if (existingToday) {
        const hasExistingCheckIn = !!existingToday.checkIn;
        const hasExistingCheckOut = !!existingToday.checkOut;

        // If completed check-in & check-out, record is locked. No edits/deletes allowed.
        if (hasExistingCheckIn && hasExistingCheckOut) {
          return NextResponse.json(
            { error: "You have already completed today's attendance." },
            { status: 400 }
          );
        }

        if (hasExistingCheckIn && !hasExistingCheckOut) {
          // Employee is checking out
          if (incomingToday.checkIn !== existingToday.checkIn) {
            return NextResponse.json({ error: "Forbidden: Cannot modify check-in time." }, { status: 403 });
          }
          if (!incomingToday.checkOut) {
            return NextResponse.json({ error: "Check-out time is required." }, { status: 400 });
          }

          // Calculate overtime and hours dynamically on the backend
          const shift = targetStaff.shiftId ? await prisma.shift.findUnique({ where: { id: targetStaff.shiftId } }) : null;
          const metrics = computeAttendanceMetrics(incomingToday.checkIn, incomingToday.checkOut, shift);
          
          incomingToday.workingHours = metrics.workingHours;
          incomingToday.overtime = metrics.overtime;
          incomingToday.lateArrival = metrics.lateArrival;
          incomingToday.earlyLeaving = metrics.earlyLeaving;
          incomingToday.breakHours = metrics.breakHours;
          incomingToday.notes = incomingToday.notes || "Clocked out from Dashboard";

          logAction = "Edited";
          logOldValue = `Check in: ${incomingToday.checkIn}`;
          logNewValue = `Clocked out at ${incomingToday.checkOut}, worked hours: ${metrics.workingHours}`;
        }
      } else {
        // Employee is checking in
        if (!incomingToday.checkIn) {
          return NextResponse.json({ error: "Check-in time is required." }, { status: 400 });
        }
        if (incomingToday.checkOut) {
          return NextResponse.json({ error: "Forbidden: Cannot check-out before checking in." }, { status: 403 });
        }

        // Initialize today's record values
        const shift = targetStaff.shiftId ? await prisma.shift.findUnique({ where: { id: targetStaff.shiftId } }) : null;
        const metrics = computeAttendanceMetrics(incomingToday.checkIn, "", shift);

        incomingToday.status = metrics.lateArrival > 0 ? "Late" : "Present";
        incomingToday.workingHours = 0;
        incomingToday.overtime = 0;
        incomingToday.lateArrival = metrics.lateArrival;
        incomingToday.earlyLeaving = 0;
        incomingToday.breakHours = metrics.breakHours;
        incomingToday.notes = incomingToday.notes || "Clocked in from Dashboard Widget";

        logAction = "Created";
        logNewValue = `${user.name} clocked in at ${incomingToday.checkIn}`;
      }

      // Save records
      let record;
      const filteredRecords = existingRecords.filter(r => r.date !== todayStr);
      const updatedRecords = [...filteredRecords, incomingToday];

      if (existingDoc) {
        record = await prisma.staffAttendance.update({
          where: { id: existingDoc.id },
          data: {
         records: JSON.stringify(updatedRecords)   
          }
        });
      } else {
        record = await prisma.staffAttendance.create({
          data: {
            staffId: data.staffId,
            staffName: targetStaff.name,
            month: data.month,
            year: Number(data.year),
            records: JSON.stringify(updatedRecords),
            company: targetStaff.company,
            branch: targetStaff.branch
          }
        });
      }

      // Log activity
      await createAuditLog(
        user,
        logAction,
        "Attendance",
        logOldValue || null,
        logNewValue,
        request.headers.get("x-forwarded-for")
      );

      // Recalculate Payroll
      await recalculateMonthlyPayroll(data.staffId, data.month, Number(data.year));

      return NextResponse.json(record);

    } else {
      // Admin Action
      // Tenancy Scoping
      if (user.role !== "Super Admin") {
        if (targetStaff.company !== user.company) {
          return NextResponse.json({ error: "Forbidden: Cannot access other company" }, { status: 403 });
        }
        if (user.role !== "Company Admin" && targetStaff.branch !== user.branch) {
          return NextResponse.json({ error: "Forbidden: Cannot access other branch" }, { status: 403 });
        }
      }

      // Find if record already exists for this staff, month and year
      const existing = await prisma.staffAttendance.findFirst({
        where: {
          staffId: data.staffId,
          month: data.month,
          year: Number(data.year)
        }
      });

      let record;
      if (existing) {
        record = await prisma.staffAttendance.update({
          where: { id: existing.id },
          data: {
            records: data.records,
            staffName: data.staffName || undefined
          }
        });
      } else {
        record = await prisma.staffAttendance.create({
          data: {
            id: data.id || undefined,
            staffId: data.staffId,
            staffName: data.staffName || targetStaff.name || "Staff member",
            month: data.month,
            year: Number(data.year),
            records: data.records,
            company: targetStaff.company || user.company,
            branch: targetStaff.branch || user.branch
          }
        });
      }

      // Log activity for admin manual edit
      const targetDate = data.records.length > 0 ? data.records[data.records.length - 1].date : "";
      await createAuditLog(
        user,
        existing ? "Edited" : "Created",
        "Attendance",
        null,
        `Admin modified attendance for ${targetStaff.name} on date ${targetDate}`,
        request.headers.get("x-forwarded-for")
      );

      // Recalculate Payroll
      await recalculateMonthlyPayroll(data.staffId, data.month, Number(data.year));

      return NextResponse.json(record);
    }
  } catch (error: any) {
    console.error("POST attendance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
