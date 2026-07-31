"use client";

import { useState } from "react";
import { Plus, MapPin, Users, Phone, Mail, Trash2, Building2, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { exportToCSV } from "@/lib/utils";
import AccessDenied from "@/components/shared/AccessDenied";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BranchesPage() {
  const { currentRole, currentUser, branches, companies, ownCompanies, addBranch, updateBranch, deleteBranch, addActivityLog, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();
  const [modal, setModal] = useState(false);
  const [editBranch, setEditBranch] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: "", company: "", companyId: "", address: "", phone: "", email: "",
    tradeLicenseNumber: "", location: "", contactPerson: "", status: "Active" as "Active" | "Inactive"
  });

  const f = filters.branches;
  const isSuperAdmin = currentRole === "Super Admin";
  const canViewBranches = hasPermission("branches", "view");
  const canCreateBranches = hasPermission("branches", "create");

  if (!canViewBranches) {
    return <AccessDenied />;
  }

  const allAvailableCompanies = [...companies, ...ownCompanies];

  let list = branches;
  if (!isSuperAdmin) list = list.filter(b => b.company === currentUser.company);
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(b => b.name.toLowerCase().includes(q) || b.company.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(b => b.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(b => b.company === f.company);

  const sortBy = f.sortBy || "newest";
  list = [...list].sort((a,b) => sortBy === "name_asc" ? a.name.localeCompare(b.name) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page - 1) * pageSize, page * pageSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.company) { toast.error("Name and company are required"); return; }
    if (editBranch) {
      updateBranch({ ...editBranch, ...form });
      toast.success("Branch updated");
    } else {
      const id = `BRN${String(Math.floor(100 + Math.random() * 900))}`;
      const selectedCompany = allAvailableCompanies.find(c => c.name === form.company);
      addBranch({ ...form, id, companyId: selectedCompany?.id || "", status: form.status || "Active", staff: 0, createdAt: new Date().toISOString().slice(0,10) });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Branches", oldValue: null, newValue: `Created branch: ${form.name}`, ipAddress: "192.168.1.102" });
      toast.success(`Branch "${form.name}" created`);
    }
    setModal(false); setEditBranch(null);
    setForm({ name: "", company: "", companyId: "", address: "", phone: "", email: "", tradeLicenseNumber: "", location: "", contactPerson: "", status: "Active" });
  };

  const openEdit = (b: any) => { 
    setEditBranch(b); 
    setForm({ 
      name: b.name, company: b.company, companyId: b.companyId, address: b.address, phone: b.phone, email: b.email,
      tradeLicenseNumber: b.tradeLicenseNumber || "", location: b.location || "", contactPerson: b.contactPerson || "", status: b.status || "Active"
    }); 
    setModal(true); 
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader title="Branch Management" subtitle="Manage company branches and locations"
        actions={canCreateBranches ? <Button onClick={() => { setEditBranch(null); setForm({ name:"",company:"",companyId:"",address:"",phone:"",email:"",tradeLicenseNumber:"",location:"",contactPerson:"",status:"Active" }); setModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>Add Branch</Button> : null}
      />
      <FilterBar moduleKey="branches" statusOptions={["Active","Inactive"]} onExport={() => { exportToCSV(list.map(b=>({ID:b.id,Name:b.name,Company:b.company,Status:b.status,Staff:b.staff})),"branches"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No branches found" action={<Button onClick={() => setModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Add Branch</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(b => (
              <Card key={b.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600"><MapPin className="w-5 h-5"/></div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{b.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3"/>{b.company}</div>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                    <div className="text-sm font-extrabold text-slate-800">{b.staff}</div>
                    <div className="text-[9px] text-slate-400 font-bold">Staff</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-600 truncate">{b.id}</div>
                    <div className="text-[9px] text-slate-400 font-bold">Branch ID</div>
                  </div>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  {b.tradeLicenseNumber && <div className="flex items-center gap-1.5 font-semibold"><FileText className="w-3.5 h-3.5 text-slate-400"/>License: {b.tradeLicenseNumber}</div>}
                  {b.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400"/>Loc: {b.location}</div>}
                  {b.contactPerson && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400"/>Contact: {b.contactPerson}</div>}
                  {b.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400"/>{b.phone}</div>}
                  {b.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400"/>{b.email}</div>}
                  {b.address && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400"/>{b.address}</div>}
                </div>
                <div className="border-t border-slate-100 pt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(b)} className="flex-1 rounded-xl text-[10px] font-bold border-slate-200 h-8">Edit Branch</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(b.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-8 px-3"><Trash2 className="w-3.5 h-3.5"/></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Pagination moduleKey="branches" totalItems={totalItems} />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">{editBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Provide branch details and link to a company.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch Name <span className="text-rose-500">*</span></Label>
                <Input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" placeholder="Main Branch" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Main Company <span className="text-rose-500">*</span></Label>
                <Select value={form.company} onValueChange={v => setForm(f => ({...f, company: v || ""}))}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Select Company"/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    {allAvailableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {[
                { id: "tradeLicenseNumber", label: "Branch Trade License Number" },
                { id: "location", label: "Branch Location" },
                { id: "contactPerson", label: "Branch Contact Person" },
                { id: "phone", label: "Branch Phone" },
                { id: "email", label: "Branch Email" },
                { id: "address", label: "Branch Address" },
              ].map(field => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</Label>
                  <Input value={(form as any)[field.id]} onChange={e => setForm(f => ({...f, [field.id]: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch Status *</Label>
                <select 
                  value={form.status} 
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">{editBranch ? "Save Changes" : "Create Branch"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteBranch(deleteId!); toast.success("Branch deleted"); setDeleteId(null); }} title="Delete Branch" description="Permanently remove this branch and its associated data." confirmText="Delete" variant="danger" />
    </div>
  );
}
