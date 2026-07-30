import { cookies } from "next/headers";
import prisma from "./prisma";
import { verifyToken } from "./jwt";
import { getPermissionModuleName } from "./constants";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  branch: string;
  status: string;
  mobile: string;
  whatsapp: string;
  permissions?: any;
}

/**
 * Cache for role permissions to prevent redundant DB lookups on concurrent API hits
 */
const roleCache = new Map<string, { permissions: any; timestamp: number }>();
const ROLE_CACHE_TTL = 10000; // 10 seconds TTL

/**
 * Gets the current authenticated session user from cookie
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("auth_token");

    if (!tokenCookie || !tokenCookie.value) {
      return null;
    }

    const payload = await verifyToken(tokenCookie.value);

    if (!payload || !payload.id) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string }
    });

    if (!user || user.status !== "Active") {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      branch: user.branch,
      status: user.status,
      mobile: user.mobile,
      whatsapp: user.whatsapp,
      permissions: user.permissions
    };
  } catch (error) {
    console.error("getSessionUser error:", error);
    return null;
  }
}

/**
 * Checks if the user is authorized for specific roles
 */
export function hasRole(user: SessionUser, roles: string[]): boolean {
  return roles.includes(user.role);
}

/**
 * Scopes database queries based on user multi-tenant permissions.
 * - Super Admin can view all data (no scoping).
 * - Company Admin/HR/Accountant can view only their company's data.
 * - Branch Admin/Staff can view only their branch's data.
 * 
 * Returns a prisma WHERE filter object.
 */
export function getTenantScopeFilter(user: SessionUser, companyField = "company", branchField = "branch") {
  if (user.role === "Super Admin") {
    return {};
  }
  
  const filter: Record<string, any> = {};
  
  if (user.company && user.company !== "System") {
    filter[companyField] = user.company;
  }
  
  if (user.role !== "Company Admin") {
    // Branch Admin, HR, Staff MUST be restricted to their branch
    filter[branchField] = (user.branch && user.branch !== "All") ? user.branch : "RESTRICTED_ACCESS";
  }
  
  return filter;
}

/**
 * Validates module permissions for a session user on the backend API
 */
