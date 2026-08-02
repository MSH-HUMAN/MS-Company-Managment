import { create } from "zustand";
import { User, Applicant, Staff, Company, InternalCompany, Branch, Task, Interview, LeaveRequest, StaffRequest, Vehicle, Supplier, Placement, Notification, ActivityLog, PayrollRecord, Role, PasswordResetRequest, StaffAttendance, SiteSettings, Shift, OvertimeRequest, AttendanceCorrection, SentEmail, SentWhatsApp, PayrollRules } from "../lib/types";
import { getPermissionModuleName } from "../lib/constants";
import { applyThemeCssVars } from "../lib/applyTheme";

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User;
  currentRole: string;
  roles: Role[];
  passwordResetRequests: PasswordResetRequest[];
  getCurrentRole: () => Role | undefined;
  hasPermission: (moduleKey: string, action: string) => boolean;
  applicants: Applicant[];
  staff: Staff[];
  companies: Company[];
  ownCompanies: InternalCompany[];
  branches: Branch[];
  users: User[];
  tasks: Task[];
  interviews: Interview[];
  leaveRequests: LeaveRequest[];
  staffRequests: StaffRequest[];
  vehicles: Vehicle[];
  suppliers: Supplier[];
  placements: Placement[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  payroll: PayrollRecord[];
  staffAttendance: StaffAttendance[];
  shifts: Shift[];
  overtimeRequests: OvertimeRequest[];
  attendanceCorrections: AttendanceCorrection[];
  isStoreLoaded: boolean;
  isStoreLoading: boolean;
  
  setCurrentUser: (user: User) => void;
  logout: () => Promise<void>;
  setRole: (role: string) => void;
  
  checkSession: () => Promise<boolean>;
  initStore: (force?: boolean) => Promise<void>;
  
  // Database CRUD Actions
  addApplicant: (app: Applicant) => Promise<void>;
  updateApplicant: (app: Applicant) => Promise<void>;
  deleteApplicant: (id: string) => Promise<void>;
  
  addStaff: (stf: Staff) => Promise<void>;
  updateStaff: (stf: Staff) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  
  addCompany: (comp: Company) => Promise<void>;
  updateCompany: (comp: Company) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  
  addOwnCompany: (comp: InternalCompany) => Promise<void>;
  updateOwnCompany: (comp: InternalCompany) => Promise<void>;
  deleteOwnCompany: (id: string) => Promise<void>;
  
  addBranch: (branch: Branch) => Promise<void>;
  updateBranch: (branch: Branch) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addPasswordResetRequest: (request: PasswordResetRequest) => Promise<void>;

  addRole: (role: Role) => Promise<void>;
  updateRole: (role: Role) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  
  addTask: (task: Task) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  addInterview: (int: Interview) => Promise<void>;
  updateInterview: (int: Interview) => Promise<void>;
  deleteInterview: (id: string) => Promise<void>;
  
  addLeaveRequest: (req: LeaveRequest) => Promise<void>;
  updateLeaveRequest: (req: LeaveRequest) => Promise<void>;
  deleteLeaveRequest: (id: string) => Promise<void>;
  
  addStaffRequest: (req: StaffRequest) => Promise<void>;
  updateStaffRequest: (req: StaffRequest) => Promise<void>;
  deleteStaffRequest: (id: string) => Promise<void>;
  
  addVehicle: (veh: Vehicle) => Promise<void>;
  updateVehicle: (veh: Vehicle) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;

  addSupplier: (sup: Supplier) => Promise<void>;
  updateSupplier: (sup: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  addPlacement: (plc: Placement) => Promise<void>;
  updatePlacement: (plc: Placement) => Promise<void>;
  deletePlacement: (id: string) => Promise<void>;
  
  addNotification: (notif: Notification) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  addActivityLog: (log: ActivityLog) => Promise<void>;
  clearActivityLogs: () => void;
  restoreActivityLogs: () => void;
  archivedActivityLogs: ActivityLog[];
  deleteArchivedLog: (id: string) => void;
  
  updatePayroll: (pay: PayrollRecord) => Promise<void>;
  addPayroll: (pay: PayrollRecord) => Promise<void>;
  saveAttendance: (record: StaffAttendance) => Promise<void>;
  siteSettings: SiteSettings;
  updateSiteSettings: (settings: SiteSettings) => Promise<void>;

  addShift: (shift: Shift) => Promise<void>;
  updateShift: (shift: Shift) => Promise<void>;
  deleteShift: (id: string) => Promise<void>;

  addOvertimeRequest: (req: OvertimeRequest) => Promise<void>;
  updateOvertimeRequest: (req: OvertimeRequest) => Promise<void>;
  deleteOvertimeRequest: (id: string) => Promise<void>;

  addAttendanceCorrection: (req: AttendanceCorrection) => Promise<void>;
  updateAttendanceCorrection: (req: AttendanceCorrection) => Promise<void>;
  deleteAttendanceCorrection: (id: string) => Promise<void>;

  salarySetups: { staffId: string; basic: number; housing: number; transport: number }[];
  updateSalarySetup: (setup: { staffId: string; basic: number; housing: number; transport: number }) => void;

  sentEmails: SentEmail[];
  sentWhatsApp: SentWhatsApp[];
  whatsappEnabled: boolean;
  addSentEmail: (email: SentEmail) => void;
  addSentWhatsApp: (wa: SentWhatsApp) => void;
  toggleWhatsApp: () => void;
  payrollRules: PayrollRules;
  updatePayrollRules: (rules: PayrollRules) => void;
}

const DEFAULT_USER: User = {
  id: "",
  name: "Guest",
  email: "",
  mobile: "",
  whatsapp: "",
  role: "Staff",
  company: "System",
  branch: "All",
  status: "Pending",
  lastLogin: "",
  photo: null,
  createdAt: "",
  theme: "system"
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: "SETTINGS",
  siteName: "MS Horizon F.Z.E",
  email: "info@mshorizon.ae",
  phone: "+971 4 123 4567",
  whatsapp: "+971 50 123 4567",
  address: "Office 101, Business Bay, Dubai, UAE",
  footerText: "© 2026 MS Horizon F.Z.E. All Rights Reserved.",
  primaryColor: "#3B82F6",
  sidebarColor: "#0A0F1C",
  linkedin: null,
  twitter: null,
  facebook: null,
  instagram: null,
  logo: null,
  website: "www.mshorizon.ae",
  fontFamily: "Inter",
  backgroundColor: "#f8fafc",
  cardColor: "#ffffff",
  textColor: "#0f172a",
  borderColor: "#e2e8f0",
  buttonColor: "#3b82f6",
  headerColor: "#ffffff",
  placementTerms: "1. Registration Process: The Candidate shall register with the Consultancy by providing complete and accurate documents, including passport copy, visa copies, and education credentials.\n2. Placement Timeline: The placement process will proceed according to candidate profile matching and client selection pipelines, typically concluding within 90 days from the registration date.\n3. Candidate Responsibilities: The Candidate is responsible for attending all scheduled interviews, providing correct documents, and undergoing mandatory medical tests as required by MoHRE.\n4. Consultancy Responsibilities: The Consultancy will guide the candidate through active job applications, coordinate interview schedules, and facilitate employment visa processing steps.\n5. Placement Service Fee Terms: All service fees are subject to 5% VAT under UAE Tax Law. Fees must be settled according to the schedules defined in the payment details.\n6. Payment Schedule: Payment must be settled in two parts: Registration Fee due upon registration, and Placement Fee due upon signing the placement agreement or job offer.\n7. Registration Fee Refund Policy: The registration fee is a processing fee and is non-refundable once administrative files are processed or candidate profiles are sent to employers.\n8. Placement Fee Refund Policy: Placement fees are eligible for refund only if the Placed Company fails to issue the entry permit or work visa within the agreed timeline.\n9. Cancellation Policy: If the Candidate cancels the registration after job matching begins, any paid fees shall be forfeited to cover administrative costs.\n10. Replacement Policy: If the Candidate resigns or is terminated within the 90-day probation period, the Consultancy will provide a one-time replacement candidate at no extra fee.\n11. Employer Related Issues: The Consultancy is not liable for changes in company policies, salary adjustments, or termination actions initiated by the Placed Company.\n12. Visa Processing Terms: Visa processing is subject to approvals from the UAE Ministry of Human Resources and Emiratisation (MoHRE) and the Federal Authority for Identity and Citizenship (ICP).\n13. Confidentiality: Both parties agree to maintain strict confidentiality regarding client business secrets, candidate personal files, and employment terms.\n14. Data Privacy: Candidate personal data will be processed and shared with prospective employers solely for recruitment and placement purposes under UAE Data Protection Law.\n15. Compliance with UAE Labour Laws: This agreement and the subsequent employment relations shall comply with UAE Federal Decree-Law No. 33 of 2021 regarding the Regulation of Labour Relations.\n16. Dispute Resolution: Any disputes arising out of this agreement shall be settled amicably through mediation, failing which they shall be referred to the competent UAE courts.\n17. Governing Law: This Agreement shall be governed by and construed in accordance with the laws of the United Arab Emirates as applied in the Emirate of Dubai.\n18. Agreement Acceptance: By signing this agreement digitally, both parties confirm they have read, understood, and agreed to all 18 clauses without any reservation.",
  refundPolicy: "Registration and service fees are non-refundable once visa processing has been initiated by the Placed Company or in case of candidates presenting falsified documents.",
  replacementPolicy: "If the placed candidate resigns or is terminated within the probation period (up to 90 days), the Consultancy shall provide a one-time replacement candidate at no extra cost.",
  candidateDeclaration: "I hereby declare that I accept the offer of employment and the terms set out in this Agreement. I verify that the passport information, address, and credentials provided are correct. I agree to abide by the labour regulations of the United Arab Emirates.",
  consultancyDeclaration: "We declare that we will act as the authorized placement agent, coordinating the scheduling, interview processing, and document management in compliance with MoHRE policies and UAE Federal Labour Laws.",
  companyLicense: "2013854/FZE",
  companyWebsite: "www.mshorizon.ae",
  printFooter: "MS Horizon F.Z.E - Recruitment Consultancy Placement Agreement"
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  currentUser: DEFAULT_USER,
  currentRole: DEFAULT_USER.role,
  
  // Dynamic arrays initialized empty (mock data erased)
  applicants: [],
  staff: [],
  companies: [],
  ownCompanies: [],
  branches: [],
  users: [],
  roles: [],
  tasks: [],
  interviews: [],
  leaveRequests: [],
  staffRequests: [],
  vehicles: [],
  suppliers: [],
  placements: [],
  notifications: [],
  activityLogs: [],
  archivedActivityLogs: [],
  payroll: [],
  staffAttendance: [],
  shifts: [],
  overtimeRequests: [],
  attendanceCorrections: [],
  isStoreLoaded: false,
  isStoreLoading: false,
  passwordResetRequests: [],
  siteSettings: DEFAULT_SITE_SETTINGS,
  salarySetups: [],
  
  sentEmails: [],
  sentWhatsApp: [],
  whatsappEnabled: false,
  
  payrollRules: {
    deductAbsences: true,
    absenceMultiplier: 1.0,
    deductHalfDays: true,
    halfDayMultiplier: 0.5,
    leaveDeductionRule: "unpaid",
    leaveMultiplier: 1.0,
    overtimeHourlyRate: 25,
    overtimeMultiplier: 1.25,
  },

  setCurrentUser: (user) => set({ isAuthenticated: true, currentUser: user, currentRole: user.role }),
  
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout API call failed:", e);
    }
    set({
      isAuthenticated: false,
      currentRole: DEFAULT_USER.role,
      currentUser: DEFAULT_USER,
      isStoreLoaded: false,
      isStoreLoading: false,
      applicants: [],
      staff: [],
      companies: [],
      ownCompanies: [],
      branches: [],
      users: [],
      roles: [],
      tasks: [],
      interviews: [],
      leaveRequests: [],
      staffRequests: [],
      vehicles: [],
      suppliers: [],
      placements: [],
      notifications: [],
      activityLogs: [],
      payroll: [],
      staffAttendance: [],
      shifts: [],
      overtimeRequests: [],
      attendanceCorrections: []
    });
  },

  setRole: (role) => set({ currentRole: role }),

  checkSession: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          set({
            isAuthenticated: true,
            currentUser: data.user,
            currentRole: data.user.role
          });
          // Initialize stores for this authenticated user in the background (non-blocking)
          get().initStore().catch(console.error);
          return true;
        }
      }
    } catch (e) {
      console.error("checkSession failed:", e);
    }
    set({ isAuthenticated: false, currentUser: DEFAULT_USER, currentRole: DEFAULT_USER.role });
    return false;
  },
  initStore: async (force = false) => {
    if (get().isStoreLoading) return;
    if (get().isStoreLoaded && !force) return;

    set({ isStoreLoading: true });
    try {
      const t = Date.now();
      const res = await fetch(`/api/bootstrap?t=${t}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Bootstrap request failed");
      }
      const {
        companies, ownCompanies, users, branches, roles, staff, applicants, tasks,
        attendance, requests, payroll, interviews, vehicles, suppliers,
        placements, notifications, logs, archivedLogs, settings, shifts, overtime, corrections,
        emails, whatsapp, leaves
      } = await res.json();

      const mappedShifts = (shifts || []).map((s: any) => ({
        ...s,
        startTime: s.clockIn || "",
        endTime: s.clockOut || "",
        assignedEmployees: (staff || []).filter((st: any) => st.shiftId === s.id).map((st: any) => st.name)
      }));

      const salarySetups = (staff || []).map((s: any) => ({
        staffId: s.id,
        basic: s.basicSalary ?? 3000,
        housing: s.housingAllowance ?? 1000,
        transport: s.transportAllowance ?? 500
      }));

      set({
        companies,
        ownCompanies,
        users,
        branches,
        roles,
        staff,
        applicants,
        tasks: (tasks || []).map((t: any) => ({
          ...t,
          deadline: t.deadline || t.dueDate || "",
          assignedDate: t.assignedDate || "",
          history: Array.isArray(t.history) ? t.history : (t.history ? JSON.parse(JSON.stringify(t.history)) : []),
        })),
        staffAttendance: attendance,
        staffRequests: requests,
        payroll,
        interviews,
        vehicles,
        suppliers,
        placements,
        notifications: notifications.map((n: any) => ({
          ...n,
          time: n.time || n.createdAt || new Date().toISOString()
        })),
        activityLogs: logs,
        archivedActivityLogs: archivedLogs,
        shifts: mappedShifts,
        overtimeRequests: overtime,
        attendanceCorrections: corrections,
        sentEmails: emails,
        sentWhatsApp: whatsapp,
        leaveRequests: leaves,
        siteSettings: settings || get().siteSettings,
        salarySetups,
        isStoreLoaded: true,
        isStoreLoading: false
      });
      // Apply theme CSS variables immediately after store load
      if (settings) {
        applyThemeCssVars(settings);
      }
    } catch (e) {
      set({ isStoreLoading: false, isStoreLoaded: true });
      console.error("initStore failed:", e);
    }
  },



  getCurrentRole: (): Role | undefined => {
    const roles = get().roles;
    const currentRole = get().currentRole;
    return roles.find((role: Role) => role.name === currentRole);
  },

  hasPermission: (moduleKey: string, action: string) => {
    const state = get();

    // 0. User-specific custom permission overrides check
    const userPermissions = typeof state.currentUser?.permissions === 'string'
      ? (() => { try { return JSON.parse(state.currentUser.permissions); } catch { return null; } })()
      : state.currentUser?.permissions;

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

    // 1. Company Module Toggle check for non-Super Admin
    if (state.currentRole !== "Super Admin" && state.currentUser?.company) {
      const company = state.companies.find(c => c.name === state.currentUser.company);
      if (company && company.enabledModules) {
        const moduleNameMap: Record<string, string> = {
          applicants: "Applicants",
          staff: "Staff",
          tasks: "Tasks",
          interviews: "Interviews",
          leave: "Leave Requests",
          requests: "Staff Requests",
          vehicles: "Vehicles",
          documents: "Documents",
          attendance: "Attendance",
          payroll: "Payroll",
          placement: "Placement Agreements",
          suppliers: "Suppliers",
          members: "Members",
          visaExpiry: "Visa Expiry",
          birthday: "Staff Birthdays",
          reports: "Reports"
        };
        const mappedName = moduleNameMap[moduleKey];
        if (mappedName && company.enabledModules[mappedName] === false) {
          return false;
        }
      }
    }

    // 2. Load role permissions
    const role = state.roles.find((role: Role) => role.name === state.currentRole);
    const permissionModule = getPermissionModuleName(moduleKey);

    if (role && permissionModule) {
      const permissions = role.permissions ? (
        typeof role.permissions === 'string'
          ? (() => { try { return JSON.parse(role.permissions); } catch { return null; } })()
          : role.permissions
      ) : null;
      if (permissions && permissions[permissionModule]) {
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

    // 3. Fallback for Super Admin (Full system administration access)
    if (state.currentRole === "Super Admin") {
      return true;
    }

    return false;
  },
  
  // Applicants CRUD APIs
  addApplicant: async (app) => {
    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(app)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to register applicant");
    }
    const saved = await res.json();
    set((state) => ({ applicants: [saved, ...state.applicants] }));
    get().initStore(true).catch(console.error);
  },
  updateApplicant: async (app) => {
    const res = await fetch(`/api/applicants/${app.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(app)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update applicant");
    }
    const saved = await res.json();
    set((state) => ({
      applicants: state.applicants.map((a) => (a.id === saved.id ? saved : a))
    }));
    get().initStore(true).catch(console.error);
  },
  deleteApplicant: async (id) => {
    const res = await fetch(`/api/applicants/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ applicants: state.applicants.filter((a) => a.id !== id) }));
    }
  },
  
  // Staff CRUD APIs
  addStaff: async (stf) => {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stf)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to create staff member");
    }
    const saved = await res.json();
    set((state) => {
      const newStaff = [saved, ...state.staff];
      const newSalarySetups = newStaff.map((s: any) => ({
        staffId: s.id,
        basic: s.basicSalary ?? 3000,
        housing: s.housingAllowance ?? 1000,
        transport: s.transportAllowance ?? 500
      }));
      const newShifts = state.shifts.map((s: any) => ({
        ...s,
        assignedEmployees: newStaff.filter((st: any) => st.shiftId === s.id).map((st: any) => st.name)
      }));
      return {
        staff: newStaff,
        salarySetups: newSalarySetups,
        shifts: newShifts
      };
    });
  },
  updateStaff: async (stf) => {
    const res = await fetch(`/api/staff/${stf.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stf)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update staff member");
    }
    const saved = await res.json();
    set((state) => {
      const newStaff = state.staff.map((s) => (s.id === saved.id ? saved : s));
      const newSalarySetups = newStaff.map((s: any) => ({
        staffId: s.id,
        basic: s.basicSalary ?? 3000,
        housing: s.housingAllowance ?? 1000,
        transport: s.transportAllowance ?? 500
      }));
      const newShifts = state.shifts.map((s: any) => ({
        ...s,
        assignedEmployees: newStaff.filter((st: any) => st.shiftId === s.id).map((st: any) => st.name)
      }));
      return {
        staff: newStaff,
        salarySetups: newSalarySetups,
        shifts: newShifts
      };
    });
  },
  deleteStaff: async (id) => {
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => {
        const newStaff = state.staff.filter((s) => s.id !== id);
        const newSalarySetups = newStaff.map((s: any) => ({
          staffId: s.id,
          basic: s.basicSalary ?? 3000,
          housing: s.housingAllowance ?? 1000,
          transport: s.transportAllowance ?? 500
        }));
        const newShifts = state.shifts.map((s: any) => ({
          ...s,
          assignedEmployees: newStaff.filter((st: any) => st.shiftId === s.id).map((st: any) => st.name)
        }));
        return {
          staff: newStaff,
          salarySetups: newSalarySetups,
          shifts: newShifts
        };
      });
    }
  },
  
  // Companies CRUD APIs
  addCompany: async (comp) => {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comp)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ companies: [saved, ...state.companies] }));
    }
  },
  updateCompany: async (comp) => {
    const res = await fetch(`/api/companies/${comp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comp)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        companies: state.companies.map((c) => (c.id === saved.id ? saved : c))
      }));
    }
  },
  deleteCompany: async (id) => {
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ companies: state.companies.filter((c) => c.id !== id) }));
    }
  },
  
  // Own Companies CRUD APIs
  addOwnCompany: async (comp) => {
    const res = await fetch("/api/own-companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comp)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ ownCompanies: [saved, ...state.ownCompanies] }));
    }
  },
  updateOwnCompany: async (comp) => {
    const res = await fetch(`/api/own-companies/${comp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comp)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        ownCompanies: state.ownCompanies.map((c) => (c.id === saved.id ? saved : c))
      }));
    }
  },
  deleteOwnCompany: async (id) => {
    const res = await fetch(`/api/own-companies/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ ownCompanies: state.ownCompanies.filter((c) => c.id !== id) }));
    }
  },
  
  // Branches CRUD APIs
  addBranch: async (branch) => {
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branch)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ branches: [saved, ...state.branches] }));
    }
  },
  updateBranch: async (branch) => {
    const res = await fetch(`/api/branches/${branch.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branch)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        branches: state.branches.map((b) => (b.id === saved.id ? saved : b))
      }));
    }
  },
  deleteBranch: async (id) => {
    const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ branches: state.branches.filter((b) => b.id !== id) }));
    }
  },
  
  // Users CRUD APIs
  addUser: async (usr) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usr)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to create user");
    }
    const saved = await res.json();
    set((state) => ({ users: [saved, ...state.users] }));
  },
  updateUser: async (usr) => {
    const res = await fetch(`/api/users/${usr.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usr)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update user");
    }
    const saved = await res.json();
    set((state) => ({
      users: state.users.map((u) => (u.id === saved.id ? saved : u))
    }));
  },
  deleteUser: async (id) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
    }
  },
  
  addPasswordResetRequest: async (request) => {
    set((state) => ({ passwordResetRequests: [request, ...state.passwordResetRequests] }));
    
    // Trigger real email send via SMTP API
    try {
      await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: request.email,
          subject: "Password Reset Notification",
          body: `Hello,\n\nA password reset request was triggered for your account by administrator ${request.requestedBy}.\n\nTimestamp: ${request.requestedAt}\nNote: ${request.note || 'None'}\n\nPlease contact your system administrator to retrieve or update your login credentials.`,
          candidateName: "System",
          company: "System",
          branch: "Main"
        })
      });
    } catch (e) {
      console.error("Failed to send password reset email:", e);
    }
  },

  // Roles CRUD APIs
  addRole: async (role) => {
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(role)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ roles: [saved, ...state.roles] }));
    }
  },
  updateRole: async (role) => {
    const res = await fetch(`/api/roles/${role.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(role)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        roles: state.roles.map((r) => (r.id === saved.id ? saved : r))
      }));
    }
  },
  deleteRole: async (id) => {
    const res = await fetch(`/api/roles/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ roles: state.roles.filter((r) => r.id !== id) }));
    }
  },
  
  // Tasks CRUD APIs
  addTask: async (task) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task)
    });
    if (res.ok) {
      const saved = await res.json();
      const normalized = {
        ...saved,
        deadline: saved.deadline || saved.dueDate || "",
        assignedDate: saved.assignedDate || "",
        history: Array.isArray(saved.history) ? saved.history : (saved.history ? JSON.parse(JSON.stringify(saved.history)) : []),
      };
      set((state) => ({ tasks: [normalized, ...state.tasks] }));
    }
  },
  updateTask: async (task) => {
    // Optimistic update — update store immediately so UI responds instantly
    const previous = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t))
    }));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task)
      });
      if (res.ok) {
        const saved = await res.json();
        // Replace optimistic entry with server-confirmed data
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === saved.id ? saved : t))
        }));
      } else {
        // Rollback on failure
        set({ tasks: previous });
        console.error("updateTask failed:", await res.text());
      }
    } catch (err) {
      // Rollback on network error
      set({ tasks: previous });
      console.error("updateTask network error:", err);
    }
  },
  deleteTask: async (id) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
  },
  
  // Interviews CRUD APIs
  addInterview: async (int) => {
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(int)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => {
        let updatedApplicants = state.applicants;
        if (saved.applicantId) {
          updatedApplicants = state.applicants.map((a) => {
            if (a.id === saved.applicantId) {
              const newHistoryItem = {
                oldStatus: a.status,
                newStatus: "Interview Scheduled",
                changedBy: state.currentUser.name || "System",
                date: new Date().toISOString().replace('T', ' ').slice(0, 19),
                reason: `Interview scheduled on ${saved.dateTime.replace("T", " ")} (${saved.type})`
              };
              return {
                ...a,
                status: "Interview Scheduled" as any,
                statusHistory: [newHistoryItem, ...(a.statusHistory || [])]
              };
            }
            return a;
          });
        }
        return {
          interviews: [saved, ...state.interviews],
          applicants: updatedApplicants
        };
      });
    }
  },
  updateInterview: async (int) => {
    const res = await fetch(`/api/interviews/${int.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(int)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => {
        let updatedApplicants = state.applicants;
        if (saved.applicantId) {
          const oldInt = state.interviews.find(i => i.id === saved.id);
          const statusChanged = oldInt && oldInt.status !== saved.status;
          const dateTimeChanged = oldInt && oldInt.dateTime !== saved.dateTime;
          
          if (statusChanged || dateTimeChanged) {
            updatedApplicants = state.applicants.map((a) => {
              if (a.id === saved.applicantId) {
                let targetStatus = a.status;
                let reason = "";

                if (saved.status === "Cancelled") {
                  targetStatus = "Pending";
                  reason = `Interview cancelled.`;
                } else if (saved.status === "Completed") {
                  targetStatus = "Selected";
                  reason = `Interview marked as completed successfully.`;
                } else if (saved.status === "Rescheduled" || dateTimeChanged) {
                  targetStatus = "Interview Scheduled";
                  reason = `Interview rescheduled to ${saved.dateTime.replace("T", " ")}`;
                }

                if (targetStatus !== a.status) {
                  const newHistoryItem = {
                    oldStatus: a.status,
                    newStatus: targetStatus,
                    changedBy: state.currentUser.name || "System",
                    date: new Date().toISOString().replace('T', ' ').slice(0, 19),
                    reason
                  };
                  return {
                    ...a,
                    status: targetStatus as any,
                    statusHistory: [newHistoryItem, ...(a.statusHistory || [])]
                  };
                }
              }
              return a;
            });
          }
        }
        return {
          interviews: state.interviews.map((i) => (i.id === saved.id ? saved : i)),
          applicants: updatedApplicants
        };
      });
    }
  },
  deleteInterview: async (id) => {
    const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ interviews: state.interviews.filter((i) => i.id !== id) }));
    }
  },
  
  // Leave Requests CRUD APIs
  addLeaveRequest: async (req) => {
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ leaveRequests: [saved, ...state.leaveRequests] }));
    }
  },
  updateLeaveRequest: async (req) => {
    const res = await fetch(`/api/leave/${req.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        leaveRequests: state.leaveRequests.map((r) => (r.id === saved.id ? saved : r))
      }));
      try {
        const attRes = await fetch("/api/attendance");
        if (attRes.ok) {
          const attendance = await attRes.json();
          set({ staffAttendance: attendance });
        }
      } catch (err) {
        console.error("Failed to re-fetch attendance after leave approval:", err);
      }
    }
  },
  deleteLeaveRequest: async (id) => {
    const res = await fetch(`/api/leave/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ leaveRequests: state.leaveRequests.filter((r) => r.id !== id) }));
    }
  },
  
  // Staff Requests CRUD APIs
  addStaffRequest: async (req) => {
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ staffRequests: [saved, ...state.staffRequests] }));
    }
  },
  updateStaffRequest: async (req) => {
    const res = await fetch(`/api/requests/${req.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        staffRequests: state.staffRequests.map((r) => (r.id === saved.id ? saved : r))
      }));
    }
  },
  deleteStaffRequest: async (id) => {
    const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ staffRequests: state.staffRequests.filter((r) => r.id !== id) }));
    }
  },
  
  // Vehicles CRUD APIs
  addVehicle: async (veh) => {
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veh)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ vehicles: [saved, ...state.vehicles] }));
    }
  },
  updateVehicle: async (veh) => {
    const res = await fetch(`/api/vehicles/${veh.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(veh)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        vehicles: state.vehicles.map((v) => (v.id === saved.id ? saved : v))
      }));
    }
  },
  deleteVehicle: async (id) => {
    const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) }));
    }
  },

  // Suppliers CRUD APIs
  addSupplier: async (sup) => {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sup)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ suppliers: [saved, ...state.suppliers] }));
    }
  },
  updateSupplier: async (sup) => {
    const res = await fetch(`/api/suppliers/${sup.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sup)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === saved.id ? saved : s))
      }));
    }
  },
  deleteSupplier: async (id) => {
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) }));
    }
  },

  // Placements CRUD APIs
  addPlacement: async (plc) => {
    const res = await fetch("/api/placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plc)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => {
        let updatedApplicants = state.applicants;
        if (saved.status === "Placed" && saved.applicantId) {
          updatedApplicants = state.applicants.map(a => {
            if (a.id === saved.applicantId) {
              const newHistoryItem = {
                oldStatus: a.status,
                newStatus: "Placed",
                changedBy: state.currentUser.name || "System",
                date: new Date().toISOString().replace('T', ' ').slice(0, 19),
                reason: `Placed with company: ${saved.companyName} on ${saved.placementDate}`
              };
              return {
                ...a,
                status: "Placed" as any,
                clientName: saved.companyName,
                statusHistory: [newHistoryItem, ...(a.statusHistory || [])]
              };
            }
            return a;
          });
        }
        return {
          placements: [saved, ...state.placements],
          applicants: updatedApplicants
        };
      });
    }
  },
  updatePlacement: async (plc) => {
    const res = await fetch(`/api/placement/${plc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plc)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => {
        let updatedApplicants = state.applicants;
        const oldPlc = state.placements.find(p => p.id === saved.id);
        const wasPlaced = oldPlc && oldPlc.status === "Placed";
        const isPlacedNow = saved.status === "Placed";
        
        if (isPlacedNow && !wasPlaced && saved.applicantId) {
          updatedApplicants = state.applicants.map(a => {
            if (a.id === saved.applicantId) {
              const newHistoryItem = {
                oldStatus: a.status,
                newStatus: "Placed",
                changedBy: state.currentUser.name || "System",
                date: new Date().toISOString().replace('T', ' ').slice(0, 19),
                reason: `Placed with company: ${saved.companyName} on ${saved.placementDate}`
              };
              return {
                ...a,
                status: "Placed" as any,
                clientName: saved.companyName,
                statusHistory: [newHistoryItem, ...(a.statusHistory || [])]
              };
            }
            return a;
          });
        }
        return {
          placements: state.placements.map((p) => (p.id === saved.id ? saved : p)),
          applicants: updatedApplicants
        };
      });
    }
  },
  deletePlacement: async (id) => {
    const res = await fetch(`/api/placement/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ placements: state.placements.filter((p) => p.id !== id) }));
    }
  },
  
  // Notifications CRUD APIs
  addNotification: async (notif) => {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notif)
    });
    if (res.ok) {
      const saved = await res.json();
      const mapped = {
        ...saved,
        time: saved.time || saved.createdAt || new Date().toISOString()
      };
      set((state) => ({ notifications: [mapped, ...state.notifications] }));
    }
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true })
    });
    if (res.ok) {
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      }));
    }
  },
  markAllNotificationsRead: async () => {
    // Optimistic local update, then update in background
    const notifications = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
    await Promise.all(
      notifications.filter(n => !n.read).map(n => 
        fetch(`/api/notifications/${n.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true })
        })
      )
    );
  },
  
  // Activity Auditing
  addActivityLog: async (log) => {
    const res = await fetch("/api/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ activityLogs: [saved, ...state.activityLogs] }));
    }
  },
  clearActivityLogs: async () => {
    const res = await fetch("/api/activity-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" })
    });
    if (res.ok) {
      const [logs, archived] = await Promise.all([
        fetch("/api/activity-log").then(r => r.ok ? r.json() : []),
        fetch("/api/activity-log?archived=true").then(r => r.ok ? r.json() : [])
      ]);
      set({ activityLogs: logs, archivedActivityLogs: archived });
    }
  },
  restoreActivityLogs: async () => {
    const res = await fetch("/api/activity-log", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" })
    });
    if (res.ok) {
      const [logs, archived] = await Promise.all([
        fetch("/api/activity-log").then(r => r.ok ? r.json() : []),
        fetch("/api/activity-log?archived=true").then(r => r.ok ? r.json() : [])
      ]);
      set({ activityLogs: logs, archivedActivityLogs: archived });
    }
  },
  deleteArchivedLog: async (id) => {
    const res = await fetch(`/api/activity-log/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      set((state) => ({
        archivedActivityLogs: state.archivedActivityLogs.filter((l) => l.id !== id)
      }));
    }
  },
  
  // Payroll CRUD APIs
  addPayroll: async (pay) => {
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pay)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ payroll: [saved, ...state.payroll] }));
    }
  },
  updatePayroll: async (pay) => {
    const res = await fetch(`/api/payroll/${pay.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pay)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({
        payroll: state.payroll.map((p) => (p.id === saved.id ? saved : p))
      }));
    }
  },
  
  // Attendance Logging
  saveAttendance: async (record) => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to save attendance");
    }
    const saved = await res.json();
    set((state) => {
      const existing = state.staffAttendance.findIndex(
        (a) => a.staffId === saved.staffId && a.month === saved.month && a.year === saved.year
      );
      if (existing >= 0) {
        const updated = [...state.staffAttendance];
        updated[existing] = saved;
        return { staffAttendance: updated };
      }
      return { staffAttendance: [...state.staffAttendance, saved] };
    });
  },
  
  // Site Settings PUT API
  updateSiteSettings: async (settings) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      const saved = await res.json();
      set({ siteSettings: saved });
      // Apply theme CSS variables immediately so the UI updates without a
      // page refresh. Works on desktop, Android Chrome, and Safari iOS.
      applyThemeCssVars(saved);
    }
  },

  // Shifts CRUD APIs
  addShift: async (shift) => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shift)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to create shift");
    }
    const saved = await res.json();
    const mapped = {
      ...saved,
      startTime: saved.clockIn || "",
      endTime: saved.clockOut || "",
      assignedEmployees: (get().staff || []).filter((st: any) => st.shiftId === saved.id).map((st: any) => st.name)
    };
    set((state) => ({ shifts: [mapped, ...state.shifts] }));
  },
  updateShift: async (shift) => {
    const res = await fetch(`/api/shifts/${shift.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shift)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update shift");
    }
    const saved = await res.json();
    const mapped = {
      ...saved,
      startTime: saved.clockIn || "",
      endTime: saved.clockOut || "",
      assignedEmployees: (get().staff || []).filter((st: any) => st.shiftId === saved.id).map((st: any) => st.name)
    };
    set((state) => ({ shifts: state.shifts.map(s => s.id === saved.id ? mapped : s) }));
  },
  deleteShift: async (id) => {
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ shifts: state.shifts.filter(s => s.id !== id) }));
    }
  },

  // Overtime CRUD APIs
  addOvertimeRequest: async (req) => {
    const res = await fetch("/api/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ overtimeRequests: [saved, ...state.overtimeRequests] }));
    }
  },
  updateOvertimeRequest: async (req) => {
    const res = await fetch(`/api/overtime/${req.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ overtimeRequests: state.overtimeRequests.map(r => r.id === saved.id ? saved : r) }));
    }
  },
  deleteOvertimeRequest: async (id) => {
    const res = await fetch(`/api/overtime/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ overtimeRequests: state.overtimeRequests.filter(r => r.id !== id) }));
    }
  },

  // Attendance Correction CRUD APIs
  addAttendanceCorrection: async (req) => {
    const res = await fetch("/api/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ attendanceCorrections: [saved, ...state.attendanceCorrections] }));
    }
  },
  updateAttendanceCorrection: async (req) => {
    const res = await fetch(`/api/corrections/${req.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ attendanceCorrections: state.attendanceCorrections.map(r => r.id === saved.id ? saved : r) }));
    }
  },
  deleteAttendanceCorrection: async (id) => {
    const res = await fetch(`/api/corrections/${id}`, { method: "DELETE" });
    if (res.ok) {
      set((state) => ({ attendanceCorrections: state.attendanceCorrections.filter(r => r.id !== id) }));
    }
  },

  updateSalarySetup: async (setup) => {
    const staffMember = get().staff.find(s => s.id === setup.staffId);
    if (!staffMember) return;
    const updatedStaff = {
      ...staffMember,
      basicSalary: setup.basic,
      housingAllowance: setup.housing,
      transportAllowance: setup.transport,
    };
    await get().updateStaff(updatedStaff);
  },
  addSentEmail: async (email) => {
    const res = await fetch("/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ sentEmails: [saved, ...state.sentEmails] }));
    }
  },
  addSentWhatsApp: async (wa) => {
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wa)
    });
    if (res.ok) {
      const saved = await res.json();
      set((state) => ({ sentWhatsApp: [saved, ...state.sentWhatsApp] }));
    }
  },
  toggleWhatsApp: () => {},
  updatePayrollRules: (rules) => {},
}));
