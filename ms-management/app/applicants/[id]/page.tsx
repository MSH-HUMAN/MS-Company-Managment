"use strict";
"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Mail, Phone, Calendar, User, FileText, ChevronRight, Download, Eye, 
  Trash2, ShieldAlert, Sparkles, Plus, Clock, MessageCircle, AlertTriangle, 
  ArrowLeft, ArrowRight, Building2, UserCheck, CalendarRange, UserMinus,
  UploadCloud, CheckCircle2, MapPin, Video, Globe, TrendingUp, Activity, Star, Target, Edit
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { formatDate, cn } from "@/lib/utils";
import type { Applicant, Document, StatusHistory, Placement } from "@/lib/types";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import StatusBadge from "@/components/shared/StatusBadge";
import TimelineItem from "@/components/shared/TimelineItem";
import EmptyState from "@/components/shared/EmptyState";
import CreatePlacementModal from "@/components/shared/CreatePlacementModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ApplicantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { applicants, updateApplicant, deleteApplicant, addActivityLog, addInterview, companies, currentUser, hasPermission, interviews, placements, addPlacement, updatePlacement, sentEmails, sentWhatsApp, addSentEmail, currentRole } = useAuthStore();
  
  const applicant = applicants.find((a: Applicant) => a.id === id);

  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [simulateSubject, setSimulateSubject] = useState("");
  const [simulateBody, setSimulateBody] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleConfirmDelete = async () => {
    if (!applicant) return;
    try {
      await deleteApplicant(applicant.id);
      toast.success("Applicant deleted successfully");
      router.push("/applicants");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete applicant");
    }
  };

  const isClientCompany = companies.some(c => c.name === currentUser.company);
  
  // Tenancy restriction: Client users can only access their linked candidates
  const isAccessDenied = applicant && currentRole !== "Super Admin" && isClientCompany && 
    applicant.company !== currentUser.company && applicant.clientName !== currentUser.company;

  // Status transition state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCreatePlacementModalOpen, setIsCreatePlacementModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("Pending");
  const [statusReason, setStatusReason] = useState("");
  const [placedCompany, setPlacedCompany] = useState("");
  const [placedDate, setPlacedDate] = useState("");

  // Interview state
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [intMode, setIntMode] = useState<any>("Zoom");
  const [intDateTime, setIntDateTime] = useState("");
  const [intNotes, setIntNotes] = useState("");

  // Per-slot document upload state
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const canUpload = hasPermission("applicants", "upload");
  const canDelete = hasPermission("applicants", "delete");
  const canDownload = hasPermission("applicants", "download");

  // Linked interviews for this applicant
  const linkedInterviews = interviews.filter(i => i.applicantId === applicant?.id);

  const applicantEmails = (sentEmails || []).filter(e => 
    e.candidateName === applicant?.fullName || 
    e.to === applicant?.email || 
    e.to === applicant?.clientEmail
  );

  const applicantWhatsApps = (sentWhatsApp || []).filter(w => 
    w.candidateName === applicant?.fullName || 
    w.to === applicant?.whatsapp || 
    w.to === applicant?.mobile
  );

  const commEvents = [
    ...applicantEmails.map(e => ({
      id: e.id,
      type: "Email" as const,
      direction: e.sentBy === "Client HR" ? "Incoming" as const : "Outgoing" as const,
      from: e.sentBy === "Client HR" ? (applicant?.clientEmail || "Client HR") : "System Recruitment Team",
      to: e.to,
      subject: e.subject,
      body: e.body,
      sentBy: e.sentBy || "System",
      date: e.createdAt ? new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleString(),
      rawDate: e.createdAt ? new Date(e.createdAt) : new Date()
    })),
    ...applicantWhatsApps.map(w => ({
      id: w.id,
      type: "WhatsApp" as const,
      direction: "Outgoing" as const,
      from: "System Notification Bot",
      to: w.to,
      subject: "WhatsApp Notification Alert",
      body: w.message || "",
      sentBy: "System",
      date: w.createdAt ? new Date(w.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : new Date().toLocaleString(),
      rawDate: w.createdAt ? new Date(w.createdAt) : new Date()
    }))
  ].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

  // Document slot helper — returns the latest doc matching a slot keyword
  const slotDoc = (keyword: string) => {
    if (keyword === "CV") {
      return (applicant?.documents || []).find(d => {
        const dName = d.name.toLowerCase();
        return dName === "cv.pdf" || dName === "cv.doc" || dName === "cv.docx";
      }) ?? null;
    }
    return (applicant?.documents || []).find(d => d.name.toLowerCase().includes(keyword.toLowerCase())) ?? null;
  };
  
  // Read file as base64
  const readAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

  const validatePhoto = (file: File): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "pdf"];
    if (!ext || !allowed.includes(ext)) {
      toast.error("Invalid file format. Only JPG, JPEG, PNG, and PDF formats are allowed for Profile Photo.");
      return false;
    }
    if (ext === "pdf") {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("PDF Profile Photo is too large. Size must be less than 5MB.");
        return false;
      }
    } else {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Profile photo image is too large. Size must be less than 2MB.");
        return false;
      }
    }
    return true;
  };

  const validatePDF = (file: File, fieldName: string): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      toast.error(`Invalid format for ${fieldName}. Only PDF format is allowed.`);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File is too large. ${fieldName} size must be less than 5MB.`);
      return false;
    }
    return true;
  };

  // Upload a named-slot document
  const handleSlotUpload = async (slotName: string, file: File) => {
    if (slotName === "Applicant Photo") {
      if (!validatePhoto(file)) return;
    } else {
      if (!validatePDF(file, slotName)) return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const url = await readAsDataURL(file);
    const primaryName = `${slotName}.${ext}`;
    
    let updatedDocs = [...(applicant!.documents || [])];

    if (slotName === "CV") {
      const cvDocs = updatedDocs.filter(d => 
        d.name.toLowerCase().startsWith("cv.") || 
        d.name.toLowerCase().startsWith("cv_v")
      );
      const versionNum = cvDocs.length + 1;

      // Rename existing primary CV (if exists) to archived version
      updatedDocs = updatedDocs.map(d => {
        const dName = d.name.toLowerCase();
        if (dName === "cv.pdf" || dName === "cv.doc" || dName === "cv.docx") {
          const oldExt = d.name.split(".").pop();
          const today = new Date().toISOString().slice(0, 10);
          return {
            ...d,
            name: `CV_v${versionNum - 1}_archived_${today}.${oldExt}`
          };
        }
        return d;
      });
    } else {
      // Overwrite previous for standard slots
      updatedDocs = updatedDocs.filter(d => d.name !== primaryName);
    }

    const doc: Document = {
      id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: primaryName,
      uploadedBy: currentUser.name,
      uploadedDate: new Date().toISOString().slice(0, 10),
      type: file.type || (slotName === "Applicant Photo" ? "image/jpeg" : "application/pdf"),
      url,
    };
    
    updatedDocs.push(doc);

    const updated = { 
      ...applicant!, 
      documents: updatedDocs,
      photo: slotName === "Applicant Photo" ? url : applicant!.photo
    };
    try {
      await updateApplicant(updated);
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Document Uploaded", module: "Applicants", oldValue: null, newValue: `${slotName} uploaded for ${applicant!.fullName}`, ipAddress: "192.168.1.102" });
      toast.success(`${slotName} uploaded successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    }
  };

  // Handle other/additional docs upload
  const handleOtherDocsUpload = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f => validatePDF(f, "Other Document"));
    if (validFiles.length === 0) return;

    const newDocs: Document[] = await Promise.all(validFiles.map(async (file) => {
      const url = await readAsDataURL(file);
      return { id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: file.name, uploadedBy: currentUser.name, uploadedDate: new Date().toISOString().slice(0, 10), type: file.type || "application/pdf", url };
    }));
    const updated = { ...applicant!, documents: [...(applicant!.documents || []), ...newDocs] };
    updateApplicant(updated);
    toast.success(`${validFiles.length} file${validFiles.length > 1 ? "s" : ""} uploaded`);
  };

  const handleDeleteDoc = (docId: string) => {
    const removed = (applicant?.documents || []).find(d => d.id === docId);
    const updated = { ...applicant!, documents: (applicant!.documents || []).filter(d => d.id !== docId) };
    updateApplicant(updated);
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Deleted", module: "Applicants", oldValue: removed?.name ?? docId, newValue: null, ipAddress: "192.168.1.102" });
    toast.success("Document removed");
  };

  const handleDownloadDoc = (doc: Document) => {
    if (doc.url) { const a = document.createElement("a"); a.href = doc.url; a.download = doc.name; a.click(); toast.success(`Downloading "${doc.name}"`); }
    else toast.info(`No file data for "${doc.name}"`);
  };

  if (isAccessDenied) {
    return (
      <div className="flex flex-col h-full overflow-hidden select-none">
        <PageHeader title="Access Restricted" showBack={true} />
        <div className="p-12">
          <EmptyState title="Access Restricted" description="You do not have permission to view this applicant's profile." />
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="flex flex-col h-full overflow-hidden select-none">
        <PageHeader title="Applicant Profile" showBack={true} />
        <div className="p-12">
          <EmptyState title="Applicant profile not found" description="The applicant you are trying to view does not exist or has been deleted." />
        </div>
      </div>
    );
  }

  // Handle status update change
  const handleCreatePlacementSubmit = async (placementData: any) => {
    try {
      const statusRes = await fetch(`/api/applicants/${applicant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Placed",
          clientName: placementData.companyName,
          statusHistoryItem: {
            oldStatus: applicant.status,
            newStatus: "Placed",
            changedBy: "Admin",
            date: new Date().toISOString().replace('T', ' ').slice(0, 19),
            reason: `Placed with company: ${placementData.companyName} on ${placementData.placementDate}`
          }
        })
      });
      if (!statusRes.ok) throw new Error("Failed to update applicant status");

      const placeRes = await fetch("/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: applicant.id,
          applicantName: applicant.fullName,
          passportNumber: applicant.passportNumber || "",
          nationality: applicant.nationality || "",
          mobileNumber: applicant.mobile || "",
          whatsappNumber: applicant.whatsapp || "",
          emailAddress: applicant.email || "",
          dateOfBirth: applicant.dateOfBirth || "",
          gender: applicant.gender || "",
          currentAddress: applicant.currentAddress || "",
          currentCountry: applicant.currentCountry || "",
          registrationDate: applicant.applicationDate || "",
          emiratesId: applicant.emiratesId || "",
          maritalStatus: applicant.maritalStatus || "",
          education: applicant.education || "",
          experience: applicant.experience || "",
          passportExpiry: applicant.passportExpiry || "",
          photo: applicant.photo || "",
          companyId: companies.find(c => c.name === placementData.companyName)?.id || "temp",
          company: applicant.company || "MS Horizon F.Z.E",
          branch: applicant.branch || "Dubai",
          ...placementData,
          status: "Placed"
        })
      });
      if (!placeRes.ok) throw new Error("Failed to create placement record");
      const createdPlacement = await placeRes.json();

      toast.success("Placement record created successfully!");
      setIsCreatePlacementModalOpen(false);
      
      // Redirect to the placement agreement page (passing query param to auto-open agreement modal)
      router.push(`/placement?generateAgreementId=${createdPlacement.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to process placement");
    }
  };

  const handleStatusChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if ((targetStatus === "Rejected" || targetStatus === "Returned") && !statusReason.trim()) {
      toast.error("Please provide a reason validation for this status change.");
      return;
    }

    if (targetStatus === "Placed" && !placedCompany) {
      toast.error("Please select or specify the placed company name.");
      return;
    }

    if (targetStatus === "Processing" && !placedDate) {
      toast.error("Please select an interview/processing date validation.");
      return;
    }

    const updated: typeof applicant = {
      ...applicant,
      status: targetStatus as typeof applicant.status,
      clientName: targetStatus === "Placed" ? placedCompany : applicant.clientName,
      statusHistory: [
        {
          oldStatus: applicant.status,
          newStatus: targetStatus,
          changedBy: currentUser.name,
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          companyName: targetStatus === "Placed" ? placedCompany : undefined,
          reason: targetStatus === "Placed" 
            ? `Placed with company: ${placedCompany} on ${formatDate(placedDate)}` 
            : targetStatus === "Processing"
            ? `Interview date scheduled: ${formatDate(placedDate.slice(0, 10))} at ${placedDate.slice(11)}`
            : statusReason || "Status changed"
        },
        ...applicant.statusHistory
      ]
    };

    updateApplicant(updated);

    if (targetStatus === "Placed" && addPlacement) {
      const newPlacement: Placement = {
        id: `PLC-${Math.floor(100 + Math.random() * 900)}`,
        applicantName: applicant.fullName,
        applicantId: applicant.id,
        companyName: placedCompany,
        position: applicant.applyingPositions[0] || "General Position",
        placementDate: placedDate,
        salary: 3000,
        status: "Placed",
        agreementStatus: "Pending",
        createdBy: currentUser.name,
        createdAt: new Date().toISOString()
      };
      addPlacement(newPlacement);
    }

    // Log Activity
    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Status Changed",
      module: "Applicants",
      oldValue: applicant.status,
      newValue: targetStatus,
      ipAddress: "192.168.1.102"
    });

    toast.success(`Status updated to ${targetStatus}`);
    setIsStatusModalOpen(false);
    setStatusReason("");
    setPlacedCompany("");
    setPlacedDate("");
  };

  // Handle scheduling interview
  const handleScheduleInterviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!intDateTime) {
      toast.error("Please select date and time.");
      return;
    }

    const newInt = {
      id: `INT-${Math.floor(100 + Math.random() * 900)}`,
      type: "Interview" as const,
      conductPerson: currentUser.name,
      personName: applicant.fullName,
      mobile: applicant.mobile,
      whatsapp: applicant.whatsapp,
      email: applicant.email,
      nationality: applicant.nationality,
      nationalityFlag: applicant.nationalityFlag,
      position: applicant.applyingPositions[0],
      dateTime: intDateTime.replace('T', ' '),
      isOnline: true,
      mode: intMode,
      meetingLink: "https://zoom.us/j/demo-url-key",
      status: "Scheduled" as const,
      applicantId: applicant.id,
      company: applicant.company,
      branch: applicant.branch,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    addInterview(newInt);

    // Update status to processing automatically
    const updated: typeof applicant = {
      ...applicant,
      status: "Processing",
      statusHistory: [
        {
          oldStatus: applicant.status,
          newStatus: "Processing",
          changedBy: currentUser.name,
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          reason: `Interview scheduled on ${formatDate(intDateTime.slice(0, 10))} at ${intDateTime.slice(11)}`
        },
        ...applicant.statusHistory
      ]
    };
    updateApplicant(updated);

    toast.success("Interview scheduled successfully. Status changed to Processing.");
    setIsInterviewModalOpen(false);
    setIntDateTime("");
    setIntNotes("");
  };

  // Mock Timeline History for wow factor
  const mockHistory = [
    { id: 1, date: applicant.createdAt.slice(0,10), type: "Registration", title: "Application Received", desc: "Applicant profile was created in the system.", icon: FileText, color: "text-slate-500", bg: "bg-slate-100" },
    ...(applicant.statusHistory || []).map((h, i) => ({
      id: i + 2,
      date: h.date.slice(0, 10),
      type: "Status Change",
      title: `Status updated to ${h.newStatus}`,
      desc: h.reason || `Changed from ${h.oldStatus} to ${h.newStatus}`,
      icon: h.newStatus === "Placed" ? UserCheck : h.newStatus === "Rejected" ? UserMinus : h.newStatus === "Returned" ? AlertTriangle : Clock,
      color: h.newStatus === "Placed" ? "text-emerald-500" : h.newStatus === "Rejected" ? "text-rose-500" : h.newStatus === "Returned" ? "text-amber-500" : "text-blue-500",
      bg: h.newStatus === "Placed" ? "bg-emerald-100" : h.newStatus === "Rejected" ? "bg-rose-100" : h.newStatus === "Returned" ? "bg-amber-100" : "bg-blue-100",
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader
        title={`Profile: ${applicant.fullName}`}
        subtitle={`Tracking: ${applicant.trackingCode}`}
        showBack={true}
        actions={
          <div className="flex items-center gap-2">
            {hasPermission("applicants", "edit") && (
              <Button
                asChild
                variant="outline"
                className="text-xs h-9 rounded-xl border-slate-200 text-amber-600 hover:bg-amber-50 gap-1.5 font-bold"
              >
                <Link href={`/applicants/edit/${applicant.id}`}>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Link>
              </Button>
            )}
            
            {hasPermission("applicants", "delete") && (
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-xs h-9 rounded-xl border-slate-200 text-rose-600 hover:bg-rose-50 gap-1.5 font-bold"
              >
                <Trash2 className="w-4 h-4" />
                Delete Profile
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setTargetStatus(applicant.status);
                setIsStatusModalOpen(true);
              }}
              className="text-xs h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 font-bold"
            >
              <Clock className="w-4 h-4 text-blue-500" />
              Change Status
            </Button>
            
            <Button
              onClick={() => setIsInterviewModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Schedule Interview
            </Button>
          </div>
        }
      />

      {/* Visual Stepper Pipeline */}
      <div className="px-4 md:px-6 max-w-6xl mx-auto w-full mb-2">
        <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-blue-600" />
              Applicant Tracking Workflow Pipeline
            </h3>
            <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full select-none">
              Current Stage: {applicant.status}
            </span>
          </div>

          {/* Stepper Steps */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative md:px-4">
            {/* Horizontal Line for desktop */}
            <div className="hidden md:block absolute top-[18px] left-[5%] right-[5%] h-[2px] bg-slate-100 -z-0" />
            
            {/* Process line highlight */}
            {(() => {
              const stages = ["Pending", "Processing", "Interview Scheduled", "Selected", "Visa Processing", "Placed"];
              const currentIdx = stages.indexOf(applicant.status);
              if (currentIdx > 0 && applicant.status !== "Rejected" && applicant.status !== "Returned") {
                const widthPercent = (currentIdx / (stages.length - 1)) * 90;
                return (
                  <div 
                    className="hidden md:block absolute top-[18px] left-[5%] h-[2px] bg-blue-500 transition-all duration-500 -z-0" 
                    style={{ width: `${widthPercent}%` }}
                  />
                );
              }
              return null;
            })()}

            {[
              { label: "Applied", status: "Pending", desc: "Form Received" },
              { label: "Screening", status: "Screening", desc: "Documents Review" },
              { label: "Evaluation", status: "Processing", desc: "Interview Sync" },
              { label: "Offered", status: "Offered", desc: "Offer Letter signed" },
              { label: "Visa Processing", status: "Visa Processing", desc: "Government Entry" },
              { label: "Placed", status: "Placed", desc: "Onboarded & Placed" },
            ].map((step, idx) => {
              const stages = ["Pending", "Screening", "Processing", "Offered", "Visa Processing", "Placed"];
              const currentIdx = stages.indexOf(applicant.status);
              const isRejected = applicant.status === "Rejected";
              const isReturned = applicant.status === "Returned";
              
              let stepState: "completed" | "active" | "pending" | "failed" = "pending";
              
              if (isRejected && idx === currentIdx) {
                stepState = "failed";
              } else if (isReturned && idx === currentIdx) {
                stepState = "failed";
              } else if (applicant.status === step.status) {
                stepState = "active";
              } else if (stages.indexOf(applicant.status) > stages.indexOf(step.status)) {
                stepState = "completed";
              }

              return (
                <div key={idx} className="flex flex-row md:flex-col items-center gap-3 md:text-center w-full md:w-1/6 relative z-10">
                  {/* Circle Indicator */}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-4",
                    stepState === "completed" && "bg-blue-600 border-white text-white shadow-sm ring-2 ring-blue-500/20",
                    stepState === "active" && "bg-white border-blue-500 text-blue-600 shadow-md ring-4 ring-blue-500/10 scale-110",
                    stepState === "pending" && "bg-white border-slate-200 text-slate-400",
                    stepState === "failed" && "bg-rose-500 border-white text-white shadow-sm ring-2 ring-rose-500/20"
                  )}>
                    {stepState === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : stepState === "failed" ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  {/* Labels */}
                  <div className="text-left md:text-center">
                    <div className={cn(
                      "text-[11px] font-extrabold uppercase tracking-wider",
                      stepState === "completed" && "text-slate-800",
                      stepState === "active" && "text-blue-600 font-black",
                      stepState === "pending" && "text-slate-400",
                      stepState === "failed" && "text-rose-600 font-black"
                    )}>
                      {step.label}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium md:mt-0.5 whitespace-nowrap">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show warning banner for Rejected / Returned */}
          {(applicant.status === "Rejected" || applicant.status === "Returned") && (
            <div className={cn(
              "mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5",
              applicant.status === "Rejected" 
                ? "bg-rose-50 border-rose-100 text-rose-800" 
                : "bg-amber-50 border-amber-100 text-amber-800"
            )}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-extrabold block">Applicant is currently {applicant.status}</span>
                <span className="font-medium text-slate-500">
                  Reason: {applicant.statusHistory[0]?.reason || "No reason specified."}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
        {/* Profile left sidebar summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-2xl mb-4 shadow-sm overflow-hidden relative group">
              {applicant.photo ? (
                applicant.photo.startsWith("data:application/pdf") || applicant.photo.endsWith(".pdf") ? (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-rose-50 border border-rose-100">
                    <FileText className="w-8 h-8 text-rose-500 animate-pulse" />
                    <span className="text-[7px] font-bold text-rose-700 uppercase mt-0.5">PDF</span>
                  </div>
                ) : (
                  <img src={applicant.photo} alt={applicant.fullName} className="w-full h-full object-cover rounded-2xl" />
                )
              ) : (
                applicant.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
              )}
            </div>
            
            <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
              {applicant.fullName}
              <span>{applicant.nationalityFlag}</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
              ID: {applicant.id}
            </span>

            <div className="mt-3">
              <StatusBadge status={applicant.status} />
            </div>

            <div className="w-full border-t border-slate-100 my-5 pt-4 space-y-3 text-xs text-slate-600 font-medium text-left">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Position:</span>
                <span className="font-bold text-slate-800">{applicant.applyingPositions.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Apply Country:</span>
                <span className="font-bold text-slate-800">{applicant.applyCountry}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Salary Expect:</span>
                <span className="font-bold text-slate-800">AED {applicant.salaryExpectation}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Visa Status:</span>
                <span className="font-bold text-slate-800">{applicant.visaType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Visa Expiry:</span>
                <span className="font-bold text-slate-800">{formatDate(applicant.visaExpiry)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Passport Expiry:</span>
                <span className="font-bold text-slate-800">{formatDate(applicant.passportExpiry)}</span>
              </div>
            </div>

            <div className="w-full flex gap-2 pt-2">
              <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] font-bold gap-1 border-slate-200">
                <a href={`tel:${applicant.mobile}`}>
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] font-bold gap-1 border-slate-200">
                <a href={`https://wa.me/${applicant.whatsapp}`} target="_blank">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp
                </a>
              </Button>
            </div>

            {applicant.photo && (applicant.photo.startsWith("data:application/pdf") || applicant.photo.endsWith(".pdf")) && (
              <div className="w-full mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-left mb-1">
                  Profile Photo (PDF)
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50">
                    <a href={applicant.photo} target="_blank">
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 rounded-xl text-[10px] font-bold gap-1 border-rose-200 text-rose-600 hover:bg-rose-50">
                    <a href={applicant.photo} download={`${applicant.fullName.replace(/\s+/g, "_")}_Profile_Photo.pdf`}>
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Profile right main tabs detail */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full space-y-4">
            <TabsList className="bg-slate-100 rounded-xl p-1 w-full flex flex-wrap gap-1 text-xs font-semibold h-auto min-h-10">
              <TabsTrigger value="personal" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">Personal</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">Documents</TabsTrigger>
              <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">History</TabsTrigger>
              <TabsTrigger value="interviews" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">Interviews</TabsTrigger>
              <TabsTrigger value="placement" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">Placement Agreement</TabsTrigger>
              <TabsTrigger value="communication" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2">Communication</TabsTrigger>
            </TabsList>

            {/* TAB: Personal Details */}
            <TabsContent value="personal">
              <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Full Profile Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Email Address</div>
                    <div className="text-slate-800 font-bold flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {applicant.email}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Date of Birth</div>
                    <div className="text-slate-800 font-bold">{formatDate(applicant.dateOfBirth)}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Nationality</div>
                    <div className="text-slate-800 font-bold flex items-center gap-1.5">
                      <span>{applicant.nationalityFlag}</span>
                      {applicant.nationality}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Current Location</div>
                    <div className="text-slate-800 font-bold">{applicant.currentCountry}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Passport Number</div>
                    <div className="text-slate-800 font-bold">{applicant.passportNumber}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 font-semibold">Assigned Branch</div>
                    <div className="text-slate-800 font-bold">{applicant.branch} ({applicant.company})</div>
                  </div>
                  {applicant.clientName && (
                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3 mt-1">
                      <div className="text-slate-400 font-semibold mb-2">Client / Hiring Company Contact</div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-10 h-10 rounded-xl border border-slate-100">
                            {applicant.clientPhoto ? (
                              <AvatarImage src={applicant.clientPhoto} className="object-cover rounded-xl w-10 h-10" />
                            ) : null}
                            <AvatarFallback className="rounded-xl text-[10px] bg-slate-100 font-bold text-slate-700">
                              {applicant.clientName?.charAt(0) || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{applicant.clientName}</div>
                            <div className="text-[9px] text-slate-400 font-semibold">Hiring Representative</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          {applicant.clientMobile && (
                            <a href={`tel:${applicant.clientMobile}`} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-2.5 py-2 font-bold text-slate-700 hover:border-blue-200 transition-colors">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/> {applicant.clientMobile}
                            </a>
                          )}
                          {applicant.clientWhatsapp && (
                            <a href={`https://wa.me/${applicant.clientWhatsapp}`} target="_blank" className="flex items-center gap-1.5 bg-white border border-emerald-100 rounded-lg px-2.5 py-2 font-bold text-emerald-700 hover:border-emerald-300 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"/> {applicant.clientWhatsapp}
                            </a>
                          )}
                          {applicant.clientEmail && (
                            <a href={`mailto:${applicant.clientEmail}`} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-2.5 py-2 font-bold text-slate-700 hover:border-blue-200 transition-colors">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/> {applicant.clientEmail}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </Card>
            </TabsContent>

            {/* TAB: Documents */}
            <TabsContent value="documents">
              <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Verification Documents</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Upload each document in its designated slot</p>
                  </div>
                  <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-lg">
                    {(applicant.documents || []).length} file{(applicant.documents || []).length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Named document slots */}
                {[
                  { key: "Passport Copy", label: "Passport Copy", hint: "Upload passport bio-data page" },
                  { key: "Visa Page", label: "Visa Page", hint: "Upload current visa stamp page" },
                  { key: "Applicant Photo", label: "Profile Photo", hint: "Passport-style photo" },
                  { key: "CV", label: "Curriculum Vitae (CV) / Resume", hint: "Upload PDF or DOCX format (Max 5MB)" }
                ].map((slot) => {
                  const doc = slotDoc(slot.key);
                  return (
                    <div key={slot.key} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 transition-all">
                      {/* Slot icon / preview */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                        {doc?.url ? (
                          doc.type?.startsWith("image/") || doc.url.startsWith("data:image/") ? (
                            <img src={doc.url} alt={slot.label} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-6 h-6 text-blue-500" />
                          )
                        ) : (
                          <UploadCloud className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800">{slot.label}</div>
                        {doc ? (
                          <div className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">{doc.name} · by {doc.uploadedBy} · {doc.uploadedDate}</div>
                        ) : (
                          <div className="text-[9px] text-slate-400 font-medium mt-0.5">{slot.hint} · Not uploaded yet</div>
                        )}
                        {doc && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-emerald-600 mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Stored
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {doc && canDownload && (
                          <button onClick={() => handleDownloadDoc(doc)} title="Download" className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-blue-300 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {doc && canDownload && (
                          <button onClick={() => setPreviewDoc(doc)} title="Preview" className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-blue-300 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {doc && canDelete && (
                          <button onClick={() => handleDeleteDoc(doc.id)} title="Remove" className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canUpload && (
                          <label className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 cursor-pointer transition-colors" title={doc ? "Replace" : "Upload"}>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <input type="file" accept={slot.key === "Applicant Photo" ? ".jpg,.jpeg,.png,.pdf" : ".pdf"} className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) await handleSlotUpload(slot.key, f); e.target.value = ""; }} />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* CV Version History */}
                {(() => {
                  const cvHistoryDocs = (applicant?.documents || []).filter(d => 
                    d.name.toLowerCase().includes("archived") && 
                    (d.name.toLowerCase().startsWith("cv_") || d.name.toLowerCase().includes("cv_v"))
                  );
                  if (cvHistoryDocs.length === 0) return null;
                  return (
                    <div className="space-y-3 pt-2">
                      <div className="border-t border-slate-100 pt-4">
                        <div className="text-xs font-bold text-slate-800">CV History & Versions</div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">Previous CV files archived on upload updates</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cvHistoryDocs.map((doc) => (
                          <div key={doc.id} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/30 hover:border-blue-200 transition-all">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4.5 h-4.5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                              <p className="text-[9px] text-slate-400 font-medium">{doc.uploadedBy} · {doc.uploadedDate}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              {canDownload && <button onClick={() => setPreviewDoc(doc)} className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600"><Eye className="w-3 h-3" /></button>}
                              {canDownload && <button onClick={() => handleDownloadDoc(doc)} className="w-6 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500"><Download className="w-3 h-3" /></button>}
                              {canDelete && <button onClick={() => handleDeleteDoc(doc.id)} className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500"><Trash2 className="w-3 h-3" /></button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Other documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Other Documents</div>
                      <div className="text-[9px] text-slate-400 font-medium">Emirates ID, references, and other certificates (PDF only, Max 5MB)</div>
                    </div>
                    {canUpload && (
                      <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Files
                        <input type="file" multiple accept=".pdf" className="hidden" onChange={async (e) => { if (e.target.files) await handleOtherDocsUpload(e.target.files); e.target.value = ""; }} />
                      </label>
                    )}
                  </div>

                  {/* Other docs list — exclude the named slots */}
                  {(() => {
                    const namedSlotKeywords = ["Passport Copy", "Visa Page", "Applicant Photo", "CV"];
                    const otherDocs = (applicant.documents || []).filter(d => {
                      const dName = d.name.toLowerCase();
                      const isNamed = namedSlotKeywords.some(kw => dName.includes(kw.toLowerCase()));
                      const isArchivedCv = dName.startsWith("cv_") || dName.includes("cv_v");
                      return !isNamed && !isArchivedCv;
                    });
                    if (otherDocs.length === 0) {
                      return (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                          <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-[10px] text-slate-400 font-semibold">No additional documents uploaded yet</p>
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {otherDocs.map((doc) => (
                          <div key={doc.id} className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4.5 h-4.5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                              <p className="text-[9px] text-slate-400 font-medium">{doc.uploadedBy} · {doc.uploadedDate}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {canDownload && <button onClick={() => setPreviewDoc(doc)} className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600"><Eye className="w-3 h-3" /></button>}
                              {canDownload && <button onClick={() => handleDownloadDoc(doc)} className="w-6 h-6 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500"><Download className="w-3 h-3" /></button>}
                              {canDelete && <button onClick={() => handleDeleteDoc(doc.id)} className="w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500"><Trash2 className="w-3 h-3" /></button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Preview Dialog */}
              <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) setPreviewDoc(null); }}>
                <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 w-[95vw] sm:w-full max-w-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{previewDoc?.name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">by {previewDoc?.uploadedBy} · {previewDoc?.uploadedDate}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-4">
                      {canDownload && previewDoc && (
                        <Button size="sm" variant="outline" onClick={() => handleDownloadDoc(previewDoc)} className="rounded-xl text-xs h-8 gap-1.5 border-slate-200 font-bold">
                          <Download className="w-3.5 h-3.5" /> Download
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[70vh] overflow-auto bg-slate-50">
                    {previewDoc?.url ? (
                      previewDoc.type?.startsWith("image/") || previewDoc.url.startsWith("data:image/") ? (
                        <div className="p-4"><img src={previewDoc.url} alt={previewDoc.name} className="max-w-full mx-auto rounded-xl shadow-md" /></div>
                      ) : previewDoc.type === "application/pdf" || previewDoc.url.startsWith("data:application/pdf") ? (
                        <iframe src={previewDoc.url} title={previewDoc.name} className="w-full h-[65vh] border-0" />
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-16 text-center">
                          <FileText className="w-12 h-12 text-slate-300" />
                          <p className="text-sm font-bold text-slate-600">{previewDoc.name}</p>
                          <p className="text-xs text-slate-400">Preview not available for this file type.</p>
                          <Button onClick={() => handleDownloadDoc(previewDoc!)} className="bg-blue-600 text-white rounded-xl text-xs gap-1.5 mt-2"><Download className="w-3.5 h-3.5" /> Download to view</Button>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <AlertTriangle className="w-12 h-12 text-amber-300" />
                        <p className="text-sm font-semibold text-slate-500">No file data available.</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* TAB: History & AI Insights (WOW FACTOR) */}
            <TabsContent value="history" className="pt-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* AI Match Insight */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="rounded-2xl border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <Sparkles className="w-5 h-5 text-blue-200" />
                      <h3 className="text-sm font-black tracking-wider uppercase">AI Profile Match</h3>
                    </div>
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black">94%</span>
                        <span className="text-xs text-blue-200 font-semibold mb-1 uppercase tracking-wider">Match Score</span>
                      </div>
                      <p className="text-xs font-medium text-blue-50 leading-relaxed">
                        {applicant.fullName} is a highly suitable candidate for the <strong>{applicant.applyingPositions[0]}</strong> role. 
                        Their salary expectations align with the budget, and their documentation is mostly complete.
                      </p>
                      <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10 mt-2 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-100">
                          <span>Experience Fit</span>
                          <span className="text-emerald-300">High</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-100">
                          <span>Salary Match</span>
                          <span className="text-emerald-300">Perfect</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" /> Hiring Stats
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Days in Pipeline</span>
                        <span className="text-xs font-black text-slate-800">
                          {Math.floor((new Date().getTime() - new Date(applicant.createdAt).getTime()) / (1000 * 60 * 60 * 24)) || 1} Days
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Interviews</span>
                        <span className="text-xs font-black text-slate-800">{linkedInterviews.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Docs Verified</span>
                        <span className="text-xs font-black text-slate-800">{(applicant.documents || []).length} Files</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Timeline */}
                <div className="lg:col-span-2">
                  <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm h-full">
                    <div className="border-b border-slate-100 pb-4 mb-6">
                      <h3 className="text-sm font-bold text-slate-800">Applicant Timeline</h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Chronological history of status changes and milestones.</p>
                    </div>
                    
                    {mockHistory.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">No history found.</div>
                    ) : (
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {mockHistory.map((item) => {
                          const Icon = item.icon;
                          return (
                            <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              {/* Icon */}
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${item.bg} ${item.color} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              
                              {/* Card */}
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${item.bg} ${item.color}`}>
                                    {item.type}
                                  </span>
                                  <time className="text-[10px] font-bold text-slate-400">{item.date}</time>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 mt-2">{item.title}</h4>
                                <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Interviews */}
            <TabsContent value="interviews">
              <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Linked Interviews & Meetings
                  </h3>
                  <Button
                    onClick={() => setIsInterviewModalOpen(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schedule
                  </Button>
                </div>

                {linkedInterviews.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No interviews scheduled for this applicant yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedInterviews.map((interview) => (
                      <div key={interview.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-blue-100 transition-all">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${interview.isOnline ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                          {interview.isOnline ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">{interview.type} — {interview.mode}</span>
                            <StatusBadge status={interview.status} />
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {interview.dateTime}</span>
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {interview.conductPerson}</span>
                          </div>
                          {interview.meetingLink && (
                            <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 font-bold mt-1 hover:underline flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Join Meeting
                            </a>
                          )}
                          {interview.notes && <p className="text-[9px] text-slate-400 mt-1 italic">{interview.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* TAB: Placement Agreement */}
            <TabsContent value="placement">
              {(() => {
                const placement = placements.find(p => p.applicantId === applicant.id);
                if (!placement) {
                  return (
                    <Card className="rounded-2xl border-slate-100 p-8 bg-white shadow-sm text-center">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <h4 className="text-sm font-bold text-slate-800">No Placement Agreement Yet</h4>
                      <p className="text-xs text-slate-400 mt-1 w-[95vw] sm:w-full max-w-md mx-auto leading-relaxed">
                        A placement agreement is generated automatically once the candidate's status transitions to "Placed" or a job placement record is registered.
                      </p>
                    </Card>
                  );
                }

                // Parse history safely
                let historyList: any[] = [];
                try {
                  if (placement.agreementHistory) {
                    historyList = typeof placement.agreementHistory === 'string'
                      ? JSON.parse(placement.agreementHistory)
                      : (placement.agreementHistory as any[]);
                  }
                } catch (e) {}

                return (
                  <div className="space-y-6">
                    <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
                      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Placement Agreement</h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Agreement terms, deadlines, signatures and history logs.</p>
                        </div>
                        <span className={`text-[10px] font-extrabold uppercase border px-2.5 py-0.5 rounded-full ${
                          placement.agreementStatus === "Signed" 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          {placement.agreementStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 font-semibold">
                        {/* Candidate & Contract Info */}
                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applicant details</h4>
                            <div className="space-y-1">
                              <div className="flex justify-between"><span>Passport Number:</span><span className="text-slate-800 font-bold">{placement.passportNumber || applicant.passportNumber}</span></div>
                              <div className="flex justify-between"><span>Contact Mobile:</span><span className="text-slate-800 font-bold">{placement.mobileNumber || applicant.mobile}</span></div>
                              <div className="flex justify-between"><span>Registration Date:</span><span className="text-slate-800 font-bold">{placement.registrationDate || placement.createdAt}</span></div>
                              <div className="flex justify-between"><span>Placement Deadline:</span><span className="text-slate-800 font-bold text-indigo-600">{placement.placementDeadline || "—"}</span></div>
                            </div>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial Terms</h4>
                            <div className="space-y-1">
                              <div className="flex justify-between"><span>Registration Fee:</span><span className="text-slate-800 font-bold">{placement.registrationFee} AED</span></div>
                              <div className="flex justify-between"><span>Placement Fee:</span><span className="text-slate-800 font-bold">{placement.placementFee} AED</span></div>
                              <div className="flex justify-between"><span>Refund Status:</span><span className={`font-bold ${placement.refundStatus?.includes("Refunded") ? "text-rose-600" : "text-slate-800"}`}>{placement.refundStatus}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Signatures Panel */}
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between gap-4">
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Counter-Signatures</h4>
                            <div className="space-y-3">
                              {/* Applicant Signature */}
                              <div className="border-b border-slate-200 pb-3">
                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Applicant Signature</span>
                                {placement.applicantSign ? (
                                  <div className="font-serif italic text-lg text-slate-800 font-bold pt-1 pl-2 border-l-2 border-blue-500 mt-1 select-none">
                                    {placement.applicantSign}
                                  </div>
                                ) : (
                                  <div className="flex gap-2 mt-2">
                                    <Input 
                                      placeholder="Type full name to sign" 
                                      id={`sign-app-${placement.id}`} 
                                      className="bg-white border-slate-200 rounded-lg text-xs h-8"
                                    />
                                    <Button 
                                      size="sm" 
                                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] h-8"
                                      onClick={async () => {
                                        const inputEl = document.getElementById(`sign-app-${placement.id}`) as HTMLInputElement;
                                        const name = inputEl?.value.trim();
                                        if (!name) { toast.error("Please type your name to sign"); return; }
                                        const newHistory = [
                                          { date: new Date().toISOString().replace('T', ' ').slice(0, 19), action: "Signed by Applicant", performedBy: name, details: "Digital signature captured" },
                                          ...historyList
                                        ];
                                        await updatePlacement({
                                          ...placement,
                                          applicantSign: name,
                                          agreementStatus: placement.companySign ? "Signed" : "Pending",
                                          agreementHistory: newHistory
                                        });
                                        toast.success("Signed by Applicant");
                                      }}
                                    >
                                      Sign
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Company Signature */}
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase block">Company Representative Signature</span>
                                {placement.companySign ? (
                                  <div className="font-serif italic text-lg text-slate-800 font-bold pt-1 pl-2 border-l-2 border-emerald-500 mt-1 select-none">
                                    {placement.companySign}
                                  </div>
                                ) : (
                                  <div className="flex gap-2 mt-2">
                                    <Input 
                                      placeholder="Type name to counter-sign" 
                                      id={`sign-comp-${placement.id}`} 
                                      className="bg-white border-slate-200 rounded-lg text-xs h-8"
                                    />
                                    <Button 
                                      size="sm" 
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] h-8"
                                      onClick={async () => {
                                        const inputEl = document.getElementById(`sign-comp-${placement.id}`) as HTMLInputElement;
                                        const name = inputEl?.value.trim();
                                        if (!name) { toast.error("Please type your name to sign"); return; }
                                        const newHistory = [
                                          { date: new Date().toISOString().replace('T', ' ').slice(0, 19), action: "Signed by Company Representative", performedBy: name, details: "Digital counter-signature captured" },
                                          ...historyList
                                        ];
                                        await updatePlacement({
                                          ...placement,
                                          companySign: name,
                                          agreementStatus: placement.applicantSign ? "Signed" : "Pending",
                                          agreementHistory: newHistory
                                        });
                                        toast.success("Signed by Company");
                                      }}
                                    >
                                      Counter-Sign
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions block */}
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terms and Conditions</span>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] font-medium leading-relaxed max-h-[160px] overflow-y-auto text-slate-500">
                          {placement.termsAndConditions || (
                            "1. The candidate agrees to accept the placement at the specified company and salary.\n" +
                            "2. MS Company Management holds the right to verify all credentials and documents provided.\n" +
                            "3. Refund of any registration fee is subject to the terms and conditions outlined in the main agreement document."
                          )}
                        </div>
                      </div>

                      {/* Agreement History logs */}
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agreement History & Sign Log</span>
                        {historyList.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic">No activity logged for this agreement yet.</div>
                        ) : (
                          <div className="space-y-2.5">
                            {historyList.map((log, idx) => (
                              <div key={idx} className="flex gap-3 text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl">
                                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center flex-wrap gap-1">
                                    <span className="font-bold text-slate-800">{log.action}</span>
                                    <time className="text-[10px] text-slate-400">{log.date}</time>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Performed by: <span className="font-semibold text-slate-700">{log.performedBy}</span> · {log.details}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })()}
            </TabsContent>

            {/* TAB: Communication History & Reply Simulator */}
            <TabsContent value="communication">
              <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Communication Logs</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">History of automatic alerts and email correspondences.</p>
                  </div>
                  <Button
                    onClick={() => {
                      setSimulateSubject(`Re: [New Application] ${applicant.fullName} - ${applicant.clientName || "Company"}`);
                      setSimulateBody("");
                      setIsSimulateModalOpen(true);
                    }}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Simulate HR Reply
                  </Button>
                </div>

                {commEvents.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No communication records logged for this candidate yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commEvents.map((evt) => (
                      <div key={evt.id} className={cn("p-4 rounded-2xl border border-slate-100 flex flex-col gap-2.5", evt.direction === "Incoming" ? "bg-emerald-50/20 border-emerald-100" : "bg-slate-50/50")}>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-7.5 h-7.5 rounded-lg flex items-center justify-center border", evt.type === "Email" ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600")}>
                              {evt.type === "Email" ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                {evt.type} {evt.direction === "Incoming" ? "Received" : "Sent"}
                              </div>
                              <div className="text-[9px] font-semibold text-slate-400">
                                From: {evt.from} | To: {evt.to}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md">
                            {evt.date}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-1 pl-9.5">
                          {evt.subject}
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium whitespace-pre-wrap pl-9.5 bg-white/50 border border-slate-50 p-3 rounded-xl max-h-48 overflow-y-auto leading-relaxed">
                          {evt.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* DIALOG: SIMULATE HR REPLY */}
      <Dialog open={isSimulateModalOpen} onOpenChange={setIsSimulateModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!simulateBody.trim()) {
              toast.error("Please enter email body content.");
              return;
            }
            try {
              await addSentEmail({
                id: `EML-${Date.now()}-${Math.floor(100+Math.random()*900)}`,
                to: "recruitment@mshorizon.ae",
                subject: simulateSubject,
                body: simulateBody,
                sentBy: "Client HR",
                candidateName: applicant?.fullName || "Candidate",
                company: applicant?.clientName || "Client Company",
                branch: applicant?.branch || "Main Branch"
              });
              
              addActivityLog({
                id: `LOG-${Date.now()}`,
                dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                userName: applicant?.clientName || "Client HR",
                role: "Client Company Admin",
                company: applicant?.clientName || "Client Company",
                branch: applicant?.branch || "Main Branch",
                action: "Email Sent",
                module: "Applicants",
                oldValue: null,
                newValue: `Simulated HR reply logged for applicant: ${applicant?.fullName}`,
                ipAddress: "127.0.0.1"
              });

              toast.success("HR reply email simulated and recorded successfully!");
              setIsSimulateModalOpen(false);
              setSimulateBody("");
            } catch (err) {
              console.error(err);
              toast.error("Error logging reply");
            }
          }} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Simulate HR Reply Email</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Log an incoming email response from the client hiring manager.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From (Client HR Email)</Label>
                <Input readOnly value={applicant.clientEmail || "hr@clientcompany.com"} className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To (Recruitment Support)</Label>
                <Input readOnly value="recruitment@mshorizon.ae" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Subject</Label>
                <Input required value={simulateSubject} onChange={e => setSimulateSubject(e.target.value)} className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Message Body *</Label>
                <textarea
                  required
                  rows={5}
                  value={simulateBody}
                  onChange={e => setSimulateBody(e.target.value)}
                  placeholder="e.g. We have reviewed candidate John Doe's resume and would like to schedule an interview..."
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:border-blue-400 leading-relaxed font-semibold border-slate-200"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsSimulateModalOpen(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-emerald-600 text-white font-bold rounded-xl text-xs px-5 h-10">Send Simulated Reply</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreatePlacementModal 
        isOpen={isCreatePlacementModalOpen} 
        onClose={() => setIsCreatePlacementModalOpen(false)} 
        applicant={applicant} 
        onSubmitSuccess={handleCreatePlacementSubmit} 
      />

      {/* MODAL: CHANGE STATUS */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Update Applicant Status</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Choose a new selection phase and add required metadata validations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs">
              {/* Select status */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Target Status
                </Label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                >
                  <option value="Pending">Pending (Applied)</option>
                  <option value="Screening">Screening (Documents Review)</option>
                  <option value="Processing">Processing (Under Interview)</option>
                  <option value="Offered">Offered (Offer Letter Signed)</option>
                  <option value="Visa Processing">Visa Processing (Government Entry)</option>
                  <option value="Placed">Placed (Active Job / Onboarded)</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Returned">Returned (Missing documents)</option>
                </select>
              </div>

              {/* Conditional: Placed (Company Selection) */}
              {targetStatus === "Placed" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Select Placed Company <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 font-medium text-slate-700"
                      value={companies.some(c => c.name === placedCompany) ? placedCompany : (placedCompany ? "custom" : "")}
                      onChange={(e) => {
                        if (e.target.value !== "custom") {
                          setPlacedCompany(e.target.value);
                        } else {
                          setPlacedCompany("");
                        }
                      }}
                    >
                      <option value="">-- Select Company --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="custom">Other / Custom Company Name</option>
                    </select>
                  </div>

                  {(!companies.some(c => c.name === placedCompany) || placedCompany === "") && (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Company Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter company name..."
                        value={placedCompany}
                        onChange={(e) => setPlacedCompany(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Placement Date
                    </Label>
                    <Input
                      type="date"
                      value={placedDate || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setPlacedDate(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                    />
                  </div>
                </div>
              )}

              {/* Conditional: Processing (Interview Date) */}
              {targetStatus === "Processing" && (
                <div className="space-y-1 pt-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Interview / Assessment Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={placedDate}
                    onChange={(e) => setPlacedDate(e.target.value)}
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                  />
                </div>
              )}



              {/* Conditional: Rejected / Returned */}
              {(targetStatus === "Rejected" || targetStatus === "Returned") && (
                <div className="space-y-1 pt-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Reason Validation <span className="text-rose-500">*</span>
                  </Label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for reject or return..."
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 shadow-lg shadow-blue-500/10"
              >
                Apply Status
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: SCHEDULE INTERVIEW */}
      <Dialog open={isInterviewModalOpen} onOpenChange={setIsInterviewModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={handleScheduleInterviewSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Schedule Interview</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Setup a meeting details card. Schedulers automatically trigger processing state.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs">
              {/* Select mode */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Meeting Mode
                </Label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400"
                  value={intMode}
                  onChange={(e) => setIntMode(e.target.value as any)}
                >
                  <option value="Zoom">Zoom Video</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="Microsoft Teams">Microsoft Teams</option>
                  <option value="WhatsApp">WhatsApp Call</option>
                  <option value="Phone call">Direct Phone call</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Date and Time <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={intDateTime}
                  onChange={(e) => setIntDateTime(e.target.value)}
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Special Notes
                </Label>
                <textarea
                  rows={2}
                  placeholder="Candidate has 5 years experience in Dubai..."
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                  value={intNotes}
                  onChange={(e) => setIntNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInterviewModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 shadow-lg shadow-blue-500/10"
              >
                Schedule & Process
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Applicant Record"
        description="Are you sure you want to delete this applicant profile? This action will permanently remove their record from the database."
        confirmText="Delete Profile"
        variant="danger"
      />
    </div>
  );
}
