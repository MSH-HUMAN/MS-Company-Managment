import { User, Role } from "@/lib/types";

export interface RBACUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  company?: string;
  branch?: string;
}

/**
 * Checks if a task is assigned to a specific user (robust against name, email, and ID variations)
 */
export function isTaskAssignee(
  task: { assignedTo?: string; assignedToId?: string },
  currentUser: RBACUser | null | undefined,
  staffList?: { id?: string; name?: string; email?: string }[]
): boolean {
  if (!currentUser || !task) return false;
  
  const userName = currentUser.name?.trim().toLowerCase();
  const userEmail = currentUser.email?.trim().toLowerCase();
  const userId = currentUser.id;

  const taskAssignedTo = task.assignedTo?.trim().toLowerCase();
  const taskAssignedToId = task.assignedToId;

  // 1. Direct ID match
  if (userId && taskAssignedToId && userId === taskAssignedToId) return true;

  // 2. Name match (trimmed, case-insensitive)
  if (userName && taskAssignedTo && (userName === taskAssignedTo || taskAssignedTo.includes(userName) || userName.includes(taskAssignedTo))) return true;

  // 3. Email match (if task assignedTo was saved as email)
  if (userEmail && taskAssignedTo && userEmail === taskAssignedTo) return true;

  // 4. Match via Staff list if available
  if (staffList && Array.isArray(staffList)) {
    const matchedStaff = staffList.find(s => 
      (userEmail && s.email?.trim().toLowerCase() === userEmail) ||
      (userName && s.name?.trim().toLowerCase() === userName) ||
      (userId && s.id === userId)
    );
    if (matchedStaff) {
      if (taskAssignedToId && matchedStaff.id === taskAssignedToId) return true;
      if (taskAssignedTo && matchedStaff.name?.trim().toLowerCase() === taskAssignedTo) return true;
    }
  }

  return false;
}

/**
 * Filters a record list based on fine-grained VIEW / VIEW ALL permission rules
 * and Company / Branch tenant isolation. Safe against null/undefined currentUser.
 */
export function filterRecordsByPermission<T extends Record<string, any>>(
  moduleKey: string,
  list: T[],
  currentUser: RBACUser | null | undefined,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): T[] {
  if (!list || !Array.isArray(list)) return [];

  const isSuperAdmin = currentRole === "Super Admin" || currentUser?.role === "Super Admin";
  if (isSuperAdmin) {
    return list;
  }

  if (!currentUser) {
    return [];
  }

  const isCompanyAdmin = currentRole === "Company Admin" || currentUser.role === "Company Admin";
  const isBranchAdmin = currentRole === "Branch Admin" || currentUser.role === "Branch Admin";
  const isHRManager = currentRole === "HR Manager" || currentUser.role === "HR Manager";

  const userComp = currentUser.company;
  const userBranch = currentUser.branch;

  // First enforce Company isolation for all non-Super Admin users
  let scoped = list;
  if (userComp && userComp !== "System" && userComp !== "All") {
    scoped = scoped.filter(item => !item.company || item.company === userComp || item.company === "System");
  }

  // Branch isolation
  if (isBranchAdmin || (userBranch && userBranch !== "All" && !isCompanyAdmin && !isHRManager)) {
    scoped = scoped.filter(item => !item.branch || item.branch === "All" || item.branch === userBranch);
  }

  // Next check VIEW ALL vs VIEW
  const canViewAll = isCompanyAdmin || isBranchAdmin || hasPermission(moduleKey, "viewAll");
  if (canViewAll) {
    return scoped;
  }

  const canView = hasPermission(moduleKey, "view");
  if (!canView) {
    return [];
  }

  // Personal Record Scoping (User can only view their own records or records assigned to them)
  const userEmail = currentUser.email?.trim().toLowerCase();
  const userName = currentUser.name?.trim().toLowerCase();
  const userId = currentUser.id;

  return scoped.filter(item => {
    // If it's a task, check with isTaskAssignee
    if (item.assignedTo || item.assignedToId) {
      if (isTaskAssignee(item as any, currentUser)) return true;
    }

    const isOwner =
      (userName && item.createdBy?.trim().toLowerCase() === userName) ||
      (userId && item.createdById === userId) ||
      (userName && item.assignedTo?.trim().toLowerCase() === userName) ||
      (userName && item.assignedTo && (item.assignedTo.trim().toLowerCase().includes(userName) || userName.includes(item.assignedTo.trim().toLowerCase()))) ||
      (userEmail && item.assignedTo?.trim().toLowerCase() === userEmail) ||
      (userId && item.assignedToId === userId) ||
      (userId && item.staffId === userId) ||
      (userName && item.staffName?.trim().toLowerCase() === userName) ||
      (userEmail && item.email?.trim().toLowerCase() === userEmail) ||
      (userName && item.name?.trim().toLowerCase() === userName) ||
      (userId && item.id === userId);

    return Boolean(isOwner);
  });
}

/**
 * Checks if user can edit a specific record based on EDIT / EDIT ALL rules
 */
