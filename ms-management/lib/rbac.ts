import { User, Role } from "@/lib/types";

export interface RBACUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  branch?: string;
}

/**
 * Filters a record list based on fine-grained VIEW / VIEW ALL permission rules
 * and Company / Branch tenant isolation.
 */
export function filterRecordsByPermission<T extends Record<string, any>>(
  moduleKey: string,
  list: T[],
  currentUser: RBACUser,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): T[] {
  if (!list || !Array.isArray(list)) return [];

  const isSuperAdmin = currentRole === "Super Admin" || currentUser.role === "Super Admin";
  if (isSuperAdmin) {
    return list;
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
  const canViewAll = isCompanyAdmin || isBranchAdmin || isHRManager || hasPermission(moduleKey, "viewAll");
  if (canViewAll) {
    return scoped;
  }

  const canView = hasPermission(moduleKey, "view");
  if (!canView) {
    return [];
  }

  // Personal Record Scoping (User can only view their own records or records assigned to them)
  return scoped.filter(item => {
    const isOwner =
      item.createdBy === currentUser.name ||
      item.createdById === currentUser.id ||
      item.assignedTo === currentUser.name ||
      item.assignedToId === currentUser.id ||
      item.staffId === currentUser.id ||
      item.staffName?.toLowerCase() === currentUser.name.toLowerCase() ||
      item.email?.toLowerCase() === currentUser.email.toLowerCase() ||
      item.name?.toLowerCase() === currentUser.name.toLowerCase() ||
      item.id === currentUser.id;

    return isOwner;
  });
}

/**
 * Checks if user can edit a specific record based on EDIT / EDIT ALL rules
 */
export function canEditRecord<T extends Record<string, any>>(
  moduleKey: string,
  record: T,
  currentUser: RBACUser,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser.role === "Super Admin";
  if (isSuperAdmin) return true;

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

  const canEditAll = isCompanyAdmin || isBranchAdmin || isHRManager || hasPermission(moduleKey, "editAll");
  if (canEditAll) return true;

  const canEdit = hasPermission(moduleKey, "edit");
  if (!canEdit) return false;

  // Personal ownership check
  return (
    record.createdBy === currentUser.name ||
    record.createdById === currentUser.id ||
    record.assignedTo === currentUser.name ||
    record.assignedToId === currentUser.id ||
    record.staffId === currentUser.id ||
    record.staffName?.toLowerCase() === currentUser.name.toLowerCase() ||
    record.email?.toLowerCase() === currentUser.email.toLowerCase() ||
    record.name?.toLowerCase() === currentUser.name.toLowerCase() ||
    record.id === currentUser.id
  );
}

/**
 * Checks if user can delete a specific record based on DELETE / DELETE ALL rules
 */
export function canDeleteRecord<T extends Record<string, any>>(
  moduleKey: string,
  record: T,
  currentUser: RBACUser,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser.role === "Super Admin";
  if (isSuperAdmin) return true;

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

  // Personal ownership check
  return (
    record.createdBy === currentUser.name ||
    record.createdById === currentUser.id ||
    record.assignedTo === currentUser.name ||
    record.assignedToId === currentUser.id ||
    record.staffId === currentUser.id ||
    record.staffName?.toLowerCase() === currentUser.name.toLowerCase() ||
    record.email?.toLowerCase() === currentUser.email.toLowerCase() ||
    record.name?.toLowerCase() === currentUser.name.toLowerCase() ||
    record.id === currentUser.id
  );
}

/**
 * Checks if user can approve/reject records in a module
 */
export function canApproveRecord(
  moduleKey: string,
  currentUser: RBACUser,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser.role === "Super Admin";
  if (isSuperAdmin) return true;

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
  currentUser: RBACUser,
  currentRole: string,
  hasPermission: (moduleKey: string, action: string) => boolean
): boolean {
  const isSuperAdmin = currentRole === "Super Admin" || currentUser.role === "Super Admin";
  if (isSuperAdmin) return true;

  const isCompanyAdmin = currentRole === "Company Admin" || currentUser.role === "Company Admin";
  if (isCompanyAdmin) return true;

  return hasPermission(moduleKey, "export") || hasPermission(moduleKey, "print") || hasPermission(moduleKey, "viewAll");
}
