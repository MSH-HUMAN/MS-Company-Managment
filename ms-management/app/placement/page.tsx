"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { 
  Plus, Briefcase, Trash2, Building2, FileCheck, CheckCircle, 
  Printer, Download, Sparkles, AlertCircle, Calendar, ShieldAlert,
  Search, X, Check, ArrowRight, ArrowLeft, DollarSign, Clock, FileText
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { exportToCSV, formatDate } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import PrintableAgreement, { usePrintAgreement } from "@/components/shared/PrintableAgreement";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Placement } from "@/lib/types";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";

// Always use the real current date for deadline calculations
const CURRENT_DATE = new Date();

// HTML5 Canvas Signature Pad
function SignaturePad({ label, onSave, defaultValue }: { label: string; onSave: (dataUrl: string) => void; defaultValue?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigned, setIsSigned] = useState(false);
  const [savedSign, setSavedSign] = useState<string | null>(defaultValue || null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches && e.touches[0]) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }
    }

    const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    canvas.dataset.drawing = "true";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.dataset.drawing !== "true") return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setIsSigned(true);
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.dataset.drawing = "false";
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
    setSavedSign(null);
    onSave("");
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isSigned) return;
    const dataUrl = canvas.toDataURL();
    setSavedSign(dataUrl);
    onSave(dataUrl);
    toast.success(`${label} applied`);
  };

  return (
    <div className="space-y-1.5 border border-slate-100 bg-slate-50/70 rounded-2xl p-3">
      <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
      
      {savedSign ? (
        <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-center h-28 relative">
          <Image src={savedSign} alt="Signed" width={280} height={80} className="max-h-full object-contain" unoptimized />
          <Button type="button" size="sm" variant="ghost" onClick={handleClear} className="absolute top-1 right-1 text-rose-500 hover:bg-rose-50 text-[9px] h-6 px-2 rounded-md">Change</Button>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              width={350}
              height={100}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-24 cursor-crosshair touch-none bg-white"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" size="sm" variant="ghost" onClick={handleClear} className="text-[9px] h-7 px-2.5 rounded-lg text-slate-500">Clear</Button>
            <Button type="button" size="sm" onClick={handleConfirm} disabled={!isSigned} className="bg-slate-900 text-white text-[9px] h-7 px-3 rounded-lg hover:bg-slate-800">Apply Signature</Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Print Buttons ───────────────────────────────────────────────────────────
// Opens a dedicated print window (new tab) that contains the fully rendered
// agreement HTML and auto-triggers window.print() after all images load.
function PrintButtons({ placement, terms }: { placement: any; terms?: any[] }) {
  const printAgreement = usePrintAgreement();
  return (
    <div className="flex gap-2 justify-end print:hidden">
      <Button
        variant="outline"
        onClick={() => printAgreement(placement, terms ?? [])}
        className="rounded-xl text-xs font-bold border-slate-200 gap-1.5 h-10 shadow-sm"
      >
        <Printer className="w-4 h-4" /> Print Agreement
      </Button>
      <Button
        variant="outline"
        onClick={() => printAgreement(placement, terms ?? [])}
        className="rounded-xl text-xs font-bold border-slate-200 gap-1.5 h-10 shadow-sm"
      >
        <Download className="w-4 h-4" /> Download PDF Copy
      </Button>
    </div>
  );
}

const DEFAULT_TERMS = `1. Registration
1. The Applicant agrees to register with MS Horizon F.Z.E and pay the applicable Registration Fee.
2. Upon registration, the Company will commence job search, recruitment, placement, and related consultancy services.
3. The Applicant must provide accurate personal information, qualifications, experience details, and supporting documents.

2. Placement Timeline
1. The Company shall make reasonable efforts to secure suitable employment opportunities based on the Applicant's qualifications, experience, and preferences.
2. A placement timeline/deadline will be communicated to the Applicant during registration.
3. The Applicant agrees to cooperate fully with interviews, document submissions, medical requirements, and other recruitment procedures.

3. Registration Fee Refund
1. If the Company fails to provide a suitable job placement within the agreed placement timeline, the Registration Fee shall be refunded in full.
2. No refund shall be provided if:
   - The Applicant rejects suitable job opportunities matching the agreed requirements.
   - The Applicant fails to attend interviews or complete recruitment procedures.
   - The Applicant submits false information or documents.
   - The Applicant obtains employment independently or through another agency during the placement period.
   - The Applicant voluntarily withdraws from the recruitment process.

4. Placement Fee
1. The remaining Placement Fee shall become payable upon successful placement.
2. Successful placement means the Applicant accepts the job offer and joins the employer.

5. Employer-Related Issues
1. If the employer fails to provide the promised employment, visa, work permit, or cancels the position for reasons beyond the Applicant's control, the Company shall:
   - Refund the Placement Fee paid by the Applicant; or
   - Arrange an alternative job opportunity without additional placement charges.

6. Replacement Service
1. If a placed Applicant loses employment due to employer-related reasons during the probation period, the Company may provide one replacement placement service free of charge.
2. This provision does not apply where employment ends due to the Applicant's misconduct, poor performance, or voluntary resignation.

7. Applicant Responsibilities
The Applicant agrees to:
- Follow all employer rules and regulations.
- Comply with UAE labour and immigration laws.
- Attend work as required.
- Maintain professional conduct.
- Provide genuine documents and information.

8. No Refund Situations
No refund shall be provided if:
- The Applicant refuses to join after placement.
- The Applicant resigns voluntarily.
- The Applicant leaves work without employer approval.
- The Applicant absconds from employment.
- The Applicant engages in illegal activities or violates company policies.
- The Applicant is terminated for misconduct or disciplinary reasons.

9. Support for Labour Disputes
If the employer fails to pay salary, refuses visa processing, or violates UAE labour laws, MS Horizon F.Z.E will provide guidance and reasonable assistance to help the Applicant pursue legal remedies through the appropriate authorities.

10. Acceptance
By registering and making payment, the Applicant confirms that they have read, understood, and accepted all terms and conditions of this Agreement.`;

export default function PlacementPage() {
  const { placements, applicants, companies, addPlacement, updatePlacement, deletePlacement, currentUser, addNotification, addActivityLog, hasPermission } = useAuthStore();
  
  const canView = hasPermission("placement", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  
  // Dashboard & Navigation states
    const [activeTab, setActiveTab] = useState<"all" | "pipeline" | "refunds" | "placed">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [placementTerms, setPlacementTerms] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/placement-terms")
      .then(res => res.json())
      .then(data => setPlacementTerms(data))
      .catch(console.error);
  }, []);

  // Listen to URL parameters to automatically trigger Generate or View Agreement dialogs
  // (e.g. after successful placement creation redirection from Applicant Detail page)
  useEffect(() => {
    if (typeof window !== "undefined" && placements.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const generateId = params.get("generateAgreementId");
      const viewId = params.get("viewAgreementId");

      if (generateId) {
        const found = placements.find(p => p.id === generateId);
        if (found) {
          setAgreementFormModal(found);
          // Clean the query parameters so refresh doesn't trigger modal again
          window.history.replaceState(null, "", window.location.pathname);
        }
      } else if (viewId) {
        const found = placements.find(p => p.id === viewId);
        if (found) {
          setAgreementModal(found);
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    }
  }, [placements]);

  // Registration Dialog states
  const [registerModal, setRegisterModal] = useState(false);

  const TODAY_ISO = new Date().toISOString().slice(0, 10);
  const NINETY_DAYS_ISO = (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10); })();
  const [registerForm, setRegisterForm] = useState({
    applicantId: "",
    applicantName: "",
    passportNumber: "",
    mobileNumber: "",
    registrationDate: TODAY_ISO,
    placementDeadline: NINETY_DAYS_ISO,
    registrationFee: 1000,
    placementFee: 5000,
    position: "",
    notes: "",
    termsAndConditions: DEFAULT_TERMS
  });

  // Action / Detail modals
  const [editModal, setEditModal] = useState<Placement | null>(null);
  const [agreementModal, setAgreementModal] = useState<Placement | null>(null);
  const [agreementFormModal, setAgreementFormModal] = useState<Placement | null>(null);
  const [formTermsAndConditions, setFormTermsAndConditions] = useState("");
  const [formApplicantSign, setFormApplicantSign] = useState("");
  const [formCompanySign, setFormCompanySign] = useState("");

  useEffect(() => {
    if (agreementFormModal) {
      setFormTermsAndConditions(agreementFormModal.termsAndConditions || DEFAULT_TERMS);
      setFormApplicantSign(agreementFormModal.applicantSign || "");
      setFormCompanySign(agreementFormModal.companySign || "");
    }
  }, [agreementFormModal]);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Status edit form states
  const [editForm, setEditForm] = useState({
    status: "" as Placement["status"],
    refundStatus: "" as Placement["refundStatus"],
    companyId: "",
    companyName: "",
    placementDate: "",
    salary: 0,
    position: "",
    notes: "",
    termsAndConditions: DEFAULT_TERMS,
    // refund rules
    reason: "",
    collected: false,
    workingHours: ""
  });

  // Automatically update deadline when registration date changes in wizard
  useEffect(() => {
    if (registerForm.registrationDate) {
      const regDate = new Date(registerForm.registrationDate);
      regDate.setDate(regDate.getDate() + 90);
      const year = regDate.getFullYear();
      const month = String(regDate.getMonth() + 1).padStart(2, "0");
      const day = String(regDate.getDate()).padStart(2, "0");
      setRegisterForm(f => ({ ...f, placementDeadline: `${year}-${month}-${day}` }));
    }
  }, [registerForm.registrationDate]);

  // Sync applicant details when selecting applicant in wizard
  const handleApplicantSelect = (appId: string) => {
    const app = applicants.find(a => a.id === appId);
    if (app) {
      setRegisterForm(f => ({
        ...f,
        applicantId: appId,
        applicantName: app.fullName,
        passportNumber: app.passportNumber || "",
        mobileNumber: app.mobile || "",
        position: app.applyingPositions?.[0] || ""
      }));
    }
  };

  // Helper date differences
  const getDaysDiff = (deadlineStr: string) => {
    if (!deadlineStr || deadlineStr === "-") return 0;
    const diffTime = new Date(deadlineStr).getTime() - CURRENT_DATE.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Compute deadline statuses
  const getDeadlineAlert = (p: Placement) => {
    if (p.status === "Placed" || p.status === "Withdrawn" || p.status === "Terminated") return null;
    const days = getDaysDiff(p.placementDeadline || "");
    if (days < 0) {
      return { type: "expired", text: "Deadline Expired", color: "bg-rose-50 text-rose-700 border-rose-100" };
    }
    if (days <= 15) {
      return { type: "warning", text: `Expiring in ${days} days`, color: "bg-amber-50 text-amber-700 border-amber-100 font-bold animate-pulse" };
    }
    return { type: "active", text: `${days} days left`, color: "bg-slate-50 text-slate-600 border-slate-100" };
  };

  // Filter Placements
  const filteredPlacements = placements.filter(p => {
    // 1. Search term
    const matchesSearch = 
      p.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.passportNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Status filter dropdown
    if (statusFilter !== "all" && p.status !== statusFilter) return false;

    // 3. Tab filter
    if (activeTab === "pipeline") {
      return p.status === "Registered" || p.status === "Interviews";
    }
    if (activeTab === "refunds") {
      return p.status === "Expired" || p.refundStatus === "Eligible" || p.refundStatus === "Pending Review" || p.refundStatus === "Refunded" || p.refundStatus === "Forfeited";
    }
    if (activeTab === "placed") {
      return p.status === "Placed";
    }
    return true;
  });

  // Statistics Calculations
  const stats = {
    total: placements.length,
    placed: placements.filter(p => p.status === "Placed").length,
    approaching: placements.filter(p => {
      if (p.status === "Placed" || p.status === "Withdrawn" || p.status === "Terminated") return false;
      const days = getDaysDiff(p.placementDeadline || "");
      return days >= 0 && days <= 15;
    }).length,
    refundQueue: placements.filter(p => p.refundStatus === "Eligible" || p.refundStatus === "Pending Review").length
  };

  // Form handlers
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  const handleRegisterSubmit = async () => {
    if (!registerForm.applicantId || !registerForm.passportNumber || !registerForm.mobileNumber) {
      toast.error("Applicant information and contact details are required.");
      return;
    }

    if (isSubmittingRegistration) return; // prevent double submission
    setIsSubmittingRegistration(true);

    // Find applicant email for notification
    const selectedApplicant = applicants.find(a => a.id === registerForm.applicantId);

    const newRecord: Placement = {
      id: `PLA-${Date.now()}`,
      applicantId: registerForm.applicantId,
      applicantName: registerForm.applicantName,
      passportNumber: registerForm.passportNumber,
      mobileNumber: registerForm.mobileNumber,
      emailAddress: selectedApplicant?.email || "",
      nationality: selectedApplicant?.nationality || "",
      dateOfBirth: selectedApplicant?.dateOfBirth || "",
      gender: selectedApplicant?.gender || "",
      currentAddress: selectedApplicant?.currentAddress || "",
      currentCountry: selectedApplicant?.currentCountry || "",
      emiratesId: selectedApplicant?.emiratesId || "",
      maritalStatus: selectedApplicant?.maritalStatus || "",
      education: selectedApplicant?.education || "",
      experience: selectedApplicant?.experience || "",
      passportExpiry: selectedApplicant?.passportExpiry || "",
      photo: selectedApplicant?.photo || "",
      registrationDate: registerForm.registrationDate,
      placementDeadline: registerForm.placementDeadline,
      registrationFee: registerForm.registrationFee,
      placementFee: registerForm.placementFee,
      position: registerForm.position || "Not Specified",
      salary: 0,
      companyId: "",
      companyName: "Pending",
      placementDate: new Date().toISOString().slice(0, 10),
      status: "Registered",
      company: currentUser.company,
      branch: currentUser.branch,
      agreementStatus: "Pending",
      refundStatus: "Not Applicable",
      agreementAccepted: false,
      applicantSign: "",
      companySign: undefined,
      applicantSignDate: "",
      applicantSignIp: "",
      applicantSignDevice: "",
      notes: registerForm.notes,
      termsAndConditions: DEFAULT_TERMS,
      createdBy: currentUser.name,
      createdAt: registerForm.registrationDate,
      agreementHistory: [
        `Registration recorded and Registration Fee (AED ${registerForm.registrationFee}) paid on ${formatDate(registerForm.registrationDate)} by ${currentUser.name}.`
      ]
    };

    try {
      await addPlacement(newRecord as any);

      // Fire notification
      try {
        await addNotification({
          id: `notif-${Date.now()}`,
          title: "New Placement Registration",
          message: `${registerForm.applicantName} has been registered for placement. Registration Fee: AED ${registerForm.registrationFee}.`,
          type: "activity",
          read: false,
          time: new Date().toISOString(),
          company: currentUser.company,
          branch: currentUser.branch,
          link: "/placement"
        });
      } catch (notifErr) {
        console.warn("Non-critical: failed to create notification", notifErr);
      }

      // Fire activity log
      try {
        await addActivityLog({
          id: `log-${Date.now()}`,
          dateTime: new Date().toISOString(),
          userName: currentUser.name,
          role: currentUser.role,
          company: currentUser.company,
          branch: currentUser.branch,
          action: "Created",
          module: "Placement",
          oldValue: null,
          ipAddress: "Browser",
          newValue: `Placement for ${registerForm.applicantName}. Status: Registered. Fee: AED ${registerForm.registrationFee}. Deadline: ${registerForm.placementDeadline}.`
        });
      } catch (logErr) {
        console.warn("Non-critical: failed to create activity log", logErr);
      }

      toast.success("Placement record created successfully!");
      setRegisterModal(false);
      resetRegisterForm();
    } catch (err: any) {
      console.error("Placement registration error:", err);
      toast.error(err?.message || "Failed to register placement. Please try again.");
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const handleGenerateAgreementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementFormModal) return;
    if (!formApplicantSign) {
      toast.error("Applicant signature is required to generate the agreement.");
      return;
    }

    const isoDate = new Date().toISOString();
    let ip = "Unknown";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      ip = ipData.ip;
    } catch (err) {
      console.error("Failed to fetch IP", err);
    }

    const updated: Placement = {
      ...agreementFormModal,
      agreementStatus: "Signed",
      agreementAccepted: true,
      applicantSign: formApplicantSign,
      companySign: formCompanySign || undefined,
      applicantSignDate: isoDate,
      applicantSignIp: ip,
      applicantSignDevice: typeof window !== "undefined" ? window.navigator.userAgent : "Server",
      termsAndConditions: formTermsAndConditions,
      agreementHistory: [
        ...(agreementFormModal.agreementHistory || []),
        `Placement Agreement generated and signed by Applicant on ${formatDate(isoDate.slice(0, 10))}.`,
        formCompanySign ? `Counter-signed by Company Officer.` : `Pending Counter-signature.`
      ]
    };

    try {
      await updatePlacement(updated);
      toast.success("Placement Agreement generated successfully!");
      setAgreementFormModal(null);
      setAgreementModal(updated);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate agreement.");
    }
  };

  const resetRegisterForm = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 90);
    const deadlineStr = deadlineDate.toISOString().slice(0, 10);
    setRegisterForm({
      applicantId: "",
      applicantName: "",
      passportNumber: "",
      mobileNumber: "",
      registrationDate: todayStr,
      placementDeadline: deadlineStr,
      registrationFee: 1000,
      placementFee: 5000,
      position: "",
      notes: "",
      termsAndConditions: DEFAULT_TERMS
    });
  };

  const openEditModal = (p: Placement) => {
    setEditModal(p);
    setEditForm({
      status: p.status,
      refundStatus: p.refundStatus || "Not Applicable",
      companyId: p.companyId || "",
      companyName: (p.companyName === "-" || p.companyName === "Pending") ? "" : p.companyName,
      placementDate: (p.placementDate === "-" || !p.placementDate) ? new Date().toISOString().slice(0, 10) : p.placementDate,
      salary: p.salary || 0,
      position: p.position || "",
      notes: "",
      termsAndConditions: p.termsAndConditions || DEFAULT_TERMS,
      reason: "",
      collected: p.status === "Placed",
      workingHours: p.workingHours || ""
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    let updated = { ...editModal };
    updated.termsAndConditions = editForm.termsAndConditions;
    const history = [...(editModal.agreementHistory || [])];
    const logDate = formatDate("2026-06-17");

    // Check specific workflow logic transitions
    let historyEntry = `Status changed: [${editModal.status}] -> [${editForm.status}] | Our Company: ${currentUser.company || "N/A"} | Our Branch: ${currentUser.branch || "N/A"} | Changed By: ${currentUser.name} | Date: ${logDate}`;

    if (editForm.status === "Placed") {
      if (!editForm.companyId) {
        toast.error("Please select the placement company.");
        return;
      }
      if (!editForm.placementDate) {
        toast.error("Please select the placement date.");
        return;
      }
      const clientCo = companies.find(c => c.id === editForm.companyId);
      updated.companyId = editForm.companyId;
      updated.companyName = clientCo?.name || editForm.companyName;
      updated.placementDate = editForm.placementDate;
      updated.salary = editForm.salary;
      updated.position = editForm.position;
      updated.workingHours = editForm.workingHours;
      updated.status = "Placed";
      
      const feeNote = editForm.collected 
        ? `Remaining Placement Fee (AED ${editModal.placementFee}) collected.` 
        : `Remaining Placement Fee collection pending.`;
      
      historyEntry += ` | Client Company: ${updated.companyName} | Reason: Placed as ${editForm.position}. ${feeNote}`;
      history.push(historyEntry);
    } else if (editForm.status === "Expired") {
      updated.status = "Expired";
      updated.refundStatus = "Eligible";
      updated.companyId = "";
      updated.companyName = "-";
      historyEntry += ` | Client Company: N/A | Reason: Agreement expired without placement. Registration Fee marked as ELIGIBLE for refund.`;
      history.push(historyEntry);
    } else if (editForm.status === "Withdrawn") {
      updated.status = "Withdrawn";
      updated.refundStatus = "Forfeited";
      updated.companyId = "";
      updated.companyName = "-";
      const forfeitReason = editForm.reason || "Applicant voluntarily withdrew.";
      historyEntry += ` | Client Company: N/A | Reason: ${forfeitReason}. Registration Fee marked as FORFEITED.`;
      history.push(historyEntry);
    } else if (editForm.status === "Terminated") {
      updated.status = "Terminated";
      updated.refundStatus = "Forfeited";
      updated.companyId = "";
      updated.companyName = "-";
      const forfeitReason = editForm.reason || "Terminated for misconduct or disciplinary reasons.";
      historyEntry += ` | Client Company: N/A | Reason: ${forfeitReason}. Refund marked as FORFEITED (No liability).`;
      history.push(historyEntry);
    } else {
      updated.status = editForm.status;
      updated.companyId = "";
      updated.companyName = "-";
      historyEntry += ` | Client Company: N/A | Reason: Status updated.`;
      history.push(historyEntry);
    }

    // Handle manual refund modifications
    if (editForm.refundStatus !== editModal.refundStatus) {
      updated.refundStatus = editForm.refundStatus;
      history.push(`Refund Status manual override to '${editForm.refundStatus}' by ${currentUser.name} on ${logDate}. Note: ${editForm.notes || "None"}`);
    }

    // Append standard notes if any
    if (editForm.notes) {
      updated.notes = editModal.notes ? `${editModal.notes}\n---\n${editForm.notes}` : editForm.notes;
    }

    updated.agreementHistory = history;
    updatePlacement(updated);
    toast.success("Placement status updated successfully!");
    setEditModal(null);
  };

  // Placement protection action handler
  const handlePlacementProtection = (type: "refund" | "alternative") => {
    if (!editModal) return;
    let updated = { ...editModal };
    const history = [...(editModal.agreementHistory || [])];
    const logDate = formatDate("2026-06-17");

    if (type === "refund") {
      updated.refundStatus = "Refunded";
      history.push(`Placement Protection Activated: Employer failed to provide job/visa. Refunded Placement Fee to Applicant on ${logDate}. Action by ${currentUser.name}.`);
      toast.success("Placement Fee refund recorded under Placement Protection!");
    } else {
      updated.status = "Interviews";
      updated.refundStatus = "Not Applicable";
      history.push(`Placement Protection Activated: Alternative placement arranged free of charge on ${logDate}. Status reset to Interviews. Action by ${currentUser.name}.`);
      toast.success("Alternative placement arranged free of charge under Placement Protection!");
    }

    updated.agreementHistory = history;
    updatePlacement(updated);
    setEditModal(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const printAgreement = (p: Placement) => {
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      toast.error("Popup blocker blocked the print window. Please allow popups for this site.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Placement Agreement - ${p.applicantName}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            font-size: 12px;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
          .master-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
          }
          .master-table > thead {
            display: table-header-group;
          }
          .master-table > tbody {
            display: table-row-group;
          }
          .master-table > thead > tr > td, 
          .master-table > tbody > tr > td {
            border: none;
            padding: 0;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 15px;
            margin-bottom: 20px;
            position: relative;
          }
          .header h2 {
            margin: 0;
            font-size: 16px;
            color: #0f172a;
            text-transform: uppercase;
          }
          .header p {
            margin: 5px 0 0;
            font-size: 9px;
            color: #94a3b8;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .stamp {
            position: absolute;
            right: 0px;
            top: -10px;
            border: 2px dashed rgba(59, 130, 246, 0.4);
            border-radius: 50%;
            width: 65px;
            height: 65px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: rgba(59, 130, 246, 0.5);
            text-transform: uppercase;
            font-weight: bold;
            transform: rotate(12deg);
            flex-direction: column;
            line-height: 1.2;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .details-table tr {
            page-break-inside: avoid;
          }
          .details-table td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
          }
          .details-table td.label {
            font-weight: bold;
            color: #64748b;
            background-color: #f8fafc;
            width: 35%;
          }
          .details-table td.value {
            color: #0f172a;
            font-weight: 600;
          }
          .terms {
            font-size: 10px;
            color: #475569;
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            white-space: pre-wrap;
            margin-bottom: 25px;
            page-break-inside: auto;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-line {
            border: 1px solid #f1f5f9;
            background-color: #fafafa;
            height: 65px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border-radius: 8px;
            margin-bottom: 6px;
          }
          .sig-line img {
            max-height: 100%;
            object-fit: contain;
          }
          .sig-title {
            font-size: 10px;
            font-weight: bold;
            color: #0f172a;
            border-top: 1px solid #e2e8f0;
            padding-top: 4px;
          }
          .sig-subtitle {
            font-size: 8px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <table class="master-table">
          <thead>
            <tr>
              <td>
                <div class="header">
                  <h2>Payment & Placement Service Agreement</h2>
                  <p>MS HORIZON F.Z.E  •  Website: mshorizonuae.com</p>
                  <div class="stamp">
                    <span>MS Horizon</span>
                    <span style="font-size: 6px;">F.Z.E</span>
                    <span style="font-size: 5px;">Verified</span>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <p>This Payment & Placement Service Agreement is entered into between <strong>MS Horizon F.Z.E</strong> ("Company") and the registered Applicant ("Applicant") detailed below:</p>

                <table class="details-table">
                  <tr>
                    <td class="label">Applicant Name</td>
                    <td class="value" style="color: #0f172a; font-size: 13px;">${p.applicantName}</td>
                  </tr>
                  <tr>
                    <td class="label">Passport / Emirates ID No.</td>
                    <td class="value">${p.passportNumber || "-"}</td>
                  </tr>
                  <tr>
                    <td class="label">Mobile Number</td>
                    <td class="value">${p.mobileNumber || "-"}</td>
                  </tr>
                  <tr>
                    <td class="label">Registration Date</td>
                    <td class="value">${p.registrationDate ? new Date(p.registrationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"}</td>
                  </tr>
                  <tr>
                    <td class="label">Placement Deadline</td>
                    <td class="value">${p.placementDeadline ? new Date(p.placementDeadline).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"}</td>
                  </tr>
                  <tr>
                    <td class="label">Registration Fee Paid</td>
                    <td class="value" style="font-size: 13px;">AED ${p.registrationFee?.toLocaleString() || "0"}</td>
                  </tr>
                  <tr>
                    <td class="label">Agreement Reference ID</td>
                    <td class="value" style="font-family: monospace; font-size: 10px;">${p.id}</td>
                  </tr>
                </table>

                <div class="terms">${p.termsAndConditions || ""}</div>

                <div class="signatures">
                  <div class="sig-box">
                    <div class="sig-line">
                      ${p.applicantSign ? `<img src="${p.applicantSign}" alt="Applicant Sign">` : `<span style="font-style: italic; color: #cbd5e1; font-size: 10px;">Signature Pending</span>`}
                    </div>
                    <div class="sig-title">Applicant Signature</div>
                    <div class="sig-subtitle">${p.applicantName}</div>
                  </div>
                  
                  <div class="sig-box">
                    <div class="sig-line">
                      ${p.companySign ? `<img src="${p.companySign}" alt="Company Sign">` : `<div style="border: 1px solid rgba(59, 130, 246, 0.2); color: rgba(59, 130, 246, 0.3); padding: 5px; font-size: 8px; font-weight: bold; transform: rotate(6deg);">MS HORIZON F.Z.E</div>`}
                    </div>
                    <div class="sig-title">Authorized Representative</div>
                    <div class="sig-subtitle">MS Horizon F.Z.E Stamp & Sign</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col min-h-full select-none print:bg-white print:p-0">
      
      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="print:hidden">
        <PageHeader 
          title="Payment & Placement Agreements" 
          subtitle="MS Horizon F.Z.E applicant registrations, timelines, refund queue and placement protections"
          actions={
            <Button 
              onClick={() => { resetRegisterForm(); setRegisterModal(true); }} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-md shadow-blue-500/10 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> New Registration
            </Button>
          }
        />

        {/* STATS PANELS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-6 pt-2 pb-4">
          <Card className="p-4 border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Agreements</span>
              <h3 className="text-xl font-extrabold text-slate-800">{stats.total}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><FileText className="w-5 h-5" /></div>
          </Card>
          <Card className="p-4 border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placed Candidates</span>
              <h3 className="text-xl font-extrabold text-emerald-600">{stats.placed}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100"><CheckCircle className="w-5 h-5" /></div>
          </Card>
          <Card className="p-4 border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline Alert (&lt;15d)</span>
              <h3 className="text-xl font-extrabold text-amber-600">{stats.approaching}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100"><Clock className="w-5 h-5 animate-pulse" /></div>
          </Card>
          <Card className="p-4 border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refund Queue (Eligible)</span>
              <h3 className="text-xl font-extrabold text-rose-600">{stats.refundQueue}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100"><ShieldAlert className="w-5 h-5" /></div>
          </Card>
        </div>

        {/* SEARCH, FILTER & TAB CONTROLS */}
        <div className="px-4 md:px-6 py-2 flex flex-col md:flex-row gap-3 items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-xl w-full md:w-auto overflow-x-auto">
            <button onClick={() => setActiveTab("all")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All Directory</button>
            <button onClick={() => setActiveTab("pipeline")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activeTab === "pipeline" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Active Pipeline {stats.approaching > 0 && <span className="bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{stats.approaching}</span>}</button>
            <button onClick={() => setActiveTab("refunds")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${activeTab === "refunds" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Refund Queue {stats.refundQueue > 0 && <span className="bg-rose-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{stats.refundQueue}</span>}</button>
            <button onClick={() => setActiveTab("placed")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "placed" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Placed / Executed</button>
          </div>

          <div className="flex gap-2 w-full md:w-auto items-center">
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search name, passport, code..." 
                className="pl-9 pr-4 bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 shadow-sm"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v || "all")}>
              <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9 w-32 shadow-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white rounded-xl text-xs">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Registered">Registered</SelectItem>
                <SelectItem value="Interviews">Interviews</SelectItem>
                <SelectItem value="Placed">Placed</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                exportToCSV(
                  filteredPlacements.map(p => ({
                    AgreementID: p.id,
                    ApplicantName: p.applicantName,
                    Passport: p.passportNumber || "-",
                    Mobile: p.mobileNumber || "-",
                    RegistrationDate: p.registrationDate || "-",
                    Deadline: p.placementDeadline || "-",
                    RegFee_AED: p.registrationFee || 0,
                    PlaceFee_AED: p.placementFee || 0,
                    Status: p.status,
                    RefundStatus: p.refundStatus || "Not Applicable",
                    PlacementCompany: p.companyName,
                    PlacementDate: p.placementDate,
                  })), 
                  "ms-horizon-placement-agreements"
                );
                toast.success("CSV directory exported!");
              }}
              className="rounded-xl border-slate-200 h-9 font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* PLACEMENT DIRECTORY GRID (HIDDEN ON PRINT) */}
      <div className="flex-1 p-4 md:p-6 print:hidden bg-slate-50/20">
        {filteredPlacements.length === 0 ? (
          <EmptyState 
            title="No placement agreements match filters. Try updating your search query or register a new applicant." 
            action={
              <Button onClick={() => setRegisterModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs px-4 h-9">
                Register Applicant
              </Button>
            } 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlacements.map(p => {
              const deadlineAlert = getDeadlineAlert(p);
              return (
                <Card 
                  key={p.id} 
                  className={`rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md hover:border-slate-200/80 transition-all flex flex-col gap-3 relative overflow-hidden`}
                >
                  {/* Status Badge & Code */}
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{p.applicantName}</div>
                        <div className="text-[9px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">{p.id}</div>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600 border-t border-b border-slate-100 py-3 my-1">
                    <div className="space-y-0.5">
                      <span className="text-slate-400 uppercase text-[8px] tracking-wider">Passport / ID</span>
                      <div className="text-slate-800 font-bold">{p.passportNumber || "-"}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 uppercase text-[8px] tracking-wider">Mobile Number</span>
                      <div className="text-slate-800 font-bold">{p.mobileNumber || "-"}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 uppercase text-[8px] tracking-wider">Registration Date</span>
                      <div className="text-slate-800 font-bold">{formatDate(p.registrationDate)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 uppercase text-[8px] tracking-wider">Timeline Deadline</span>
                      <div className="text-slate-800 font-bold">{formatDate(p.placementDeadline)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 uppercase text-[8px] tracking-wider">Reg Fee Paid</span>
                      <div className="text-indigo-600 font-extrabold">AED {p.registrationFee?.toLocaleString() || "0"}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-slate-400 uppercase text-[8px] tracking-wider">Placement Fee</span>
                      <div className="text-slate-800 font-bold">AED {p.placementFee?.toLocaleString() || "0"}</div>
                    </div>
                  </div>

                  {/* Placement Company Details (if Placed) */}
                  {p.status === "Placed" && (
                    <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-xl p-2.5 space-y-1 text-[10px] font-semibold text-emerald-800">
                      <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-emerald-500" /> Placed Company: <span className="font-bold text-slate-800">{p.companyName}</span></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 pt-1 border-t border-emerald-100/30 text-[9px]">
                        <div>Date: <span className="font-bold text-slate-800">{formatDate(p.placementDate)}</span></div>
                        <div>Salary: <span className="font-bold text-slate-800">AED {p.salary?.toLocaleString() || 0}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Deadline warning banner (for active candidates) */}
                  {deadlineAlert && (
                    <div className={`border rounded-xl p-2 text-center text-[10px] font-bold ${deadlineAlert.color}`}>
                      {deadlineAlert.text}
                    </div>
                  )}

                  {/* Refund Status label (if applicable) */}
                  {p.refundStatus && p.refundStatus !== "Not Applicable" && (
                    <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-slate-100 p-2 rounded-xl">
                      <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Refund Status</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border ${
                        p.refundStatus === "Eligible" ? "bg-rose-50 text-rose-700 border-rose-200" :
                        p.refundStatus === "Refunded" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-slate-200 text-slate-600 border-slate-300"
                      }`}>{p.refundStatus}</span>
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                    {p.agreementStatus === "Pending" ? (
                      <Button 
                        size="sm" 
                        onClick={() => setAgreementFormModal(p)} 
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold h-8 gap-1 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" /> Generate Agreement
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => setAgreementModal(p)} 
                        className="flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-bold h-8 gap-1 shadow-sm"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> View & Print
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditModal(p)} 
                      className="rounded-xl text-[10px] font-bold border-slate-200 hover:bg-slate-50 text-slate-600 h-8"
                    >
                      Update Status
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDeleteId(p.id)} 
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-[10px] font-bold h-8 px-2.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* REGISTRATION DIALOG */}
      <Dialog open={registerModal} onOpenChange={setRegisterModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-5 h-5 text-blue-600" /> New Placement Registration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Create a new placement record for the selected candidate. Agreement generation can be performed as a separate step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Applicant <span className="text-rose-500">*</span></Label>
                <Select value={registerForm.applicantId} onValueChange={v => handleApplicantSelect(v || "")}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400">
                    <SelectValue placeholder="Choose applicant to register" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    {applicants.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.fullName} - {a.id} ({a.nationality})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passport / Emirates ID No <span className="text-rose-500">*</span></Label>
                <Input 
                  value={registerForm.passportNumber} 
                  onChange={e => setRegisterForm(f => ({ ...f, passportNumber: e.target.value }))}
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number <span className="text-rose-500">*</span></Label>
                <Input 
                  value={registerForm.mobileNumber} 
                  onChange={e => setRegisterForm(f => ({ ...f, mobileNumber: e.target.value }))}
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration Date</Label>
                <Input 
                  type="date" 
                  value={registerForm.registrationDate} 
                  onChange={e => setRegisterForm(f => ({ ...f, registrationDate: e.target.value }))}
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Placement Deadline (Auto +90 days)</Label>
                <Input 
                  type="date" 
                  value={registerForm.placementDeadline} 
                  onChange={e => setRegisterForm(f => ({ ...f, placementDeadline: e.target.value }))}
                  className="bg-white border-slate-200 bg-slate-50 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration Fee (AED) <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">AED</span>
                  <Input 
                    type="number" 
                    value={registerForm.registrationFee} 
                    onChange={e => setRegisterForm(f => ({ ...f, registrationFee: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-slate-200 rounded-xl text-xs h-9 pl-12 focus:border-blue-400" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Placement Fee (AED) <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">AED</span>
                  <Input 
                    type="number" 
                    value={registerForm.placementFee} 
                    onChange={e => setRegisterForm(f => ({ ...f, placementFee: parseFloat(e.target.value) || 0 }))}
                    className="bg-white border-slate-200 rounded-xl text-xs h-9 pl-12 focus:border-blue-400" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desired Job Position</Label>
                <Input 
                  value={registerForm.position} 
                  onChange={e => setRegisterForm(f => ({ ...f, position: e.target.value }))}
                  placeholder="e.g. Sales Executive, Driver, receptionist"
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                <textarea 
                  rows={2}
                  value={registerForm.notes}
                  onChange={e => setRegisterForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Record initial comments, cash/receipt references or candidate guidelines..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 gap-2 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setRegisterModal(false)} className="text-xs rounded-xl px-4 h-9">Cancel</Button>
              <Button 
                type="button" 
                disabled={!registerForm.applicantId || !registerForm.passportNumber || !registerForm.mobileNumber || isSubmittingRegistration}
                onClick={handleRegisterSubmit} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-9 gap-1.5"
              >
                {isSubmittingRegistration ? "Creating..." : "Create Placement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GENERATE AGREEMENT DIALOG */}
      <Dialog open={!!agreementFormModal} onOpenChange={open => !open && setAgreementFormModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto print:hidden">
          {agreementFormModal && (
            <form onSubmit={handleGenerateAgreementSubmit} className="space-y-5">
              <DialogHeader className="border-b border-slate-100 pb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  Generate Placement Agreement
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Customize terms and collect signatures for <span className="font-bold text-slate-700">{agreementFormModal.applicantName}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">Agreement Terms & Conditions</h4>
                  <p className="text-[9px] text-slate-400 font-semibold mb-2 leading-relaxed">
                    Review and modify the clauses below as needed.
                  </p>
                  
                  <textarea 
                    rows={8}
                    value={formTermsAndConditions}
                    onChange={e => setFormTermsAndConditions(e.target.value)}
                    className="w-full text-[10px] bg-white border border-slate-200 rounded-xl font-sans p-3 text-slate-600 focus:outline-none focus:border-blue-400 leading-relaxed shadow-inner"
                    placeholder="Type or paste customized terms and conditions..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SignaturePad 
                    label="Applicant Signature (Required)" 
                    onSave={setFormApplicantSign}
                    defaultValue={formApplicantSign}
                  />
                  <SignaturePad 
                    label="Authorized Rep Counter-Signature (Optional)" 
                    onSave={setFormCompanySign}
                    defaultValue={formCompanySign}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setAgreementFormModal(null)} className="text-xs rounded-xl px-4 h-9">Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={!formApplicantSign}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs px-5 h-9 shadow-md shadow-purple-500/10 transition-all"
                >
                  Generate Agreement & Sign
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* UPDATE STATUS DIALOG */}
      <Dialog open={!!editModal} onOpenChange={open => !open && setEditModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto print:hidden">
          {editModal && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <DialogHeader className="border-b border-slate-100 pb-3">
                <DialogTitle className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-5 h-5 text-indigo-500" /> Update Placement Status
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Refactor candidate status, apply refund rules, or execute successful placements.
                </DialogDescription>
              </DialogHeader>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Pipeline Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={v => setEditForm(f => ({ ...f, status: (v || "Registered") as Placement["status"] }))}
                >
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    <SelectItem value="Registered">Registered (Paid Reg Fee)</SelectItem>
                    <SelectItem value="Interviews">Interviews (Active Pipeline)</SelectItem>
                    <SelectItem value="Placed">Placed (Job Match Secured)</SelectItem>
                    <SelectItem value="Expired">Expired (Deadline Passed - Refund Eligible)</SelectItem>
                    <SelectItem value="Withdrawn">Withdrawn (Candidate Refusal / Independent Job)</SelectItem>
                    <SelectItem value="Terminated">Terminated (Misconduct / Post-placement Ends)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CONDITIONAL FIELD: PLACEMENT FORM */}
              {editForm.status === "Placed" && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Successful Placement Details</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Placement Client Company <span className="text-rose-500">*</span></Label>
                      <Select 
                        value={editForm.companyId} 
                        onValueChange={v => setEditForm(f => ({ ...f, companyId: v || "" }))}
                      >
                        <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
                          <SelectValue placeholder="Select client company" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">
                          {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Position Title</Label>
                      <Input 
                        value={editForm.position} 
                        onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))}
                        className="bg-white border-slate-200 rounded-xl text-xs h-9" 
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Monthly Salary (AED)</Label>
                      <Input 
                        type="number"
                        value={editForm.salary} 
                        onChange={e => setEditForm(f => ({ ...f, salary: parseFloat(e.target.value) || 0 }))}
                        className="bg-white border-slate-200 rounded-xl text-xs h-9" 
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Placement/Joining Date <span className="text-rose-500">*</span></Label>
                      <Input 
                        type="date"
                        value={editForm.placementDate} 
                        onChange={e => setEditForm(f => ({ ...f, placementDate: e.target.value }))}
                        className="bg-white border-slate-200 rounded-xl text-xs h-9" 
                      />
                    </div>

                    <div className="space-y-1 col-span-2">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Working Hours</Label>
                      <Input 
                        value={editForm.workingHours} 
                        onChange={e => setEditForm(f => ({ ...f, workingHours: e.target.value }))}
                        placeholder="e.g. 8 Hours per Day, 9:00 AM – 6:00 PM"
                        className="bg-white border-slate-200 rounded-xl text-xs h-9" 
                      />
                    </div>

                    {/* Checkbox to record placement fee collection */}
                    <div className="col-span-2 flex items-center gap-2 p-2 border border-emerald-100 bg-emerald-50/20 rounded-xl mt-1">
                      <input 
                        type="checkbox" 
                        id="collect-checkbox"
                        checked={editForm.collected}
                        onChange={e => setEditForm(f => ({ ...f, collected: e.target.checked }))}
                        className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer" 
                      />
                      <Label htmlFor="collect-checkbox" className="text-[10px] font-bold text-emerald-800 cursor-pointer leading-normal">
                        Collect Remaining Placement Fee (AED {editModal.placementFee?.toLocaleString()}) from candidate.
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* CONDITIONAL FIELD: REFUND RULES & FORFEITING REASONS */}
              {(editForm.status === "Withdrawn" || editForm.status === "Terminated") && (
                <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Refund Forfeiting Rule Audits</h4>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Forfeiting Details / Resignation Reason <span className="text-rose-500">*</span></Label>
                    <Select 
                      value={editForm.reason} 
                      onValueChange={v => setEditForm(f => ({ ...f, reason: v || "" }))}
                    >
                      <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl text-xs">
                        {editForm.status === "Withdrawn" ? (
                          <>
                            <SelectItem value="Applicant voluntarily withdrew from process">Applicant voluntarily withdrew</SelectItem>
                            <SelectItem value="Applicant rejected suitable jobs matches">Applicant rejected suitable jobs</SelectItem>
                            <SelectItem value="Obtained employment independently or through another agency">Obtained alternative employment</SelectItem>
                            <SelectItem value="Applicant submitted false information/documents">Submitted false information</SelectItem>
                            <SelectItem value="Applicant failed to follow standard procedures/medical">Failed to follow procedures</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Applicant resigned voluntarily during probation">Resigned voluntarily</SelectItem>
                            <SelectItem value="Applicant absconded from employment">Absconded from work</SelectItem>
                            <SelectItem value="Applicant engaged in illegal activities / policy violation">Illegal activities / Policy violation</SelectItem>
                            <SelectItem value="Terminated by employer for misconduct">Terminated for misconduct</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* PLACEMENT PROTECTION CONTROLS (IF PLACED OFFER CANCELLED BY EMPLOYER) */}
              {editModal.status === "Placed" && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-2">
                  <h4 className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider border-b pb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Placement Protection (Employer Issues)</h4>
                  <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
                    If the employer cancels the offer, fails visa processing or cancels positions for reasons beyond applicant control, activate protection:
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handlePlacementProtection("refund")} 
                      className="flex-1 bg-white border-slate-200 hover:bg-slate-50 text-[9px] h-8 text-blue-700 font-bold"
                    >
                      Refund Placement Fee
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => handlePlacementProtection("alternative")} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] h-8 font-bold"
                    >
                      Free Alternative Job Match
                    </Button>
                  </div>
                </div>
              )}

              {/* Refund Status override */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audit Refund Status</Label>
                <Select 
                  value={editForm.refundStatus} 
                  onValueChange={v => setEditForm(f => ({ ...f, refundStatus: (v || "Not Applicable") as Placement["refundStatus"] }))}
                >
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    <SelectItem value="Not Applicable">Not Applicable (Active Pipeline / Placed)</SelectItem>
                    <SelectItem value="Pending Review">Pending Review</SelectItem>
                    <SelectItem value="Eligible">Eligible (Deadline expired without placement)</SelectItem>
                    <SelectItem value="Refunded">Refunded (Registration fee returned in full)</SelectItem>
                    <SelectItem value="Forfeited">Forfeited (Rule violation / Voluntary withdrawal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Edit terms and conditions */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modify Agreement Terms & Conditions</Label>
                <textarea 
                  rows={5}
                  value={editForm.termsAndConditions}
                  onChange={e => setEditForm(f => ({ ...f, termsAndConditions: e.target.value }))}
                  className="w-full text-[10px] border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-400 font-sans leading-relaxed"
                  placeholder="Write or copy custom terms..."
                />
              </div>

              {/* Standard text notes input */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consultant Audit Notes</Label>
                <textarea 
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Record reasons, voucher reference numbers, counter agreements..."
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:outline-none focus:border-blue-400"
                />
              </div>

              <DialogFooter className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setEditModal(null)} className="text-xs rounded-xl px-4 h-9">Cancel</Button>
                <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-9">Save Status Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* AGREEMENT DOCUMENT PREVIEW & PDF PRINT MODAL */}
      <Dialog open={!!agreementModal} onOpenChange={open => !open && setAgreementModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-4xl max-h-[90vh] overflow-y-auto print:hidden">
          {agreementModal && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left 2 Columns: Contract Document Template */}
              <div className="lg:col-span-2 space-y-4 print:col-span-1">
                <DialogHeader className="print:hidden">
                  <DialogTitle className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-5 h-5 text-blue-600" /> MS Horizon F.Z.E Agreement Preview
                  </DialogTitle>
                  <DialogDescription className="text-[10px] text-slate-400 font-semibold">
                    Authorized placement contract copy. Ready to download or print.
                  </DialogDescription>
                </DialogHeader>

                {/* Print Sheet */}
                <div className="border border-slate-200 bg-white rounded-2xl p-6 md:p-8 space-y-5 shadow-sm text-slate-700 text-[10px] leading-relaxed font-sans print:border-0 print:p-0 print:shadow-none">
                  
                  {/* Company Stamp Header */}
                  <div className="text-center space-y-1.5 border-b border-slate-200 pb-4 relative">
                    <h2 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">Payment & Placement Service Agreement</h2>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">MS HORIZON F.Z.E  •  Website: mshorizonuae.com</p>
                    
                    {/* Fake Stamp logo */}
                    <div className="absolute right-2 top-0 border-2 border-blue-500/30 rounded-full w-14 h-14 flex items-center justify-center text-[7px] text-blue-600/40 uppercase font-extrabold select-none rotate-12 flex-col leading-tight print:border-blue-500/40">
                      <span>MS Horizon</span>
                      <span className="text-[5px]">F.Z.E</span>
                      <span className="text-[4px]">Verified</span>
                    </div>
                  </div>

                  <p>This Payment & Placement Service Agreement is entered into between **MS Horizon F.Z.E** (&quot;Company&quot;) and the registered Applicant (&quot;Applicant&quot;) detailed below:</p>

                  {/* Applicant Details Table */}
                  <table className="w-full border border-slate-100 rounded-xl overflow-hidden print:border-slate-200">
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-600 print:divide-slate-200">
                      <tr className="bg-slate-50/50 print:bg-white">
                        <td className="p-2 font-bold text-slate-400 w-1/3">Applicant Name</td>
                        <td className="p-2 text-slate-900 font-bold">{agreementModal.applicantName}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-400">Passport / Emirates ID No.</td>
                        <td className="p-2 text-slate-900">{agreementModal.passportNumber || "-"}</td>
                      </tr>
                      <tr className="bg-slate-50/50 print:bg-white">
                        <td className="p-2 font-bold text-slate-400">Mobile Number</td>
                        <td className="p-2 text-slate-900">{agreementModal.mobileNumber || "-"}</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-slate-400">Registration Date</td>
                        <td className="p-2 text-slate-900">{formatDate(agreementModal.registrationDate)}</td>
                      </tr>
                      <tr className="bg-slate-50/50 print:bg-white">
                        <td className="p-2 font-bold text-slate-400">Placement Deadline</td>
                        <td className="p-2 text-slate-900">{formatDate(agreementModal.placementDeadline)}</td>
                      </tr>
                      <tr className="bg-slate-50/50 print:bg-white">
                        <td className="p-2 font-bold text-slate-400">Agreement Reference ID</td>
                        <td className="p-2 text-slate-900 font-mono font-bold text-[9px]">{agreementModal.id}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Agreement Terms & Conditions (Manually customizable) */}
                  <div className="space-y-2 pt-1 text-[9px] text-slate-500 font-medium whitespace-pre-wrap border border-slate-50 p-3 rounded-xl bg-slate-50/20 leading-relaxed font-sans">
                    {agreementModal.termsAndConditions || DEFAULT_TERMS}
                  </div>

                  {/* Render Signatures */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200 mt-6 print:pt-4">
                    <div className="text-center space-y-1.5">
                      <div className="border border-slate-100 bg-slate-50/30 rounded-xl h-14 flex items-center justify-center overflow-hidden">
                        {agreementModal.applicantSign ? (
                          <Image src={agreementModal.applicantSign} alt="Applicant Signature" width={200} height={70} className="max-h-full object-contain" unoptimized />
                        ) : (
                          <span className="text-[9px] text-slate-300 italic">Signature Pending</span>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-slate-800 border-t border-slate-100 pt-1">Applicant Signature</div>
                      <div className="text-[7px] text-slate-400 font-semibold">{agreementModal.applicantName}</div>
                    </div>

                    <div className="text-center space-y-1.5">
                      <div className="border border-slate-100 bg-slate-50/30 rounded-xl h-14 flex items-center justify-center overflow-hidden">
                        {agreementModal.companySign ? (
                          <Image src={agreementModal.companySign} alt="Company Signature" width={200} height={70} className="max-h-full object-contain" unoptimized />
                        ) : (
                          <div className="border border-blue-500/20 text-blue-600/30 rounded px-3 py-1.5 text-[6px] font-bold uppercase rotate-6">MS HORIZON F.Z.E</div>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-slate-800 border-t border-slate-100 pt-1">Authorized Representative</div>
                      <div className="text-[7px] text-slate-400 font-semibold">MS Horizon F.Z.E Stamp & Sign</div>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <PrintButtons placement={agreementModal} terms={placementTerms} />
              </div>

              {/* Right Column: Signing pads and contract logs */}
              <div className="space-y-4 print:hidden">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-500" /> Contract Auditing History
                </h3>

                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {agreementModal.agreementHistory && agreementModal.agreementHistory.length > 0 ? (
                    agreementModal.agreementHistory.map((log, index) => (
                      <div key={index} className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl font-semibold leading-normal">
                        {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">No auditing logs recorded.</div>
                  )}
                </div>

                {/* Counter Sign pad in detail modal if representative signature is pending */}
                {!agreementModal.companySign && (
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <SignaturePad 
                      label="Counter-Sign Contract (Company Stamp)" 
                      onSave={sign => {
                        if (!sign) return;
                        const updated = {
                          ...agreementModal,
                          companySign: sign,
                          agreementHistory: [...(agreementModal.agreementHistory || []), `Counter-signed by Company Officer on ${formatDate("2026-06-17")}.`]
                        };
                        updatePlacement(updated);
                        setAgreementModal(updated);
                        toast.success("Counter-signature recorded");
                      }} 
                    />
                  </div>
                )}
              </div>

            </div>
          )}
          
          <DialogFooter className="border-t border-slate-100 pt-3 mt-4 print:hidden">
            <Button onClick={() => setAgreementModal(null)} className="bg-slate-900 text-white rounded-xl text-xs font-bold h-9">Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <ConfirmDialog 
        isOpen={!!deleteId} 
        onOpenChange={open => !open && setDeleteId(null)} 
        onConfirm={() => { deletePlacement(deleteId!); toast.success("Placement agreement deleted"); setDeleteId(null); }} 
        title="Delete Agreement" 
        description="Permanently remove this placement agreement and details from database? This action cannot be undone." 
        confirmText="Delete" 
        variant="danger" 
      />

      {agreementModal && (
        <PrintableAgreement placement={agreementModal} terms={placementTerms} />
      )}
    </div>
  );
}