export function canEditRecord<T extends Record<string, any>>(
  moduleKey: string,
  record: T,
  currentUser: RBACUser | null | undefined,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser?.role === "Super Admin";
  if (isSuperAdmin) return true;
  if (!currentUser) return false;

  const isCompanyAdmin = currentRole === "Company Admin" || currentUser.role === "Company Admin";
  const isBranchAdmin = currentRole === "Branch Admin" || currentUser.role === "Branch Admin";

  // Check company / branch isolation first
  if (record.company && currentUser.company && currentUser.company !== "System" && record.company !== currentUser.company) {
    return false;
  }
  if (isBranchAdmin && record.branch && currentUser.branch && currentUser.branch !== "All" && record.branch !== currentUser.branch) {
    return false;
  }

  // If assigned directly to this task, user can edit/update status of their own assigned task!
  if (record.assignedTo || record.assignedToId) {
    if (isTaskAssignee(record as any, currentUser)) return true;
  }

  const canEditAll = isCompanyAdmin || isBranchAdmin || hasPermission(moduleKey, "editAll");
  if (canEditAll) return true;

  const canEdit = hasPermission(moduleKey, "edit");
  if (!canEdit) return false;

  const userEmail = currentUser.email?.trim().toLowerCase();
  const userName = currentUser.name?.trim().toLowerCase();
  const userId = currentUser.id;

  return Boolean(
    (userName && record.createdBy?.trim().toLowerCase() === userName) ||
    (userId && record.createdById === userId) ||
    (userName && record.assignedTo?.trim().toLowerCase() === userName) ||
    (userName && record.assignedTo && (record.assignedTo.trim().toLowerCase().includes(userName) || userName.includes(record.assignedTo.trim().toLowerCase()))) ||
    (userEmail && record.assignedTo?.trim().toLowerCase() === userEmail) ||
    (userId && record.assignedToId === userId) ||
    (userId && record.staffId === userId) ||
    (userName && record.staffName?.trim().toLowerCase() === userName) ||
    (userEmail && record.email?.trim().toLowerCase() === userEmail) ||
    (userName && record.name?.trim().toLowerCase() === userName) ||
    (userId && record.id === userId)
  );
}

/**
 * Checks if user can delete a specific record based on DELETE / DELETE ALL rules
 */
export function canDeleteRecord<T extends Record<string, any>>(
  moduleKey: string,
  record: T,
  currentUser: RBACUser | null | undefined,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser?.role === "Super Admin";
  if (isSuperAdmin) return true;
  if (!currentUser) return false;

  const isCompanyAdmin = currentRole === "Company Admin" || currentUser.role === "Company Admin";
  const isBranchAdmin = currentRole === "Branch Admin" || currentUser.role === "Branch Admin";
  const isHRManager = currentRole === "HR Manager" || currentUser.role === "HR Manager";

  // Check company / branch isolation first
  if (record.company && currentUser.company && currentUser.company !== "System" && record.company !== currentUser.company) {
    return false;
  }
  if (isBranchAdmin && record.branch && currentUser.branch && currentUser.branch !== "All" && record.branch !== currentUser.branch) {
    return false;
  }

  const canDeleteAll = isCompanyAdmin || isBranchAdmin || isHRManager || hasPermission(moduleKey, "deleteAll");
  if (canDeleteAll) return true;

  const canDelete = hasPermission(moduleKey, "delete");
  if (!canDelete) return false;

  const userEmail = currentUser.email?.toLowerCase();
  const userName = currentUser.name?.toLowerCase();
  const userId = currentUser.id;

  return Boolean(
    (userName && record.createdBy?.toLowerCase() === userName) ||
    (userId && record.createdById === userId) ||
    (userName && record.assignedTo?.toLowerCase() === userName) ||
    (userId && record.assignedToId === userId) ||
    (userId && record.staffId === userId) ||
    (userName && record.staffName?.toLowerCase() === userName) ||
    (userEmail && record.email?.toLowerCase() === userEmail) ||
    (userName && record.name?.toLowerCase() === userName) ||
    (userId && record.id === userId)
  );
}

/**
 * Checks if user can approve/reject records in a module
 */
export function canApproveRecord(
  moduleKey: string,
  currentUser: RBACUser | null | undefined,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser?.role === "Super Admin";
  if (isSuperAdmin) return true;
  if (!currentUser) return false;

  const isCompanyAdmin = currentRole === "Company Admin" || currentUser.role === "Company Admin";
  const isHRManager = currentRole === "HR Manager" || currentUser.role === "HR Manager";
  if (isCompanyAdmin || isHRManager) return true;

  return hasPermission(moduleKey, "approve") || hasPermission(moduleKey, "editAll");
}

/**
 * Checks if user can export/print records in a module
 */
export function canExportRecord(
  moduleKey: string,
  currentUser: RBACUser | null | undefined,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser?.role === "Super Admin";
  if (isSuperAdmin) return true;
  if (!currentUser) return false;

  const isCompanyAdmin = currentRole === "Company Admin" || currentUser.role === "Company Admin";
  if (isCompanyAdmin) return true;

  return hasPermission(moduleKey, "export") || hasPermission(moduleKey, "print") || hasPermission(moduleKey, "viewAll");
}
