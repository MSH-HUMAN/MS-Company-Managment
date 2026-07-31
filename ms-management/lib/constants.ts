export const NATIONALITIES = [
  { name: "UAE", flag: "🇦🇪" },
  { name: "India", flag: "🇮🇳" },
  { name: "Pakistan", flag: "🇵🇰" },
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Bangladesh", flag: "🇧🇩" },
  { name: "Sri Lanka", flag: "🇱🇰" },
  { name: "Egypt", flag: "🇪🇬" },
  { name: "Jordan", flag: "🇯🇴" },
  { name: "Kenya", flag: "🇰🇪" },
  { name: "Ethiopia", flag: "🇪🇹" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "Nepal", flag: "🇳🇵" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Nigeria", flag: "🇳🇬" }
];

export const MEETING_MODES = [
  "Zoom",
  "Google Meet",
  "Microsoft Teams",
  "WhatsApp",
  "Phone call"
];

export const MODULE_STATUS_OPTIONS = {
  applicants: ["Pending", "Screening", "Processing", "Offered", "Visa Processing", "Placed", "Rejected", "Returned"],
  staff: ["Active", "Inactive", "Suspended"],
  tasks: ["Pending", "Processing", "Completed", "Incomplete", "Reassigned", "Cancelled"],
  leave: ["Pending", "Processing", "Approved", "Rejected"],
  requests: ["Pending", "Processing", "Approved", "Rejected", "Returned"],
  vehicles: ["Available", "Assigned", "Maintenance", "Returned"],
  users: ["Active", "Disabled", "Suspended", "Pending"],
  companies: ["Active", "Inactive", "Suspended"],
  visaExpiry: ["Active", "Expiring Soon", "Expired"],
  interviews: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
  documents: [],
  attendance: ["Present", "Absent", "Late", "Leave"],
  payroll: ["Draft", "Pending Approval", "Approved", "Paid"],
  notifications: ["Read", "Unread"],
  activityLog: ["Created", "Edited", "Deleted", "Login", "Logout"]
};

export const MODULES_LIST = [
  { key: "applicants", label: "Applicants", path: "/applicants" },
  { key: "staff", label: "Staff", path: "/staff" },
  { key: "companies", label: "Companies", path: "/companies" },
  { key: "branches", label: "Branches", path: "/branches" },
  { key: "users", label: "Users", path: "/users" },
  { key: "roles", label: "Roles & Permissions", path: "/roles" },
  { key: "tasks", label: "Tasks", path: "/tasks" },
  { key: "interviews", label: "Interviews & Meetings", path: "/interviews" },
  { key: "leave", label: "Leave Requests", path: "/leave" },
  { key: "requests", label: "Staff Requests", path: "/requests" },
  { key: "vehicles", label: "Vehicles", path: "/vehicles" },
  { key: "documents", label: "Documents", path: "/documents" },
  { key: "suppliers", label: "Suppliers", path: "/suppliers" },
  { key: "placement", label: "Placement Agreements", path: "/placement" },
  { key: "members", label: "Members", path: "/members" },
  { key: "visaExpiry", label: "Visa Expiry", path: "/visa-expiry" },
  { key: "birthday", label: "Staff Birthdays", path: "/birthday" },
  { key: "attendance", label: "Attendance", path: "/attendance" },
  { key: "payroll", label: "Payroll", path: "/payroll" },
  { key: "notifications", label: "Notifications", path: "/notifications" },
  { key: "activityLog", label: "Activity Log", path: "/activity-log" },
  { key: "settings", label: "Site Settings", path: "/settings" },
  { key: "tracking", label: "Applicant Tracking", path: "/tracking" },
  { key: "reports", label: "Dashboard & Reports", path: "/reports" }
];

export const MODULE_PERMISSION_MAP: Record<string, string> = {
  applicants: "Applicants",
  staff: "Staff",
  companies: "Companies",
  branches: "Branches",
  users: "Users",
  roles: "Roles",
  tasks: "Tasks",
  documents: "Documents",
  attendance: "Attendance",
  payroll: "Payroll",
  notifications: "Notifications",
  activitylog: "Activity Log",
  activityLog: "Activity Log",
  placement: "Placement",
  members: "Members",
  suppliers: "Suppliers",
  visaexpiry: "Visa Expiry",
  visaExpiry: "Visa Expiry",
  birthday: "Staff Birthdays",
  leave: "Leave Requests",
  requests: "Staff Requests",
  interviews: "Interviews",
  reports: "Reports",
  settings: "Site Settings",
  tracking: "Applicant Tracking",
  vehicles: "Vehicles",
  emails: "Email Center"
};

export const getPermissionModuleName = (moduleKey: string): string | undefined =>
  MODULE_PERMISSION_MAP[moduleKey] ?? MODULE_PERMISSION_MAP[moduleKey.toLowerCase()];

export const SYSTEM_ROLES = [
  "Super Admin",
  "Company Admin",
  "Branch Admin",
  "HR Manager",
  "Recruiter",
  "Accountant",
  "Secretary",
  "PRO",
  "Sales Executive",
  "Vehicle Coordinator",
  "Task Manager",
  "Data Entry",
  "Staff",
  "Read Only User"
];

export const DEFAULT_FILTER_STATE = {
  search: "",
  mobileSearch: "",
  whatsappSearch: "",
  emailSearch: "",
  status: "all",
  company: "all",
  branch: "all",
  nationality: "all",
  createdBy: "all",
  assignedTo: "all",
  fromDate: "",
  toDate: "",
  sortBy: "newest",
  sortOrder: "desc" as const,
  page: 1,
  pageSize: 10
};
