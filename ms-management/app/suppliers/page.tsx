"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Store, Phone, Mail, MapPin, Trash2, Edit, Sparkles, Send, Check, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { exportToCSV } from "@/lib/utils";
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
import { Supplier } from "@/lib/types";
import { NATIONALITIES } from "@/lib/constants";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";
import { filterRecordsByPermission } from "@/lib/rbac";

export default function SuppliersPage() {
  const { currentRole, currentUser, suppliers, addSupplier, updateSupplier, deleteSupplier, addActivityLog, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canView = hasPermission("suppliers", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [modal, setModal] = useState(false);
  const [editSup, setEditSup] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", nationality: "India", mobile: "", whatsapp: "", email: "", notes: "", company: "", branch: "" });

  // Email Broadcaster states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetMode, setEmailTargetMode] = useState<"all" | "specific">("all");
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [emailTemplateType, setEmailTemplateType] = useState<"Manpower Request" | "Gift / Greeting" | "Custom">("Custom");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [specificSupplierSearch, setSpecificSupplierSearch] = useState("");

  const isSuperAdmin = currentRole === "Super Admin";
  const allAvailableCompanies = Array.from(new Set(suppliers.map(s => (s as any).company).filter(Boolean)));

  const f = filters.suppliers || { page: 1, pageSize: 10 };
  // Apply company and permission scoping (VIEW vs VIEW ALL)
  let list = filterRecordsByPermission("suppliers", suppliers, currentUser, currentRole, hasPermission);
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(s => (s.name ?? "").toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(s => s.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(s => (s as any).company === f.company);
  if (f.fromDate) list = list.filter(s => s.createdAt >= f.fromDate);
  if (f.toDate) list = list.filter(s => s.createdAt <= f.toDate);
  
  list = [...list].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile) { toast.error("Name and mobile are required"); return; }
    const flag = NATIONALITIES.find(n => n.name === form.nationality)?.flag || "🏳️";
    if (editSup) {
      updateSupplier({ ...editSup, ...form, nationalityFlag: flag });
      toast.success("Supplier updated");
    } else {
      const id = `SUP-${Math.floor(100+Math.random()*900)}`;
      addSupplier({ ...form, id, nationalityFlag: flag, status: "Active", documents: [], createdBy: currentUser.name, createdAt: new Date().toISOString().slice(0,10), company: isSuperAdmin ? (form.company || "System") : currentUser.company } as any);
      toast.success("Supplier added");
    }
    setModal(false); setEditSup(null);
    setForm({ name: "", nationality: "India", mobile: "", whatsapp: "", email: "", notes: "", company: "", branch: "" });
  };

  const handleTemplateChange = (type: "Manpower Request" | "Gift / Greeting" | "Custom") => {
    setEmailTemplateType(type);
    if (type === "Manpower Request") {
      setEmailSubject("Urgent Manpower Requirement");
      setEmailBody("Dear Supplier,\n\nWe have an urgent requirement for skilled personnel in our upcoming projects. Please review our latest requisition list and submit candidate profiles as soon as possible.\n\nBest Regards,\nMS Company Procurement Team");
    } else if (type === "Gift / Greeting") {
      setEmailSubject("Thank You for Your Partnership");
      setEmailBody("Dear Supplier,\n\nWe would like to extend our gratitude for your continuous support and excellent service. As a token of our appreciation, please find the details of our partner reward enclosed.\n\nBest Regards,\nMS Company Management");
    } else {
      setEmailSubject("");
      setEmailBody("");
    }
  };

  const handleOpenSpecificEmail = (supplier: any) => {
    setEmailTargetMode("specific");
    setSelectedSupplierIds([supplier.id]);
    setEmailTemplateType("Custom");
    setEmailSubject("");
    setEmailBody("");
    setIsEmailModalOpen(true);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Subject and Body are required fields.");
      return;
    }

    let targets = list;
    if (emailTargetMode === "specific") {
      if (selectedSupplierIds.length === 0) { toast.error("Please select at least one specific supplier."); return; }
      targets = targets.filter(s => selectedSupplierIds.includes(s.id));
    }

    if (targets.length === 0) {
      toast.error("No recipients found matching the chosen filters.");
      return;
    }

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setIsEmailModalOpen(false);
      
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Email Sent",
        module: "Suppliers",
        oldValue: null,
        newValue: `Broadcasted "${emailSubject}" via ${emailTemplateType} template to ${targets.length} suppliers. Filter Mode: ${emailTargetMode}`,
        ipAddress: "192.168.1.102"
      });

      toast.success(`Successfully dispatched ${targets.length} emails to targeted suppliers!`);
      
      setEmailSubject("");
      setEmailBody("");
      setSelectedSupplierIds([]);
    }, 1200);
  };

  const filteredSpecificSuppliers = list.filter(s =>
    s.name.toLowerCase().includes(specificSupplierSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(specificSupplierSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title="Supplier Management" 
        subtitle="Manage external manpower suppliers and agencies"
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setEmailTargetMode("all");
                setSelectedSupplierIds([]);
                setEmailTemplateType("Custom");
                setEmailSubject("");
                setEmailBody("");
                setIsEmailModalOpen(true);
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-md shadow-emerald-500/10"
            >
              <Sparkles className="w-4 h-4" />
              Offer Mails
            </Button>
            <Button onClick={() => { setEditSup(null); setForm({ name:"",nationality:"India",mobile:"",whatsapp:"",email:"",notes:"", company: isSuperAdmin ? "System" : currentUser.company, branch: currentUser.branch }); setModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>Add Supplier</Button>
          </div>
        }
      />
      <FilterBar moduleKey="suppliers" statusOptions={["Active","Inactive"]} showNationality onExport={() => { exportToCSV(list.map(s=>({ID:s.id,Name:s.name,Nationality:s.nationality,Mobile:s.mobile,Email:s.email,Status:s.status})),"suppliers"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No suppliers found" action={<Button onClick={() => setModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Add Supplier</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(s => (
              <Card key={s.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100"><Store className="w-5 h-5"/></div>
                    <div>
                      <Link href={`/suppliers/${s.id}`} className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors block">{s.name} <span className="text-sm">{s.nationalityFlag}</span></Link>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.id}</div>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400"/> {s.mobile} {s.whatsapp && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 rounded ml-1">WA</span>}</div>
                  {s.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400"/> {s.email}</div>}
                  <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {s.nationality}</div>
                </div>
                {s.notes && <div className="text-[10px] text-slate-500 italic px-1 line-clamp-2">&ldquo;{s.notes}&rdquo;</div>}
                
                <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 justify-between">
                   <button 
                      onClick={() => handleOpenSpecificEmail(s)}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 focus:outline-none"
                      title="Send Promo / Request Offer to this supplier"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-500" /> Send Offer
                    </button>
                    <div className="flex gap-2">
                        <Link href={`/suppliers/${s.id}`}>
                            <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-bold border-slate-200 h-8 gap-1">Details</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => { setEditSup(s); setForm({ name:s.name,nationality:s.nationality,mobile:s.mobile,whatsapp:s.whatsapp || "",email:s.email || "",notes:s.notes || "", company: (s as any).company || "", branch: (s as any).branch || "" }); setModal(true); }} className="rounded-xl text-[10px] font-bold border-slate-200 h-8 px-3">Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-8 px-3"><Trash2 className="w-3.5 h-3.5"/></Button>
                    </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Pagination moduleKey="suppliers" totalItems={totalItems} />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-md w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <DialogTitle className="text-base font-bold text-slate-800">{editSup ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Register details of manpower agencies or independent suppliers.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0">
              <div className="space-y-1 col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agency/Supplier Name <span className="text-rose-500">*</span></Label>
                <Input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              {isSuperAdmin && (
                <div className="space-y-1 col-span-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Assignment</Label>
                  <select value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3">
                    <option value="System">System (All)</option>
                    {allAvailableCompanies.map((c: any) => c !== "System" && <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile <span className="text-rose-500">*</span></Label>
                <Input required value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp</Label>
                <Input value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Country / Origin <span className="text-rose-500">*</span></Label>
                <select value={form.nationality} onChange={e => setForm(f => ({...f, nationality: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3">
                  {NATIONALITIES.map(n => <option key={n.name} value={n.name}>{n.flag} {n.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">{editSup ? "Save Changes" : "Add Supplier"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteSupplier(deleteId!); toast.success("Supplier deleted"); setDeleteId(null); }} title="Delete Supplier" description="Permanently delete this supplier." confirmText="Delete" variant="danger" />

      {/* Offer Mails Broadcaster Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Supplier Offer Mails
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Send targeted requests, promotions, or custom notifications to manpower suppliers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Recipient Targeting Mode */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Recipient Group</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: "all", label: "All Suppliers" },
                    { key: "specific", label: "Select Specific" }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setEmailTargetMode(opt.key as any)}
                      className={`py-2 px-3 text-center border rounded-xl font-bold transition-all text-[11px] ${
                        emailTargetMode === opt.key 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific selection checklist */}
              {emailTargetMode === "specific" && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Choose Suppliers</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search supplier name..."
                      value={specificSupplierSearch}
                      onChange={e => setSpecificSupplierSearch(e.target.value)}
                      className="pl-8 bg-white border-slate-200 text-[11px] h-8 rounded-lg"
                    />
                  </div>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-100">
                    {filteredSpecificSuppliers.map(s => {
                      const isSelected = selectedSupplierIds.includes(s.id);
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSupplierIds(selectedSupplierIds.filter(id => id !== s.id));
                            } else {
                              setSelectedSupplierIds([...selectedSupplierIds, s.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-[11px] font-semibold ${
                            isSelected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span>{s.name} <span className="text-[9px] text-slate-400 font-normal">({s.id})</span></span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                      );
                    })}
                    {filteredSpecificSuppliers.length === 0 && (
                      <div className="text-center py-4 text-slate-400 italic">No suppliers found</div>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    {selectedSupplierIds.length} supplier(s) selected
                  </div>
                </div>
              )}

              {/* Template selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Promotion Template Type</Label>
                <div className="flex gap-2">
                  {[
                    { key: "Custom", label: "Custom Msg" },
                    { key: "Manpower Request", label: "Manpower Request" },
                    { key: "Gift / Greeting", label: "Gift / Greeting" }
                  ].map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleTemplateChange(t.key as any)}
                      className={`flex-1 py-1.5 border rounded-lg text-center font-bold text-[10px] ${
                        emailTemplateType === t.key 
                          ? "bg-slate-900 border-slate-900 text-white" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Subject Line</Label>
                <Input
                  required
                  placeholder="Subject line..."
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Message Content</Label>
                <textarea
                  required
                  rows={5}
                  placeholder="Type email body template..."
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none font-sans"
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-xs rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 h-10 gap-1.5 shadow-md shadow-emerald-500/10"
              >
                {isSending ? (
                  <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Broadcasting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Broadcast
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
