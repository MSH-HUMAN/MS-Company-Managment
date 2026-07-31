"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, MapPin, Users, Phone, Mail, Trash2, Eye, Calendar, Database, ToggleLeft, ToggleRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { getStatusColor } from "@/lib/utils";
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
import { toast } from "sonner";
import { InternalCompany } from "@/lib/types";

export default function OwnCompaniesPage() {
  const { currentRole, currentUser, ownCompanies, addOwnCompany, updateOwnCompany, deleteOwnCompany, addActivityLog } = useAuthStore();
  const { filters } = useFilterStore();
  const [addModal, setAddModal] = useState(false);
  const [editCompany, setEditCompany] = useState<InternalCompany | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: "", telephone: "", email: "", address: "", notes: "", 
    subscriptionPlan: "Basic" as "Basic" | "Pro" | "Enterprise", 
    licenseExpiry: "", maxUsers: 10, maxStorage: 5,
    logo: null as string | null,
    type: "" as "Main Company" | "Sub Company" | "",
    branch: "", location: "", country: "", district: "", province: "", city: ""
  });

  const f = filters.companies || {};

  // Super Admin only can see own companies page
  if (currentRole !== "Super Admin") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Internal SaaS Companies" />
        <div className="p-12"><EmptyState title="Access Restricted" description="You do not have permission to view the SaaS tenant management module. Contact your Super Admin." /></div>
      </div>
    );
  }

  let list = [...ownCompanies];
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(c => c.status === f.status);
  
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page - 1) * pageSize, page * pageSize);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        setLogoPreview(url);
        setForm(f => ({ ...f, logo: url }));
        toast.success("Logo attached");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editCompany) {
      updateOwnCompany({ ...editCompany, ...form });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Edited", module: "Companies", oldValue: editCompany.name, newValue: form.name, ipAddress: "192.168.1.102" });
      toast.success("SaaS Tenant updated");
    } else {
      const id = `OWN-${String(Math.floor(100 + Math.random() * 900))}`;
      addOwnCompany({ ...form, id, status: "Active", branches: 0, staff: 0, createdAt: new Date().toISOString().slice(0,10), createdBy: currentUser.name });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Companies", oldValue: null, newValue: `Created SaaS tenant: ${form.name}`, ipAddress: "192.168.1.102" });
      toast.success(`Tenant "${form.name}" created`);
    }
    setAddModal(false); setEditCompany(null); setLogoPreview(null);
    setForm({ name: "", telephone: "", email: "", address: "", notes: "", subscriptionPlan: "Basic", licenseExpiry: "", maxUsers: 10, maxStorage: 5, logo: null, type: "", branch: "", location: "", country: "", district: "", province: "", city: "" });
  };

  const openEdit = (c: InternalCompany) => {
    setEditCompany(c);
    setLogoPreview(c.logo || null);
    setForm({ name: c.name, telephone: c.telephone, email: c.email, address: c.address, notes: c.notes || "", subscriptionPlan: c.subscriptionPlan, licenseExpiry: c.licenseExpiry, maxUsers: c.maxUsers, maxStorage: c.maxStorage, logo: c.logo || null, type: c.type || "", branch: c.branch || "", location: c.location || "", country: c.country || "", district: c.district || "", province: c.province || "", city: c.city || "" });
    setAddModal(true);
  };

  const handleToggleStatus = (c: InternalCompany) => {
    const newStatus = c.status === "Active" ? "Inactive" : "Active";
    updateOwnCompany({ ...c, status: newStatus });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Companies", oldValue: c.status, newValue: newStatus, ipAddress: "192.168.1.102" });
    toast.success(`Tenant ${newStatus === "Active" ? "enabled" : "disabled"}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Own Company Management" subtitle="Manage internal SaaS tenants and agencies"
        actions={<Button onClick={() => { setEditCompany(null); setLogoPreview(null); setForm({ name:"",telephone:"",email:"",address:"",notes:"",subscriptionPlan:"Basic",licenseExpiry:"",maxUsers:10,maxStorage:5,logo:null, type: "", branch: "", location: "", country: "", district: "", province: "", city: "" }); setAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>Add Internal Company</Button>}
      />
      <FilterBar moduleKey="companies" statusOptions={["Active","Inactive","Suspended"]} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No internal companies found" action={<Button onClick={() => setAddModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Add Internal Company</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(c => {
              const isExpired = new Date(c.licenseExpiry) < new Date();
              return (
              <Card key={c.id} className={`rounded-2xl border ${isExpired ? 'border-rose-200 bg-rose-50/10' : 'border-slate-100 bg-white'} p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${isExpired ? 'bg-rose-100 text-rose-600' : 'bg-blue-50 border border-blue-100 text-blue-600'}`}>
                      {c.logo ? (
                        <img src={c.logo} alt={c.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Building2 className="w-5 h-5"/>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{c.id}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                
                {/* Subscription Badge Block */}
                <div className={`mt-2 p-2.5 rounded-xl border ${isExpired ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'} flex items-center justify-between`}>
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider block opacity-70">Subscription Plan</span>
                    <span className="text-xs font-bold">{c.subscriptionPlan} Tier</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider block opacity-70">License Expiry</span>
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {c.licenseExpiry || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center mt-1">
                  {[{ label: "Max Users", value: c.maxUsers, icon: Users }, { label: "Storage", value: c.maxStorage + ' GB', icon: Database }].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center justify-center gap-2">
                      <s.icon className="w-4 h-4 text-slate-400" />
                      <div className="text-left">
                        <div className="text-xs font-extrabold text-slate-800">{s.value}</div>
                        <div className="text-[9px] text-slate-400 font-bold">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 flex-1 mt-2">
                  <div className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>{c.email}</div>
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>{c.telephone}</div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex gap-2">
                  <Link href={`/own-companies/${c.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] font-bold border-slate-200 h-8 gap-1"><Eye className="w-3.5 h-3.5"/>Details</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="rounded-xl text-[10px] font-bold border-slate-200 h-8 px-3">Edit</Button>
                  
                  {/* Status Toggle (Enable/Disable) */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleToggleStatus(c)} 
                    className={`rounded-xl text-[10px] font-bold border-slate-200 h-8 px-3 ${c.status === 'Active' ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 border-amber-200' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200'}`}
                    title={c.status === 'Active' ? 'Disable Tenant' : 'Enable Tenant'}
                  >
                    {c.status === 'Active' ? <ToggleLeft className="w-4 h-4"/> : <ToggleRight className="w-4 h-4"/>}
                  </Button>
                  
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-8 px-3"><Trash2 className="w-3.5 h-3.5"/></Button>
                </div>
              </Card>
            )})}
          </div>
        )}
      </div>
      <Pagination moduleKey="companies" totalItems={totalItems} />

      {/* Add/Edit Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">{editCompany ? "Edit SaaS Tenant" : "Add New SaaS Tenant"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Configure internal agency settings and subscription limits.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Type *</Label>
                <select 
                  required
                  value={form.type} 
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 outline-none text-slate-700"
                >
                  <option value="">Select Type</option>
                  <option value="Main Company">Main Company</option>
                  <option value="Sub Company">Sub Company</option>
                </select>
              </div>

              {form.type && (
                <>
                  {[
                    { id: "name", label: "Agency Name", req: true },
                    { id: "branch", label: "Branch", req: true },
                    { id: "email", label: "Email Address", req: true },
                    { id: "telephone", label: "Telephone" },
                    { id: "location", label: "Location" },
                    { id: "country", label: "Country" },
                    { id: "province", label: "Province" },
                    { id: "district", label: "District" },
                    { id: "city", label: "City" },
                  ].map(field => (
                    <div key={field.id} className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}{field.req && <span className="text-rose-500"> *</span>}</Label>
                      <Input required={field.req} value={(form as any)[field.id]} onChange={e => setForm(f => ({ ...f, [field.id]: e.target.value }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>
                  ))}
                </>
              )}
              
              <div className="space-y-1 sm:col-span-2 mt-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800">Subscription & License Config</Label>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plan Tier *</Label>
                <select 
                  value={form.subscriptionPlan} 
                  onChange={e => setForm(f => ({ ...f, subscriptionPlan: e.target.value as any }))}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">License Expiry *</Label>
                <Input type="date" required value={form.licenseExpiry} onChange={e => setForm(f => ({ ...f, licenseExpiry: e.target.value }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Users</Label>
                <Input type="number" required value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: parseInt(e.target.value) }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Storage Limit (GB)</Label>
                <Input type="number" required value={form.maxStorage} onChange={e => setForm(f => ({ ...f, maxStorage: parseInt(e.target.value) }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">{editCompany ? "Save Changes" : "Create SaaS Tenant"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteOwnCompany(deleteId!); toast.success("SaaS Tenant deleted"); setDeleteId(null); }} title="Delete Tenant" description="This will permanently remove the internal agency. This is irreversible." confirmText="Delete Tenant" variant="danger" />
    </div>
  );
}
