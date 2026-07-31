"use client";

import { useState, useMemo } from "react";
import { Plus, Calendar, Clock, Video, Phone, MapPin, Trash2, Globe, User, Mail, FileText, Download } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { exportToCSV, cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DocumentUploader from "@/components/shared/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Interview } from "@/lib/types";
import { NATIONALITIES } from "@/lib/constants";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import AccessDenied from "@/components/shared/AccessDenied";

const INTERVIEW_MODES = [
  "Physical Interview",
  "Zoom Meeting",
  "Google Meet",
  "Microsoft Teams",
  "Telephone Interview",
  "Online Interview",
  "Other"
];

const TIME_ZONES = [
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "America/New_York",
  "Asia/Singapore",
  "Asia/Karachi",
  "Asia/Manila"
];

export default function InterviewsPage() {
  const { currentRole, currentUser, interviews, applicants, ownCompanies, companies, branches, addInterview, updateInterview, deleteInterview, addSentEmail, addSentWhatsApp, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canView = hasPermission("interviews", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  const [modal, setModal] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [editInt, setEditInt] = useState<Interview | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedGreetingCard, setSelectedGreetingCard] = useState<Interview | null>(null);
  const [isGreetingCardOpen, setIsGreetingCardOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<"Formal" | "Modern" | "Technical">("Formal");

  const [form, setForm] = useState({
    applicantId: "",
    type: "Interview" as Interview["type"],
    conductPerson: currentUser.name,
    personName: "",
    mobile: "",
    whatsapp: "",
    email: "",
    nationality: "India",
    position: "",
    meetingType: "",
    isOnline: true,
    dateTime: "",
    mode: "Zoom Meeting",
    meetingLink: "",
    locationLink: "",
    notes: "",
    company: currentUser.company === "System" ? "" : currentUser.company,
    branch: currentUser.branch === "All" ? "" : currentUser.branch,
    autoEmail: true,
    autoWhatsapp: true,
    scheduledBy: "",
    interviewResult: "",
    feedback: "",
    remarks: "",
    candidateResponse: "",
    // New Redesign attributes
    isExternal: false,
    externalCompany: "",
    title: "",
    timeZone: "Asia/Dubai",
    meetingId: "",
    passcode: "",
    venue: "",
    building: "",
    floor: "",
    location: "",
    attachments: [] as any[],
  });

  const isSuperAdmin = currentRole === "Super Admin";

  // List BOTH ownCompanies (Internal) and companies (Client Companies)
  const selectableCompanies = useMemo(() => {
    const list: { id: string; name: string; type: "Internal" | "Client" }[] = [];
    ownCompanies.forEach(c => {
      if (isSuperAdmin || c.name === currentUser.company) {
        list.push({ id: c.id, name: c.name, type: "Internal" });
      }
    });
    companies.forEach(c => {
      if (isSuperAdmin || c.name === currentUser.company) {
        list.push({ id: c.id, name: c.name, type: "Client" });
      }
    });
    return list;
  }, [ownCompanies, companies, isSuperAdmin, currentUser.company]);

  const allowedBranches = useMemo(() => {
    const branchCompany = form.company || (isSuperAdmin ? "" : currentUser.company);
    return branches.filter(b => {
      if (isSuperAdmin) {
        return branchCompany === "" || b.company === branchCompany;
      } else {
        return b.company === currentUser.company && (currentUser.branch === "All" || b.name === currentUser.branch);
      }
    });
  }, [branches, form.company, isSuperAdmin, currentUser.company, currentUser.branch]);

  // Filter applicant dropdown based on selected company & branch
  const filteredApplicants = applicants.filter(app => {
    if (form.company && app.company !== form.company) return false;
    if (form.branch && form.branch !== "All" && app.branch !== form.branch) return false;
    if (!isSuperAdmin && currentUser.company !== "System") {
      if (app.company !== currentUser.company) return false;
      if (currentUser.branch !== "All" && app.branch !== currentUser.branch) return false;
    }
    return true;
  });

  const f = filters.interviews;
  let list = interviews;
  if (currentRole !== "Super Admin" && currentUser.company !== "System") {
    list = list.filter(i => i.company === currentUser.company);
  }

  // Filter list with full filters
  if (f.search) { 
    const q = f.search.toLowerCase(); 
    list = list.filter(i => {
      const linkedApp = applicants.find(a => a.id === i.applicantId);
      return (i.personName ?? "").toLowerCase().includes(q) || 
             (i.conductPerson ?? "").toLowerCase().includes(q) ||
             (i.title ?? "").toLowerCase().includes(q) ||
             (linkedApp?.fullName ?? "").toLowerCase().includes(q);
    }); 
  }
  if (f.status && f.status !== "all") list = list.filter(i => i.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(i => i.company === f.company);
  if (f.branch && f.branch !== "all") list = list.filter(i => i.branch === f.branch);
  if (f.nationality && f.nationality !== "all") list = list.filter(i => i.nationality === f.nationality);
  if (f.assignedTo && f.assignedTo !== "all") {
    const cond = f.assignedTo.toLowerCase();
    list = list.filter(i => (i.conductPerson ?? "").toLowerCase().includes(cond));
  }
  if (f.interviewType && f.interviewType !== "all") {
    const isOnlineTarget = f.interviewType === "Online";
    list = list.filter(i => i.isOnline === isOnlineTarget);
  }
  if (f.interviewMode && f.interviewMode !== "all") {
    list = list.filter(i => i.mode === f.interviewMode);
  }
  if (f.fromDate) list = list.filter(i => i.dateTime.slice(0,10) >= f.fromDate);
  if (f.toDate) list = list.filter(i => i.dateTime.slice(0,10) <= f.toDate);

  const sortBy = f.sortBy || "newest";
  list = [...list].sort((a, b) => {
    const dtA = a.dateTime || "";
    const dtB = b.dateTime || "";
    return sortBy === "oldest" ? dtA.localeCompare(dtB) : dtB.localeCompare(dtA);
  });
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const getEmailTemplateBody = (template: string, formState: typeof form) => {
    const name = formState.personName || "[Candidate Name]";
    const positionName = (formState.type === "Interview" ? formState.position : formState.meetingType) || "[Position]";
    const dt = formState.dateTime ? formState.dateTime.replace("T", " ") : "[Date & Time]";
    const onlineState = ["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(formState.mode);
    const format = onlineState ? `Online (${formState.mode})` : formState.mode === "Telephone Interview" ? "Telephone Interview" : "Physical Assessment";
    
    let links = "";
    if (onlineState) {
      links = `Meeting Link: ${formState.meetingLink || "TBD"}\n`;
      if (formState.meetingId) links += `Meeting ID: ${formState.meetingId}\n`;
      if (formState.passcode) links += `Passcode: ${formState.passcode}\n`;
    } else if (formState.mode === "Physical Interview") {
      links = `Venue: ${formState.venue || "TBD"}\nLocation Link: ${formState.locationLink || "TBD"}\n`;
    }
    
    switch (template) {
      case "Modern":
        return `Hi ${name}!

Thank you for your application for the ${positionName} position. We are excited to connect with you!

We have scheduled your session:
- Title: ${formState.title || "Interview Sync"}
- Date & Time: ${dt} (${formState.timeZone})
- Format: ${format}
${links}
Looking forward to speaking with you!

Best regards,
Hiring Team`;
      case "Technical":
        return `Dear ${name},

You have been scheduled for a Technical Assessment interview for the position of ${positionName} conducted by ${formState.conductPerson}.

Session Details:
- Title: ${formState.title || "Technical Interview"}
- Date & Time: ${dt} (${formState.timeZone})
- Format: ${format}
${links}
Please ensure you are in a quiet room, have a stable internet connection, and have your development environment ready.

Best regards,
Technical Recruitment Team`;
      case "Formal":
      default:
        return `Dear ${name},

We are pleased to invite you for an interview regarding your application for the ${positionName} position.

Below are the scheduled details:
- Title: ${formState.title || "Interview Session"}
- Conductor: ${formState.conductPerson}
- Date & Time: ${dt} (${formState.timeZone})
- Format: ${format}
${links}
Please confirm your availability by replying to this email.

Best regards,
HR Department`;
    }
  };

  const handleEdit = (int: Interview) => {
    setEditInt(int);
    setForm({
      applicantId: int.applicantId || "",
      type: int.type,
      conductPerson: int.conductPerson || "",
      personName: int.personName || "",
      mobile: int.mobile || "",
      whatsapp: int.whatsapp || "",
      email: int.email || "",
      nationality: int.nationality || "India",
      position: int.position || "",
      meetingType: int.meetingType || "",
      isOnline: int.isOnline,
      dateTime: int.dateTime ? int.dateTime.replace(" ", "T") : "",
      mode: int.mode || "Zoom Meeting",
      meetingLink: int.meetingLink || "",
      locationLink: int.locationLink || "",
      notes: int.notes || "",
      company: int.company,
      branch: int.branch,
      autoEmail: false,
      autoWhatsapp: false,
      scheduledBy: int.scheduledBy || "",
      interviewResult: int.interviewResult || "",
      feedback: int.feedback || "",
      remarks: int.remarks || "",
      candidateResponse: int.candidateResponse || "",
      // Redesign Attributes
      isExternal: !int.applicantId,
      externalCompany: int.company || "",
      title: int.title || "",
      timeZone: int.timeZone || "Asia/Dubai",
      meetingId: int.meetingId || "",
      passcode: int.passcode || "",
      venue: int.venue || "",
      building: int.building || "",
      floor: int.floor || "",
      location: int.location || "",
      attachments: int.attachments || []
    });
    setModal(true);
  };

  const resetForm = () => {
    setForm({
      applicantId: "",
      type: "Interview",
      conductPerson: currentUser.name,
      personName: "",
      mobile: "",
      whatsapp: "",
      email: "",
      nationality: "India",
      position: "",
      meetingType: "",
      isOnline: true,
      dateTime: "",
      mode: "Zoom Meeting",
      meetingLink: "",
      locationLink: "",
      notes: "",
      company: currentUser.company === "System" ? "" : currentUser.company,
      branch: currentUser.branch === "All" ? "" : currentUser.branch,
      autoEmail: true,
      autoWhatsapp: true,
      scheduledBy: "",
      interviewResult: "",
      feedback: "",
      remarks: "",
      candidateResponse: "",
      isExternal: false,
      externalCompany: "",
      title: "",
      timeZone: "Asia/Dubai",
      meetingId: "",
      passcode: "",
      venue: "",
      building: "",
      floor: "",
      location: "",
      attachments: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personName || !form.dateTime || !form.mode) { 
      toast.error("Required fields: Candidate Name, Date & Time, and Interview Mode."); 
      return; 
    }
    if (!form.company || !form.branch) {
      toast.error("Required fields: Company and Branch must be selected.");
      return;
    }
    if (form.isExternal) {
      if (!form.email.trim() && !form.mobile.trim()) {
        toast.error("External candidates require at least an Email Address or Mobile Number.");
        return;
      }
    }

    const flag = NATIONALITIES.find(n => n.name === form.nationality)?.flag || "🏳️";
    const onlineState = ["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode);

    const payload = {
      ...form,
      nationalityFlag: flag,
      isOnline: onlineState,
      meetingLink: onlineState ? form.meetingLink : undefined,
      locationLink: form.mode === "Physical Interview" ? form.locationLink : undefined,
    };

    if (editInt) {
      updateInterview({
        ...editInt,
        ...payload,
      });
      toast.success("Schedule updated successfully");
    } else {
      const id = `INT-${Math.floor(100+Math.random()*900)}`;
      addInterview({
        ...payload,
        id,
        status: "Scheduled",
        createdBy: currentUser.name || "System",
        createdAt: new Date().toISOString().slice(0, 10),
      });
      
      // Auto dispatch client window action
      if (form.autoWhatsapp && form.whatsapp) {
        const cleanNumber = form.whatsapp.replace(/[^0-9]/g, "");
        const waMsg = `Hello ${form.personName}, your ${form.type} (${form.type === "Interview" ? form.position : form.meetingType}) is scheduled with ${form.conductPerson} on ${form.dateTime.replace("T", " ")}. Link: ${form.meetingLink || "N/A"}`;
        if (typeof window !== "undefined") {
          window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(waMsg)}`, "_blank");
        }
        addSentWhatsApp({
          id: `WHA-${Math.floor(100+Math.random()*900)}`,
          to: form.whatsapp,
          message: waMsg,
          sentAt: new Date().toISOString().slice(0, 16).replace("T", " "),
          company: form.company || "System",
          branch: form.branch || "Main",
          candidateName: form.personName
        });
      }
      toast.success("Interview scheduled successfully!");
    }
    setModal(false);
    setEditInt(null);
    resetForm();
  };

  const [statusModal, setStatusModal] = useState<{ int: Interview; targetStatus: Interview["status"] } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [rescheduleDateTime, setRescheduleDateTime] = useState("");

  const handleStatusChange = (int: Interview, status: Interview["status"]) => {
    if (status === "Cancelled" || status === "Rescheduled") {
      setStatusModal({ int, targetStatus: status });
      setStatusReason("");
      setRescheduleDateTime(int.dateTime ? int.dateTime.replace(" ", "T") : "");
    } else {
      updateInterview({ ...int, status });
      toast.success(`Status → ${status}`);
    }
  };

  const modeIcon = (mode: string) => {
    const m = (mode || "").toLowerCase();
    if (m.includes("zoom") || m.includes("meet") || m.includes("teams") || m.includes("online")) {
      return <Video className="w-3.5 h-3.5"/>;
    }
    if (m.includes("phone") || m.includes("telephone") || m.includes("whatsapp")) {
      return <Phone className="w-3.5 h-3.5"/>;
    }
    return <MapPin className="w-3.5 h-3.5"/>;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title="Interviews & Meetings" 
        subtitle="Schedule and manage all interviews and team meetings"
        actions={
          <Button 
            onClick={() => { setEditInt(null); resetForm(); setModal(true); }} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4"/>
            Schedule
          </Button>
        }
      />
      <FilterBar 
        moduleKey="interviews" 
        statusOptions={["Scheduled","Completed","Cancelled","Rescheduled"]} 
        showNationality={true}
        showAssignee={true}
        onExport={() => { 
          exportToCSV(list.map(i=>({
            ID: i.id,
            Type: i.type,
            Title: i.title || "N/A",
            Person: i.personName,
            DateTime: i.dateTime,
            Mode: i.mode,
            Status: i.status,
            Conductor: i.conductPerson,
            Nationality: i.nationality,
            Company: i.company,
            Branch: i.branch
          })), "interviews"); 
          toast.success("Exported"); 
        }} 
      />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState 
            title="No interviews scheduled" 
            description="Schedule your first interview or meeting." 
            action={<Button onClick={() => setModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Schedule Now</Button>} 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(int => {
              const linkedApp = applicants.find(a => a.id === int.applicantId);
              return (
                <Card key={int.id} className="rounded-2xl border border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex-shrink-0">
                        {linkedApp?.photo ? (
                          <AvatarImage src={linkedApp.photo} className="object-cover rounded-xl" />
                        ) : null}
                        <AvatarFallback className="rounded-xl font-bold bg-slate-100 text-slate-700 text-xs">
                          {(int.personName || "").trim().split(" ").filter(Boolean).map(n => n[0]).join("").slice(0,2).toUpperCase() || "INT"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${int.type === "Interview" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"}`}>{int.type}</span>
                          {!int.applicantId && <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-100 uppercase">External</span>}
                        </div>
                        {int.title && <div className="text-[10px] font-bold text-blue-600 truncate">{int.title}</div>}
                        <div className="text-sm font-bold text-slate-800 leading-tight truncate">{int.personName} {int.nationalityFlag}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-semibold truncate">
                          {int.type === "Interview" ? `Position: ${int.position || "N/A"}` : `Type: ${int.meetingType || "N/A"}`}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={int.status} />
                  </div>

                  {int.applicantId && (
                    <div className="text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2 flex items-center gap-1">
                      <span className="text-slate-400">Linked applicant:</span>
                      <a href={`/applicants/${int.applicantId}`} className="text-blue-600 font-bold hover:underline">
                        Profile ({int.applicantId})
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                      {int.dateTime ? (int.dateTime.split("T")[0] || int.dateTime.split(" ")[0]) : "N/A"}
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      <Clock className="w-3.5 h-3.5 text-slate-400"/>
                      {int.dateTime ? (int.dateTime.split("T")[1] || int.dateTime.split(" ")[1] || "N/A") : "N/A"}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border col-span-2",
                      int.isOnline 
                        ? "bg-blue-50 text-blue-600 border-blue-100" 
                        : int.mode === "Telephone Interview"
                        ? "bg-purple-50 text-purple-600 border-purple-100"
                        : "bg-amber-50 text-amber-600 border-amber-100"
                    )}>
                      {modeIcon(int.mode)}
                      <span>{int.mode} {int.timeZone ? `(${int.timeZone})` : ""}</span>
                    </div>
                  </div>

                  {/* Meeting Details Render block */}
                  {int.isOnline && (int.meetingLink || int.meetingId || int.passcode) && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[10px] font-semibold space-y-1">
                      <div className="text-slate-400 text-[9px] uppercase font-extrabold tracking-wider">Virtual Meeting Info</div>
                      {int.meetingLink && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Link:</span>
                          <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">{int.meetingLink}</a>
                        </div>
                      )}
                      {int.meetingId && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">ID:</span>
                          <span className="text-slate-800 font-bold">{int.meetingId}</span>
                        </div>
                      )}
                      {int.passcode && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Passcode:</span>
                          <span className="text-slate-800 font-bold">{int.passcode}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Physical Location Details Render block */}
                  {!int.isOnline && int.mode === "Physical Interview" && (int.venue || int.building || int.floor || int.location || int.locationLink) && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[10px] font-semibold space-y-1">
                      <div className="text-slate-400 text-[9px] uppercase font-extrabold tracking-wider">Physical Venue Details</div>
                      {int.venue && <div>Venue: <span className="text-slate-800 font-bold">{int.venue}</span></div>}
                      {(int.building || int.floor) && <div>Location: <span className="text-slate-800 font-bold">{int.floor ? `Floor ${int.floor}, ` : ""}{int.building || ""}</span></div>}
                      {int.location && <div>Address: <span className="text-slate-700 font-medium">{int.location}</span></div>}
                      {int.locationLink && (
                        <a href={int.locationLink} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> View Map Location
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold border-t border-slate-50 pt-2">
                    {int.whatsapp && <div>WhatsApp: <span className="font-normal text-slate-700">{int.whatsapp}</span></div>}
                    {int.email && <div>Email: <span className="font-normal text-slate-700 truncate block">{int.email}</span></div>}
                    {int.nationality && <div>Nationality: <span className="font-normal text-slate-700">{int.nationality}</span></div>}
                    {int.mobile && <div>Mobile: <span className="font-normal text-slate-700">{int.mobile}</span></div>}
                  </div>
                  
                  <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Conductor: <span className="text-slate-800 font-bold">{int.conductPerson}</span></span>
                  </div>

                  {/* Attachments Section */}
                  {int.attachments && int.attachments.length > 0 && (
                    <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attachments ({int.attachments.length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {int.attachments.map((doc: any) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2 py-1 text-slate-600 transition-colors"
                          >
                            <FileText className="w-2.5 h-2.5 text-slate-400" />
                            <span className="truncate max-w-[85px]">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {(int.interviewResult || int.feedback || int.remarks || int.candidateResponse || int.scheduledBy) && (
                    <div className="border-t border-slate-100 pt-2.5 space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-dashed border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assessment Status & Feedback</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                        {int.scheduledBy && <div>Scheduled By: <span className="font-bold text-slate-800">{int.scheduledBy}</span></div>}
                        {int.interviewResult && (
                          <div>Result: <span className={cn(
                            "font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase border",
                            int.interviewResult === "Passed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            int.interviewResult === "Failed" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            int.interviewResult === "Shortlisted" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          )}>{int.interviewResult}</span></div>
                        )}
                        {int.candidateResponse && (
                          <div>Candidate Response: <span className={cn(
                            "font-extrabold px-1.5 py-0.5 rounded text-[9px] uppercase border",
                            int.candidateResponse === "Accepted" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            int.candidateResponse === "Rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-slate-50 text-slate-700 border-slate-200"
                          )}>{int.candidateResponse}</span></div>
                        )}
                      </div>
                      {int.feedback && (
                        <div className="text-[10px] text-slate-600 leading-normal">
                          <span className="font-bold">Feedback:</span> {int.feedback}
                        </div>
                      )}
                      {int.remarks && (
                        <div className="text-[10px] text-slate-500 leading-normal italic">
                          <span className="font-bold not-italic">Remarks:</span> {int.remarks}
                        </div>
                      )}
                    </div>
                  )}

                  {int.notes && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                      Notes: {int.notes}
                    </div>
                  )}

                  {/* Notifications invite buttons */}
                  <div className="flex gap-2 border-t border-slate-50 pt-2.5">
                    {int.email && (
                      <button 
                        onClick={() => {
                          addSentEmail({
                            id: `EML-${Math.floor(100+Math.random()*900)}`,
                            to: int.email!,
                            subject: `Interview Details Notice: ${int.title || "Scheduled Sync"} - ${int.personName}`,
                            body: `Dear ${int.personName},\n\nThis is a notification reminder for your ${int.type} scheduled with ${int.conductPerson} on ${int.dateTime}.\n\nMeeting link: ${int.meetingLink || "N/A"}\nLocation: ${int.locationLink || "N/A"}\nNotes: ${int.notes || "N/A"}`,
                            sentAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                            company: int.company || currentUser.company,
                            branch: int.branch || currentUser.branch,
                            candidateName: int.personName
                          });
                          toast.success(`Invitation Email manually sent to ${int.personName}`);
                        }}
                        className="text-[9px] font-bold px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors flex items-center gap-1 flex-1 justify-center"
                      >
                        <Mail className="w-3 h-3"/> Send Email Invite
                      </button>
                    )}
                    {int.whatsapp && (
                      <button 
                        onClick={() => {
                          const waMsg = `Hello ${int.personName}, your ${int.type} is scheduled on ${int.dateTime}. Join link: ${int.meetingLink || "N/A"}`;
                          const cleanNumber = int.whatsapp!.replace(/[^0-9]/g, "");
                          if (typeof window !== "undefined") {
                            window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(waMsg)}`, "_blank");
                          }
                          addSentWhatsApp({
                            id: `WHA-${Math.floor(100+Math.random()*900)}`,
                            to: int.whatsapp!,
                            message: waMsg,
                            sentAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                            company: int.company || currentUser.company,
                            branch: int.branch || currentUser.branch,
                            candidateName: int.personName
                          });
                          toast.success(`WhatsApp message manually sent to ${int.personName}`);
                        }}
                        className="text-[9px] font-bold px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 transition-colors flex items-center gap-1 flex-1 justify-center"
                      >
                        <Phone className="w-3 h-3 text-emerald-500"/> Send WhatsApp Invite
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex gap-1 flex-wrap">
                    {(["Completed","Cancelled","Rescheduled"] as Interview["status"][]).filter(s => s !== int.status).map(s => (
                      <button key={s} onClick={() => handleStatusChange(int, s)} className="text-[9px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">→ {s}</button>
                    ))}
                    <button type="button" onClick={() => { setSelectedGreetingCard(int); setIsGreetingCardOpen(true); }} className="text-[9px] font-bold px-2.5 py-1 rounded-lg border border-indigo-150 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-200 transition-colors flex items-center gap-1 ml-auto">🎴 Card</button>
                    <button onClick={() => handleEdit(int)} className="text-[9px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors">Edit</button>
                    <button onClick={() => setDeleteId(int.id)} className="text-[9px] font-bold px-2.5 py-1 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Pagination moduleKey="interviews" totalItems={totalItems} />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <DialogTitle className="text-base font-bold text-slate-800">{editInt ? "Edit Schedule" : "Schedule Interview / Meeting"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Configure type, participant registry, venue/virtual links, and attachments.</DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Candidate / Participant Details */}
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 flex-shrink-0">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {form.type === "Interview" ? "Candidate Details" : "Participant Details"}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Toggle between Registered and External */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Participant Registry</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!!editInt}
                          onClick={() => setForm(f => ({ ...f, isExternal: false, applicantId: "", personName: "", mobile: "", whatsapp: "", email: "", nationality: "India", position: "" }))}
                          className={cn(
                            "flex-1 text-xs py-2 rounded-xl border font-bold transition-all disabled:opacity-70",
                            !form.isExternal
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          Registered Applicant
                        </button>
                        <button
                          type="button"
                          disabled={!!editInt}
                          onClick={() => setForm(f => ({ ...f, isExternal: true, applicantId: "", personName: "", mobile: "", whatsapp: "", email: "", nationality: "India", position: "" }))}
                          className={cn(
                            "flex-1 text-xs py-2 rounded-xl border font-bold transition-all disabled:opacity-70",
                            form.isExternal
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          External Candidate
                        </button>
                      </div>
                    </div>

                    {/* Company Dropdown (Both Client and Internal) */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company <span className="text-rose-500">*</span></Label>
                      <select
                        value={form.company}
                        required
                        onChange={e => setForm(f => ({ ...f, company: e.target.value || "", branch: "", applicantId: "", personName: "", mobile: "", whatsapp: "", email: "", nationality: "India", position: "", meetingType: "" }))}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                      >
                        <option value="">Select Company...</option>
                        {selectableCompanies.map(c => (
                          <option key={`${c.type}-${c.id}`} value={c.name}>
                            {c.name} ({c.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Branch Selector */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch <span className="text-rose-500">*</span></Label>
                      <select
                        value={form.branch}
                        required
                        onChange={e => setForm(f => ({ ...f, branch: e.target.value || "", applicantId: "", personName: "", mobile: "", whatsapp: "", email: "", nationality: "India", position: "", meetingType: "" }))}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                      >
                        <option value="">Select Branch...</option>
                        {allowedBranches.map(b => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional input fields based on Registered vs External */}
                    {!form.isExternal ? (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link Applicant</Label>
                        <select
                          value={form.applicantId}
                          onChange={e => {
                            const val = e.target.value;
                            const selected = applicants.find(a => a.id === val);
                            setForm(f => ({
                              ...f,
                              applicantId: val || "",
                              personName: selected?.fullName || "",
                              mobile: selected?.mobile || "",
                              whatsapp: selected?.whatsapp || "",
                              email: selected?.email || "",
                              nationality: selected?.nationality || "India",
                              position: selected?.applyingPositions?.[0] || "",
                            }));
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                        >
                          <option value="">Select Applicant...</option>
                          {filteredApplicants.map(app => <option key={app.id} value={app.id}>{app.fullName} ({app.id})</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">External Company Name (Optional)</Label>
                        <Input value={form.externalCompany} onChange={e => setForm(f => ({...f, externalCompany: e.target.value}))} placeholder="Enter company name..." className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Name <span className="text-rose-500">*</span></Label>
                      <Input required value={form.personName} onChange={e => setForm(f => ({...f, personName: e.target.value}))} placeholder="Enter full name" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp</Label>
                        <Input value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} placeholder="WhatsApp..." className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile</Label>
                        <Input value={form.mobile} onChange={e => setForm(f => ({...f, mobile: e.target.value}))} placeholder="Mobile..." className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</Label>
                      <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nationality</Label>
                        <select
                          value={form.nationality}
                          onChange={e => setForm(f => ({...f, nationality: e.target.value || "India"}))}
                          className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                        >
                          {NATIONALITIES.map(n => <option key={n.name} value={n.name}>{n.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {form.type === "Interview" ? "Designation / Position" : "Meeting Type"}
                        </Label>
                        <Input value={form.type === "Interview" ? form.position : form.meetingType} onChange={e => setForm(f => form.type === "Interview" ? ({...f, position: e.target.value}) : ({...f, meetingType: e.target.value}))} placeholder={form.type === "Interview" ? "e.g. Developer" : "e.g. Sync"} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Schedule & Format */}
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100/80">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 flex-shrink-0">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Schedule & Format</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interview Title</Label>
                      <Input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="E.g. Final Technical Round" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</Label>
                        <select
                          value={form.type}
                          onChange={e => setForm(f => ({...f, type: (e.target.value as Interview["type"]) || "Interview"}))}
                          className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                        >
                          <option value="Interview">Interview</option>
                          <option value="Meeting">Meeting</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Conducted By <span className="text-rose-500">*</span></Label>
                        <Input required value={form.conductPerson} onChange={e => setForm(f => ({...f, conductPerson: e.target.value}))} placeholder="Conductor name" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date & Time <span className="text-rose-500">*</span></Label>
                        <Input required type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({...f, dateTime: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 text-slate-800" />
                      </div>
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time Zone</Label>
                        <select
                          value={form.timeZone}
                          onChange={e => setForm(f => ({...f, timeZone: e.target.value}))}
                          className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                        >
                          {TIME_ZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 col-span-2">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interview Mode <span className="text-rose-500">*</span></Label>
                        <select
                          value={form.mode}
                          required
                          onChange={e => setForm(f => ({...f, mode: e.target.value}))}
                          className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                        >
                          {INTERVIEW_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Online platforms extra detail inputs */}
                    {["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode) && (
                      <div className="space-y-3 bg-blue-50/20 p-4 rounded-xl border border-blue-100/50">
                        <div className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">Online Platforms Link Credentials</div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meeting Link</Label>
                          <Input value={form.meetingLink} onChange={e => setForm(f => ({...f, meetingLink: e.target.value}))} placeholder="https://..." className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meeting ID</Label>
                            <Input value={form.meetingId} onChange={e => setForm(f => ({...f, meetingId: e.target.value}))} placeholder="ID..." className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passcode</Label>
                            <Input value={form.passcode} onChange={e => setForm(f => ({...f, passcode: e.target.value}))} placeholder="Passcode..." className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Physical office details extra inputs */}
                    {form.mode === "Physical Interview" && (
                      <div className="space-y-3 bg-amber-50/20 p-4 rounded-xl border border-amber-100/50">
                        <div className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider">Physical Office Location Details</div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Venue / Office Name</Label>
                          <Input value={form.venue} onChange={e => setForm(f => ({...f, venue: e.target.value}))} placeholder="e.g. HQ Head Office" className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Building</Label>
                            <Input value={form.building} onChange={e => setForm(f => ({...f, building: e.target.value}))} placeholder="e.g. Tower B" className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Floor</Label>
                            <Input value={form.floor} onChange={e => setForm(f => ({...f, floor: e.target.value}))} placeholder="e.g. 14th Floor" className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location / Address</Label>
                          <Input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} placeholder="Full address details..." className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google Maps Link</Label>
                          <Input value={form.locationLink} onChange={e => setForm(f => ({...f, locationLink: e.target.value}))} placeholder="https://maps.google.com/..." className="bg-white border-slate-200 rounded-xl text-xs h-8 focus:border-blue-400" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invitation Template</Label>
                      <select
                        value={emailTemplate}
                        onChange={e => {
                          const val = e.target.value as any;
                          setEmailTemplate(val);
                          const generated = getEmailTemplateBody(val, form);
                          setForm(f => ({ ...f, notes: generated }));
                          toast.success(`${val} template text applied to Notes`);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700 outline-none"
                      >
                        <option value="Formal">Formal Invite Template</option>
                        <option value="Modern">Modern & Friendly Template</option>
                        <option value="Technical">Technical Assessment Template</option>
                      </select>
                    </div>

                    {/* Auto Notifications */}
                    <div className="space-y-2 pt-2.5 border-t border-slate-100">
                      <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Auto Notifications</Label>
                      <div className="flex items-center justify-between p-2.5 border border-slate-150 rounded-xl bg-white shadow-sm">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-800">Auto Send Email Invite</div>
                          <div className="text-[9px] text-slate-400 font-semibold">Instantly email details to candidates</div>
                        </div>
                        <Switch 
                          checked={form.autoEmail} 
                          onCheckedChange={v => setForm(f => ({ ...f, autoEmail: v }))} 
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-2.5 border border-slate-150 rounded-xl bg-white shadow-sm">
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-bold text-slate-800">Auto Send WhatsApp Invite</div>
                          <div className="text-[9px] text-slate-400 font-semibold">WhatsApp message to candidate</div>
                        </div>
                        <Switch 
                          checked={form.autoWhatsapp} 
                          onCheckedChange={v => setForm(f => ({ ...f, autoWhatsapp: v }))} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Attachments Section */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attachments</Label>
                <DocumentUploader
                  documents={form.attachments || []}
                  uploadedBy={currentUser.name}
                  canUpload={true}
                  canDelete={true}
                  canDownload={true}
                  onAdd={(doc) => setForm(f => ({ ...f, attachments: [...(f.attachments || []), doc] }))}
                  onDelete={(docId) => setForm(f => ({ ...f, attachments: (f.attachments || []).filter(d => d.id !== docId) }))}
                  label="Schedule Attachments"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Enter any extra details or instructions..." className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none transition-all" />
              </div>
            </div>
            
            <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-end flex-shrink-0">
              {form.email && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEmailPreview(true)} 
                  className="text-xs rounded-xl px-4 h-9 border-slate-200 gap-1.5 mr-auto font-bold"
                >
                  <Mail className="w-3.5 h-3.5" /> Preview Email Invite
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4 h-9">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-9">{editInt ? "Update" : "Schedule"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Live Email Invitation Preview Modal */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-2xl w-[95vw] overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" /> Live Invitation Email Preview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Review how the candidate's invitation email looks before scheduling.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4 font-sans max-h-[60vh] min-h-0">
            <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-sm space-y-3.5 text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-400 w-16">To:</span>
                <span className="font-bold text-slate-800 flex-1 truncate">{form.email || "[Candidate Email Not Provided]"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-400 w-16">From:</span>
                <span className="font-bold text-slate-800 flex-1 truncate">MS Horizon F.Z.E HR Support</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-400 w-16">Subject:</span>
                <span className="font-black text-blue-600 flex-1">
                  {form.type === "Meeting" 
                    ? `Initial Interview Invitation: ${form.position || form.meetingType || "Discussion"} - ${form.personName || "Candidate"}`
                    : ["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode)
                    ? `Online Interview Invitation: ${form.position || "Discussion"} - ${form.personName || "Candidate"}`
                    : `Office Interview Invitation: ${form.position || "Discussion"} - ${form.personName || "Candidate"}`}
                </span>
              </div>

              <div className="mt-4 border border-slate-150 rounded-xl overflow-hidden shadow-xs">
                <div className={`p-5 text-center text-white font-bold bg-gradient-to-r ${
                  form.type === "Meeting"
                    ? "from-slate-800 to-blue-600"
                    : ["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode)
                    ? "from-teal-800 to-teal-600" 
                    : "from-amber-800 to-amber-600"
                }`}>
                  <div className="text-sm font-extrabold tracking-wide">MS HORIZON F.Z.E</div>
                  <div className="text-[10px] text-white/80 font-medium mt-0.5">
                    {form.type === "Meeting" ? "Initial Screen Sync" : ["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode) ? "Virtual Interview Portal" : "On-site Interview Assessment"}
                  </div>
                </div>

                <div className="p-6 bg-white space-y-4 text-[11px] leading-relaxed text-slate-600 font-sans">
                  <p>Dear <strong className="text-slate-800">{form.personName || "[Candidate Name]"}</strong>,</p>
                  
                  {form.type === "Meeting" ? (
                    <p>We are pleased to invite you for an Initial screening interview for the position of <strong>{form.position || form.meetingType || "Discussion"}</strong> at MS Horizon.</p>
                  ) : ["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode) ? (
                    <p>We are pleased to invite you for an Online Virtual Interview for the position of <strong>{form.position || "Discussion"}</strong> at MS Horizon.</p>
                  ) : (
                    <p>We are pleased to invite you for an In-person/Physical Interview for the position of <strong>{form.position || "Discussion"}</strong> at MS Horizon.</p>
                  )}

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between border-b border-slate-100/50 pb-1.5 font-sans">
                      <span className="font-bold text-slate-400">Title:</span>
                      <strong className="text-slate-800">{form.title || "Interview Session"}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 pb-1.5">
                      <span className="font-bold text-slate-400">Date & Time:</span>
                      <strong className="text-slate-800">{form.dateTime ? form.dateTime.replace("T", " ") : "TBD"} ({form.timeZone})</strong>
                    </div>
                    {["Zoom Meeting", "Google Meet", "Microsoft Teams", "Online Interview", "Other"].includes(form.mode) ? (
                      <>
                        <div className="flex justify-between border-b border-slate-100/50 pb-1.5">
                          <span className="font-bold text-slate-400">Platform Link:</span>
                          <strong className="text-blue-600 truncate max-w-[250px]">{form.meetingLink || "To be provided"}</strong>
                        </div>
                        {form.meetingId && (
                          <div className="flex justify-between border-b border-slate-100/50 pb-1.5">
                            <span className="font-bold text-slate-400">Meeting ID:</span>
                            <strong className="text-slate-800">{form.meetingId}</strong>
                          </div>
                        )}
                        {form.passcode && (
                          <div className="flex justify-between border-b border-slate-100/50 pb-1.5">
                            <span className="font-bold text-slate-400">Passcode:</span>
                            <strong className="text-slate-800">{form.passcode}</strong>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {form.venue && (
                          <div className="flex justify-between border-b border-slate-100/50 pb-1.5">
                            <span className="font-bold text-slate-400">Venue:</span>
                            <strong className="text-slate-800">{form.venue}</strong>
                          </div>
                        )}
                        <div className="flex justify-between border-b border-slate-100/50 pb-1.5">
                          <span className="font-bold text-slate-400">Office Location:</span>
                          <strong className="text-slate-800 truncate max-w-[250px]">{form.locationLink || "To be provided"}</strong>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="font-bold text-slate-400">Conductor:</span>
                      <strong className="text-slate-800">{form.conductPerson || "HR Team"}</strong>
                    </div>
                  </div>

                  {form.notes && (
                    <div className="space-y-1">
                      <strong className="text-[10px] uppercase text-slate-400 block tracking-wider">Additional Instructions / Notes:</strong>
                      <p className="whitespace-pre-wrap italic bg-slate-50 p-3 rounded-lg border border-slate-100">"{form.notes}"</p>
                    </div>
                  )}

                  <p>If you have any questions or need to reschedule, please contact our coordinator.</p>
                  <p>Best regards,<br/><strong className="text-slate-800">MS Horizon F.Z.E HR Team</strong></p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end flex-shrink-0">
            <Button onClick={() => setShowEmailPreview(false)} className="bg-slate-900 text-white rounded-xl text-xs font-bold px-5 h-9">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule/Cancel Status Update Modal */}
      <Dialog open={!!statusModal} onOpenChange={open => !open && setStatusModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!statusModal) return;
            const { int, targetStatus } = statusModal;
            if (targetStatus === "Rescheduled" && !rescheduleDateTime) {
              toast.error("Please pick a new date and time");
              return;
            }
            if (!statusReason.trim()) {
              toast.error("Please enter a reason");
              return;
            }

            updateInterview({
              ...int,
              status: targetStatus,
              dateTime: targetStatus === "Rescheduled" ? rescheduleDateTime.replace("T", " ") : int.dateTime,
              reason: statusReason
            } as any);

            toast.success(`Schedule ${targetStatus === "Rescheduled" ? "Rescheduled" : "Cancelled"}`);
            setStatusModal(null);
            setStatusReason("");
          }} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                {statusModal?.targetStatus === "Rescheduled" ? "Reschedule Interview / Meeting" : "Cancel Interview / Meeting"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Please provide the reason for {statusModal?.targetStatus === "Rescheduled" ? "rescheduling" : "cancelling"} this event. Candidates will be notified via email.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {statusModal?.targetStatus === "Rescheduled" && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Date & Time <span className="text-rose-500">*</span></Label>
                  <Input 
                    required 
                    type="datetime-local" 
                    value={rescheduleDateTime} 
                    onChange={e => setRescheduleDateTime(e.target.value)} 
                    className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason <span className="text-rose-500">*</span></Label>
                <textarea 
                  required
                  rows={3} 
                  value={statusReason} 
                  onChange={e => setStatusReason(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" 
                  placeholder={`Write the reason manually here...`}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setStatusModal(null)} className="text-xs rounded-xl px-4 h-9">Cancel</Button>
              <Button type="submit" className={`text-white font-bold rounded-xl text-xs px-5 h-9 ${statusModal?.targetStatus === "Rescheduled" ? "bg-blue-600 hover:bg-blue-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteInterview(deleteId!); toast.success("Deleted"); setDeleteId(null); }} title="Delete Schedule" description="Remove this interview/meeting from the calendar." confirmText="Delete" variant="danger" />

      {/* MODAL: GREETING CARD */}
      <Dialog open={isGreetingCardOpen} onOpenChange={setIsGreetingCardOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-lg w-[95vw] max-h-[95vh] overflow-y-auto">
          <div id="print-card-content" className="p-8 space-y-6 flex flex-col items-center bg-gradient-to-b from-blue-900 via-slate-900 to-blue-950 text-white border-b-8 border-amber-500 relative select-none">
            <div className="absolute inset-4 border border-amber-500/20 rounded-2xl pointer-events-none" />
            <div className="absolute inset-5 border-2 border-amber-500/45 rounded-xl pointer-events-none" />
            
            <div className="z-10 text-center space-y-4 w-full">
              <div className="text-amber-500 font-extrabold text-[11px] uppercase tracking-widest">Official Invitation</div>
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">Interview Invitation</h2>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent w-3/4 mx-auto my-2" />
              
              <div className="space-y-1.5 py-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Candidate Name</p>
                <h3 className="text-xl font-extrabold text-white">{selectedGreetingCard?.personName}</h3>
                <p className="text-xs text-amber-400 font-bold italic">{selectedGreetingCard?.position || selectedGreetingCard?.meetingType}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3.5 text-left text-xs font-semibold text-slate-200 font-sans">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Interviewer</span>
                  <span className="font-extrabold text-white">{selectedGreetingCard?.conductPerson}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Date & Time</span>
                  <span className="font-extrabold text-white">{(selectedGreetingCard?.dateTime || "").replace("T", " ")} ({selectedGreetingCard?.timeZone || "Asia/Dubai"})</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Format</span>
                  <span className="font-extrabold text-white font-sans">
                    {selectedGreetingCard?.isOnline ? `Online (${selectedGreetingCard?.mode})` : "Physical Assessment"}
                  </span>
                </div>
                {selectedGreetingCard?.meetingLink && (
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                    <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Meeting Link</span>
                    <span className="text-[10px] text-blue-400 font-medium truncate block select-text">{selectedGreetingCard?.meetingLink}</span>
                  </div>
                )}
                {selectedGreetingCard?.locationLink && (
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-2">
                    <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Google Map Location</span>
                    <span className="text-[10px] text-amber-400 font-medium truncate block select-text">{selectedGreetingCard?.locationLink}</span>
                  </div>
                )}
                {selectedGreetingCard?.notes && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold">Instructions</span>
                    <span className="text-[10px] text-slate-300 font-medium leading-relaxed italic">"{selectedGreetingCard?.notes}"</span>
                  </div>
                )}
              </div>

              <div className="pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {selectedGreetingCard?.company || "MS COMPANY"} HR & RECRUITMENT TEAM
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsGreetingCardOpen(false)} className="text-xs rounded-xl px-4 h-9">
              Close
            </Button>
            <Button
              onClick={() => {
                const card = selectedGreetingCard;
                if (!card) return;
                const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Interview Invitation - ${card.personName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Inter', sans-serif;
      background: linear-gradient(to bottom, #1e3a8a, #0f172a, #172554);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 2rem; color: white;
    }
    .card { 
      max-width: 500px; width: 100%; border-bottom: 8px solid #f59e0b;
      padding: 3rem 2.5rem; position: relative; border-radius: 1.5rem;
      background: linear-gradient(to bottom, #1e3a8a, #0f172a);
    }
    .card::before { content: ""; position: absolute; inset: 1rem; border: 1px solid rgba(245,158,11,0.2); border-radius: 1rem; pointer-events: none; }
    .card::after  { content: ""; position: absolute; inset: 1.25rem; border: 2px solid rgba(245,158,11,0.45); border-radius: 0.75rem; pointer-events: none; }
    .label { color: #f59e0b; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; text-align: center; }
    h1 { font-size: 1.75rem; font-weight: 900; text-transform: uppercase; text-align: center; letter-spacing: 0.05em; margin-top: 0.5rem; }
    .divider { height: 2px; background: linear-gradient(to right, transparent, #f59e0b, transparent); width: 75%; margin: 1rem auto; }
    .candidate-label { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-align: center; }
    .candidate-name { font-size: 1.4rem; font-weight: 800; text-align: center; margin-top: 0.25rem; }
    .candidate-role { font-size: 0.75rem; color: #fbbf24; font-weight: 700; font-style: italic; text-align: center; margin-top: 0.25rem; }
    .info-box { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.25rem; margin-top: 1.5rem; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem; }
    .info-row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .info-key { color: #94a3b8; text-transform: uppercase; font-size: 9px; letter-spacing: 0.08em; font-weight: 700; }
    .info-val { color: white; font-weight: 700; text-align: right; max-width: 60%; }
    .footer { margin-top: 1.5rem; font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-align: center; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="label">Official Invitation</div>
    <h1>Interview Invitation</h1>
    <div class="divider"></div>
    <div class="candidate-label">Candidate Name</div>
    <div class="candidate-name">${card.personName}</div>
    <div class="candidate-role">${card.position || card.meetingType || ""}</div>
    <div class="info-box">
      <div class="info-row"><span class="info-key">Interviewer</span><span class="info-val">${card.conductPerson}</span></div>
      <div class="info-row"><span class="info-key">Date &amp; Time</span><span class="info-val">${(card.dateTime || "").replace("T", " ")} (${card.timeZone || "Asia/Dubai"})</span></div>
      <div class="info-row"><span class="info-key">Format</span><span class="info-val">${card.isOnline ? `Online (${card.mode})` : "Physical Assessment"}</span></div>
      ${card.meetingLink ? `<div class="info-row"><span class="info-key">Meeting Link</span><span class="info-val" style="color:#93c5fd;font-size:9px;">${card.meetingLink}</span></div>` : ""}
      ${card.locationLink ? `<div class="info-row"><span class="info-key">Location</span><span class="info-val" style="color:#fbbf24;font-size:9px;">${card.locationLink}</span></div>` : ""}
      ${card.notes ? `<div class="info-row"><span class="info-key">Instructions</span><span class="info-val" style="font-style:italic;color:#cbd5e1;">"${card.notes}"</span></div>` : ""}
    </div>
    <div class="footer">${card.company || "MS COMPANY"} HR &amp; Recruitment Team</div>
  </div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;
                const popup = window.open("", "PrintCard", "width=600,height=750,toolbar=no,menubar=no,scrollbars=yes,resizable=yes");
                if (popup) {
                  popup.document.write(html);
                  popup.document.close();
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-9 gap-1.5 shadow-sm"
            >
              🖨️ Print Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
