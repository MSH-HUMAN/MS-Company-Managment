"use client";

import { useState } from "react";
import { Plus, UserCheck, Shield, Mail, Phone, Trash2, Lock, Unlock, RefreshCw, Eye, History, ShieldAlert, Key, ClipboardList, User as UserIcon, Building2, GitBranch, Camera, CheckCircle2, XCircle, AlertCircle, Clock, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, getStatusColor, exportToCSV, cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AccessDenied from "@/components/shared/AccessDenied";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SYSTEM_ROLES } from "@/lib/constants";
import { User, EmailChangeRecord } from "@/lib/types";
import { toast } from "sonner";

// Login history is per-user (mocked shared data for demo)
const MOCK_LOGIN_HISTORY = [
  { date: "2026-06-04 12:05", ip: "192.168.1.110", status: "Success (Chrome/Windows)" },
  { date: "2026-06-04 09:44", ip: "192.168.1.110", status: "Success (Chrome/Windows)" },
  { date: "2026-06-03 15:30", ip: "185.220.101.44", status: "Failed (Incorrect Password)" },
  { date: "2026-06-03 11:12", ip: "192.168.1.102", status: "Success (Safari/MacBook)" },
  { date: "2026-06-02 08:15", ip: "192.168.1.102", status: "Success (Safari/MacBook)" },
];

