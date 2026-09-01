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
      safeQuery("shifts", async () => {
        let list = await prisma.shift.findMany({ where: generalTenantFilter, orderBy: { name: "asc" } });
        if (list.length === 0) {
          try {
            const company = user.company === "System" ? "MS Horizon F.Z.E" : (user.company || "MS Horizon F.Z.E");
            const branch = user.branch === "All" ? "Main Branch" : (user.branch || "Main Branch");
            const defaultShifts = [
              { name: "Standard Morning Shift", clockIn: "09:00", clockOut: "18:00", gracePeriod: 15, breakDuration: 60, description: "Standard Morning Shift (9:00 AM - 6:00 PM)", company, branch, createdBy: "System", createdAt: new Date().toISOString().slice(0, 10) },
              { name: "Early Morning Shift", clockIn: "08:00", clockOut: "17:00", gracePeriod: 15, breakDuration: 60, description: "Early Shift (8:00 AM - 5:00 PM)", company, branch, createdBy: "System", createdAt: new Date().toISOString().slice(0, 10) },
              { name: "General Day Shift", clockIn: "09:00", clockOut: "19:00", gracePeriod: 15, breakDuration: 60, description: "General Day Shift (9:00 AM - 7:00 PM)", company, branch, createdBy: "System", createdAt: new Date().toISOString().slice(0, 10) },
              { name: "Night Shift", clockIn: "20:00", clockOut: "05:00", gracePeriod: 15, breakDuration: 60, description: "Night Shift (8:00 PM - 5:00 AM)", company, branch, createdBy: "System", createdAt: new Date().toISOString().slice(0, 10) },
            ];
            for (const ds of defaultShifts) {
              await prisma.shift.create({ data: ds });
            }
            list = await prisma.shift.findMany({ where: generalTenantFilter, orderBy: { name: "asc" } });
          } catch (e) {
            console.warn("Bootstrap shift seeding error:", e);
          }
        }
        return list;
      }, []),
      overtimeFilter ? safeQuery("overtime", () => prisma.overtimeRequest.findMany({ where: overtimeFilter }), []) : [],
      correctionsFilter ? safeQuery("corrections", () => prisma.attendanceCorrection.findMany({ where: correctionsFilter }), []) : [],
      emailsFilter ? safeQuery("emails", () => prisma.sentEmail.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }), []) : [],
      emailsFilter ? safeQuery("whatsapp", () => prisma.sentWhatsApp.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }), []) : [],
      leavesFilter ? safeQuery("leaves", () => prisma.leaveRequest.findMany({ where: leavesFilter }), []) : []
    ]);

    // Count how many critical queries had errors vs returned empty legitimately
    const errorCount = Object.keys(_errors).length;
    const hasQueryErrors = errorCount > 0;

    // Safe parser helpers
    const safeJsonArray = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const safeJsonObject = (val: any, fallback: any = null) => {
      if (!val) return fallback;
      if (typeof val === "object") return val;
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    // Sanitize applicant and staff documents for bootstrap payload to keep payload under 50KB for fast < 1s loading
    const sanitizedApplicants = (applicants || []).map((app: any) => {
      let docs = safeJsonArray(app.documents);
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

      return {
        ...app,
        fullName: app.fullName || "",
        email: app.email || "",
        mobile: app.mobile || "",
        whatsapp: app.whatsapp || "",
        trackingCode: app.trackingCode || "",
        status: app.status || "Registered",
        nationality: app.nationality || "",
        company: app.company || "",
        branch: app.branch || "",
        applicationDate: app.applicationDate || "",
        applyingPositions: safeJsonArray(app.applyingPositions),
        documents: docs,
        statusHistory: safeJsonArray(app.statusHistory)
      };
    });

    const sanitizedStaff = (staff || []).map((s: any) => {
      let docs = safeJsonArray(s.documents);
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

      return {
        ...s,
        name: s.name || "",
        email: s.email || "",
        mobile: s.mobile || "",
        whatsapp: s.whatsapp || "",
        company: s.company || "",
        branch: s.branch || "",
        position: s.position || "",
        documents: docs,
        permissions: safeJsonArray(s.permissions)
      };
    });

    const sanitizedCompanies = (companies || []).map((c: any) => ({
      ...c,
      name: c.name || "",
      documents: safeJsonArray(c.documents),
      enabledModules: safeJsonObject(c.enabledModules, {}),
      jobDemands: safeJsonArray(c.jobDemands),
      themeConfig: safeJsonObject(c.themeConfig, null)
    }));

    const sanitizedSuppliers = (suppliers || []).map((s: any) => ({
      ...s,
      name: s.name || "",
      documents: safeJsonArray(s.documents)
    }));

    const sanitizedVehicles = (v: any) => ({
      ...v,
      documents: safeJsonArray(v.documents),
      assignmentHistory: safeJsonArray(v.assignmentHistory)
    });

    const sanitizedAttendance = (attendance || []).map((a: any) => ({
      ...a,
      records: safeJsonArray(a.records)
    }));

    const sanitizedPlacements = (placements || []).map((p: any) => ({
      ...p,
      agreementHistory: safeJsonArray(p.agreementHistory)
    }));

    const sanitizedRoles = (roles || []).map((r: any) => ({
      ...r,
      permissions: safeJsonArray(r.permissions)
    }));

    const sanitizedTasks = (tasks || []).map((t: any) => ({
      ...t,
      history: safeJsonArray(t.history)
    }));

    const sanitizedRequests = (requests || []).map((r: any) => ({
      ...r,
      history: safeJsonArray(r.history)
    }));

    const sanitizedInterviews = (interviews || []).map((int: any) => ({
      ...int,
      attachments: safeJsonArray(int.attachments)
    }));

    return NextResponse.json({
      companies: sanitizedCompanies,
      ownCompanies: ownCompanies || [],
      users: users || [],
      branches: branches || [],
      roles: sanitizedRoles,
      staff: sanitizedStaff,
      applicants: sanitizedApplicants,
      tasks: sanitizedTasks,
      attendance: sanitizedAttendance,
      requests: sanitizedRequests,
      payroll: payroll || [],
      interviews: sanitizedInterviews, 
      vehicles: (vehicles || []).map(sanitizedVehicles),
      suppliers: sanitizedSuppliers,
      placements: sanitizedPlacements,
      notifications: notifications || [],
      logs: logs || [],
      archivedLogs: archivedLogs || [],
      settings: settings || null,
      shifts: shifts || [],
      overtime: overtime || [],
      corrections: corrections || [],
      emails: emails || [],
      whatsapp: whatsapp || [],
      leaves: leaves || [],
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
