"use client";

import { useState, useEffect } from "react";
import { Shield, CheckCircle, XCircle, Save, Info, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Role } from "@/lib/types";
import PageHeader from "@/components/shared/PageHeader";
import AccessDenied from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SYSTEM_ROLES } from "@/lib/constants";
import { toast } from "sonner";

const ALL_MODULES = [
  "Applicants", "Staff", "Companies", "Branches", "Users", "Roles", "Tasks",
  "Interviews", "Leave Requests", "Staff Requests", "Vehicles", "Documents", "Suppliers",
  "Placement", "Members", "Visa Expiry", "Staff Birthdays", "Attendance", "Payroll",
  "Notifications", "Activity Log", "Site Settings", "Reports", "Applicant Tracking"
];

const PERMISSIONS = ["view", "viewAll", "create", "edit", "editAll", "delete", "deleteAll", "approve", "reject", "export", "print", "download", "upload"];

const PERMISSION_LABELS: Record<string,string> = {
  view: "View", 
  viewAll: "View All", 
  create: "Create", 
  edit: "Edit", 
  editAll: "Edit All", 
  delete: "Delete", 
  deleteAll: "Delete All",
  approve: "Approve", 
  reject: "Reject", 
  export: "Export", 
  print: "Print",
  download: "Download", 
  upload: "Upload"
};

// Default permission matrix per role
const buildDefaultMatrix = (role: string): Role["permissions"] => {
  const matrix: Role["permissions"] = {};
  ALL_MODULES.forEach(m => {
    const all = role === "Super Admin";
    const readOnly = role === "Read Only User";
    const companyAdmin = role === "Company Admin";
    const branchAdmin = role === "Branch Admin";
    const isManager = ["HR Manager", "Recruiter", "Accountant"].includes(role);
    
    matrix[m] = {
      view:         all || readOnly || companyAdmin || branchAdmin || isManager || role === "Staff",
      viewAll:      all || companyAdmin || branchAdmin || isManager,
      create:       all || companyAdmin || branchAdmin || isManager || (role === "Staff" && ["Tasks", "Leave Requests", "Staff Requests", "Attendance"].includes(m)),
      edit:         all || companyAdmin || branchAdmin || isManager || (role === "Staff" && ["Tasks", "Leave Requests", "Staff Requests", "Attendance"].includes(m)),
      editAll:      all || companyAdmin || branchAdmin || isManager,
      delete:       all || companyAdmin,
      deleteAll:    all || companyAdmin,
      approve:      all || companyAdmin || (isManager && m === "Leave Requests"),
      reject:       all || companyAdmin || (isManager && m === "Leave Requests"),
      export:       all || companyAdmin || isManager,
      print:        all || companyAdmin || isManager,
      download:     all || companyAdmin || branchAdmin || isManager,
      upload:       all || companyAdmin || branchAdmin || isManager,
    };
  });
  return matrix;
};

const buildPermissionMatrixFromRole = (role: Role): Role["permissions"] => {
  const matrix: Role["permissions"] = {};
  ALL_MODULES.forEach((module) => {
    const src = role.permissions?.[module];
    matrix[module] = {
      view:         Boolean(src?.view),
      viewAll:      Boolean(src?.viewAll),
      create:       Boolean(src?.create),
      edit:         Boolean(src?.edit),
      editAll:      Boolean(src?.editAll),
      delete:       Boolean(src?.delete),
      deleteAll:    Boolean(src?.deleteAll),
      approve:      Boolean(src?.approve),
      reject:       Boolean(src?.reject),
      export:       Boolean(src?.export),
      print:        Boolean(src?.print),
      download:     Boolean(src?.download),
      upload:       Boolean(src?.upload),
    };
  });
  return matrix;
};

