import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, getPermissionScopedFilter } from "@/lib/auth-helpers";

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
      getPermissionScopedFilter(user, "payroll", "view", "company", "branch"),
      getPermissionScopedFilter(user, "attendance", "view", "company", "branch"),
      getPermissionScopedFilter(user, "emails", "view", "company", "branch"),
      getPermissionScopedFilter(user, "leave", "view", "company", "branch")
    ]);

    // Now query all 25 tables concurrently using Prisma
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
      companiesFilter ? prisma.company.findMany({ where: companiesFilter, orderBy: { name: "asc" } }) : [],
      isSuperAdmin ? prisma.internalCompany.findMany() : [],
      usersFilter ? prisma.user.findMany({
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
      }) : [],
      branchesFilter ? prisma.branch.findMany({ where: branchesFilter }) : [],
      prisma.role.findMany({ where: isSuperAdmin ? {} : { OR: [{ company: user.company }, { company: null }] } }),
      staffFilter ? prisma.staff.findMany({ where: staffFilter, orderBy: { name: "asc" } }) : [],
      applicantsFilter ? prisma.applicant.findMany({ where: applicantsFilter, orderBy: { createdAt: "desc" }, take: 500 }) : [],
      tasksFilter ? prisma.task.findMany({ where: tasksFilter }) : [],
      attendanceFilter ? prisma.staffAttendance.findMany({ where: attendanceFilter }) : [],
      requestsFilter ? prisma.staffRequest.findMany({ where: requestsFilter }) : [],
      payrollFilter ? prisma.payrollRecord.findMany({ where: payrollFilter, orderBy: { createdAt: "desc" }, take: 100 }) : [],
      interviewsFilter ? prisma.interview.findMany({ where: interviewsFilter }) : [],
      vehiclesFilter ? prisma.vehicle.findMany({ where: vehiclesFilter }) : [],
      suppliersFilter ? prisma.supplier.findMany({ where: suppliersFilter }) : [],
      placementsFilter ? prisma.placement.findMany({ where: placementsFilter }) : [],
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      hasReportsView ? prisma.activityLog.findMany({ where: { ...tenantFilter, archived: false }, orderBy: { dateTime: "desc" }, take: 50 }) : [],
      hasReportsView ? prisma.activityLog.findMany({ where: { ...tenantFilter, archived: true }, orderBy: { dateTime: "desc" }, take: 50 }) : [],
      prisma.siteSettings.findUnique({ where: { id: "SETTINGS" } }),
      prisma.shift.findMany({ where: generalTenantFilter }),
      overtimeFilter ? prisma.overtimeRequest.findMany({ where: overtimeFilter }) : [],
      correctionsFilter ? prisma.attendanceCorrection.findMany({ where: correctionsFilter }) : [],
      emailsFilter ? prisma.sentEmail.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }) : [],
      emailsFilter ? prisma.sentWhatsApp.findMany({ where: emailsFilter, orderBy: { sentAt: "desc" }, take: 100 }) : [],
      leavesFilter ? prisma.leaveRequest.findMany({ where: leavesFilter }) : []
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
