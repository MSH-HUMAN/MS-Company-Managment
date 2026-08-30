"use client";

import { useMemo, useState } from "react";
import { 
  FileText, Download, Eye, File, Image as ImageIcon, Trash2, 
  Edit3, UploadCloud, Plus, Building2, MapPin, Building,
  LayoutGrid, ListCollapse, History, X
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import FilterBar from "@/components/shared/FilterBar";
import DocumentUploader from "@/components/shared/DocumentUploader";
import AccessDenied from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { formatDate, exportToCSV, cn } from "@/lib/utils";
import { toast } from "sonner";

const getIcon = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("pdf")) return <FileText className="w-8 h-8 text-rose-500" />;
  if (t.includes("image") || t.includes("jpg") || t.includes("png") || t.includes("jpeg")) 
    return <ImageIcon className="w-8 h-8 text-blue-500" />;
  return <File className="w-8 h-8 text-slate-400" />;
};

export default function DocumentsPage() {
  const { 
    currentRole, currentUser, applicants, staff, suppliers, vehicles, companies,
    updateApplicant, updateStaff, updateSupplier, updateVehicle, updateCompany, addActivityLog, hasPermission 
  } = useAuthStore();

  const canView = currentRole === "Super Admin" || hasPermission("documents", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  const { filters, setFilter } = useFilterStore();
  
  const [activeTab, setActiveTab] = useState<"all" | "applicants" | "staff" | "suppliers" | "companies" | "vehicles">("all");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  
  // Grouped View toggle
  const [isGroupedView, setIsGroupedView] = useState(false);

  // Upload Document Dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadEntityType, setUploadEntityType] = useState<"Applicant" | "Staff" | "Supplier" | "Company" | "Vehicle" | "">("");
  const [uploadEntityId, setUploadEntityId] = useState("");

  // Upload New Version states
  const [isUploadVersionOpen, setIsUploadVersionOpen] = useState(false);
  const [versionDoc, setVersionDoc] = useState<any>(null);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState("");
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  const isSuperAdmin = currentRole === "Super Admin";
  const currentFilter = filters.documents;

  // Role-based Access and Isolation
  const allowedApplicants = useMemo(() => {
    if (isSuperAdmin) return applicants;
    return applicants.filter(a => 
      (a.company === currentUser.company || a.clientName === currentUser.company) && 
      (currentRole === "Company Admin" || currentUser.branch === "All" || a.branch === currentUser.branch)
    );
  }, [isSuperAdmin, applicants, currentUser, currentRole]);

  const allowedStaff = useMemo(() => {
    if (isSuperAdmin) return staff;
    return staff.filter(s => 
      s.company === currentUser.company && 
      (currentRole === "Company Admin" || currentUser.branch === "All" || s.branch === currentUser.branch)
    );
  }, [isSuperAdmin, staff, currentUser, currentRole]);

  const allowedSuppliers = useMemo(() => {
    if (isSuperAdmin) return suppliers;
    return suppliers.filter(s => s.company === currentUser.company);
  }, [isSuperAdmin, suppliers, currentUser]);

  const allowedCompanies = useMemo(() => {
    if (isSuperAdmin) return companies;
    return companies.filter(c => c.id === currentUser.company || c.name === currentUser.company);
  }, [isSuperAdmin, companies, currentUser]);

  const allowedVehicles = useMemo(() => {
    if (isSuperAdmin) return vehicles;
    return vehicles.filter(v => 
      v.company === currentUser.company && 
      (currentRole === "Company Admin" || currentUser.branch === "All" || v.branch === currentUser.branch)
    );
  }, [isSuperAdmin, vehicles, currentUser, currentRole]);

  // Aggregate stats of documents company-wise and branch-wise (for Super Admin explorer)
  const companyBranchStats = useMemo(() => {
    const stats: Record<string, { total: number; branches: Record<string, number> }> = {};
    
    (allowedApplicants || []).forEach(app => {
      (Array.isArray(app?.documents) ? app.documents : []).forEach(() => {
        const comp = app?.company || "General";
        const br = app?.branch || "General";
        if (!stats[comp]) stats[comp] = { total: 0, branches: {} };
        stats[comp].total += 1;
        stats[comp].branches[br] = (stats[comp].branches[br] || 0) + 1;
      });
    });

    (allowedStaff || []).forEach(s => {
      (Array.isArray(s?.documents) ? s.documents : []).forEach(() => {
        const comp = s?.company || "General";
        const br = s?.branch || "General";
        if (!stats[comp]) stats[comp] = { total: 0, branches: {} };
        stats[comp].total += 1;
        stats[comp].branches[br] = (stats[comp].branches[br] || 0) + 1;
      });
    });

    (allowedSuppliers || []).forEach(sup => {
      (Array.isArray(sup?.documents) ? sup.documents : []).forEach(() => {
        const comp = currentUser?.company || "General Suppliers";
        const br = "Suppliers";
        if (!stats[comp]) stats[comp] = { total: 0, branches: {} };
        stats[comp].total += 1;
        stats[comp].branches[br] = (stats[comp].branches[br] || 0) + 1;
      });
    });

    (allowedCompanies || []).forEach(comp => {
      (Array.isArray(comp?.documents) ? comp.documents : []).forEach(() => {
        const compName = comp?.name || "General";
        const br = "Main Office";
        if (!stats[compName]) stats[compName] = { total: 0, branches: {} };
        stats[compName].total += 1;
        stats[compName].branches[br] = (stats[compName].branches[br] || 0) + 1;
      });
    });

    (allowedVehicles || []).forEach(v => {
      (Array.isArray(v?.documents) ? v.documents : []).forEach(() => {
        const compName = v?.company || "General";
        const br = v?.branch || "General";
        if (!stats[compName]) stats[compName] = { total: 0, branches: {} };
        stats[compName].total += 1;
        stats[compName].branches[br] = (stats[compName].branches[br] || 0) + 1;
      });
    });

    return stats;
  }, [allowedApplicants, allowedStaff, allowedSuppliers, allowedCompanies, allowedVehicles, currentUser]);

  // Compile all documents and apply filters
  const allDocs = useMemo(() => {
    let docs: any[] = [];

    (allowedApplicants || []).forEach((applicant) => {
      (Array.isArray(applicant?.documents) ? applicant.documents : []).forEach((doc: any) => {
        if (!doc) return;
        docs.push({
          ...doc,
          ownerType: "Applicant",
          ownerName: applicant.fullName || "",
          ownerId: applicant.id,
          ownerCompany: applicant.company || "",
          ownerBranch: applicant.branch || "",
          source: "Applicant"
        });
      });
    });

    (allowedStaff || []).forEach((member) => {
      (Array.isArray(member?.documents) ? member.documents : []).forEach((doc: any) => {
        if (!doc) return;
        docs.push({
          ...doc,
          ownerType: "Staff",
          ownerName: member.name || "",
          ownerId: member.id,
          ownerCompany: member.company || "",
          ownerBranch: member.branch || "",
          source: "Staff"
        });
      });
    });

    (allowedSuppliers || []).forEach((supplier) => {
      (Array.isArray(supplier?.documents) ? supplier.documents : []).forEach((doc: any) => {
        if (!doc) return;
        docs.push({
          ...doc,
          ownerType: "Supplier",
          ownerName: supplier.name || "",
          ownerId: supplier.id,
          ownerCompany: currentUser?.company || "General",
          ownerBranch: "Suppliers",
          source: "Supplier"
        });
      });
    });

    (allowedCompanies || []).forEach((company) => {
      (Array.isArray(company?.documents) ? company.documents : []).forEach((doc: any) => {
        if (!doc) return;
        docs.push({
          ...doc,
          ownerType: "Company",
          ownerName: company.name || "",
          ownerId: company.id,
          ownerCompany: company.name || "",
          ownerBranch: "Main Office",
          source: "Company"
        });
      });
    });

    (allowedVehicles || []).forEach((vehicle) => {
      (Array.isArray(vehicle?.documents) ? vehicle.documents : []).forEach((doc: any) => {
        if (!doc) return;
        docs.push({
          ...doc,
          ownerType: "Vehicle",
          ownerName: `${vehicle.brand || ""} (${vehicle.plateNumber || ""})`,
          ownerId: vehicle.id,
          ownerCompany: vehicle.company || "",
          ownerBranch: vehicle.branch || "",
          source: "Vehicle"
        });
      });
    });

    // Tab Filter
    if (activeTab !== "all") {
      docs = docs.filter((doc) => {
        const type = (doc.ownerType || "").toLowerCase();
        if (activeTab === "companies") return type === "company";
        if (activeTab === "vehicles") return type === "vehicle";
        if (activeTab === "applicants") return type === "applicant";
        if (activeTab === "staff") return type === "staff";
        if (activeTab === "suppliers") return type === "supplier";
        return false;
      });
    }

    // Search Query
    if (currentFilter.search) {
      const q = currentFilter.search.toLowerCase();
      docs = docs.filter((doc) =>
        (doc.name || "").toLowerCase().includes(q) ||
        (doc.uploadedBy || "").toLowerCase().includes(q) ||
        (doc.ownerName || "").toLowerCase().includes(q) ||
        (doc.ownerCompany || "").toLowerCase().includes(q)
      );
    }

    // Company filter
    if (currentFilter.company !== "all") {
      docs = docs.filter((doc) => doc.ownerCompany === currentFilter.company);
    }

    // Branch filter
    if (currentFilter.branch !== "all") {
      docs = docs.filter((doc) => doc.ownerBranch === currentFilter.branch);
    }

    // Type filter
    if (currentFilter.status !== "all") {
      docs = docs.filter((doc) => doc.type.toLowerCase().includes(currentFilter.status.toLowerCase()));
    }

    // Date filter
    if (currentFilter.fromDate) {
      docs = docs.filter(doc => new Date(doc.uploadedDate) >= new Date(currentFilter.fromDate!));
    }
    if (currentFilter.toDate) {
      docs = docs.filter(doc => new Date(doc.uploadedDate) <= new Date(currentFilter.toDate!));
    }

    return docs.sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime());
  }, [allowedApplicants, allowedStaff, allowedSuppliers, allowedCompanies, allowedVehicles, activeTab, currentFilter, currentUser]);

  // Grouped documents computed map
  const groupedDocs = useMemo(() => {
    if (!isGroupedView) return null;
    const groups: Record<string, Record<string, any[]>> = {};
    allDocs.forEach(doc => {
      const comp = doc.ownerCompany || "General";
      const br = doc.ownerBranch || "General";
      if (!groups[comp]) groups[comp] = {};
      if (!groups[comp][br]) groups[comp][br] = [];
      groups[comp][br].push(doc);
    });
    return groups;
  }, [allDocs, isGroupedView]);

  const updateDocumentName = (ownerType: string, ownerId: string, docId: string, newName: string) => {
    const versionNote = `Renamed by ${currentUser.name}`;
    const versionItem = {
      id: `VER-${Date.now()}`,
      versionLabel: `Renamed ${new Date().toISOString().slice(0, 10)}`,
      uploadedBy: currentUser.name,
      uploadedDate: new Date().toISOString().slice(0, 10),
      notes: versionNote
    };

    if (ownerType === "Applicant") {
      const owner = applicants.find((item) => item.id === ownerId);
      if (!owner) return;
      const updatedDocs = (owner.documents || []).map((doc) =>
        doc.id === docId
          ? { ...doc, name: newName, versions: [...(doc.versions || []), versionItem] }
          : doc
      );
      updateApplicant({ ...owner, documents: updatedDocs });
      return;
    }

    if (ownerType === "Staff") {
      const owner = staff.find((item) => item.id === ownerId);
      if (!owner) return;
      const updatedDocs = (owner.documents || []).map((doc) =>
        doc.id === docId
          ? { ...doc, name: newName, versions: [...(doc.versions || []), versionItem] }
          : doc
      );
      updateStaff({ ...owner, documents: updatedDocs });
      return;
    }

    if (ownerType === "Supplier") {
      const owner = suppliers.find((item) => item.id === ownerId);
      if (!owner) return;
      const updatedDocs = (owner.documents || []).map((doc) =>
        doc.id === docId
          ? { ...doc, name: newName, versions: [...(doc.versions || []), versionItem] }
          : doc
      );
      updateSupplier({ ...owner, documents: updatedDocs });
      return;
    }

    if (ownerType === "Company") {
      const owner = companies.find((item) => item.id === ownerId);
      if (!owner) return;
      const updatedDocs = (owner.documents || []).map((doc) =>
        doc.id === docId
          ? { ...doc, name: newName, versions: [...(doc.versions || []), versionItem] }
          : doc
      );
      updateCompany({ ...owner, documents: updatedDocs });
      return;
    }

    if (ownerType === "Vehicle") {
      const owner = vehicles.find((item) => item.id === ownerId);
      if (!owner) return;
      const updatedDocs = (owner.documents || []).map((doc) =>
        doc.id === docId
          ? { ...doc, name: newName, versions: [...(doc.versions || []), versionItem] }
          : doc
      );
      updateVehicle({ ...owner, documents: updatedDocs });
      return;
    }
  };

  const deleteDocument = (ownerType: string, ownerId: string, docId: string) => {
    if (ownerType === "Applicant") {
      const owner = applicants.find((item) => item.id === ownerId);
      if (!owner) return;
      updateApplicant({ ...owner, documents: owner.documents.filter((doc) => doc.id !== docId) });
      return;
    }

    if (ownerType === "Staff") {
      const owner = staff.find((item) => item.id === ownerId);
      if (!owner) return;
      updateStaff({ ...owner, documents: owner.documents.filter((doc) => doc.id !== docId) });
      return;
    }

    if (ownerType === "Supplier") {
      const owner = suppliers.find((item) => item.id === ownerId);
      if (!owner) return;
      updateSupplier({ ...owner, documents: owner.documents.filter((doc) => doc.id !== docId) });
      return;
    }

    if (ownerType === "Company") {
      const owner = companies.find((item) => item.id === ownerId);
      if (!owner) return;
      updateCompany({ ...owner, documents: (owner.documents || []).filter((doc) => doc.id !== docId) });
      return;
    }

    if (ownerType === "Vehicle") {
      const owner = vehicles.find((item) => item.id === ownerId);
      if (!owner) return;
      updateVehicle({ ...owner, documents: (owner.documents || []).filter((doc) => doc.id !== docId) });
      return;
    }
  };

  const openPreview = (doc: any) => {
    setSelectedDoc(doc);
    setRenameValue(doc.name || "");
    setIsPreviewOpen(true);
  };

  const handleRenameSubmit = () => {
    if (!selectedDoc) return;
    if (!renameValue.trim()) {
      toast.error("Document name is required.");
      return;
    }
    updateDocumentName(selectedDoc.ownerType, selectedDoc.ownerId, selectedDoc.id, renameValue.trim());
    toast.success("Document renamed successfully.");
    setIsRenameOpen(false);
    setIsPreviewOpen(false);
  };

  const handleDownloadDirect = (doc: any) => {
    if (doc.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.name;
      a.click();
      toast.success(`Downloading "${doc.name}"`);
    } else {
      toast.info(`No file data stored for "${doc.name}"`);
    }
  };

  const handleVersionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setNewVersionFile(file);
      if (!newVersionName) {
        setNewVersionName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUploadVersionSubmit = () => {
    if (!versionDoc || !newVersionFile) return;
    if (!newVersionName.trim()) {
      toast.error("Document name is required.");
      return;
    }

    setIsUploadingVersion(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const ext = newVersionFile.name.includes(".") ? "." + newVersionFile.name.split(".").pop() : "";
      
      const prevVersionItem = {
        id: `VER-${Date.now()}`,
        versionLabel: `v${(versionDoc.versions?.length || 0) + 1} - ${versionDoc.name}`,
        uploadedBy: versionDoc.uploadedBy,
        uploadedDate: versionDoc.uploadedDate,
        notes: versionNotes.trim() || "Superseded by new version",
        url: versionDoc.url,
        type: versionDoc.type
      };

      const updatedDoc = {
        ...versionDoc,
        name: newVersionName.trim() + ext,
        type: newVersionFile.type || "application/octet-stream",
        url: dataUrl,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        versions: [...(versionDoc.versions || []), prevVersionItem]
      };

      const state = useAuthStore.getState();

      if (versionDoc.ownerType === "Applicant") {
        const owner = state.applicants.find((a) => a.id === versionDoc.ownerId);
        if (owner) {
          const updatedDocs = (owner.documents || []).map((d) => (d.id === versionDoc.id ? updatedDoc : d));
          state.updateApplicant({ ...owner, documents: updatedDocs });
        }
      } else if (versionDoc.ownerType === "Staff") {
        const owner = state.staff.find((s) => s.id === versionDoc.ownerId);
        if (owner) {
          const updatedDocs = (owner.documents || []).map((d) => (d.id === versionDoc.id ? updatedDoc : d));
          state.updateStaff({ ...owner, documents: updatedDocs });
        }
      } else if (versionDoc.ownerType === "Supplier") {
        const owner = state.suppliers.find((s) => s.id === versionDoc.ownerId);
        if (owner) {
          const updatedDocs = (owner.documents || []).map((d) => (d.id === versionDoc.id ? updatedDoc : d));
          state.updateSupplier({ ...owner, documents: updatedDocs });
        }
      } else if (versionDoc.ownerType === "Company") {
        const owner = state.companies.find((c) => c.id === versionDoc.ownerId);
        if (owner) {
          const updatedDocs = (owner.documents || []).map((d) => (d.id === versionDoc.id ? updatedDoc : d));
          state.updateCompany({ ...owner, documents: updatedDocs });
        }
      } else if (versionDoc.ownerType === "Vehicle") {
        const owner = state.vehicles.find((v) => v.id === versionDoc.ownerId);
        if (owner) {
          const updatedDocs = (owner.documents || []).map((d) => (d.id === versionDoc.id ? updatedDoc : d));
          state.updateVehicle({ ...owner, documents: updatedDocs });
        }
      }

      state.addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Edited",
        module: "Documents",
        oldValue: versionDoc.name,
        newValue: `Uploaded new version: ${updatedDoc.name}`,
        ipAddress: "127.0.0.1"
      });

      toast.success("New version uploaded successfully!");
      setIsUploadVersionOpen(false);
      setNewVersionFile(null);
      setNewVersionName("");
      setVersionNotes("");
      setIsUploadingVersion(false);
    };

    reader.onerror = () => {
      toast.error("Failed to read file.");
      setIsUploadingVersion(false);
    };

    reader.readAsDataURL(newVersionFile);
  };

  const canCreate = hasPermission("documents", "create");
  const canEdit = hasPermission("documents", "edit");
  const canDelete = hasPermission("documents", "delete");

  const renderDocCard = (doc: any, idx: number) => {
    return (
      <Card key={`${doc.id}-${idx}`} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm hover:shadow-md transition-all flex flex-col group">
        <div className="flex justify-between items-start mb-3">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
            {getIcon(doc.type || doc.name)}
          </div>
          <div className="flex gap-1">
            <button onClick={() => openPreview(doc)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="View Preview"><Eye className="w-3.5 h-3.5"/></button>
            {doc.url && (
              <button onClick={() => handleDownloadDirect(doc)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Download"><Download className="w-3.5 h-3.5"/></button>
            )}
            {canEdit && (
              <>
                <button onClick={() => { setSelectedDoc(doc); setRenameValue(doc.name); setIsRenameOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Rename"><Edit3 className="w-3.5 h-3.5"/></button>
                <button onClick={() => { setVersionDoc(doc); setNewVersionName(doc.name.replace(/\.[^/.]+$/, "")); setIsUploadVersionOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors" title="Upload New Version"><UploadCloud className="w-3.5 h-3.5"/></button>
              </>
            )}
            {canDelete && <button onClick={() => { deleteDocument(doc.ownerType, doc.ownerId, doc.id); toast.success(`Deleted ${doc.name}`); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5"/></button>}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mb-1" title={doc.name}>{doc.name}</div>
          <div className="text-[10px] text-slate-400 font-semibold mb-2">Uploaded {formatDate(doc.uploadedDate)}</div>
          {doc.versions?.length ? (
            <div className="rounded-xl bg-violet-50/50 border border-violet-100/50 p-2 text-[10px] text-violet-700 flex items-center gap-1 w-fit">
              <History className="w-3 h-3 flex-shrink-0" />
              <span>{doc.versions.length} version{doc.versions.length !== 1 ? "s" : ""}</span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400">No version history.</div>
          )}
        </div>
        <div className="mt-2 pt-3 border-t border-slate-50 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-0.5">{doc.ownerType}</div>
            <div className="text-[11px] font-bold text-slate-700 truncate max-w-[100px]" title={doc.ownerName}>{doc.ownerName}</div>
          </div>
          {doc.ownerBranch && (
            <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg flex items-center gap-0.5 max-w-[80px] truncate" title={doc.ownerBranch}>
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              {doc.ownerBranch}
            </span>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title="Document Center" 
        subtitle="Centralized repository of all uploaded documents" 
        actions={
          canCreate && (
            <Button 
              onClick={() => setIsUploadOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl px-4 py-2 flex items-center gap-1.5 font-bold shadow-md shadow-blue-500/10"
            >
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
          )
        }
      />

      {/* Super Admin Dashboard Cards */}
      {isSuperAdmin && Object.keys(companyBranchStats).length > 0 && (
        <div className="bg-slate-50 border-b border-slate-100 p-4 md:px-6">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Company & Branch Explorer</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(companyBranchStats).map(([compName, stats]) => {
              const isActiveCompany = currentFilter.company === compName;
              return (
                <Card
                  key={compName}
                  className={cn(
                    "p-4 rounded-2xl border bg-white shadow-sm transition-all cursor-pointer hover:shadow-md",
                    isActiveCompany ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-100"
                  )}
                  onClick={() => {
                    if (isActiveCompany) {
                      setFilter("documents", { company: "all", branch: "all", page: 1 });
                    } else {
                      setFilter("documents", { company: compName, branch: "all", page: 1 });
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-slate-800 line-clamp-1 flex-1 pr-1">{compName}</span>
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex-shrink-0">
                      {stats.total} File{stats.total !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
                    {Object.entries(stats.branches).map(([brName, count]) => {
                      const isActiveBranch = currentFilter.company === compName && currentFilter.branch === brName;
                      return (
                        <button
                          key={brName}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isActiveBranch) {
                              setFilter("documents", { company: "all", branch: "all", page: 1 });
                            } else {
                              setFilter("documents", { company: compName, branch: brName, page: 1 });
                            }
                          }}
                          className={cn(
                            "text-[9px] font-extrabold px-2 py-1 rounded-lg border transition-all flex items-center gap-1",
                            isActiveBranch
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                          )}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          {brName} ({count})
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGroupedView(!isGroupedView)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                isGroupedView
                  ? "bg-slate-800 border-slate-800 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              {isGroupedView ? <LayoutGrid className="w-3.5 h-3.5" /> : <ListCollapse className="w-3.5 h-3.5" />}
              {isGroupedView ? "Flat View" : "Grouped View"}
            </button>
            <div className="flex bg-slate-100 rounded-xl p-1 w-full xl:w-auto overflow-x-auto">
              {(["all", "applicants", "staff", "suppliers", "companies", "vehicles"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 sm:px-6 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800"}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full xl:w-[420px]">
            <FilterBar
              moduleKey="documents"
              statusOptions={["all", "pdf", "image", "doc", "other"]}
              onExport={() => exportToCSV(allDocs.map((doc) => ({ id: doc.id, name: doc.name, uploadedBy: doc.uploadedBy, uploadedDate: doc.uploadedDate, type: doc.type, ownerType: doc.ownerType, ownerName: doc.ownerName, ownerCompany: doc.ownerCompany, ownerBranch: doc.ownerBranch })), "documents")}
              onPrint={() => window.print()}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {allDocs.length === 0 ? (
          <EmptyState title="No documents found" description="Try adjusting your search filters." />
        ) : isGroupedView ? (
          <div className="space-y-8">
            {Object.entries(groupedDocs || {}).map(([compName, branchMap]) => (
              <div key={compName} className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building className="w-5 h-5 text-slate-500" />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">{compName}</h2>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {Object.values(branchMap).flat().length} File(s)
                  </span>
                </div>
                
                <div className="space-y-6 pl-2 md:pl-4">
                  {Object.entries(branchMap).map(([brName, docs]) => (
                    <div key={brName} className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-600">{brName}</h3>
                        <span className="text-[9px] font-bold bg-slate-50 text-slate-400 px-1.5 py-0.2 rounded-full border border-slate-100">
                          {docs.length}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {docs.map((doc, idx) => renderDocCard(doc, idx))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allDocs.map((doc, idx) => renderDocCard(doc, idx))}
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW DIALOG */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Document Preview</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Review file details and version history.</DialogDescription>
          </DialogHeader>
          {selectedDoc ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  {getIcon(selectedDoc.type || selectedDoc.name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">{selectedDoc.name}</div>
                  <div className="text-[11px] text-slate-500">{selectedDoc.ownerType} • {selectedDoc.ownerName}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-3">Uploaded by<br/><span className="font-bold text-slate-800">{selectedDoc.uploadedBy}</span></div>
                <div className="rounded-2xl bg-slate-50 p-3">Uploaded on<br/><span className="font-bold text-slate-800">{formatDate(selectedDoc.uploadedDate)}</span></div>
                <div className="rounded-2xl bg-slate-50 p-3">Company<br/><span className="font-bold text-slate-800">{selectedDoc.ownerCompany || "N/A"}</span></div>
                <div className="rounded-2xl bg-slate-50 p-3">Branch<br/><span className="font-bold text-slate-800">{selectedDoc.ownerBranch || "N/A"}</span></div>
              </div>
              
              {/* Actual File Preview */}
              {selectedDoc.url && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 p-4 max-h-[260px] flex items-center justify-center">
                  {selectedDoc.type?.startsWith("image/") || selectedDoc.url.startsWith("data:image/") ? (
                    <img src={selectedDoc.url} alt={selectedDoc.name} className="max-h-[220px] rounded-xl object-contain shadow-sm" />
                  ) : selectedDoc.type === "application/pdf" || selectedDoc.url.startsWith("data:application/pdf") ? (
                    <iframe src={selectedDoc.url} title={selectedDoc.name} className="w-full h-[220px] border-0" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4 text-center">
                      <FileText className="w-10 h-10 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-500">Preview not available for this file type.</p>
                      <Button onClick={() => handleDownloadDirect(selectedDoc)} size="sm" className="bg-blue-600 text-white rounded-xl text-[10px] mt-1 h-8">
                        Download to View
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Version History list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Version History</div>
                  {canEdit && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setVersionDoc(selectedDoc); setNewVersionName(selectedDoc.name.replace(/\.[^/.]+$/, "")); setIsUploadVersionOpen(true); }}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 text-[10px] font-bold h-7 gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload New Version
                    </Button>
                  )}
                </div>
                {selectedDoc.versions?.length ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {selectedDoc.versions.map((version: any) => (
                      <div key={version.id} className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 flex justify-between items-center gap-4">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{version.versionLabel}</div>
                          <div className="text-[10px] text-slate-500">{version.uploadedBy} • {formatDate(version.uploadedDate)}</div>
                          {version.notes && <div className="mt-1 text-[10px] text-slate-500 italic">"{version.notes}"</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {version.url && (
                            <>
                              <button
                                onClick={() => {
                                  const tempDoc = {
                                    ...selectedDoc,
                                    name: version.versionLabel.split(" - ").slice(1).join(" - ") || selectedDoc.name,
                                    url: version.url,
                                    type: version.type || selectedDoc.type,
                                    uploadedBy: version.uploadedBy,
                                    uploadedDate: version.uploadedDate
                                  };
                                  setSelectedDoc(tempDoc);
                                  toast.success(`Viewing version: ${version.versionLabel.split(" - ")[0]}`);
                                }}
                                title="Preview this version"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5"/>
                              </button>
                              <button
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = version.url;
                                  a.download = version.versionLabel.split(" - ").slice(1).join(" - ") || selectedDoc.name;
                                  a.click();
                                  toast.success(`Downloaded version: ${version.versionLabel.split(" - ")[0]}`);
                                }}
                                title="Download this version"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5"/>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">No version history available.</div>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter className="pt-6">
            <Button onClick={() => setIsPreviewOpen(false)} className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs rounded-xl px-4 py-2">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RENAME DOCUMENT DIALOG */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Rename Document</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Update the document title. Previous name will be logged in version history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Document Name</Label>
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="bg-slate-50 border-slate-200 rounded-xl text-sm h-11" />
            </div>
          </div>
          <DialogFooter className="pt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRenameOpen(false)} className="text-xs rounded-xl px-4 py-2">Cancel</Button>
            <Button onClick={handleRenameSubmit} className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl px-4 py-2">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPLOAD DOCUMENT DIALOG */}
      <Dialog open={isUploadOpen} onOpenChange={(o) => { if (!o) { setIsUploadOpen(false); setUploadEntityType(""); setUploadEntityId(""); } }}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Upload Documents</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Select target profile type and specific record to attach documents to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Target Type</Label>
                <Select value={uploadEntityType} onValueChange={(val: any) => { setUploadEntityType(val); setUploadEntityId(""); }}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
                    <SelectItem value="Applicant">Applicant</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-500">Select Profile</Label>
                <Select value={uploadEntityId} onValueChange={(val) => setUploadEntityId(val || "")} disabled={!uploadEntityType}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 disabled:opacity-50">
                    <SelectValue placeholder="Select Profile" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-100 rounded-xl text-xs max-h-48">
                    {uploadEntityType === "Applicant" && allowedApplicants.map(app => (
                      <SelectItem key={app.id} value={app.id}>{app.fullName} ({app.id})</SelectItem>
                    ))}
                    {uploadEntityType === "Staff" && allowedStaff.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>
                    ))}
                    {uploadEntityType === "Supplier" && allowedSuppliers.map(sup => (
                      <SelectItem key={sup.id} value={sup.id}>{sup.name} ({sup.id})</SelectItem>
                    ))}
                    {uploadEntityType === "Company" && allowedCompanies.map(comp => (
                      <SelectItem key={comp.id} value={comp.id}>{comp.name} ({comp.id})</SelectItem>
                    ))}
                    {uploadEntityType === "Vehicle" && allowedVehicles.map(veh => (
                      <SelectItem key={veh.id} value={veh.id}>{veh.brand} - {veh.plateNumber} ({veh.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {uploadEntityType && uploadEntityId && (
              <div className="border-t border-slate-100 pt-4">
                <DocumentUploader
                  documents={
                    uploadEntityType === "Applicant"
                      ? (applicants.find((a) => a.id === uploadEntityId)?.documents || [])
                      : uploadEntityType === "Staff"
                      ? (staff.find((s) => s.id === uploadEntityId)?.documents || [])
                      : uploadEntityType === "Supplier"
                      ? (suppliers.find((s) => s.id === uploadEntityId)?.documents || [])
                      : uploadEntityType === "Company"
                      ? (companies.find((c) => c.id === uploadEntityId)?.documents || [])
                      : uploadEntityType === "Vehicle"
                      ? (vehicles.find((v) => v.id === uploadEntityId)?.documents || [])
                      : []
                  }
                  uploadedBy={currentUser.name}
                  canUpload={true}
                  canDelete={false}
                  canDownload={false}
                  label="Upload Documents"
                  onAdd={(doc) => {
                    const state = useAuthStore.getState();
                    if (uploadEntityType === "Applicant") {
                      const owner = state.applicants.find(a => a.id === uploadEntityId);
                      if (owner) {
                        const updatedDocs = [...(owner.documents || []), doc];
                        state.updateApplicant({ ...owner, documents: updatedDocs });
                        state.addActivityLog({
                          id: `LOG-${Date.now()}`,
                          dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                          userName: currentUser.name,
                          role: currentUser.role,
                          company: currentUser.company,
                          branch: currentUser.branch,
                          action: "Document Uploaded",
                          module: "Documents",
                          oldValue: null,
                          newValue: `Uploaded ${doc.name} for Applicant ${owner.fullName}`,
                          ipAddress: "127.0.0.1"
                        });
                      }
                    } else if (uploadEntityType === "Staff") {
                      const owner = state.staff.find(s => s.id === uploadEntityId);
                      if (owner) {
                        const updatedDocs = [...(owner.documents || []), doc];
                        state.updateStaff({ ...owner, documents: updatedDocs });
                        state.addActivityLog({
                          id: `LOG-${Date.now()}`,
                          dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                          userName: currentUser.name,
                          role: currentUser.role,
                          company: currentUser.company,
                          branch: currentUser.branch,
                          action: "Document Uploaded",
                          module: "Documents",
                          oldValue: null,
                          newValue: `Uploaded ${doc.name} for Staff ${owner.name}`,
                          ipAddress: "127.0.0.1"
                        });
                      }
                    } else if (uploadEntityType === "Supplier") {
                      const owner = state.suppliers.find(s => s.id === uploadEntityId);
                      if (owner) {
                        const updatedDocs = [...(owner.documents || []), doc];
                        state.updateSupplier({ ...owner, documents: updatedDocs });
                        state.addActivityLog({
                          id: `LOG-${Date.now()}`,
                          dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                          userName: currentUser.name,
                          role: currentUser.role,
                          company: currentUser.company,
                          branch: currentUser.branch,
                          action: "Document Uploaded",
                          module: "Documents",
                          oldValue: null,
                          newValue: `Uploaded ${doc.name} for Supplier ${owner.name}`,
                          ipAddress: "127.0.0.1"
                        });
                      }
                    } else if (uploadEntityType === "Company") {
                      const owner = state.companies.find(c => c.id === uploadEntityId);
                      if (owner) {
                        const updatedDocs = [...(owner.documents || []), doc];
                        state.updateCompany({ ...owner, documents: updatedDocs });
                        state.addActivityLog({
                          id: `LOG-${Date.now()}`,
                          dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                          userName: currentUser.name,
                          role: currentUser.role,
                          company: currentUser.company,
                          branch: currentUser.branch,
                          action: "Document Uploaded",
                          module: "Documents",
                          oldValue: null,
                          newValue: `Uploaded ${doc.name} for Company ${owner.name}`,
                          ipAddress: "127.0.0.1"
                        });
                      }
                    } else if (uploadEntityType === "Vehicle") {
                      const owner = state.vehicles.find(v => v.id === uploadEntityId);
                      if (owner) {
                        const updatedDocs = [...(owner.documents || []), doc];
                        state.updateVehicle({ ...owner, documents: updatedDocs });
                        state.addActivityLog({
                          id: `LOG-${Date.now()}`,
                          dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                          userName: currentUser.name,
                          role: currentUser.role,
                          company: currentUser.company,
                          branch: currentUser.branch,
                          action: "Document Uploaded",
                          module: "Documents",
                          oldValue: null,
                          newValue: `Uploaded ${doc.name} for Vehicle ${owner.brand} (${owner.plateNumber})`,
                          ipAddress: "127.0.0.1"
                        });
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter className="pt-6">
            <Button onClick={() => { setIsUploadOpen(false); setUploadEntityType(""); setUploadEntityId(""); }} className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs rounded-xl px-4 py-2">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPLOAD NEW VERSION DIALOG */}
      <Dialog open={isUploadVersionOpen} onOpenChange={setIsUploadVersionOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Upload New Version</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Replace the current document with a new file. The old file will be archived in the version history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">Document Name</Label>
              <Input
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white focus:border-blue-400"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">Upload File</Label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  onChange={handleVersionFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {newVersionFile && (
                  <p className="text-[10px] text-slate-500 font-medium">Selected: {newVersionFile.name} ({(newVersionFile.size / 1024).toFixed(0)} KB)</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500">Version Notes / Description</Label>
              <Input
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="e.g. Renewed passport copy, updated contract details"
                className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white focus:border-blue-400"
              />
            </div>
          </div>
          <DialogFooter className="pt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsUploadVersionOpen(false)} className="text-xs rounded-xl px-4 py-2">
              Cancel
            </Button>
            <Button
              onClick={handleUploadVersionSubmit}
              disabled={isUploadingVersion || !newVersionFile}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl px-4 py-2"
            >
              {isUploadingVersion ? "Saving..." : "Save Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
