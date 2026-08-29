import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, getPermissionScopedFilter } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Track query errors separately from empty results so the client can retry
const _errors: Record<string, string> = {};

const safeQuery = async <T>(key: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    const result = await fn();
    return result;
  } catch (err: any) {
    console.error(`[Bootstrap] Query "${key}" failed:`, err?.message || err);
    _errors[key] = err?.message || "Unknown error";
    return fallback;
  }
};

export async function GET(request: Request) {
  // Reset error tracking on each request
  Object.keys(_errors).forEach(k => delete _errors[k]);

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = user.role === "Super Admin";
    const tenantFilter = getTenantScopeFilter(user, "company", "branch");
    const generalTenantFilter = isSuperAdmin ? {} : { company: user.company };

    // Resolve permission scoped filters for each module in parallel
    const [
      companiesFilter,
      usersFilter,
      branchesFilter,
      staffFilter,
      applicantsFilter,
      tasksFilter,
      attendanceFilter,
      requestsFilter,
      payrollFilter,
      interviewsFilter,
      vehiclesFilter,
      suppliersFilter,
      placementsFilter,
      hasReportsView,
      overtimeFilter,
      correctionsFilter,
      emailsFilter,
      leavesFilter
    ] = await Promise.all([
      getPermissionScopedFilter(user, "companies", "view", "name"),
      getPermissionScopedFilter(user, "users", "view", "company", "branch"),
      getPermissionScopedFilter(user, "branches", "view", "company", "name"),
      getPermissionScopedFilter(user, "staff", "view", "company", "branch"),
      getPermissionScopedFilter(user, "applicants", "view", "company", "branch"),
      getPermissionScopedFilter(user, "tasks", "view", "company", "branch"),
      getPermissionScopedFilter(user, "attendance", "view", "company", "branch"),
      getPermissionScopedFilter(user, "requests", "view", "company", "branch"),
      getPermissionScopedFilter(user, "payroll", "view", "company", "branch"),
      getPermissionScopedFilter(user, "interviews", "view", "company", "branch"),
      getPermissionScopedFilter(user, "vehicles", "view", "company", "branch"),
      getPermissionScopedFilter(user, "suppliers", "view", "company"),
      getPermissionScopedFilter(user, "placement", "view", "company", "branch"),
      hasPermissionBackend(user, "reports", "view"),
      getPermissionScopedFilter(user, "overtime", "view", "company", "branch"),
      getPermissionScopedFilter(user, "corrections", "view", "company", "branch"),
      getPermissionScopedFilter(user, "emails", "view", "company", "branch"),
      getPermissionScopedFilter(user, "leave", "view", "company", "branch")
    ]);

    // Query all tables concurrently with per-query error tracking
    const [
      companies,
      ownCompanies,
      users,
      branches,
      roles,
      staff,
      applicants,
      tasks,
      attendance,
      requests,
      payroll,
      interviews,
      vehicles,
      suppliers,
      placements,
      notifications,
      logs,
      archivedLogs,
      settings,
      shifts,
      overtime,
      corrections,
      emails,
      whatsapp,
      leaves
    ] = await Promise.all([
      companiesFilter ? safeQuery("companies", () => prisma.company.findMany({ where: companiesFilter, orderBy: { name: "asc" } }), []) : [],
      isSuperAdmin ? safeQuery("ownCompanies", () => prisma.internalCompany.findMany(), []) : [],
      usersFilter ? safeQuery("users", () => prisma.user.findMany({
        where: usersFilter,
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
          whatsapp: true,
          role: true,
          company: true,
          branch: true,
          status: true,
          lastLogin: true,
          photo: true
        }
      }), []) : [],
      branchesFilter ? safeQuery("branches", () => prisma.branch.findMany({ where: branchesFilter }), []) : [],
      safeQuery("roles", () => prisma.role.findMany({ where: isSuperAdmin ? {} : { OR: [{ company: user.company }, { company: null }] } }), []),
      staffFilter ? safeQuery("staff", () => prisma.staff.findMany({ where: staffFilter, orderBy: { name: "asc" } }), []) : [],
      applicantsFilter ? safeQuery("applicants", () => prisma.applicant.findMany({ where: applicantsFilter, orderBy: { createdAt: "desc" }, take: 500 }), []) : [],
      tasksFilter ? safeQuery("tasks", () => prisma.task.findMany({ where: tasksFilter, orderBy: { createdAt: "desc" } }), []) : [],
      attendanceFilter ? safeQuery("attendance", () => prisma.staffAttendance.findMany({ where: attendanceFilter, orderBy: { month: "desc" }, take: 200 }), []) : [],
      requestsFilter ? safeQuery("requests", () => prisma.staffRequest.findMany({ where: requestsFilter, orderBy: { date: "desc" } }), []) : [],
      payrollFilter ? safeQuery("payroll", async () => {
        let list = await prisma.payrollRecord.findMany({ where: payrollFilter, orderBy: { createdAt: "desc" }, take: 100 });
        if (list.length === 0) {
          try {
            const activeStaff = await prisma.staff.findMany({ where: { status: "Active" } });
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
                    allowanceDetails: JSON.stringify([
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
              list = await prisma.payrollRecord.findMany({ where: payrollFilter, orderBy: { createdAt: "desc" }, take: 100 });
            }
          } catch (e) {
            console.warn("Bootstrap payroll seed error:", e);
          }
        }
        return list;
      }, []) : [],
      interviewsFilter ? safeQuery("interviews", () => prisma.interview.findMany({ where: interviewsFilter, orderBy: { dateTime: "desc" } }), []) : [],
      vehiclesFilter ? safeQuery("vehicles", () => prisma.vehicle.findMany({ where: vehiclesFilter }), []) : [],
      suppliersFilter ? safeQuery("suppliers", () => prisma.supplier.findMany({ where: suppliersFilter }), []) : [],
      placementsFilter ? safeQuery("placements", () => prisma.placement.findMany({ where: placementsFilter, orderBy: { placementDate: "desc" } }), []) : [],
      safeQuery("notifications", () => prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }), []),
      hasReportsView ? safeQuery("logs", () => prisma.activityLog.findMany({ where: { ...tenantFilter, archived: false }, orderBy: { dateTime: "desc" }, take: 50 }), []) : [],
      hasReportsView ? safeQuery("archivedLogs", () => prisma.activityLog.findMany({ where: { ...tenantFilter, archived: true }, orderBy: { dateTime: "desc" }, take: 50 }), []) : [],
      safeQuery("settings", () => prisma.siteSettings.findUnique({ where: { id: "SETTINGS" } }), null),
      safeQuery("shifts", () => prisma.shift.findMany({ where: generalTenantFilter }), []),
      overtimeFilter ? safeQuery("overtime", () => prisma.overtimeRequest.findMany({ where: overtimeFilter }), []) : [],
      correctionsFilter ? safeQuery("corrections", () => prisma.attendanceCorrection.findMany({ where: correctionsFilter }), []) : [],
      emailsFilter ? safeQuery("emails", () => prisma.sentEmail.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }), []) : [],
      emailsFilter ? safeQuery("whatsapp", () => prisma.sentWhatsApp.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }), []) : [],
      leavesFilter ? safeQuery("leaves", () => prisma.leaveRequest.findMany({ where: leavesFilter }), []) : []
    ]);

    // Count how many critical queries had errors vs returned empty legitimately
    const errorCount = Object.keys(_errors).length;
    const hasQueryErrors = errorCount > 0;

    // Sanitize applicant and staff documents for bootstrap payload to keep payload under 50KB for fast < 1s loading
    const sanitizedApplicants = (applicants || []).map((app: any) => {
      let docs = app.documents;
      if (typeof docs === "string") {
        try { docs = JSON.parse(docs); } catch (e) {}
      }
      if (Array.isArray(docs)) {
        docs = docs.map((d: any) => {
          if (!d) return d;
          const urlStr = d.url || "";
          if (urlStr.startsWith("data:") && urlStr.length > 500) {
            return {
              id: d.id,
              name: d.name,
              type: d.type,
              size: d.size,
              uploadedBy: d.uploadedBy,
              uploadedDate: d.uploadedDate,
              slotLabel: d.slotLabel,
              documentType: d.documentType,
              hasFile: true
            };
          }
          return d;
        });
      }
      return {
        ...app,
        documents: docs
      };
    });

    const sanitizedStaff = (staff || []).map((s: any) => {
      let docs = s.documents;
      if (typeof docs === "string") {
        try { docs = JSON.parse(docs); } catch (e) {}
      }
      if (Array.isArray(docs)) {
        docs = docs.map((d: any) => {
          if (!d) return d;
          const urlStr = d.url || "";
          if (urlStr.startsWith("data:") && urlStr.length > 500) {
            return {
              id: d.id,
              name: d.name,
              type: d.type,
              size: d.size,
              uploadedBy: d.uploadedBy,
              uploadedDate: d.uploadedDate,
              slotLabel: d.slotLabel,
              documentType: d.documentType,
              hasFile: true
            };
          }
          return d;
        });
      }
      return {
        ...s,
        documents: docs
      };
    });
const sanitizedInterviews = (interviews || []).map((int: any) => {
  let attachments = int.attachments;

  if (typeof attachments === "string") {
    try {
      attachments = JSON.parse(attachments);
    } catch (e) {
      attachments = [];
    }
  }

  if (!Array.isArray(attachments)) {
    attachments = [];
  }

  return { ...int, attachments };
});
    return NextResponse.json({
      companies,
      ownCompanies,
      users,
      branches,
      roles,
      staff: sanitizedStaff,
      applicants: sanitizedApplicants,
      tasks,
      attendance,
      requests,
      payroll,
     interviews: sanitizedInterviews, 
      vehicles,
      suppliers,
      placements,
      notifications,
      logs,
      archivedLogs,
      settings,
      shifts,
      overtime,
      corrections,
      emails,
      whatsapp,
      leaves,
      _hasQueryErrors: hasQueryErrors,
      _errors: hasQueryErrors ? { ..._errors } : undefined,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "Surrogate-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Bootstrap API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
