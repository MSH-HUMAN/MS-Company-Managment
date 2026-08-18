import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog, getPermissionScopedFilter } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "payroll", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "payroll", null, "Unauthorized attempt to view payroll logs", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    let records = await prisma.payrollRecord.findMany({
      where: filter,
      orderBy: { month: "desc" }
    });

    if (records.length === 0) {
      try {
        const activeStaff = await prisma.staff.findMany({
          where: { status: "Active" }
        });

        if (activeStaff.length > 0) {
          const today = new Date();
          const monthName = today.toLocaleString("default", { month: "short" });
          const genYear = today.getFullYear();

          for (const s of activeStaff) {
            const basic = s.basicSalary || 3500;
            const housing = s.housingAllowance || 1000;
            const transport = s.transportAllowance || 500;
            const totalAllowances = housing + transport;
            const net = basic + totalAllowances;

            await prisma.payrollRecord.create({
              data: {
                id: `PAY-${s.id}-${monthName}${genYear}`,
                staffId: s.id,
                staffName: s.name,
                position: s.position || "Staff",
                month: monthName,
                year: genYear,
                basicSalary: basic,
                allowances: totalAllowances,
                deductions: 0,
                allowanceDetails: JSON.stringify ([
                  { name: "Housing Allowance", amount: housing },
                  { name: "Transport Allowance", amount: transport }
                ]),
                deductionDetails: JSON.stringify([]),
                advanceDeduction: 0,
                loanDeduction: 0,
                overtimeHours: 0,
                overtimeRate: 15,
                overtime: 0,
                netSalary: net,
                status: "Draft",
                company: s.company || user.company || "MS Horizon F.Z.E",
                branch: s.branch || user.branch || "Main Branch",
                createdAt: new Date().toISOString().slice(0, 10)
              }
            });
          }

          records = await prisma.payrollRecord.findMany({
            where: filter,
            orderBy: { month: "desc" }
          });
        }
      } catch (seedErr) {
        console.warn("Non-critical auto-seed error for payroll:", seedErr);
      }
    }

    return NextResponse.json(records);
  } catch (error: any) {
    console.error("GET payroll error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Permission check
    if (!(await hasPermissionBackend(user, "payroll", "create"))) {
      await createAuditLog(user, "Status Changed", "payroll", null, "Unauthorized attempt to create payroll record", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.staffId || !data.staffName || !data.month || !data.company || !data.branch) {
      return NextResponse.json(
        { error: "StaffId, staffName, month, company, and branch are required" },
        { status: 400 }
      );
    }

    // Tenancy Check
    if (user.role !== "Super Admin") {
      if (data.company !== user.company) {
        return NextResponse.json({ error: "Forbidden: Cannot access other company" }, { status: 403 });
      }
      if (user.role !== "Company Admin" && data.branch !== user.branch) {
        return NextResponse.json({ error: "Forbidden: Cannot access other branch" }, { status: 403 });
      }
    }

    const newRecord = await prisma.payrollRecord.create({
      data: {
        id: data.id || undefined,
        staffId: data.staffId,
        staffName: data.staffName,
        position: data.position || "",
        month: data.month,
        year: data.year ? parseInt(data.year) : (data.month ? parseInt(data.month.slice(0, 4)) : new Date().getFullYear()),
        basicSalary: Number(data.basicSalary) || 0,
        allowances: Number(data.allowances) || 0,
        deductions: Number(data.deductions) || 0,
        allowanceDetails: data.allowanceDetails || null,
        deductionDetails: data.deductionDetails || null,
        advanceDeduction: data.advanceDeduction !== undefined ? Number(data.advanceDeduction) : 0,
        loanDeduction: data.loanDeduction !== undefined ? Number(data.loanDeduction) : 0,
        overtimeHours: data.overtimeHours !== undefined ? Number(data.overtimeHours) : 0,
        overtimeRate: data.overtimeRate !== undefined ? Number(data.overtimeRate) : 0,
        overtime: data.overtime !== undefined ? Number(data.overtime) : 0,
        netSalary: Number(data.netSalary) || 0,
        status: data.status || "Draft",
        company: data.company,
        branch: data.branch,
        createdAt: data.createdAt || new Date().toISOString().slice(0, 10)
      }
    });

    return NextResponse.json(newRecord);
  } catch (error: any) {
    console.error("POST payroll error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