export async function hasPermissionBackend(user: SessionUser, moduleKey: string, action: string): Promise<boolean> {
  // 1. Check user custom permissions override from the session object (already retrieved in getSessionUser)
  if (user.permissions) {
    const userPermissions = typeof user.permissions === "string"
      ? (() => { try { return JSON.parse(user.permissions); } catch { return null; } })()
      : user.permissions;
      
    if (userPermissions) {
      const permissionModule = getPermissionModuleName(moduleKey);
      if (permissionModule) {
        const matrix = userPermissions.matrix || userPermissions;
        if (matrix[permissionModule] !== undefined && matrix[permissionModule] !== null) {
          const modulePerms = matrix[permissionModule];
          if (modulePerms) {
            if (modulePerms[action] !== undefined && Boolean(modulePerms[action])) {
              return true;
            }
            if (action === "view" && modulePerms["viewAll"] !== undefined && Boolean(modulePerms["viewAll"])) {
              return true;
            }
            if (action === "edit" && modulePerms["editAll"] !== undefined && Boolean(modulePerms["editAll"])) {
              return true;
            }
            if (action === "delete" && modulePerms["deleteAll"] !== undefined && Boolean(modulePerms["deleteAll"])) {
              return true;
            }
          }
        }
      }
    }
  }

  // 2. Fetch role permissions from cache or DB
  const now = Date.now();
  const cached = roleCache.get(user.role);
  let permissions = null;

  if (cached && now - cached.timestamp < ROLE_CACHE_TTL) {
    permissions = cached.permissions;
  } else {
    const role = await prisma.role.findFirst({
      where: { name: user.role }
    });
    if (role) {
      permissions = role.permissions ? (
        typeof role.permissions === "string" 
          ? (() => { try { return JSON.parse(role.permissions); } catch { return null; } })()
          : (role.permissions as any)
      ) : null;
      roleCache.set(user.role, { permissions, timestamp: now });
    }
  }

  const permissionModule = getPermissionModuleName(moduleKey);
  if (permissions && permissionModule) {
    if (permissions[permissionModule] !== undefined && permissions[permissionModule] !== null) {
      const modulePerms = permissions[permissionModule];
      if (modulePerms) {
        if (modulePerms[action] !== undefined && Boolean(modulePerms[action])) {
          return true;
        }
        if (action === "view" && modulePerms["viewAll"] !== undefined && Boolean(modulePerms["viewAll"])) {
          return true;
        }
        if (action === "edit" && modulePerms["editAll"] !== undefined && Boolean(modulePerms["editAll"])) {
          return true;
        }
        if (action === "delete" && modulePerms["deleteAll"] !== undefined && Boolean(modulePerms["deleteAll"])) {
          return true;
        }
      }
    }
  }

  // 3. Fallback for Super Admin (general CRUD is allowed, but approve/reject/assign must be explicit)
  if (user.role === "Super Admin") {
    if (["approve", "reject", "assign"].includes(action)) {
      if (["attendance", "payroll", "leave"].includes(moduleKey.toLowerCase())) {
        return true;
      }
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Record an activity log in the database
 */
export async function createAuditLog(
  user: SessionUser,
  action: string,
  moduleName: string,
  oldValue: string | null = null,
  newValue: string | null = null,
  ipAddress: string | null = null
) {
  try {
    await prisma.activityLog.create({
      data: {
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: user.name,
        role: user.role,
        company: user.company,
        branch: user.branch,
        action,
        module: moduleName,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        ipAddress: ipAddress || "127.0.0.1"
      }
    });
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

/**
 * Calculates differences in hours
 */
export function calcHours(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`2000-01-01T${checkIn}`);
  const end = new Date(`2000-01-01T${checkOut}`);
  let diff = (end.getTime() - start.getTime()) / 3_600_000;
  if (diff < 0) diff += 24; // Handle overnight shifts
  return parseFloat(diff.toFixed(2));
}

/**
 * Computes working hours, overtime, late arrival and early leaving
 */
export function computeAttendanceMetrics(checkIn: string, checkOut: string, shift: any) {
  if (!checkIn || !checkOut) {
    return { workingHours: 0, overtime: 0, lateArrival: 0, earlyLeaving: 0, breakHours: 0 };
  }

  const shiftIn = shift ? (shift.clockIn || "09:00") : "09:00";
  const shiftOut = shift ? (shift.clockOut || "18:00") : "18:00";
  const breakMin = shift ? (shift.breakDuration || 0) : 60;
  const breakHours = breakMin / 60;

  const employeeElapsed = calcHours(checkIn, checkOut);
  const netWorkingHours = Math.max(0, employeeElapsed - breakHours);

  const shiftElapsed = calcHours(shiftIn, shiftOut);

  const isOTEligible = shift ? shift.overtimeEligible !== "No" : true;
  const overtime = (employeeElapsed > shiftElapsed && isOTEligible) 
    ? parseFloat((employeeElapsed - shiftElapsed).toFixed(2)) 
    : 0;

  let lateArrival = 0;
  try {
    const [empInH, empInM] = checkIn.split(":").map(Number);
    const [shInH, shInM] = shiftIn.split(":").map(Number);
    const empInMin = empInH * 60 + empInM;
    const shInMin = shInH * 60 + shInM;
    const grace = shift ? (shift.gracePeriod || 0) : 15;
    if (empInMin > (shInMin + grace)) {
      lateArrival = empInMin - shInMin;
    }
  } catch (e) {}

  let earlyLeaving = 0;
  try {
    const [empOutH, empOutM] = checkOut.split(":").map(Number);
    const [shOutH, shOutM] = shiftOut.split(":").map(Number);
    const empOutMin = empOutH * 60 + empOutM;
    const shOutMin = shOutH * 60 + shOutM;
    if (empOutMin < shOutMin) {
      earlyLeaving = shOutMin - empOutMin;
    }
  } catch (e) {}

  return {
    workingHours: parseFloat(netWorkingHours.toFixed(2)),
    overtime,
    lateArrival,
    earlyLeaving,
    breakHours
  };
}

/**
 * Recalculate monthly overtime and net salary for a staff member and update the PayrollRecord if it exists
 */
export async function recalculateMonthlyPayroll(staffId: string, month: string, year: number) {
  try {
    const targetStaff = await prisma.staff.findUnique({
      where: { id: staffId }
    });
    if (!targetStaff) return;

    // 1. Fetch the StaffAttendance document
    const attendance = await prisma.staffAttendance.findFirst({
      where: {
        staffId,
        month,
        year
      }
    });

    let totalOvertimeHours = 0;
    if (attendance && attendance.records) {
      const records = typeof attendance.records === "string"
        ? JSON.parse(attendance.records)
        : (attendance.records as any[]);
      
      if (Array.isArray(records)) {
        for (const r of records) {
          totalOvertimeHours += Number(r.overtime) || 0;
        }
      }
    }

    // 2. Fetch the existing PayrollRecord
    const payrollRecord = await prisma.payrollRecord.findFirst({
      where: {
        staffId,
        month,
        year
      }
    });

    if (payrollRecord) {
      const otRate = payrollRecord.overtimeRate || targetStaff.overtimeRate || 15;
      const newOvertimePay = parseFloat((totalOvertimeHours * otRate).toFixed(2));
      const diffOvertimePay = newOvertimePay - payrollRecord.overtime;
      const newNetSalary = Math.max(0, parseFloat((payrollRecord.netSalary + diffOvertimePay).toFixed(2)));

      await prisma.payrollRecord.update({
        where: { id: payrollRecord.id },
        data: {
          overtimeHours: totalOvertimeHours,
          overtime: newOvertimePay,
          netSalary: newNetSalary
        }
      });
      console.log(`Recalculated payroll for staff ${staffId}: overtime hours = ${totalOvertimeHours}, overtime pay = ${newOvertimePay}, net salary = ${newNetSalary}`);
    }
  } catch (error) {
    console.error("recalculateMonthlyPayroll error:", error);
  }
}

/**
 * Resolves permissions and returns a scoped database filter object.
 * Returns null if the user does not have permission at all.
 */
export async function getPermissionScopedFilter(
  user: SessionUser,
  moduleKey: string,
  actionKey: "view" | "edit" | "delete",
  companyField = "company",
  branchField = "branch",
  staffIdField = "staffId"
): Promise<Record<string, any> | null> {
  const isSuperAdmin = user.role === "Super Admin";

  // Check permissions: either the base action (e.g., 'view') or the 'All' variation (e.g., 'viewAll') must be true
  const hasBase = await hasPermissionBackend(user, moduleKey, actionKey);
  const hasAll = await hasPermissionBackend(user, moduleKey, `${actionKey}All`);

  if (!isSuperAdmin && !hasBase && !hasAll) {
    return null; // Deny access
  }

  // Base tenancy filters are always applied first
  const filter = getTenantScopeFilter(user, companyField, branchField);

  if (isSuperAdmin) {
    return filter;
  }

  // If the user has the "All" version of the permission, they get the full company/branch scope
  if (hasAll) {
    return filter;
  }

  // Otherwise, user only has the "Own" version (e.g., 'view' instead of 'viewAll').
  // We restrict query results strictly to their own data.
  const staffMember = await prisma.staff.findFirst({
    where: { email: user.email }
  });
  const staffId = staffMember ? staffMember.id : "NO_LINKED_STAFF";

  const moduleLower = moduleKey.toLowerCase();
  
  if (moduleLower === "applicants" || moduleLower === "applicant tracking") {
    // Can only see their own application or those they created
    filter["OR"] = [
      { email: user.email },
      { createdBy: user.name }
    ];
  } else if (moduleLower === "staff" || moduleLower === "staff birthdays") {
    filter["id"] = staffId;
  } else if (moduleLower === "users") {
    filter["id"] = user.id;
  } else if (moduleLower === "tasks") {
    filter["OR"] = [
      { assignedToId: staffId },
      { createdBy: user.name }
    ];
  } else if (moduleLower === "documents") {
    filter["uploadedBy"] = user.name;
  } else if (moduleLower === "interviews") {
    filter["OR"] = [
      { conductPerson: user.name },
      { createdBy: user.name }
    ];
  } else if (moduleLower === "companies") {
    filter["name"] = user.company;
  } else if (moduleLower === "branches") {
    filter["name"] = user.branch;
  } else if (moduleLower === "vehicles") {
    filter["OR"] = [
      { assignedToId: staffId },
      { createdBy: user.name }
    ];
  } else if (moduleLower === "suppliers") {
    filter["createdBy"] = user.name;
  } else if (moduleLower === "placement" || moduleLower === "placement agreements") {
    filter["OR"] = [
      { emailAddress: user.email },
      { createdBy: user.name }
    ];
  } else if (moduleLower === "notifications") {
    filter["userId"] = user.id;
  } else if (moduleLower === "activity log") {
    filter["userName"] = user.name;
  } else {
    // Default fallback (e.g., attendance, payroll, leave requests, staff requests)
    filter[staffIdField] = staffId;
  }

  return filter;
}

/**
 * Checks if the user is allowed to modify (edit or delete) a specific record.
 */
export async function canModifyRecord(
  user: SessionUser,
  moduleKey: string,
  actionKey: "edit" | "delete",
  record: any,
  staffIdField = "staffId"
): Promise<boolean> {
  const isSuperAdmin = user.role === "Super Admin";
  if (isSuperAdmin) return true;

  const hasAll = await hasPermissionBackend(user, moduleKey, `${actionKey}All`);
  const hasBase = await hasPermissionBackend(user, moduleKey, actionKey);

  if (!hasAll && !hasBase) {
    return false; // No permission at all
  }

  // Enforce company scope (users cannot modify records belonging to other companies)
  if (user.company && user.company !== "System" && record.company && record.company !== user.company) {
    return false;
  }
  // Enforce branch scope for non-Company Admin users
  if (user.role !== "Company Admin" && user.branch && user.branch !== "All" && record.branch && record.branch !== user.branch) {
    return false;
  }

  if (hasAll) {
    return true; // Authorized to edit/delete all within tenant/branch scope
  }

  // Otherwise, user only has base 'edit' or 'delete' (own data only)
  const staffMember = await prisma.staff.findFirst({
    where: { email: user.email }
  });
  const staffId = staffMember ? staffMember.id : "NO_LINKED_STAFF";

  const moduleLower = moduleKey.toLowerCase();

  if (moduleLower === "applicants" || moduleLower === "applicant tracking") {
    return record.email === user.email || record.createdBy === user.name;
  } else if (moduleLower === "staff" || moduleLower === "staff birthdays") {
    return record.id === staffId;
  } else if (moduleLower === "users") {
    return record.id === user.id;
  } else if (moduleLower === "tasks") {
    return record.assignedToId === staffId || record.createdBy === user.name;
  } else if (moduleLower === "documents") {
    return record.uploadedBy === user.name;
  } else if (moduleLower === "interviews") {
    return record.conductPerson === user.name || record.createdBy === user.name;
  } else if (moduleLower === "companies") {
    return record.name === user.company;
  } else if (moduleLower === "branches") {
    return record.name === user.branch;
  } else if (moduleLower === "vehicles") {
    return record.assignedToId === staffId || record.createdBy === user.name;
  } else if (moduleLower === "suppliers") {
    return record.createdBy === user.name;
  } else if (moduleLower === "placement" || moduleLower === "placement agreements") {
    return record.emailAddress === user.email || record.createdBy === user.name;
  } else if (moduleLower === "notifications") {
    return record.userId === user.id;
  } else if (moduleLower === "activity log") {
    return record.userName === user.name;
  } else {
    // Default fallback (e.g. attendance, payroll, leave requests, staff requests)
    return record[staffIdField] === staffId;
  }
}