export default function RolesPage() {
  const { currentRole, roles, addRole, updateRole, deleteRole, hasPermission, companies, ownCompanies } = useAuthStore();
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || "");
  const canViewRoles = hasPermission("roles", "view");
  const canEditRoles = hasPermission("roles", "edit");
 
  if (!canViewRoles) {
    return <AccessDenied />;
  }
  const [matrix, setMatrix] = useState<Role["permissions"]>(() => roles[0] ? buildPermissionMatrixFromRole(roles[0]) : buildDefaultMatrix("Super Admin"));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCompany, setNewRoleCompany] = useState("System");
 
  const selectedRole = roles.find((role) => role.id === selectedRoleId) || roles[0] || null;
 
  useEffect(() => {
    if (selectedRole) {
      setMatrix(buildPermissionMatrixFromRole(selectedRole));
    }
  }, [selectedRole?.id]);
 
  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
  };
 
  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required to create a new role.");
      return;
    }
 
    const id = `ROL${Date.now()}`;
    const role: Role = {
      id,
      name: newRoleName.trim(),
      description: `Custom role for ${newRoleCompany === "System" ? "System-wide use" : newRoleCompany}`,
      userCount: 0,
      permissions: buildDefaultMatrix(newRoleName.trim()),
      isCustom: true,
      company: newRoleCompany === "System" ? null : newRoleCompany
    };
 
    addRole(role);
    setSelectedRoleId(id);
    setNewRoleName("");
    setNewRoleCompany("System");
    setShowCreateModal(false);
    toast.success(`Role "${role.name}" was created successfully.`);
  };

  const handleDeleteRole = (role: Role) => {
    if (role.isSystem) {
      toast.error("System roles cannot be deleted.");
      return;
    }

    deleteRole(role.id);
    toast.success(`Role "${role.name}" deleted successfully.`);
    if (selectedRoleId === role.id) {
      setSelectedRoleId(roles[0]?.id || "");
    }
  };

  const toggle = (module: string, perm: string) => {
    if (currentRole !== "Super Admin") { toast.error("Only Super Admin can modify permissions"); return; }
    setMatrix(prev => {
      const prevMod = prev[module] ?? {};
      return { ...prev, [module]: { ...prevMod, [perm]: !(prevMod as any)[perm] } };
    });
  };

  const toggleAll = (module: string, val: boolean) => {
    if (currentRole !== "Super Admin") return;
    const allOn: Role["permissions"][string] = {
      view: val, create: val, edit: val, delete: val,
      download: val, upload: val, export: val, print: val,
      approve: val, reject: val, assign: val, statusChange: val, restore: val,
    };
    setMatrix(prev => ({ ...prev, [module]: allOn }));
  };

  const handleSave = () => {
    if (!selectedRole) {
      toast.error("No role selected to save.");
      return;
    }

    updateRole({ ...selectedRole, permissions: matrix });
    toast.success(`Permissions for "${selectedRole.name}" were saved successfully.`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Roles & Permissions" subtitle="Configure module-level access for each system role"
        actions={canEditRoles ? <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Save className="w-4 h-4"/>Save Permissions</Button> : null}
      />

      {currentRole !== "Super Admin" && (
        <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 font-semibold">
          <Info className="w-4 h-4 flex-shrink-0"/>
          You are in read-only mode. Only Super Admin can modify role permissions.
        </div>
      )}

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 flex flex-col lg:flex-row gap-6 pb-28 md:pb-6">
        {/* Role Selector Sidebar */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Role</div>
            {canEditRoles && (
              <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm" className="text-[10px] font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 px-2 py-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-2">
                <button onClick={() => handleRoleChange(role.id)}
                  className={`w-full text-left text-xs font-semibold px-3 py-2.5 rounded-xl transition-all ${selectedRoleId === role.id ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"}`}>
                  <Shield className="w-3.5 h-3.5 inline mr-2 opacity-70"/>{role.name}
                </button>
                {!role.isSystem && canEditRoles && (
                  <button onClick={() => handleDeleteRole(role)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="flex-1 min-w-0">
          <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-800">{selectedRole?.name || "Select a Role"}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Click checkboxes to toggle individual permissions</div>
              </div>
              {currentRole === "Super Admin" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const allOn: Role["permissions"][string] = { view:true,viewAll:true,create:true,edit:true,editAll:true,delete:true,deleteAll:true,approve:true,reject:true,export:true,print:true,download:true,upload:true };
                    const m: Role["permissions"] = {};
                    ALL_MODULES.forEach(mod => { m[mod] = { ...allOn }; });
                    setMatrix(m);
                  }} className="text-[10px] font-bold rounded-xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 h-8 px-3">All On</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const allOff: Role["permissions"][string] = { view:false,viewAll:false,create:false,edit:false,editAll:false,delete:false,deleteAll:false,approve:false,reject:false,export:false,print:false,download:false,upload:false };
                    const m: Role["permissions"] = {};
                    ALL_MODULES.forEach(mod => { m[mod] = { ...allOff }; });
                    setMatrix(m);
                  }} className="text-[10px] font-bold rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 h-8 px-3">All Off</Button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3 w-40">Module</th>
                    {PERMISSIONS.map(p => (
                      <th key={p} className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-3">{PERMISSION_LABELS[p]}</th>
                    ))}
                    <th className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-3">All</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_MODULES.map((module, idx) => {
                    const allOn = PERMISSIONS.every(p => matrix[module]?.[p]);
                    return (
                      <tr key={module} className={`border-b border-slate-50 hover:bg-slate-50/30 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"}`}>
                        <td className="px-4 py-2.5 font-bold text-slate-700 whitespace-nowrap">{module}</td>
                        {PERMISSIONS.map(p => (
                          <td key={p} className="text-center px-2 py-2.5">
                            <button onClick={() => toggle(module, p)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${matrix[module]?.[p] ? "bg-blue-600 border-blue-600" : "border-slate-200 bg-white hover:border-slate-300"} ${currentRole !== "Super Admin" ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                              {matrix[module]?.[p] && <CheckCircle className="w-3.5 h-3.5 text-white"/>}
                            </button>
                          </td>
                        ))}
                        <td className="text-center px-3 py-2.5">
                          <button onClick={() => toggleAll(module, !allOn)} className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border transition-all ${allOn ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100" : "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"} ${currentRole !== "Super Admin" ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                            {allOn ? "OFF" : "ON"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Create New Role</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Add a custom role and initialize it with default permissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Role name</label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter new role name"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {currentRole === "Super Admin" && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Assign to Company</label>
                <select
                  value={newRoleCompany}
                  onChange={(e) => setNewRoleCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="System">System (All Companies)</option>
                  {ownCompanies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
            <Button type="button" onClick={handleCreateRole} className="bg-blue-600 text-white rounded-xl text-xs px-4">Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
