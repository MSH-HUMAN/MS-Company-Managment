"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  User, Mail, Phone, Calendar, Shield, MapPin, Briefcase, FileText, 
  Download, Trash2, Plus, Clock, FileQuestion, CheckCircle2, AlertTriangle, 
  ArrowLeft, Sparkles, Building2, HelpCircle, History, MessageCircle
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const { 
    suppliers, 
    updateSupplier, 
    activityLogs, 
    addActivityLog, 
    currentUser 
  } = useAuthStore();

  const supplier = suppliers.find(s => s.id === id);

  const [activeTab, setActiveTab] = useState("overview");

  if (!supplier) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Supplier Profile" showBack={true} />
        <div className="p-12">
          <EmptyState title="Supplier profile not found" description="The supplier profile you are trying to view does not exist or has been deleted." />
        </div>
      </div>
    );
  }

  // Filter activity logs matching the supplier name or supplier ID
  const supplierHistory = activityLogs.filter(log => 
    log.module === "Suppliers" && 
    (log.newValue?.toLowerCase().includes(supplier.name.toLowerCase()) || 
     log.oldValue?.toLowerCase().includes(supplier.name.toLowerCase()) ||
     log.newValue?.toLowerCase().includes(supplier.id.toLowerCase()))
  );

  // Handle document upload
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs = Array.from(files).map((file, i) => ({
        id: `DOC-SUP-${Date.now()}-${i}`,
        name: file.name,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        type: file.name.split('.').pop() || "other"
      }));

      const updatedDocs = [...(supplier.documents || []), ...newDocs];
      updateSupplier({ ...supplier, documents: updatedDocs });

      // Log activity
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Document Uploaded",
        module: "Suppliers",
        oldValue: supplier.name,
        newValue: `Uploaded ${files.length} document(s) for supplier ${supplier.name}`,
        ipAddress: "192.168.1.102"
      });

      toast.success(`Uploaded ${files.length} document(s) successfully`);
    }
  };

  // Handle document delete
  const handleDocDelete = (docId: string, docName: string) => {
    const updatedDocs = (supplier.documents || []).filter(d => d.id !== docId);
    updateSupplier({ ...supplier, documents: updatedDocs });

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Deleted",
      module: "Suppliers",
      oldValue: docName,
      newValue: null,
      ipAddress: "192.168.1.102"
    });

    toast.success("Document removed");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title={`Supplier Profile: ${supplier.name}`} 
        subtitle={`ID: ${supplier.id} · Created By: ${supplier.createdBy}`}
        showBack={true}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={supplier.status} />
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {/* Supplier Header Info */}
        <Card className="rounded-3xl border-slate-100 p-6 bg-white shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <Avatar className="w-16 h-16 rounded-2xl border border-slate-100 flex-shrink-0 shadow-sm">
            <AvatarFallback className="rounded-2xl font-extrabold text-lg bg-blue-50 text-blue-700 uppercase">
              {supplier.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-800">{supplier.name}</h2>
            <p className="text-xs text-slate-500 font-semibold flex items-center justify-center sm:justify-start gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Supplier Representative
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5">
                <span>{supplier.nationalityFlag}</span>
                <span>{supplier.nationality}</span>
              </span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                Registered: {supplier.createdAt}
              </span>
            </div>
          </div>
        </Card>

        {/* Tab System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto grid grid-cols-3 gap-1 text-xs">
            <TabsTrigger value="overview" className="rounded-lg py-2">Overview</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg py-2">Documents ({(supplier.documents || []).length})</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2">History ({supplierHistory.length})</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="pt-4 space-y-4">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Contact Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 text-xs font-semibold text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Supplier Name</span>
                    <p className="text-slate-800 font-bold mt-1">{supplier.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nationality</span>
                    <p className="text-slate-800 font-bold mt-1 flex items-center gap-1.5">
                      <span>{supplier.nationalityFlag}</span>
                      <span>{supplier.nationality}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
                    <div className="mt-1"><StatusBadge status={supplier.status} /></div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile Number</span>
                    <p className="text-slate-800 font-bold mt-1">{supplier.mobile}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">WhatsApp Contact</span>
                    <p className="text-slate-800 font-bold mt-1 flex items-center gap-1.5">
                      {supplier.whatsapp}
                      {supplier.whatsapp && (
                        <a href={`https://wa.me/${supplier.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-emerald-600 hover:text-emerald-800 font-bold">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</span>
                    <p className="text-slate-800 font-bold mt-1">{supplier.email}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Internal Notes</h3>
                <div className="pt-4">
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {supplier.notes || "No internal notes or remarks have been registered for this supplier."}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="pt-4 space-y-4">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Supplier Agreements & Docs</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage licenses, terms sheet, and commercial agreements.</p>
                </div>
                <div className="relative">
                  <Input 
                    type="file" 
                    multiple 
                    onChange={handleDocUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
                    <Plus className="w-4 h-4" /> Upload Document
                  </Button>
                </div>
              </div>

              {(!supplier.documents || supplier.documents.length === 0) ? (
                <EmptyState title="No documents" description="There are no documents uploaded for this supplier." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {supplier.documents.map(doc => (
                    <div 
                      key={doc.id} 
                      className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</div>
                          <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            By {doc.uploadedBy} · {doc.uploadedDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast.success(`Downloading file: ${doc.name} (Simulated)`)}
                          className="w-8 h-8 rounded-lg p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDocDelete(doc.id, doc.name)}
                          className="w-8 h-8 rounded-lg p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="pt-4">
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
              {supplierHistory.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No history logs" description="There are no system logs associated with this supplier's registry." />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Date & Time</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">User</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Role</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Action</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-semibold text-slate-700">
                    {supplierHistory.map(log => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-[10px] text-slate-400">{log.dateTime}</TableCell>
                        <TableCell className="font-bold text-slate-900">{log.userName}</TableCell>
                        <TableCell className="text-[10px]">{log.role}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.action === "Created" 
                              ? "bg-emerald-50 text-emerald-700" 
                              : log.action === "Deleted"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]" title={log.newValue || log.oldValue || ""}>
                          {log.newValue || log.oldValue || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
