"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, MapPin, Users, Phone, Mail, Trash2, Eye, FileText, Upload, Calendar, AlertTriangle, GitBranch, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { getStatusColor, exportToCSV } from "@/lib/utils";
import AccessDenied from "@/components/shared/AccessDenied";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CompaniesPage() {
  const { currentRole, currentUser, companies, branches, addCompany, updateCompany, deleteCompany, addActivityLog, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canViewCompanies = hasPermission("companies", "view");
  if (!canViewCompanies) {
    return <AccessDenied />;
  }
  const [addModal, setAddModal] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState("list");
  const [form, setForm] = useState<{
    name: string; telephone: string; hrMobile: string; ownerMobile: string;
    whatsapp: string; email: string; address: string; notes: string;
    googleMapLink: string; logo: string | null; documents: any[];
    tradeLicenseNumber: string; licenseIssueDate: string; licenseExpiryDate: string;
    companyType: string; ownerName: string; emirateLocation: string; trnNumber: string;
    status: "Active" | "Inactive" | "Suspended";
    separateDatabase: boolean; databaseStatus: "Not Provisioned" | "Provisioning" | "Ready";
    brandColor: string; secondaryColor: string; website: string; description: string;
    themeConfig: any;
  }>({ 
    name: "", telephone: "", hrMobile: "", ownerMobile: "", whatsapp: "", email: "", address: "", notes: "", googleMapLink: "", logo: null, documents: [],
    tradeLicenseNumber: "", licenseIssueDate: "", licenseExpiryDate: "", companyType: "", ownerName: "", emirateLocation: "", trnNumber: "", status: "Active",
    separateDatabase: true, databaseStatus: "Ready",
    brandColor: "#1e293b", secondaryColor: "#3b82f6", website: "", description: "",
    themeConfig: null
  });

  const f = filters.companies;

  // Super Admin only can see companies page
  if (currentRole !== "Super Admin") {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader title="Client Companies" />
        <div className="p-12"><EmptyState title="Access Restricted" description="You do not have permission to view the client company management module. Contact your Super Admin." /></div>
      </div>
    );
  }

  let list = [...companies];
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(c => c.status === f.status);
  const sortBy = f.sortBy || "newest";
  list = [...list].sort((a, b) => sortBy === "name_asc" ? a.name.localeCompare(b.name) : sortBy === "name_desc" ? b.name.localeCompare(a.name) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
        
        // Auto-generate matching brand colors on logo upload
        const logoColors = {
          primaryColor: "#0f766e", // Teal Logo Accent
          secondaryColor: "#0d9488",
          accentColor: "#0f766e",
          buttonColor: "#0f766e",
          headerColor: "#ffffff",
          sidebarColor: "#042f2e", // Deep Slate Teal
          cardColor: "#ffffff",
          tableHeaderColor: "#f0fdfa",
          notificationColor: "#e11d48",
          backgroundColor: "#f8fafc",
          textColor: "#0f172a",
          borderColor: "#e2e8f0"
        };

        setForm(f => ({ 
          ...f, 
          logo: url,
          brandColor: "#0f766e",
          secondaryColor: "#0d9488",
          themeConfig: logoColors
        }));
        toast.success("Logo uploaded & matching branding colors applied automatically!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs = Array.from(files).map((file, i) => ({
        id: `DOC-COM-${Date.now()}-${i}`,
        name: file.name,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        type: file.name.split('.').pop() || "other",
      }));
      setForm(f => ({ ...f, documents: [...(f.documents || []), ...newDocs] }));
      toast.success(`Attached ${files.length} document(s)`);
    }
  };

  const handleCardDocUpload = (e: React.ChangeEvent<HTMLInputElement>, c: any) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs = Array.from(files).map((file, i) => ({
        id: `DOC-COM-${Date.now()}-${i}`,
        name: file.name,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        type: file.name.split('.').pop() || "other",
      }));
      updateCompany({ ...c, documents: [...(c.documents || []), ...newDocs] });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Document Uploaded", module: "Companies", oldValue: c.name, newValue: `Uploaded ${files.length} doc(s)`, ipAddress: "192.168.1.102" });
      toast.success(`Attached ${files.length} document(s) to ${c.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editCompany) {
      updateCompany({ ...editCompany, ...form });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Edited", module: "Companies", oldValue: editCompany.name, newValue: form.name, ipAddress: "192.168.1.102" });
      toast.success("Company updated");
    } else {
      const id = `COM${String(Math.floor(100 + Math.random() * 900))}`;
      addCompany({ ...form, id, status: form.status || "Active", branches: 0, staff: 0, applicants: 0, createdAt: new Date().toISOString().slice(0,10), createdBy: currentUser.name });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Companies", oldValue: null, newValue: `Created company: ${form.name}`, ipAddress: "192.168.1.102" });
      toast.success(`Company "${form.name}" created`);
    }
    setAddModal(false); setEditCompany(null); setLogoPreview(null);
    setForm({ name: "", telephone: "", hrMobile: "", ownerMobile: "", whatsapp: "", email: "", address: "", notes: "", googleMapLink: "", logo: null, documents: [], tradeLicenseNumber: "", licenseIssueDate: "", licenseExpiryDate: "", companyType: "", ownerName: "", emirateLocation: "", trnNumber: "", status: "Active", separateDatabase: true, databaseStatus: "Ready", brandColor: "#1e293b", secondaryColor: "#3b82f6", website: "", description: "", themeConfig: null });
  };

  const openEdit = (c: any) => {
    setEditCompany(c);
    setLogoPreview(c.logo || null);
    
    // Parse themeConfig safely
    let tc = c.themeConfig;
    if (tc && typeof tc === "string") {
      try { tc = JSON.parse(tc); } catch(e) { tc = null; }
    }
    if (!tc) {
      tc = {
        primaryColor: c.brandColor || "#3B82F6",
        secondaryColor: c.secondaryColor || "#64748b",
        accentColor: c.brandColor || "#3B82F6",
        buttonColor: c.brandColor || "#3B82F6",
        headerColor: "#ffffff",
        sidebarColor: "#0A0F1C",
        cardColor: "#ffffff",
        tableHeaderColor: "#f8fafc",
        notificationColor: "#ef4444",
        backgroundColor: "#f8fafc",
        textColor: "#0f172a",
        borderColor: "#e2e8f0"
      };
    }

    setForm({ 
      name: c.name, telephone: c.telephone, hrMobile: c.hrMobile, ownerMobile: c.ownerMobile, whatsapp: c.whatsapp, email: c.email, address: c.address, notes: c.notes || "", googleMapLink: c.googleMapLink || "", logo: c.logo || null, documents: c.documents || [],
      tradeLicenseNumber: c.tradeLicenseNumber || "", licenseIssueDate: c.licenseIssueDate || "", licenseExpiryDate: c.licenseExpiryDate || "", companyType: c.companyType || "", ownerName: c.ownerName || "", emirateLocation: c.emirateLocation || "", trnNumber: c.trnNumber || "", status: c.status || "Active",
      separateDatabase: c.separateDatabase !== false, databaseStatus: c.databaseStatus || (c.separateDatabase !== false ? "Ready" : "Not Provisioned"),
      brandColor: c.brandColor || "#1e293b", secondaryColor: c.secondaryColor || "#3b82f6", website: c.website || "", description: c.description || "",
      themeConfig: tc
    });
    setAddModal(true);
  };

  const handleToggleStatus = (c: any) => {
    const newStatus = c.status === "Active" ? "Inactive" : "Active";
    updateCompany({ ...c, status: newStatus });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Companies", oldValue: c.status, newValue: newStatus, ipAddress: "192.168.1.102" });
    toast.success(`Company ${newStatus === "Active" ? "enabled" : "disabled"}`);
  };

  // License Expiry stats calculations
  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const totalMainCompanies = companies.length;
  const totalBranches = branches.length;
  const activeCompaniesCount = companies.filter(c => c.status === "Active").length;
  const expiredLicensesCount = companies.filter(c => isExpired(c.licenseExpiryDate)).length;
  const expiringSoonCount = companies.filter(c => isExpiringSoon(c.licenseExpiryDate)).length;

  return (
    <div className="flex flex-col select-none">
      <PageHeader title="Client Company Management" subtitle="Manage all registered client companies and their settings"
        actions={<Button onClick={() => { setEditCompany(null); setLogoPreview(null); setForm({ name:"",telephone:"",hrMobile:"",ownerMobile:"",whatsapp:"",email:"",address:"",notes:"",googleMapLink:"",logo:null,documents:[], tradeLicenseNumber: "", licenseIssueDate: "", licenseExpiryDate: "", companyType: "", ownerName: "", emirateLocation: "", trnNumber: "", status: "Active", separateDatabase: true, databaseStatus: "Ready", brandColor: "#1e293b", secondaryColor: "#3b82f6", website: "", description: "", themeConfig: null }); setAddModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>Add Client Company</Button>}
      />
 
      {/* Stats Cards Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4 md:px-6 py-4 bg-slate-50 border-b border-slate-100">
        {[
          { label: "Total Companies", value: totalMainCompanies, icon: Building2, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Total Branches", value: totalBranches, icon: GitBranch, color: "text-purple-600 bg-purple-50 border-purple-100" },
          { label: "Active Companies", value: activeCompaniesCount, icon: Building2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Expired Licenses", value: expiredLicensesCount, icon: ShieldAlert, color: "text-rose-600 bg-rose-50 border-rose-100" },
          { label: "Expiring Soon", value: expiringSoonCount, icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-100" },
        ].map(s => (
          <Card key={s.label} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm hover:shadow-md transition-all flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-black text-slate-800">{s.value}</div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>
 
      <Tabs value={activeViewTab} onValueChange={setActiveViewTab} className="flex flex-col">
        <div className="px-4 md:px-6 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto flex text-xs">
            <TabsTrigger value="list" className="rounded-lg py-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Company Directory</TabsTrigger>
            <TabsTrigger value="dashboard" className="rounded-lg py-2 flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5"/>Company-wise Branches</TabsTrigger>
          </TabsList>
        </div>
 
        <TabsContent value="list" className="focus-visible:outline-none">
          <FilterBar moduleKey="companies" statusOptions={["Active","Inactive","Suspended"]} onExport={() => { exportToCSV(list.map(c=>({ID:c.id,Name:c.name,Email:c.email,Status:c.status,Branches:c.branches,Staff:c.staff})),"companies"); toast.success("Exported"); }} />
 
          <div className="p-4 md:p-6">
            {paginated.length === 0 ? (
              <EmptyState title="No client companies found" action={<Button onClick={() => setAddModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Add Client Company</Button>} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginated.map(c => {
                  const isLicenseExpired = isExpired(c.licenseExpiryDate);
                  const isLicenseSoon = isExpiringSoon(c.licenseExpiryDate);
                  return (
                    <Card key={c.id} className={`rounded-2xl border p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ${
                      isLicenseExpired ? "border-rose-200 bg-rose-50/5" : isLicenseSoon ? "border-amber-200 bg-amber-50/5" : "border-slate-100"
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 overflow-hidden flex-shrink-0">
                            {c.logo ? (
                              <img src={c.logo} alt={c.name} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <Building2 className="w-5 h-5"/>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{c.id} · {c.companyType || "Main Company"}</div>
                          </div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      
                      {/* Trade License Quick Stats */}
                      {(c.tradeLicenseNumber || c.licenseExpiryDate) && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                          isLicenseExpired ? "bg-rose-50 border-rose-100 text-rose-700" :
                          isLicenseSoon ? "bg-amber-50 border-amber-100 text-amber-700" :
                          "bg-slate-50 border-slate-100 text-slate-600"
                        }`}>
                          <div>
                            <span className="text-[9px] font-black uppercase opacity-70 block">Trade License</span>
                            <span className="font-bold">{c.tradeLicenseNumber || "N/A"}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase opacity-70 block">Expiry Date</span>
                            <span className="font-bold flex items-center gap-1 justify-end">
                              <Calendar className="w-3.5 h-3.5" /> {c.licenseExpiryDate || "N/A"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-center">
                        {[{ label: "Branches", value: branches.filter(b => b.companyId === c.id || b.company === c.name).length }, { label: "Staff", value: c.staff }, { label: "Applicants", value: c.applicants }].map(s => (
                          <div key={s.label} className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                            <div className="text-sm font-extrabold text-slate-800">{s.value}</div>
                            <div className="text-[9px] text-slate-400 font-bold">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600 flex-1">
                        <div className="flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>{c.email}</div>
                        <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>{c.telephone}</div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Owner Name</span>
                            <span className="font-semibold text-slate-700 truncate">{c.ownerName || "N/A"}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location</span>
                            <span className="font-semibold text-slate-700 truncate">{c.emirateLocation || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex gap-2">
                        <Link href={`/companies/${c.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] font-bold border-slate-200 h-8 gap-1"><Eye className="w-3.5 h-3.5"/>Details</Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="rounded-xl text-[10px] font-bold border-slate-200 h-8 px-3">Edit</Button>
                        
                        <label className="cursor-pointer">
                          <input type="file" multiple className="hidden" onChange={(e) => handleCardDocUpload(e, c)} />
                          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title={`Upload Documents (${(c.documents || []).length} existing)`}>
                            <Upload className="w-3.5 h-3.5"/>
                          </div>
                        </label>
                        
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-bold h-8 px-3"><Trash2 className="w-3.5 h-3.5"/></Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          <Pagination moduleKey="companies" totalItems={totalItems} />
        </TabsContent>

        <TabsContent value="dashboard" className="p-4 md:p-6 space-y-6 focus-visible:outline-none bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel: Expiry Alerts */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  License Status & Expirations
                </h3>
                <div className="space-y-3">
                  {companies.filter(c => isExpired(c.licenseExpiryDate) || isExpiringSoon(c.licenseExpiryDate)).length === 0 ? (
                    <div className="text-xs text-slate-400 italic text-center py-6">All company licenses are active and up to date.</div>
                  ) : (
                    companies.filter(c => isExpired(c.licenseExpiryDate) || isExpiringSoon(c.licenseExpiryDate)).map(c => {
                      const expired = isExpired(c.licenseExpiryDate);
                      return (
                        <div key={c.id} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          expired ? "bg-rose-50/50 border-rose-100 text-rose-700" : "bg-amber-50/50 border-amber-100 text-amber-700"
                        }`}>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{c.name}</div>
                            <div className="text-[10px] font-medium opacity-80">License: {c.tradeLicenseNumber || "N/A"}</div>
                            <div className="text-[10px] font-bold mt-1">Expiry: {c.licenseExpiryDate || "N/A"}</div>
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            expired ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                          }`}>
                            {expired ? "Expired" : "Soon"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Right Panel: Company-wise Branch List */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-purple-600" />
                    Company-wise Branch Listing
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Hierarchical layout of Main Companies and their linked Branches.</p>
                </div>
                <div className="space-y-4">
                  {companies.map(c => {
                    const companyBranches = branches.filter(b => b.companyId === c.id || b.company === c.name);
                    return (
                      <div key={c.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-3 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{c.name}</div>
                              <div className="text-[9px] text-slate-400 font-semibold">Location: {c.emirateLocation || "N/A"} · {companyBranches.length} branch(es)</div>
                            </div>
                          </div>
                          <Link href={`/companies/${c.id}`}>
                            <Button size="sm" variant="ghost" className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg px-2 h-7">Manage</Button>
                          </Link>
                        </div>
                        
                        {companyBranches.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic pl-12">No branches linked to this company.</div>
                        ) : (
                          <div className="pl-6 border-l border-slate-200 space-y-2">
                            {companyBranches.map(b => (
                              <div key={b.id} className="bg-white border border-slate-100 rounded-lg p-2.5 flex items-center justify-between text-[11px]">
                                <div>
                                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                    {b.name}
                                    <span className="text-[9px] font-normal text-slate-400 font-mono">({b.id})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Contact: {b.contactPerson || "N/A"} · Loc: {b.location || "N/A"}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                    b.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {b.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
            
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">{editCompany ? "Edit Client Company" : "Add New Client Company"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Fill in the client company details. All required fields must be completed.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: "name", label: "Company Name", req: true },
                { id: "email", label: "Company Email", type: "email", req: true },
                { id: "ownerName", label: "Contact Person / Owner Name", req: true },
                { id: "hrMobile", label: "Mobile Number", req: true },
                { id: "emirateLocation", label: "Country / Location", req: true },
                { id: "companyType", label: "Company Type (Optional)", req: false },
                { id: "tradeLicenseNumber", label: "Trade License Number (Optional)", req: false },
                { id: "trnNumber", label: "TRN Number (Optional)", req: false },
                { id: "licenseIssueDate", label: "License Issue Date (Optional)", type: "date", req: false },
                { id: "licenseExpiryDate", label: "License Expiry Date (Optional)", type: "date", req: false },
                { id: "telephone", label: "Telephone (Optional)", req: false },
                { id: "ownerMobile", label: "Owner Mobile (Optional)", req: false },
                { id: "whatsapp", label: "WhatsApp (Optional)", req: false },
              ].map(field => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{field.label}{field.req && <span className="text-rose-500"> *</span>}</Label>
                  <Input required={field.req} type={field.type || "text"} value={(form as any)[field.id]} onChange={e => setForm(f => ({ ...f, [field.id]: e.target.value }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status *</Label>
                <select 
                  value={form.status || "Active"} 
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Database Isolation</Label>
                <select 
                  value={form.separateDatabase ? "true" : "false"} 
                  onChange={e => setForm(f => ({ ...f, separateDatabase: e.target.value === "true", databaseStatus: e.target.value === "true" ? "Ready" : "Not Provisioned" }))}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  <option value="true">Dedicated Schema (Isolated)</option>
                  <option value="false">Shared Schema (Filtered)</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Logo</Label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer">
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                  </label>
                  {logoPreview && (
                    <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 shadow-sm">
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {logoPreview && (
                    <button type="button" onClick={() => { setLogoPreview(null); setForm(f => ({ ...f, logo: null })); }} className="text-rose-500 hover:text-rose-700 text-[10px] font-bold flex-shrink-0">Remove</button>
                  )}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Map Link</Label>
                <Input value={form.googleMapLink} onChange={e => setForm(f => ({ ...f, googleMapLink: e.target.value }))} placeholder="https://maps.google.com/..." className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upload Documents</Label>
                <Input type="file" multiple onChange={handleDocsUpload} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              {form.documents && form.documents.length > 0 && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uploaded Documents ({form.documents.length})</Label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {form.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs border border-slate-100">
                        <span className="truncate max-w-[300px] text-slate-700 font-medium">{doc.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((d: any) => d.id !== doc.id) }))} 
                          className="text-rose-500 hover:text-rose-700 font-bold text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* ── Custom Theme Branding Colors ── */}
              <div className="space-y-2 sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Custom Theme Branding</h4>
                <p className="text-[10px] text-slate-400 font-semibold">Customize company-specific theme colors. Theme changes instantly apply to this company's users.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {[
                    { label: "Primary Theme Color", key: "primaryColor", def: "#3B82F6" },
                    { label: "Secondary Theme Color", key: "secondaryColor", def: "#64748b" },
                    { label: "Accent Color", key: "accentColor", def: "#3B82F6" },
                    { label: "Button Color", key: "buttonColor", def: "#3b82f6" },
                    { label: "Header Color", key: "headerColor", def: "#ffffff" },
                    { label: "Sidebar Color", key: "sidebarColor", def: "#0A0F1C" },
                    { label: "Card Color", key: "cardColor", def: "#ffffff" },
                    { label: "Table Header Color", key: "tableHeaderColor", def: "#f8fafc" },
                    { label: "Notification Color", key: "notificationColor", def: "#ef4444" },
                  ].map(({ label, key, def }) => {
                    const currentVal = (form.themeConfig && form.themeConfig[key]) || def;
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={currentVal}
                            onChange={e => {
                              const tc = form.themeConfig || {
                                primaryColor: form.brandColor || "#3B82F6",
                                secondaryColor: form.secondaryColor || "#64748b",
                                accentColor: form.brandColor || "#3B82F6",
                                buttonColor: form.brandColor || "#3B82F6",
                                headerColor: "#ffffff",
                                sidebarColor: "#0A0F1C",
                                cardColor: "#ffffff",
                                tableHeaderColor: "#f8fafc",
                                notificationColor: "#ef4444",
                                backgroundColor: "#f8fafc",
                                textColor: "#0f172a",
                                borderColor: "#e2e8f0"
                              };
                              setForm(f => ({
                                ...f,
                                themeConfig: { ...tc, [key]: e.target.value }
                              }));
                            }}
                            className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0 overflow-hidden" 
                          />
                          <Input 
                            value={currentVal}
                            onChange={e => {
                              const tc = form.themeConfig || {
                                primaryColor: form.brandColor || "#3B82F6",
                                secondaryColor: form.secondaryColor || "#64748b",
                                accentColor: form.brandColor || "#3B82F6",
                                buttonColor: form.brandColor || "#3B82F6",
                                headerColor: "#ffffff",
                                sidebarColor: "#0A0F1C",
                                cardColor: "#ffffff",
                                tableHeaderColor: "#f8fafc",
                                notificationColor: "#ef4444",
                                backgroundColor: "#f8fafc",
                                textColor: "#0f172a",
                                borderColor: "#e2e8f0"
                              };
                              setForm(f => ({
                                ...f,
                                themeConfig: { ...tc, [key]: e.target.value }
                              }));
                            }}
                            className="bg-white border-slate-200 rounded-xl font-mono text-[10px] h-9 uppercase flex-1" 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setAddModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">{editCompany ? "Save Changes" : "Create Client Company"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteCompany(deleteId!); toast.success("Client Company deleted"); setDeleteId(null); }} title="Delete Client Company" description="This will permanently remove the client company and all its data. This is irreversible." confirmText="Delete Company" variant="danger" />
    </div>
  );
}
