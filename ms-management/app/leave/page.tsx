"use client";

import { useState } from "react";
import { Plus, CalendarDays, Clock, CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, LayoutGrid, List, UploadCloud } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, exportToCSV } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AccessDenied from "@/components/shared/AccessDenied";
import { filterRecordsByPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeaveRequest } from "@/lib/types";
import { toast } from "sonner";

const LEAVE_TYPES: LeaveRequest["leaveType"][] = ["Annual","Sick","Emergency","Vacation","Unpaid"];

export default function LeavePage() {
  const { currentRole, currentUser, leaveRequests, staff, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest, addActivityLog, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canViewLeave = hasPermission("leave", "view");
  if (!canViewLeave) {
    return <AccessDenied />;
  }
  const [modal, setModal] = useState(false);
  const [viewType, setViewType] = useState<"grid" | "calendar">("grid");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [approveModal, setApproveModal] = useState<{ req: LeaveRequest; action: "Approved"|"Rejected" } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ staffId: "", staffName: "", leaveType: "Annual" as LeaveRequest["leaveType"], fromDate: "", toDate: "", reason: "", attachment: null as string | null });

  const isSystemUser = currentUser.company === "System";
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
        leaveType: "Annual",
        fromDate: "",
        toDate: "",
        reason: "",
        attachment: null
      });
    } else {
      setForm({
        staffId: "",
        staffName: "",
        leaveType: "Annual",
        fromDate: "",
        toDate: "",
        reason: "",
        attachment: null
      });
    }
    setModal(true);
  };

  const f = filters.leave;
  let list = filterRecordsByPermission("leave", leaveRequests, currentUser, currentRole, hasPermission);
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(r => r.staffName.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(r => r.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(r => r.company === f.company);

  list = [...list].sort((a,b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || !form.fromDate || !form.toDate) { toast.error("Staff member and dates are required"); return; }
    const days = Math.max(1, Math.ceil((new Date(form.toDate).getTime() - new Date(form.fromDate).getTime()) / 86400000) + 1);
    const id = `LVE-${Math.floor(100+Math.random()*900)}`;
    
    const selectedStaff = staff.find(s => s.id === form.staffId);
    const company = selectedStaff ? selectedStaff.company : (currentUser.company === "System" ? "MS COMPANY" : currentUser.company);
    const branch = selectedStaff ? selectedStaff.branch : (currentUser.branch === "All" ? "Main Branch" : currentUser.branch);

    addLeaveRequest({ 
      ...form, 
      id, 
      days, 
      status: "Pending", 
      appliedDate: new Date().toISOString().slice(0,10), 
      company, 
      branch, 
      approvedBy: null, 
      approvedAt: null, 
      createdAt: new Date().toISOString().replace("T"," ").slice(0,19) 
    });
    toast.success("Leave request submitted");
    setModal(false);
    setForm({ staffId:"", staffName:"", leaveType:"Annual", fromDate:"", toDate:"", reason:"", attachment:null });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm(f => ({ ...f, attachment: file.name }));
      toast.success("Attachment added");
    }
  };

  const handleApproveReject = () => {
    if (!approveModal) return;
    const { req, action } = approveModal;
    if (action === "Rejected" && !rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    updateLeaveRequest({ ...req, status: action, approvedBy: currentUser.name, approvedAt: new Date().toISOString().slice(0,10), rejectReason: action === "Rejected" ? rejectReason : undefined });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Leave", oldValue: req.status, newValue: action, ipAddress: "192.168.1.102" });
    toast.success(`Leave request ${action}`);
    setApproveModal(null);
    setRejectReason("");
  };

  const leaveTypeColor = (t: string) => {
    const colors: Record<string,string> = { Annual:"bg-blue-50 text-blue-700 border-blue-100", Sick:"bg-rose-50 text-rose-700 border-rose-100", Emergency:"bg-amber-50 text-amber-700 border-amber-100", Vacation:"bg-emerald-50 text-emerald-700 border-emerald-100", Unpaid:"bg-gray-50 text-gray-700 border-gray-100" };
    return colors[t] || "bg-slate-50 text-slate-500 border-slate-100";
  };

  const filteredStaff = (currentRole === "Super Admin" || isSystemUser) 
    ? staff 
    : staff.filter(s => s.company.trim().toLowerCase() === currentUser.company.trim().toLowerCase());

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Leave Requests" subtitle="Manage and approve staff leave applications"
        actions={
          <div className="flex gap-2">
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button onClick={() => setViewType("grid")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewType === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}>Grid</button>
              <button onClick={() => setViewType("calendar")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewType === "calendar" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}>Calendar</button>
            </div>
            {hasPermission("leave", "create") && (
              <Button onClick={handleOpenModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>New Request</Button>
            )}
          </div>
        }
      />
      <FilterBar moduleKey="leave" statusOptions={["Pending","Processing","Approved","Rejected"]} onExport={() => { exportToCSV(list.map(r=>({ID:r.id,Staff:r.staffName,Type:r.leaveType,From:r.fromDate,To:r.toDate,Days:r.days,Status:r.status})),"leave-requests"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {viewType === "grid" ? (
          paginated.length === 0 ? (
            <EmptyState title="No leave requests" description="No leave requests have been submitted yet." action={<Button onClick={handleOpenModal} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Submit Request</Button>} />
          ) : (
            <div className="space-y-3">
              {paginated.map(req => (
                <Card key={req.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">
                        {req.staffName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{req.staffName}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${leaveTypeColor(req.leaveType)}`}>{req.leaveType}</span>
                          <StatusBadge status={req.status} />
                          <span className="text-[10px] text-slate-500 font-semibold">{req.days} day{req.days !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-slate-400"/>{formatDate(req.fromDate)} → {formatDate(req.toDate)}</span>
                        </div>
                        {req.reason && <div className="text-[10px] text-slate-500 mt-1 italic">&ldquo;{req.reason}&rdquo;</div>}
                        {req.attachment && <div className="text-[9px] text-blue-500 mt-1 font-bold underline cursor-pointer">📎 {req.attachment}</div>}
                        {req.rejectReason && req.status === "Rejected" && (
                          <div className="text-[10px] text-rose-500 mt-1 font-bold">Reason for Rejection: {req.rejectReason}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center flex-shrink-0">
                      {(req.status === "Pending" || req.status === "Processing") && (
                        <>
                          {req.status === "Pending" && hasPermission("leave", "edit") && (
                            <Button size="sm" onClick={() => {
                              updateLeaveRequest({ ...req, status: "Processing" });
                              toast.success("Status updated to Processing");
                            }} className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-bold rounded-xl text-[10px] h-8 px-3 gap-1">Process</Button>
                          )}
                          {hasPermission("leave", "approve") && (
                            <Button size="sm" onClick={() => setApproveModal({ req, action: "Approved" })} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><CheckCircle className="w-3.5 h-3.5"/>Approve</Button>
                          )}
                          {hasPermission("leave", "reject") && (
                            <Button size="sm" variant="outline" onClick={() => setApproveModal({ req, action: "Rejected" })} className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><XCircle className="w-3.5 h-3.5"/>Reject</Button>
                          )}
                        </>
                      )}
                      {req.approvedBy && <span className="text-[10px] text-slate-400 font-semibold">By {req.approvedBy}</span>}
                      {(hasPermission("leave", "delete") || (currentStaff && req.staffId === currentStaff.id && req.status === "Pending")) && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(req.id)} className="w-7 h-7 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
            <div className="text-center space-y-3">
              <CalendarDays className="w-12 h-12 text-slate-200 mx-auto" />
              <div className="text-slate-500 font-bold text-sm">Calendar View Active</div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">This calendar displays approved leaves. In a production app, this would use a calendar library (e.g. react-big-calendar).</p>
            </div>
          </div>
        )}
      </div>
      {viewType === "grid" && <Pagination moduleKey="leave" totalItems={totalItems} />}

      {/* New Request Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-md w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <DialogTitle className="text-base font-bold text-slate-800">Submit Leave Request</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Complete the leave request on behalf of a staff member.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Member <span className="text-rose-500">*</span></Label>
                <Select disabled={!isAdmin && !!currentStaff} value={form.staffId} onValueChange={v => { const s = filteredStaff.find(s => s.id === v); setForm(f => ({...f, staffId: v || "", staffName: s?.name || ""})); }}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Select staff"/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs max-h-48">{filteredStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.position}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leave Type</Label>
                <Select value={form.leaveType} onValueChange={v => setForm(f => ({...f, leaveType: (v as LeaveRequest["leaveType"]) || "Annual"}))}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">{LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Date <span className="text-rose-500">*</span></Label>
                  <Input required type="date" value={form.fromDate} onChange={e => setForm(f => ({...f, fromDate: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Date <span className="text-rose-500">*</span></Label>
                  <Input required type="date" value={form.toDate} onChange={e => setForm(f => ({...f, toDate: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason</Label>
                <textarea rows={2} value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attachment</Label>
                <div className="relative">
                  <Input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full" />
                  <Button type="button" variant="outline" className="w-full text-xs rounded-xl h-9 border-slate-200 gap-1 bg-slate-50">
                    <UploadCloud className="w-4 h-4 text-slate-500"/> {form.attachment ? form.attachment : "Upload Support Document"}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Confirmation */}
      <Dialog open={!!approveModal} onOpenChange={open => !open && setApproveModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">{approveModal?.action === "Approved" ? "Approve Leave Request?" : "Reject Leave Request?"}</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Leave request for {approveModal?.req.staffName} — {approveModal?.req.leaveType} ({approveModal?.req.days} days)</DialogDescription>
          </DialogHeader>
          {approveModal?.action === "Rejected" && (
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rejection Reason <span className="text-rose-500">*</span></Label>
              <textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" placeholder="Enter reason for rejection..." />
            </div>
          )}
          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setApproveModal(null)} className="text-xs rounded-xl px-4">Cancel</Button>
            <Button onClick={handleApproveReject} className={`text-white font-bold rounded-xl text-xs px-5 h-10 ${approveModal?.action === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>{approveModal?.action}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteLeaveRequest(deleteId!); toast.success("Request deleted"); setDeleteId(null); }} title="Delete Leave Request" description="Remove this leave request permanently." confirmText="Delete" variant="danger" />
    </div>
  );
}