export default function UsersPage() {
  const { currentRole, currentUser, users, ownCompanies, branches, addUser, updateUser, deleteUser, addActivityLog, hasPermission, passwordResetRequests, addPasswordResetRequest, activityLogs, shifts } = useAuthStore();
  const { filters } = useFilterStore();
  const canViewUsers = hasPermission("users", "view");
  const canCreateUsers = hasPermission("users", "create");
  const canEditUsers = hasPermission("users", "edit");
  const canDeleteUsers = hasPermission("users", "delete");
  const canExportUsers = hasPermission("users", "export");

  if (!canViewUsers) {
    return <AccessDenied />;
  }
  const [modal, setModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"general" | "permissions">("general");
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    whatsapp: "",
    role: "Recruiter",
    company: "",
    branch: "",
    photo: null as string | null,
    status: "Active" as User["status"],
    department: "",
    designation: "",
    shiftId: "",
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    permissions: null as any
  });

  const FORM_MODULES = [
    { key: "Dashboard", label: "Dashboard" },
    { key: "Companies", label: "Company Management" },
    { key: "Branches", label: "Branch Management" },
    { key: "Users", label: "User Management" },
    { key: "Roles", label: "Role & Permission" },
    { key: "Applicants", label: "Applicant Management" },
    { key: "Applicant Tracking", label: "Applicant Tracking" },
    { key: "Interviews", label: "Interview Management" },
    { key: "Meetings", label: "Meeting Management" },
    { key: "Placement", label: "Placement Agreements" },
    { key: "Staff", label: "Staff Management" },
    { key: "Attendance", label: "Attendance Management" },
    { key: "Shifts", label: "Shift Management" },
    { key: "Payroll", label: "Payroll Management" },
    { key: "Payslips", label: "Payslip Management" },
    { key: "Leave Requests", label: "Leave Management" },
    { key: "Staff Requests", label: "Staff Requests" },
    { key: "Tasks", label: "Task Management" },
    { key: "Vehicles", label: "Vehicle Management" },
    { key: "Suppliers", label: "Supplier Management" },
    { key: "Documents", label: "Document Management" },
    { key: "Notifications", label: "Notification Management" },
    { key: "Reports", label: "Reports" },
    { key: "Activity Log", label: "Activity Logs" },
    { key: "Site Settings", label: "Site Settings" },
    { key: "Forms", label: "Form Management" }
  ];

  const FORM_ACTIONS = [
    { key: "view", label: "View" },
    { key: "create", label: "Create" },
    { key: "edit", label: "Edit" },
    { key: "delete", label: "Delete" },
    { key: "approve", label: "Approve" },
    { key: "reject", label: "Reject" },
    { key: "assign", label: "Assign" },
    { key: "upload", label: "Upload" },
    { key: "download", label: "Download" },
    { key: "export", label: "Export" },
    { key: "print", label: "Print" },
    { key: "restore", label: "Restore" },
    { key: "statusChange", label: "Status" }
  ];

  const toggleModuleExpanded = (key: string) => {
    setExpandedModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePermissionCheckbox = (modKey: string, actKey: string) => {
    setForm(f => {
      const matrix = { ...(f.permissions || {}) };
      if (!matrix[modKey]) {
        matrix[modKey] = {
          view: false, create: false, edit: false, delete: false, approve: false,
          reject: false, assign: false, upload: false, download: false, export: false,
          print: false, restore: false, statusChange: false
        };
      }
      matrix[modKey] = {
        ...matrix[modKey],
        [actKey]: !matrix[modKey][actKey]
      };
      return { ...f, permissions: matrix };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photo: reader.result as string }));
        toast.success("Profile photo uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  // Detail audit panel state
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [auditTab, setAuditTab] = useState<"profile" | "logins" | "emails" | "activity">("profile");

  // Email Change Form state
  const [emailChangeModal, setEmailChangeModal] = useState<User | null>(null);
  const [newEmailValue, setNewEmailValue] = useState("");
  const [emailChangeReason, setEmailChangeReason] = useState("");

  const f = filters.users;
  const isSuperAdmin = currentRole === "Super Admin";

  let list = users;
  if (!isSuperAdmin) {
    list = list.filter(u => u.company === currentUser.company);
    if (currentRole === "Branch Admin") list = list.filter(u => u.branch === currentUser.branch);
  }
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(u => u.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(u => u.company === f.company);

  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) { toast.error("Name, email, and role are required"); return; }
    if (!form.company) { toast.error("Every user must belong to a company"); return; }
    
    const companyBranches = branches.filter(b => b.company === form.company);
    if (companyBranches.length > 0 && (!form.branch || form.branch === "")) {
      toast.error("Every user must belong to a branch if the company has branches");
      return;
    }

    const permissionsPayload = {
      matrix: form.permissions,
      department: form.department,
      designation: form.designation,
      shiftId: form.shiftId,
      basicSalary: Number(form.basicSalary) || 0,
      allowances: Number(form.allowances) || 0,
      deductions: Number(form.deductions) || 0
    };

    const submitPayload = {
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      whatsapp: form.whatsapp,
      role: form.role,
      company: form.company,
      branch: form.branch,
      photo: form.photo,
      status: form.status,
      permissions: permissionsPayload
    };

    try {
      if (editUser) {
        await updateUser({ ...editUser, ...submitPayload } as any);
        addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Edited", module: "Users", oldValue: editUser.name, newValue: form.name, ipAddress: "192.168.1.102" });
        toast.success("User updated");
      } else {
        const id = `USR${String(Math.floor(100 + Math.random() * 900))}`;
        await addUser({ ...submitPayload, id, lastLogin: "Never", createdAt: new Date().toISOString().slice(0,10) } as any);
        addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Users", oldValue: null, newValue: `Created user: ${form.name} (${form.role})`, ipAddress: "192.168.1.102" });
        toast.success(`User "${form.name}" created`);
      }
      setModal(false); setEditUser(null);
      setForm({ name:"", email:"", mobile:"", whatsapp:"", role:"Recruiter", company:currentUser.company, branch: currentRole === "Branch Admin" ? currentUser.branch : "", photo: null, status: "Active", department: "", designation: "", shiftId: "", basicSalary: 0, allowances: 0, deductions: 0, permissions: null });
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
  };

  const handleStatusToggle = (u: User) => {
    const newStatus = u.status === "Active" ? "Disabled" : "Active";
    updateUser({ ...u, status: newStatus });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Users", oldValue: u.status, newValue: newStatus, ipAddress: "192.168.1.102" });
    toast.success(`User ${newStatus === "Active" ? "enabled" : "disabled"}`);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    let parsedPerms: any = null;
    if (u.permissions) {
      parsedPerms = typeof u.permissions === "string"
        ? (() => { try { return JSON.parse(u.permissions); } catch { return null; } })()
        : u.permissions;
    }
    setForm({
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      whatsapp: u.whatsapp || "",
      role: u.role,
      company: u.company,
      branch: u.branch,
      photo: u.photo,
      status: u.status,
      department: parsedPerms?.department || "",
      designation: parsedPerms?.designation || "",
      shiftId: parsedPerms?.shiftId || "",
      basicSalary: parsedPerms?.basicSalary || 0,
      allowances: parsedPerms?.allowances || 0,
      deductions: parsedPerms?.deductions || 0,
      permissions: parsedPerms?.matrix || parsedPerms || null
    });
    setActiveModalTab("general");
    setModal(true);
  };

  const handleEmailChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailChangeModal || !newEmailValue || !emailChangeReason) {
      toast.error("New email and reason are required.");
      return;
    }

    const targetUser = emailChangeModal;
    const oldEmail = targetUser.email;

    const record: EmailChangeRecord = {
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
      admin: currentUser.name,
      oldEmail,
      newEmail: newEmailValue,
      reason: emailChangeReason
    };

    // Persist history on the user object in the store
    updateUser({
      ...targetUser,
      email: newEmailValue,
      emailHistory: [record, ...(targetUser.emailHistory || [])]
    });

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T"," ").slice(0,19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Email Changed",
      module: "Users",
      oldValue: oldEmail,
      newValue: newEmailValue,
      ipAddress: "192.168.1.102"
    });

    toast.success("Email address changed and audited successfully");
    setEmailChangeModal(null);
    setNewEmailValue("");
    setEmailChangeReason("");
  };

  const allowedCompanies = isSuperAdmin ? ownCompanies : ownCompanies.filter(c => c.name === currentUser.company);
  
  // Compute branches based on selected company in the form — always show actual branch names
  const branchCompany = form.company || (isSuperAdmin ? "" : currentUser.company);
  const allowedBranches = isSuperAdmin
    ? branches.filter(b => branchCompany === "" || b.company === branchCompany)
    : branches.filter(b => b.company === currentUser.company && (currentUser.branch === "All" || b.name === currentUser.branch));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="User Management" subtitle="Manage system users, roles, and access levels"
        actions={canCreateUsers ? (
          <Button onClick={() => { setEditUser(null); setForm({ name:"", email:"", mobile:"", whatsapp:"", role:"Recruiter", company:currentUser.company, branch: currentRole === "Branch Admin" ? currentUser.branch : "", photo: null, status: "Active", department: "", designation: "", shiftId: "", basicSalary: 0, allowances: 0, deductions: 0, permissions: null }); setModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>Add User</Button>
        ) : null}
      />
      <FilterBar moduleKey="users" statusOptions={["Active","Disabled","Suspended","Pending"]} onExport={canExportUsers ? () => { exportToCSV(list.map(u=>({ID:u.id,Name:u.name,Email:u.email,Role:u.role,Status:u.status,Company:u.company,Branch:u.branch})),"users"); toast.success("Exported"); } : undefined} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No users found" action={canCreateUsers ? <Button onClick={() => setModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Add User</Button> : null} />
        ) : (
          <>
            {/* Mobile Portrait View */}
            <div className="space-y-3 md:hidden">
              {paginated.map(u => (
                <Card key={u.id} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-9 h-9 rounded-xl border border-slate-100">
                        {u.photo ? (
                          <AvatarImage src={u.photo} alt={u.name} className="object-cover rounded-xl w-9 h-9" />
                        ) : null}
                        <AvatarFallback className="rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer text-xs" onClick={() => { setDetailUser(u); setAuditTab("profile"); }}>{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getStatusColor(u.status)}`}>{u.status}</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div><strong>Role:</strong> {u.role}</div>
                    <div><strong>Company/Branch:</strong> {u.company} / {u.branch}</div>
                    <div><strong>Last Login:</strong> {formatDate(u.lastLogin)}</div>
                  </div>
                  <div className="flex justify-end gap-1 pt-1.5 border-t border-slate-100">
                    <Button variant="ghost" size="icon" onClick={() => { setDetailUser(u); setAuditTab("profile"); }} className="w-7 h-7 text-slate-500 hover:bg-slate-50 rounded-lg" title="Auditing & Logs"><Eye className="w-4 h-4"/></Button>
                    {canEditUsers ? (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="w-7 h-7 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit"><UserCheck className="w-4 h-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleStatusToggle(u)} className="w-7 h-7 text-amber-500 hover:bg-amber-50 rounded-lg" title={u.status === "Active" ? "Disable" : "Enable"}>{u.status === "Active" ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}</Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEmailChangeModal(u); setNewEmailValue(u.email); }} className="w-7 h-7 text-slate-600 hover:bg-slate-50 rounded-lg" title="Audit Email Change"><Mail className="w-4 h-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const reqId = `RST-${Date.now()}`;
                          addPasswordResetRequest({
                            id: reqId,
                            userId: u.id,
                            email: u.email,
                            requestedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
                            status: "Sent",
                            requestedBy: currentUser.name,
                            note: "Password reset triggered from User Management table"
                          });
                          addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Password Reset", module: "Users", oldValue: null, newValue: `Reset link sent to ${u.email}`, ipAddress: "192.168.1.102" });
                          toast.success(`Password reset link sent to ${u.email}`);
                        }} className="w-7 h-7 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Reset Password"><RefreshCw className="w-4 h-4"/></Button>
                      </>
                    ) : null}
                    {canDeleteUsers ? (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Company / Branch</TableHead>
                    <TableHead>Last Login</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(u => (
                    <TableRow key={u.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-9 h-9 rounded-xl border border-slate-100">
                            {u.photo ? (
                              <AvatarImage src={u.photo} alt={u.name} className="object-cover rounded-xl w-9 h-9" />
                            ) : null}
                            <AvatarFallback className="rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">{u.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer" onClick={() => { setDetailUser(u); setAuditTab("profile"); }}>{u.name}</div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full"><Shield className="w-3 h-3 inline mr-1"/>{u.role}</span>
                      </TableCell>
                      <TableCell className="text-[10px]">{u.company}<br/><span className="text-slate-400">{u.branch}</span></TableCell>
                      <TableCell className="text-[10px]">{formatDate(u.lastLogin)}</TableCell>
                      <TableCell><span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getStatusColor(u.status)}`}>{u.status}</span></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => { setDetailUser(u); setAuditTab("profile"); }} className="w-7 h-7 text-slate-500 hover:bg-slate-50 rounded-lg" title="Auditing & Logs"><Eye className="w-4 h-4"/></Button>
                        {canEditUsers ? (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="w-7 h-7 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit"><UserCheck className="w-4 h-4"/></Button>
                        ) : null}
                        {canEditUsers ? (
                          <Button variant="ghost" size="icon" onClick={() => handleStatusToggle(u)} className="w-7 h-7 text-amber-500 hover:bg-amber-50 rounded-lg" title={u.status === "Active" ? "Disable" : "Enable"}>{u.status === "Active" ? <Lock className="w-4 h-4"/> : <Unlock className="w-4 h-4"/>}</Button>
                        ) : null}
                        {canEditUsers ? (
                          <Button variant="ghost" size="icon" onClick={() => { setEmailChangeModal(u); setNewEmailValue(u.email); }} className="w-7 h-7 text-slate-600 hover:bg-slate-50 rounded-lg" title="Audit Email Change"><Mail className="w-4 h-4"/></Button>
                        ) : null}
                        {canEditUsers ? (
                          <Button variant="ghost" size="icon" onClick={() => {
                            const reqId = `RST-${Date.now()}`;
                            addPasswordResetRequest({
                              id: reqId,
                              userId: u.id,
                              email: u.email,
                              requestedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
                              status: "Sent",
                              requestedBy: currentUser.name,
                              note: "Password reset triggered from User Management table"
                            });
                            addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Password Reset", module: "Users", oldValue: null, newValue: `Reset link sent to ${u.email}`, ipAddress: "192.168.1.102" });
                            toast.success(`Password reset link sent to ${u.email}`);
                          }} className="w-7 h-7 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Reset Password"><RefreshCw className="w-4 h-4"/></Button>
                        ) : null}
                        {canDeleteUsers ? (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
      <Pagination moduleKey="users" totalItems={totalItems} />

      {/* Add/Edit User Modal — full redesign */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 w-[95vw] sm:w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
          style={{ width: "min(680px, 96vw)" }}>
          {/* Header */}
          <div className={`px-6 py-4 border-b border-slate-100 flex items-center gap-3 ${editUser ? "bg-gradient-to-r from-blue-600 to-violet-600" : "bg-gradient-to-r from-slate-800 to-slate-900"}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${editUser ? "bg-white/20" : "bg-white/10"}`}>
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                {editUser ? `Edit User — ${editUser.name}` : "Add New User"}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-white/60 mt-0.5">
                {editUser ? "Update user details, access, and status." : "Fill in all required fields to create a new system user."}
              </DialogDescription>
            </div>
          </div>

          {/* Tabs bar */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 py-2.5 gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveModalTab("general")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeModalTab === "general" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
              )}
            >
              General Details
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab("permissions")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeModalTab === "permissions" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
              )}
            >
              Permissions Override
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 bg-slate-50/40">

              {activeModalTab === "general" ? (
                <>
                  {/* ── SECTION 1: Profile Photo ── */}
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-xs">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                        {form.photo ? (
                          <img src={form.photo} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-7 h-7 text-slate-300" />
                        )}
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center cursor-pointer shadow-md transition-colors">
                        <Camera className="w-3 h-3 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-700">Profile Photo</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Click the camera icon to upload. JPG, PNG, WebP supported.</div>
                      {form.photo && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, photo: null }))} className="text-[10px] text-rose-500 font-bold mt-1 hover:text-rose-700">Remove photo</button>
                      )}
                    </div>
                  </div>

                  {/* ── SECTION 2: Personal Information ── */}
                  <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personal Information</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Full Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          required
                          placeholder="e.g. Mohammed Al Rashid"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Email Address <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input
                            required
                            type="email"
                            placeholder="name@company.com"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            className="pl-9 bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <Input
                            placeholder="+971 50 123 4567"
                            value={form.mobile}
                            onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                            className="pl-9 bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                          />
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-bold">WA</span>
                          <Input
                            placeholder="+971 50 123 4567"
                            value={form.whatsapp}
                            onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                            className="pl-9 bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 3: Corporate Info & Scoping ── */}
                  <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Corporate Assignment</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Role <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v || "Recruiter" }))}>
                          <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl text-xs max-h-52">
                            {SYSTEM_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Account Status <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as User["status"] }))}>
                          <SelectTrigger className={`bg-white border-slate-200 rounded-xl text-xs h-10 font-bold ${
                            form.status === "Active" ? "text-emerald-700" :
                            form.status === "Disabled" ? "text-rose-700" :
                            form.status === "Suspended" ? "text-purple-700" : "text-amber-700"
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl text-xs">
                            <SelectItem value="Active"><span className="text-emerald-700 font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Active</span></SelectItem>
                            <SelectItem value="Disabled"><span className="text-rose-700 font-bold flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Disabled</span></SelectItem>
                            <SelectItem value="Suspended"><span className="text-purple-700 font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />Suspended</span></SelectItem>
                            <SelectItem value="Pending"><span className="text-amber-700 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Pending</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company</Label>
                        <Select
                          value={form.company}
                          onValueChange={v => setForm(f => ({ ...f, company: v || "", branch: currentRole === "Branch Admin" ? currentUser.branch : "" }))}
                          disabled={!isSuperAdmin}
                        >
                          <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10">
                            <SelectValue placeholder="Select Company" />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl text-xs">
                            {allowedCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</Label>
                        <Select
                          value={form.branch}
                          onValueChange={v => setForm(f => ({ ...f, branch: v || "" }))}
                          disabled={currentRole === "Branch Admin"}
                        >
                          <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10">
                            <SelectValue placeholder="Select Branch" />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl text-xs">
                            {isSuperAdmin && <SelectItem value="All">All Branches</SelectItem>}
                            {allowedBranches.length > 0 ? (
                              allowedBranches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)
                            ) : (
                              <div className="px-3 py-2 text-[10px] text-slate-400 italic">Select a company first</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</Label>
                        <Input
                          placeholder="e.g. Finance, Support"
                          value={form.department}
                          onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                          className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designation</Label>
                        <Input
                          placeholder="e.g. Lead Developer, Recruiter"
                          value={form.designation}
                          onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                          className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift Assignment</Label>
                        <Select
                          value={form.shiftId}
                          onValueChange={v => setForm(f => ({ ...f, shiftId: v || "" }))}
                        >
                          <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10">
                            <SelectValue placeholder="Select Daily Work Shift" />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl text-xs">
                            {shifts.filter(s => s.company === form.company).length > 0 ? (
                              shifts.filter(s => s.company === form.company).map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-[10px] text-slate-400 italic">No shifts created for this company</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* ── SECTION 4: Compensation Details ── */}
                  <div className="space-y-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Salary Details</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Basic Salary (AED)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 5000"
                          value={form.basicSalary || ""}
                          onChange={e => setForm(f => ({ ...f, basicSalary: Number(e.target.value) || 0 }))}
                          className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Allowances (AED)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 1500"
                          value={form.allowances || ""}
                          onChange={e => setForm(f => ({ ...f, allowances: Number(e.target.value) || 0 }))}
                          className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deductions (AED)</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 200"
                          value={form.deductions || ""}
                          onChange={e => setForm(f => ({ ...f, deductions: Number(e.target.value) || 0 }))}
                          className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] font-semibold text-blue-800 leading-relaxed">
                    ⚙️ <strong>Custom Permissions Override Engine:</strong> Configure specialized permissions to selectively grant or block module access actions for this user. Toggles here override role defaults.
                  </div>
                  <div className="space-y-2">
                    {FORM_MODULES.map(m => {
                      const currentModulePerms = form.permissions?.[m.key] || {};
                      const activeCount = Object.values(currentModulePerms).filter(Boolean).length;
                      const isExpanded = !!expandedModules[m.key];
                      return (
                        <div key={m.key} className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white shadow-xs">
                          <button 
                            type="button" 
                            onClick={() => toggleModuleExpanded(m.key)}
                            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors text-left"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800">{m.label}</span>
                              <p className="text-[9px] text-slate-400 font-medium">System Module Code: {m.key}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {activeCount > 0 ? (
                                <span className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                  {activeCount} custom overrides
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full">
                                  Role default
                                </span>
                              )}
                              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isExpanded && "rotate-180")} />
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="p-3.5 bg-slate-50/50 border-t border-slate-150/50 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {FORM_ACTIONS.map(act => {
                                const isChecked = !!currentModulePerms[act.key];
                                return (
                                  <label 
                                    key={act.key} 
                                    className={cn(
                                      "flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-all",
                                      isChecked 
                                        ? "bg-blue-50 border-blue-200 text-blue-800 font-bold" 
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                    )}
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked} 
                                      onChange={() => togglePermissionCheckbox(m.key, act.key)}
                                      className="w-3.5 h-3.5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500" 
                                    />
                                    <span className="text-[10px]">{act.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <div className="text-[10px] text-slate-400 font-medium">
                {editUser ? `Editing user: ${editUser.id}` : "Provide correct credentials to complete registration."}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4 h-9 text-slate-600 hover:bg-slate-200">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-9 gap-1.5 shadow-md shadow-blue-500/20">
                  {editUser ? "Save Changes" : "Create User"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audited Email Change Modal */}
      <Dialog open={!!emailChangeModal} onOpenChange={open => !open && setEmailChangeModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={handleEmailChangeSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600"/> Change User Email Address
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Altering system logins requires auditing. Specify the reason, which will be logged in user security history.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Email</Label>
                <Input disabled value={emailChangeModal?.email || ""} className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Email Address <span className="text-rose-500">*</span></Label>
                <Input type="email" required value={newEmailValue} onChange={e => setNewEmailValue(e.target.value)} placeholder="new.email@company.com" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason for Modification <span className="text-rose-500">*</span></Label>
                <textarea required rows={3} value={emailChangeReason} onChange={e => setEmailChangeReason(e.target.value)} placeholder="Provide explanation for changing user login credentials..." className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setEmailChangeModal(null)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Confirm & Log Change</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Detail & Security History Slide-over */}
      <Dialog open={!!detailUser} onOpenChange={open => !open && setDetailUser(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 rounded-xl border border-slate-100">
                {detailUser?.photo ? (
                  <AvatarImage src={detailUser.photo} alt={detailUser.name} className="object-cover rounded-xl w-12 h-12" />
                ) : null}
                <AvatarFallback className="rounded-xl bg-blue-100 text-blue-800 font-extrabold text-lg">{detailUser?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-800">{detailUser?.name}</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>ID: {detailUser?.id}</span> · <span className="text-blue-600 font-bold uppercase">{detailUser?.role}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Audit tabs */}
          <div className="flex gap-1 border-b border-slate-100 py-2.5">
            <button onClick={() => setAuditTab("profile")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${auditTab === "profile" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800"}`}>
              Profile
            </button>
            <button onClick={() => setAuditTab("logins")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${auditTab === "logins" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800"}`}>
              <History className="w-3.5 h-3.5 inline mr-1" /> Login History
            </button>
            <button onClick={() => setAuditTab("emails")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${auditTab === "emails" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800"}`}>
              <Mail className="w-3.5 h-3.5 inline mr-1" /> Email Changes
            </button>
            <button onClick={() => setAuditTab("activity")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${auditTab === "activity" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800"}`}>
              <ClipboardList className="w-3.5 h-3.5 inline mr-1" /> Activity Logs
            </button>
          </div>

          <div className="py-4 space-y-4">
            {/* Tab 1: Profile */}
            {auditTab === "profile" && detailUser && (
              <div className="space-y-4 text-xs font-semibold text-slate-600">
                {/* Avatar + name header */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-100 rounded-2xl">
                  <Avatar className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm flex-shrink-0">
                    {detailUser.photo ? <AvatarImage src={detailUser.photo} className="object-cover rounded-2xl" /> : null}
                    <AvatarFallback className="rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-xl">{detailUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-extrabold text-slate-800">{detailUser.name}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full"><Shield className="w-2.5 h-2.5 inline mr-1" />{detailUser.role}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusColor(detailUser.status)}`}>{detailUser.status}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">ID: {detailUser.id} · Created {formatDate(detailUser.createdAt)}</div>
                  </div>
                </div>

                {(() => {
                  const parsedPerms = detailUser.permissions
                    ? typeof detailUser.permissions === "string"
                      ? (() => { try { return JSON.parse(detailUser.permissions); } catch { return null; } })()
                      : detailUser.permissions
                    : null;
                  const matchedShift = shifts.find(sh => sh.id === parsedPerms?.shiftId);
                  
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Mail className="w-3 h-3" />Contact Information</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Email:</span><span className="font-bold text-slate-800 truncate">{detailUser.email}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Mobile:</span><span className="font-bold text-slate-800">{detailUser.mobile || "—"}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">WhatsApp:</span><span className="font-bold text-slate-800">{detailUser.whatsapp || "—"}</span></div>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Building2 className="w-3 h-3" />Corporate Scope</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Company:</span><span className="font-bold text-slate-800">{detailUser.company}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Branch:</span><span className="font-bold text-slate-800">{detailUser.branch}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Last Login:</span><span className="font-bold text-slate-800">{formatDate(detailUser.lastLogin)}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><UserIcon className="w-3 h-3" />Employment Scope</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Department:</span><span className="font-bold text-slate-800">{parsedPerms?.department || "—"}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Designation:</span><span className="font-bold text-slate-800">{parsedPerms?.designation || "—"}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-20 flex-shrink-0">Work Shift:</span><span className="font-bold text-slate-800">{matchedShift ? `${matchedShift.name} (${matchedShift.startTime}-${matchedShift.endTime})` : "—"}</span></div>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><DollarSign className="w-3 h-3" />Compensation Details</div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-24 flex-shrink-0">Basic Salary:</span><span className="font-bold text-slate-800 font-mono">AED {(parsedPerms?.basicSalary || 0).toLocaleString()}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-24 flex-shrink-0">Allowances:</span><span className="font-bold text-slate-800 font-mono">AED {(parsedPerms?.allowances || 0).toLocaleString()}</span></div>
                            <div className="flex items-center gap-2"><span className="text-slate-400 w-24 flex-shrink-0">Deductions:</span><span className="font-bold text-rose-600 font-mono">AED {(parsedPerms?.deductions || 0).toLocaleString()}</span></div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5"><Key className="w-3.5 h-3.5 text-indigo-500" />Password Reset</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Send a password reset link to {detailUser.email}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const reqId = `RST-${Date.now()}`;
                        addPasswordResetRequest({
                          id: reqId, userId: detailUser.id, email: detailUser.email,
                          requestedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
                          status: "Sent", requestedBy: currentUser.name,
                          note: "Password reset from user management panel"
                        });
                        addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Password Reset", module: "Users", oldValue: null, newValue: `Reset link for ${detailUser.name}`, ipAddress: "192.168.1.102" });
                        toast.success(`Password reset link sent to ${detailUser.email}`);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold h-8 gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Send Reset Link
                    </Button>
                  </div>
                  <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reset Request Log</div>
                    {passwordResetRequests.filter(r => r.userId === detailUser.id).length === 0 ? (
                      <div className="text-[10px] text-slate-400 italic">No password resets logged.</div>
                    ) : (
                      <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {passwordResetRequests.filter(r => r.userId === detailUser.id).map(r => (
                          <div key={r.id} className="text-[10px] flex justify-between bg-white border border-slate-100 p-1.5 rounded-lg">
                            <span>By: <span className="font-bold text-blue-600">{r.requestedBy}</span></span>
                            <span className="text-slate-400">{r.requestedAt}</span>
                            <span className="bg-emerald-50 text-emerald-700 px-1 rounded text-[8px] font-bold">{r.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Login History */}
            {auditTab === "logins" && (
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Recent User Login Sessions</div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase">
                      <TableRow className="border-slate-100">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Session Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs font-semibold text-slate-600">
                      {MOCK_LOGIN_HISTORY.map((log, i) => (
                        <TableRow key={i} className="border-slate-100">
                          <TableCell className="text-[10px] text-slate-400">{log.date}</TableCell>
                          <TableCell className="font-mono text-[10px]">{log.ip}</TableCell>
                          <TableCell>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                              log.status.includes("Failed") ? "bg-rose-50 border-rose-100 text-rose-700" : "bg-slate-50 border-slate-100 text-slate-600"
                            }`}>{log.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Tab 3: Email Change Auditing History */}
            {auditTab === "emails" && detailUser && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email modification logs</div>
                  <Button size="sm" variant="outline" onClick={() => { setEmailChangeModal(detailUser); setDetailUser(null); }} className="rounded-xl border-slate-200 text-[10px] font-bold h-7 gap-1"><Mail className="w-3.5 h-3.5"/> Modify Email</Button>
                </div>
                {detailUser.emailHistory && detailUser.emailHistory.length > 0 ? (
                  <div className="space-y-3">
                    {detailUser.emailHistory.map((rec, i) => (
                      <div key={i} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold border-b border-slate-100 pb-1.5">
                          <span>Date/Time: {rec.date}</span>
                          <div className="flex items-center gap-2">
                            <span>Admin: <span className="text-blue-600 font-bold">{rec.admin}</span></span>
                            {isSuperAdmin && (
                              <button 
                                type="button"
                                onClick={() => {
                                  if (confirm("Are you sure you want to permanently delete this email change history entry?")) {
                                    const updatedHistory = detailUser.emailHistory?.filter((_, idx) => idx !== i) || [];
                                    updateUser({ ...detailUser, emailHistory: updatedHistory });
                                    setDetailUser({ ...detailUser, emailHistory: updatedHistory });
                                    toast.success("History log deleted");
                                  }
                                }}
                                className="w-5 h-5 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded"
                                title="Delete Log Entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
                          <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><span className="text-[8px] uppercase text-slate-400 font-extrabold block mb-0.5">Old Email:</span>{rec.oldEmail}</div>
                          <div className="bg-blue-50 p-2 rounded-lg text-blue-700"><span className="text-[8px] uppercase text-blue-400 font-extrabold block mb-0.5">New Email:</span>{rec.newEmail}</div>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl flex gap-2 text-amber-800 text-[10px]">
                          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div><span className="font-bold text-amber-900">Audited Reason:</span> {rec.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-2xl border-dashed border-2 border-slate-200 p-6 text-center bg-white">
                    <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Email Modifications Logged</p>
                  </Card>
                )}
              </div>
            )}

            {/* Tab 4: Activity Log */}
            {auditTab === "activity" && detailUser && (
              <div className="space-y-3">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">User Activity History Logs</div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50 text-[10px] font-bold text-slate-500 uppercase">
                      <TableRow className="border-slate-100">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs font-semibold text-slate-600">
                      {activityLogs.filter(log => log.userName === detailUser.name).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-4">No activity records found for this user.</TableCell>
                        </TableRow>
                      ) : (
                        activityLogs.filter(log => log.userName === detailUser.name).map((log) => (
                          <TableRow key={log.id} className="border-slate-100">
                            <TableCell className="text-[10px] text-slate-400">{log.dateTime}</TableCell>
                            <TableCell><span className="font-bold text-blue-600">{log.action}</span></TableCell>
                            <TableCell className="text-[10px]">{log.module}</TableCell>
                            <TableCell className="text-[10px] text-slate-500">{log.newValue || log.oldValue}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button onClick={() => setDetailUser(null)} className="bg-slate-900 text-white rounded-xl text-xs font-bold h-9">Close Panel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteUser(deleteId!); toast.success("User deleted"); setDeleteId(null); }} title="Delete User" description="Remove this user's access and account permanently." confirmText="Delete User" variant="danger" />
    </div>
  );
}
