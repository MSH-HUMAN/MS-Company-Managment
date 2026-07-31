"use client";

import { useState } from "react";
import { Plus, MessageSquare, FileText, CheckCircle, XCircle, Trash2, CornerUpLeft, UploadCloud } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import AccessDenied from "@/components/shared/AccessDenied";
import { formatDate, exportToCSV } from "@/lib/utils";
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
import { StaffRequest } from "@/lib/types";
import { toast } from "sonner";

const REQUEST_TYPES = ["Salary Advance", "Vacation", "Emergency Leave", "Medical Leave", "Cancel", "Resign", "Complaint", "Company Loan", "Other"];

export default function StaffRequestsPage() {
  const { currentRole, currentUser, staffRequests, staff, addStaffRequest, updateStaffRequest, deleteStaffRequest, addActivityLog, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canViewRequests = hasPermission("requests", "view");
  if (!canViewRequests) {
    return <AccessDenied />;
  }
  const [modal, setModal] = useState(false);
  const [actionModal, setActionModal] = useState<{ req: StaffRequest; action: "Approved"|"Rejected"|"Returned" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyReq, setHistoryReq] = useState<StaffRequest | null>(null);
  const [form, setForm] = useState({
    staffId: "",
    staffName: "",
    staffMobile: "",
    staffWhatsApp: "",
    staffEmail: "",
    requestType: "Salary Advance" as StaffRequest["requestType"],
    description: "",
    attachment: null as string | null,
    date: new Date().toISOString().slice(0, 10),
    signature: null as string | null,
  });

  const isAdmin = currentRole === "Super Admin" || 
                  currentRole === "Company Admin" || 
                  currentRole === "Branch Admin" || 
                  currentRole === "HR Manager" || 
                  currentRole === "Admin" || 
                  currentRole === "HR" ||
                  currentRole === "Recruiter" ||
                  currentRole === "Accountant";

  const currentStaff = staff.find(
    s => s.email?.toLowerCase() === currentUser.email?.toLowerCase() || 
         s.name?.toLowerCase() === currentUser.name?.toLowerCase()
  );

  const handleOpenModal = () => {
    if (!isAdmin) {
      setForm({
        staffId: currentStaff?.id || currentUser.id,
        staffName: currentStaff?.name || currentUser.name,
        staffMobile: currentStaff?.mobile || currentUser.mobile || "",
        staffWhatsApp: currentStaff?.whatsapp || currentUser.whatsapp || "",
        staffEmail: currentStaff?.email || currentUser.email || "",
        requestType: "Salary Advance",
        description: "",
        attachment: null,
        date: new Date().toISOString().slice(0, 10),
        signature: null
      });
    } else {
      setForm({
        staffId: "",
        staffName: "",
        staffMobile: "",
        staffWhatsApp: "",
        staffEmail: "",
        requestType: "Salary Advance",
        description: "",
        attachment: null,
        date: new Date().toISOString().slice(0, 10),
        signature: null
      });
    }
    setModal(true);
  };

  const f = filters.requests;
  let list = staffRequests;
  if (!isAdmin) {
    list = list.filter(r => r.staffId === currentStaff?.id);
  } else if (currentRole !== "Super Admin" && currentUser.company !== "System") {
    list = list.filter(r => r.company === currentUser.company);
  }
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(r => r.staffName.toLowerCase().includes(q) || r.requestType.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(r => r.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(r => r.company === f.company);

  list = [...list].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || !form.description) { toast.error("Staff member and description are required"); return; }
    if (!form.staffMobile.trim()) { toast.error("Mobile number is required"); return; }
    if (!form.signature) { toast.error("Digital signature is required"); return; }
    const id = `REQ-${Math.floor(100+Math.random()*900)}`;
    addStaffRequest({
      ...form,
      id,
      status: "Pending",
      date: form.date || new Date().toISOString().slice(0,10),
      company: currentUser.company === "System" ? "Alpha Solutions LLC" : currentUser.company,
      branch: currentUser.branch === "All" ? "Main Branch" : currentUser.branch,
      reply: null,
      processedBy: null,
      createdAt: new Date().toISOString().replace("T"," ").slice(0,19)
    });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Requests", oldValue: null, newValue: `New request: ${form.requestType} by ${form.staffName}`, ipAddress: "192.168.1.102" });
    toast.success("Request submitted successfully");
    setModal(false);
    setForm({ staffId:"", staffName:"", staffMobile:"", staffWhatsApp:"", staffEmail:"", requestType:"Salary Advance", description:"", attachment:null, date: new Date().toISOString().slice(0,10), signature:null });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setForm(f => ({ ...f, attachment: file.name })); toast.success("Attachment added"); }
  };

  const handleSignatureDraw = () => {
    setForm(f => ({ ...f, signature: `signed-${Date.now()}` }));
    toast.success("Digital signature captured");
  };

  const handleAction = () => {
    if (!actionModal) return;
    const { req, action } = actionModal;
    if ((action === "Rejected" || action === "Returned") && !actionReason.trim()) { toast.error("Reason is required"); return; }
    const updates: any = { status: action, processedBy: currentUser.name, reply: actionReason };
    if (action === "Rejected") updates.rejectReason = actionReason;
    if (action === "Returned") updates.returnReason = actionReason;
    updateStaffRequest({ ...req, ...updates });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Requests", oldValue: req.status, newValue: action, ipAddress: "192.168.1.102" });
    toast.success(`Request ${action}`);
    setActionModal(null); setActionReason("");
  };

  const filteredStaff = currentRole === "Super Admin" 
    ? staff 
    : staff.filter(s => s.company.trim().toLowerCase() === currentUser.company.trim().toLowerCase());

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Staff Requests" subtitle="Process advances, complaints, loans, and general requests"
        actions={
          hasPermission("requests", "create") && (
            <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>New Request</Button>
          )
        }
      />
      <FilterBar moduleKey="requests" statusOptions={["Pending","Processing","Approved","Rejected","Returned"]} onExport={() => { exportToCSV(list.map(r=>({ID:r.id,Staff:r.staffName,Type:r.requestType,Date:r.date,Status:r.status})),"staff-requests"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No staff requests" description="No requests have been submitted yet." action={<Button onClick={handleOpenModal} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Submit Request</Button>} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginated.map(req => (
              <Card key={req.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><MessageSquare className="w-4 h-4"/></div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{req.staffName}</div>
                        <div className="text-[10px] text-slate-400">{req.id} · {formatDate(req.date)}</div>
                        {(req as any).staffMobile && <div className="text-[9px] text-slate-400 mt-0.5">📱 {(req as any).staffMobile}{(req as any).staffEmail && ` · ✉️ ${(req as any).staffEmail}`}</div>}
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="mb-3">
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 uppercase">{req.requestType}</span>
                    <p className="mt-2 text-xs text-slate-600 italic line-clamp-3">&ldquo;{req.description}&rdquo;</p>
                  </div>
                  {req.reply && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs mb-3">
                      <div className="font-bold text-slate-700 text-[10px] uppercase mb-1">Reply from {req.processedBy}:</div>
                      <div className="text-slate-600">{req.reply}</div>
                    </div>
                  )}
                  {(req as any).signature && (
                    <div className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-bold mb-2">
                      <CheckCircle className="w-3 h-3"/> Digitally Signed
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 pt-3 flex gap-1.5 flex-wrap justify-end">
                  <Button size="sm" variant="outline" onClick={() => setHistoryReq(req)} className="border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] h-8 px-3 gap-1">
                    <FileText className="w-3.5 h-3.5"/>History
                  </Button>
                  {(req.status === "Pending" || req.status === "Processing") && (
                    <>
                      {req.status === "Pending" && hasPermission("requests", "edit") && (
                        <Button size="sm" onClick={() => {
                          updateStaffRequest({ ...req, status: "Processing" });
                          toast.success("Status updated to Processing");
                        }} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold rounded-xl text-[10px] h-8 px-3 gap-1">Process</Button>
                      )}
                      {hasPermission("requests", "approve") && (
                        <Button size="sm" onClick={() => setActionModal({ req, action: "Approved" })} className="bg-emerald-600 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><CheckCircle className="w-3.5 h-3.5"/>Approve</Button>
                      )}
                      {hasPermission("requests", "reject") && (
                        <Button size="sm" onClick={() => setActionModal({ req, action: "Returned" })} className="bg-amber-500 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><CornerUpLeft className="w-3.5 h-3.5"/>Return</Button>
                      )}
                      {hasPermission("requests", "reject") && (
                        <Button size="sm" variant="outline" onClick={() => setActionModal({ req, action: "Rejected" })} className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><XCircle className="w-3.5 h-3.5"/>Reject</Button>
                      )}
                    </>
                  )}
                  {req.attachment && <Button size="sm" variant="outline" className="border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><FileText className="w-3.5 h-3.5"/>View Docs</Button>}
                  {(hasPermission("requests", "delete") || (currentStaff && req.staffId === currentStaff.id && req.status === "Pending")) && (
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(req.id)} className="w-8 h-8 text-rose-400 hover:bg-rose-50 rounded-lg ml-auto"><Trash2 className="w-3.5 h-3.5"/></Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Pagination moduleKey="requests" totalItems={totalItems} />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[92vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Submit Staff Request</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">All fields marked * are required. A digital signature is mandatory.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Member <span className="text-rose-500">*</span></Label>
                <Select disabled={!isAdmin && !!currentStaff} value={form.staffId} onValueChange={v => { const s = filteredStaff.find(s => s.id === v); setForm(f => ({ ...f, staffId: v ?? "", staffName: s?.name || "", staffEmail: (s as any)?.email || "", staffMobile: (s as any)?.mobile || "", staffWhatsApp: (s as any)?.whatsapp || "" })); }}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Select staff"/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs max-h-48">{filteredStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.position}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></Label>
                  <Input value={form.staffName} onChange={e => setForm(f => ({...f, staffName: e.target.value}))} placeholder="Full name" className="bg-white border-slate-200 rounded-xl text-xs h-9" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number <span className="text-rose-500">*</span></Label>
                  <Input type="tel" value={form.staffMobile} onChange={e => setForm(f => ({...f, staffMobile: e.target.value}))} placeholder="+971 XX XXX XXXX" className="bg-white border-slate-200 rounded-xl text-xs h-9" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</Label>
                  <Input type="tel" value={form.staffWhatsApp} onChange={e => setForm(f => ({...f, staffWhatsApp: e.target.value}))} placeholder="+971 XX XXX XXXX" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</Label>
                  <Input type="email" value={form.staffEmail} onChange={e => setForm(f => ({...f, staffEmail: e.target.value}))} placeholder="Email" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Request Type <span className="text-rose-500">*</span></Label>
                  <Select value={form.requestType} onValueChange={v => setForm(f => ({...f, requestType: v as StaffRequest["requestType"]}))}>
                    <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue/></SelectTrigger>
                    <SelectContent className="bg-white rounded-xl text-xs">{REQUEST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date <span className="text-rose-500">*</span></Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description <span className="text-rose-500">*</span></Label>
                <textarea rows={4} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" placeholder="Provide details about the request..." required />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attach Relevant Document</Label>
                <div className="relative">
                  <Input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full" />
                  <Button type="button" variant="outline" className="w-full text-xs rounded-xl h-9 border-slate-200 gap-1 bg-slate-50">
                    <UploadCloud className="w-4 h-4 text-slate-500"/> {form.attachment ? `✅ ${form.attachment}` : "Upload Support Document"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Digital Signature <span className="text-rose-500">*</span></Label>
                {form.signature ? (
                  <div className="w-full h-14 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
                    <CheckCircle className="w-4 h-4"/> Signature Captured
                    <button type="button" onClick={() => setForm(f => ({...f, signature: null}))} className="ml-2 text-[10px] text-slate-400 underline">Clear</button>
                  </div>
                ) : (
                  <button type="button" onClick={handleSignatureDraw} className="w-full h-14 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-semibold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all">
                    ✍️ Click here to sign digitally
                  </button>
                )}
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionModal} onOpenChange={open => !open && setActionModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">{actionModal?.action} Request?</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Request from {actionModal?.req.staffName} for {actionModal?.req.requestType}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {(actionModal?.action === "Rejected" || actionModal?.action === "Returned") ? `Reason for ${actionModal?.action}` : "Reply Message"}
              {(actionModal?.action === "Rejected" || actionModal?.action === "Returned") && <span className="text-rose-500"> *</span>}
            </Label>
            <textarea rows={3} value={actionReason} onChange={e => setActionReason(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" placeholder="Enter reason or reply message..." />
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-3">
            <Button variant="ghost" onClick={() => setActionModal(null)} className="text-xs rounded-xl px-4">Cancel</Button>
            <Button onClick={handleAction} className={`text-white font-bold rounded-xl text-xs px-5 h-10 ${actionModal?.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : actionModal?.action === "Returned" ? "bg-amber-500 hover:bg-amber-600" : "bg-rose-600 hover:bg-rose-700"}`}>Confirm {actionModal?.action}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!historyReq} onOpenChange={open => !open && setHistoryReq(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Request History</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">{historyReq?.staffName} · {historyReq?.requestType}</DialogDescription>
          </DialogHeader>
          {historyReq && (
            <div className="space-y-3 mt-2">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Request ID</span><span className="font-bold text-slate-700">{historyReq.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="font-bold text-slate-700">{formatDate(historyReq.date)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Status</span><span className="font-bold text-slate-700">{historyReq.status}</span></div>
                {historyReq.processedBy && <div className="flex justify-between"><span className="text-slate-400">Processed By</span><span className="font-bold text-slate-700">{historyReq.processedBy}</span></div>}
                {(historyReq as any).staffMobile && <div className="flex justify-between"><span className="text-slate-400">Mobile</span><span className="font-bold text-slate-700">{(historyReq as any).staffMobile}</span></div>}
                {(historyReq as any).staffEmail && <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-bold text-slate-700">{(historyReq as any).staffEmail}</span></div>}
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Description</div>
                <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">&ldquo;{historyReq.description}&rdquo;</p>
              </div>
              {historyReq.reply && <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Reply from Management</div><p className="text-xs text-slate-600 bg-blue-50 border border-blue-100 p-3 rounded-xl">{historyReq.reply}</p></div>}
              {(historyReq as any).rejectReason && <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs text-rose-700"><div className="font-bold mb-1">Rejection Reason:</div>{(historyReq as any).rejectReason}</div>}
              {(historyReq as any).returnReason && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700"><div className="font-bold mb-1">Return Reason:</div>{(historyReq as any).returnReason}</div>}
              {(historyReq as any).signature && <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3"><CheckCircle className="w-4 h-4"/> Digitally Signed by {historyReq.staffName}</div>}
            </div>
          )}
          <DialogFooter className="pt-4"><Button onClick={() => setHistoryReq(null)} className="bg-slate-900 text-white rounded-xl text-xs px-5 h-9">Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteStaffRequest(deleteId!); toast.success("Request deleted"); setDeleteId(null); }} title="Delete Request" description="Remove this request permanently." confirmText="Delete" variant="danger" />
    </div>
  );
}
