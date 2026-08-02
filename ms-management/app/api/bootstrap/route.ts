import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, getPermissionScopedFilter } from "@/lib/auth-helpers";

const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    console.error("Bootstrap sub-query error:", err);
    return fallback;
  }
};

export async function GET(request: Request) {
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

    // Now query all 25 tables concurrently using Prisma with safeQuery wrappers
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
      companiesFilter ? safeQuery(() => prisma.company.findMany({ where: companiesFilter, orderBy: { name: "asc" } }), []) : [],
      isSuperAdmin ? safeQuery(() => prisma.internalCompany.findMany(), []) : [],
      usersFilter ? safeQuery(() => prisma.user.findMany({
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
      branchesFilter ? safeQuery(() => prisma.branch.findMany({ where: branchesFilter }), []) : [],
      safeQuery(() => prisma.role.findMany({ where: isSuperAdmin ? {} : { OR: [{ company: user.company }, { company: null }] } }), []),
      staffFilter ? safeQuery(() => prisma.staff.findMany({ where: staffFilter, orderBy: { name: "asc" } }), []) : [],
      applicantsFilter ? safeQuery(() => prisma.applicant.findMany({ where: applicantsFilter, orderBy: { createdAt: "desc" }, take: 500 }), []) : [],
      tasksFilter ? safeQuery(() => prisma.task.findMany({ where: tasksFilter }), []) : [],
      attendanceFilter ? safeQuery(() => prisma.staffAttendance.findMany({ where: attendanceFilter }), []) : [],
      requestsFilter ? safeQuery(() => prisma.staffRequest.findMany({ where: requestsFilter }), []) : [],
      payrollFilter ? safeQuery(() => prisma.payrollRecord.findMany({ where: payrollFilter, orderBy: { createdAt: "desc" }, take: 100 }), []) : [],
      interviewsFilter ? safeQuery(() => prisma.interview.findMany({ where: interviewsFilter }), []) : [],
      vehiclesFilter ? safeQuery(() => prisma.vehicle.findMany({ where: vehiclesFilter }), []) : [],
      suppliersFilter ? safeQuery(() => prisma.supplier.findMany({ where: suppliersFilter }), []) : [],
      placementsFilter ? safeQuery(() => prisma.placement.findMany({ where: placementsFilter }), []) : [],
      safeQuery(() => prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }), []),
      hasReportsView ? safeQuery(() => prisma.activityLog.findMany({ where: { ...tenantFilter, archived: false }, orderBy: { dateTime: "desc" }, take: 50 }), []) : [],
      hasReportsView ? safeQuery(() => prisma.activityLog.findMany({ where: { ...tenantFilter, archived: true }, orderBy: { dateTime: "desc" }, take: 50 }), []) : [],
      safeQuery(() => prisma.siteSettings.findUnique({ where: { id: "SETTINGS" } }), null),
      safeQuery(() => prisma.shift.findMany({ where: generalTenantFilter }), []),
      overtimeFilter ? safeQuery(() => prisma.overtimeRequest.findMany({ where: overtimeFilter }), []) : [],
      correctionsFilter ? safeQuery(() => prisma.attendanceCorrection.findMany({ where: correctionsFilter }), []) : [],
      emailsFilter ? safeQuery(() => prisma.sentEmail.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }), []) : [],
      emailsFilter ? safeQuery(() => prisma.sentWhatsApp.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }), []) : [],
      leavesFilter ? safeQuery(() => prisma.leaveRequest.findMany({ where: leavesFilter }), []) : []
    ]);

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error("Bootstrap API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
