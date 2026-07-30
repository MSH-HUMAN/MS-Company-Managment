"use client";

import { useState, useEffect } from "react";
import {
  Search, Briefcase, Eye, Calendar, ShieldCheck, PhoneCall, Mail,
  CheckCircle, Clock, ArrowLeft, RotateCcw, Building2, UserCheck,
  Users, AlertTriangle, Download, FileText, CalendarRange, Globe,
  Printer, LayoutGrid, List
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import PageHeader from "@/components/shared/PageHeader";
import { NATIONALITIES } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Applicant } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import AccessDenied from "@/components/shared/AccessDenied";

export default function TrackingPage() {
  const {
    currentRole,
    currentUser,
    applicants,
    interviews,
    placements,
    updateApplicant,
    addActivityLog,
    ownCompanies,
    companies,
    branches,
    staff,
    hasPermission,
    isStoreLoaded
  } = useAuthStore();

  if (!isStoreLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-semibold">Loading tracking pipeline...</p>
        </div>
      </div>
    );
  }

  const canView = hasPermission("tracking", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  const { filters, setFilter, clearFilter } = useFilterStore();
  const f = filters.tracking || {};

  const search = f.search || "";
  const companyFilter = f.company || "all";
  const branchFilter = f.branch || "all";
  const nationalityFilter = f.nationality || "all";
  const statusFilter = f.status || "all";
  const startDate = f.fromDate || "";
  const endDate = f.toDate || "";
  
  const positionFilter = f.position || "all";
  const visaStatusFilter = f.visaStatus || "all";
  const interviewDateFilter = f.interviewDate || "";

  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);

  // Pagination and View states
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset page when filters update
  useEffect(() => {
    setCurrentPage(1);
  }, [
    f.search,
    f.company,
    f.branch,
    f.nationality,
    f.status,
    f.fromDate,
    f.toDate,
    f.position,
    f.visaStatus,
    f.interviewDate
  ]);

  // Status progression validations state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [draggedApplicant, setDraggedApplicant] = useState<Applicant | null>(null);
  const [targetStatus, setTargetStatus] = useState<Applicant["status"] | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [placedCompany, setPlacedCompany] = useState("");
  const [placedDate, setPlacedDate] = useState("");

  const isSuperAdmin = currentRole === "Super Admin";
  const isCompanyAdmin = currentRole === "Company Admin";

  // Base list depending on role and soft delete / visibility
  let baseApplicants = applicants;
  if (!isSuperAdmin) {
    baseApplicants = baseApplicants.filter(a => a.company === currentUser.company);
    if (!isCompanyAdmin && currentUser.branch && currentUser.branch !== "All") {
      baseApplicants = baseApplicants.filter(a => a.branch === currentUser.branch);
    }
  }

  // Apply filters
  let filteredList = [...baseApplicants];

  if (companyFilter !== "all") {
    filteredList = filteredList.filter(a => a.company === companyFilter);
  }
  if (branchFilter !== "all") {
    filteredList = filteredList.filter(a => a.branch === branchFilter);
  }

  if (nationalityFilter !== "all") {
    filteredList = filteredList.filter(a => a.nationality === nationalityFilter);
  }
  if (statusFilter !== "all") {
    filteredList = filteredList.filter(a => a.status && a.status.trim().toLowerCase() === statusFilter.trim().toLowerCase());
  }
  if (startDate) {
    filteredList = filteredList.filter(a => a.applicationDate >= startDate);
  }
  if (endDate) {
    filteredList = filteredList.filter(a => a.applicationDate <= endDate);
  }
  if (search) {
    const q = search.toLowerCase();
    filteredList = filteredList.filter(a =>
      a.fullName.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      (a.applyingPositions && a.applyingPositions.join(", ").toLowerCase().includes(q))
    );
  }

  // 1. Position Filter
  if (positionFilter !== "all") {
    filteredList = filteredList.filter(a => a.applyingPositions && Array.isArray(a.applyingPositions) && (a.applyingPositions as string[]).includes(positionFilter));
  }

  // 2. Visa Status / Visa Type Filter
  if (visaStatusFilter !== "all") {
    filteredList = filteredList.filter(a => a.visaType === visaStatusFilter);
  }

  // 3. Interview Date Filter
  if (interviewDateFilter) {
    const matchingAppIds = interviews
      .filter(i => i.dateTime && i.dateTime.slice(0, 10) === interviewDateFilter)
      .map(i => i.applicantId);
    filteredList = filteredList.filter(a => matchingAppIds.includes(a.id));
  }

  // Derive unique values for filters
  const allPositions = Array.from(
    new Set(baseApplicants.flatMap(a => Array.isArray(a.applyingPositions) ? a.applyingPositions : []))
  ).sort();

  const allVisaTypes = Array.from(
    new Set(baseApplicants.map(a => a.visaType).filter(Boolean))
  ).sort();

  // Derive paginated list
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV Export
  const exportTrackingToCSV = () => {
    const headers = ["Candidate ID", "Full Name", "Email", "Mobile", "Nationality", "Applying Positions", "Internal Company", "Branch", "Visa Type", "Visa Expiry", "Current Status", "Client Company"];
    const rows = filteredList.map(a => [
      a.id,
      a.fullName,
      a.email || "",
      a.mobile || "",
      a.nationality,
      a.applyingPositions ? a.applyingPositions.join(" | ") : "",
      a.company || "",
      a.branch || "",
      a.visaType,
      a.visaExpiry || "",
      a.status,
      a.clientName || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `applicant_tracking_pipeline_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export initiated");
  };

  // Printable report report print popup window
  const printTrackingReport = () => {
    const printWindow = window.open("", "_blank", "width=950,height=800");
    if (!printWindow) {
      toast.error("Popup blocker blocked the print window.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Applicant Pipeline Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            padding: 40px;
            font-size: 11px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h2 {
            margin: 0;
            font-size: 15px;
            color: #0f172a;
            text-transform: uppercase;
          }
          .header p {
            margin: 4px 0 0;
            font-size: 8px;
            color: #64748b;
            font-weight: bold;
            letter-spacing: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            padding: 6px 10px;
            border: 1px solid #e2e8f0;
            text-align: left;
          }
          th {
            background-color: #f8fafc;
            font-weight: bold;
            color: #475569;
          }
          tr:nth-child(even) {
            background-color: #fafafa;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Applicant Pipeline Tracking Report</h2>
          <p>MS HORIZON F.Z.E  •  Total Candidates: ${filteredList.length}  •  Report Date: ${new Date().toLocaleDateString()}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Full Name</th>
              <th>Nationality</th>
              <th>Positions</th>
              <th>Internal Company</th>
              <th>Internal Branch</th>
              <th>Visa Type</th>
              <th>Pipeline Stage</th>
            </tr>
          </thead>
          <tbody>
            ${filteredList.map(a => `
              <tr>
                <td>${a.id}</td>
                <td><strong>${a.fullName}</strong></td>
                <td>${a.nationality}</td>
                <td>${a.applyingPositions ? a.applyingPositions.join(", ") : "N/A"}</td>
                <td>${a.company || "-"}</td>
                <td>${a.branch || "-"}</td>
                <td>${a.visaType}</td>
                <td>${a.status}</td>
              </tr>
            `).join("")}
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

  // Statistics calculations
  const totalStaffCount = staff.filter(s => isSuperAdmin ? true : s.company === currentUser.company).length;
  const activeStaffCount = staff.filter(s => (isSuperAdmin ? true : s.company === currentUser.company) && s.status === "Active").length;

  // Placements depending on scope
  const activePlacements = placements.filter(p => {
    if (isSuperAdmin) return true;
    // match company by name
    return p.companyName === currentUser.company;
  });

  const totalPlacedInPipeline = baseApplicants.filter(a => a.status === "Placed").length;

  const STAGES: Applicant["status"][] = [
    "Registered",
    "Pending",
    "Processing",
    "Interview Scheduled",
    "Interview Completed",
    "Selected",
    "Visa Processing",
    "Ready to Travel",
    "Placed",
    "Rejected",
    "Returned"
  ];

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draggedApplicant || !targetStatus) return;

    if ((targetStatus === "Rejected" || targetStatus === "Returned") && !statusReason.trim()) {
      toast.error("Please provide a reason validation for this status change.");
      return;
    }

    if (targetStatus === "Placed" && (!placedCompany || !placedDate)) {
      toast.error("Please specify both the Placed Company and the Placement Date.");
      return;
    }

    if (targetStatus === "Processing" && !placedDate) {
      toast.error("Please select an interview/processing date validation.");
      return;
    }

    const reason = targetStatus === "Placed"
      ? `Placed with company: ${placedCompany} on ${formatDate(placedDate)}`
      : targetStatus === "Processing"
        ? `Interview / processing scheduled: ${formatDate(placedDate.slice(0, 10))} at ${placedDate.slice(11)}`
        : statusReason;

    const updated = {
      ...draggedApplicant,
      status: targetStatus,
      clientName: targetStatus === "Placed" ? placedCompany : draggedApplicant.clientName,
      statusHistory: [
        {
          oldStatus: draggedApplicant.status,
          newStatus: targetStatus,
          changedBy: currentUser.name,
          date: new Date().toISOString().replace("T", " ").slice(0, 19),
          companyName: targetStatus === "Placed" ? placedCompany : undefined,
          reason: reason
        },
        ...draggedApplicant.statusHistory
      ]
    };

    updateApplicant(updated);

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Status Changed",
      module: "Tracking",
      oldValue: draggedApplicant.status,
      newValue: targetStatus,
      ipAddress: "192.168.1.102"
    });

    toast.success(`${draggedApplicant.fullName} status updated to ${targetStatus}`);
    setIsStatusDialogOpen(false);
    setDraggedApplicant(null);
    setTargetStatus(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: Applicant["status"]) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("appId");
    const app = baseApplicants.find(a => a.id === id);
    if (app) {
      initiateStatusChange(app, newStatus);
    }
  };

  const initiateStatusChange = (app: Applicant, newStatus: Applicant["status"]) => {
    if (app.status === newStatus) return;
    if (
      newStatus === "Placed" ||
      newStatus === "Processing" ||
      newStatus === "Rejected" ||
      newStatus === "Returned"
    ) {
      setDraggedApplicant(app);
      setTargetStatus(newStatus);
      setStatusReason("");
      setPlacedCompany("");
      setPlacedDate("");
      setIsStatusDialogOpen(true);
    } else {
      const updated = {
        ...app,
        status: newStatus,
        statusHistory: [
          {
            oldStatus: app.status,
            newStatus: newStatus,
            changedBy: currentUser.name,
            date: new Date().toISOString().replace("T", " ").slice(0, 19),
            reason: `Status changed to ${newStatus}`
          },
          ...app.statusHistory
        ]
      };
      updateApplicant(updated);
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Status Changed",
        module: "Tracking",
        oldValue: app.status,
        newValue: newStatus,
        ipAddress: "Browser"
      });
      toast.success(`${app.fullName} status updated to ${newStatus}`);
      if (selectedApp?.id === app.id) {
        setSelectedApp(updated);
      }
    }
  };

  const getColColor = (status: string) => {
    switch (status) {
      case "Registered": return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "Pending": return "bg-slate-50 border-slate-200 text-slate-700";
      case "Processing": return "bg-sky-50 border-sky-200 text-sky-700";
      case "Interview Scheduled": return "bg-purple-50 border-purple-200 text-purple-700";
      case "Interview Completed": return "bg-violet-50 border-violet-200 text-violet-700";
      case "Selected": return "bg-blue-50 border-blue-200 text-blue-700";
      case "Visa Processing": return "bg-amber-50 border-amber-200 text-amber-700";
      case "Ready to Travel":
      case "Ready To Travel": return "bg-teal-50 border-teal-200 text-teal-700";
      case "Placed": return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "Returned": return "bg-orange-50 border-orange-200 text-orange-700";
      case "Rejected": return "bg-rose-50 border-rose-200 text-rose-700";
      default: return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  // Helper to fetch details for selected applicant
  const selectedAppInterviews = selectedApp
    ? interviews.filter(i => i.applicantId === selectedApp.id)
    : [];

  const selectedAppPlacement = selectedApp
    ? placements.find(p => p.applicantId === selectedApp.id)
    : null;

  // Calculate Visa Expiry remaining days
  const getVisaDaysLeft = (expiryDate: string) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date("2026-06-04"); // system standard reference date
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const selectedVisaDays = selectedApp ? getVisaDaysLeft(selectedApp.visaExpiry) : null;

  // Retrieve files from documents
  const getVisaDocument = (app: Applicant | null) => {
    if (!app) return null;
    return app.documents.find(d => d.name.toLowerCase().includes("visa")) ?? null;
  };

  const handleDownloadDoc = (doc: any) => {
    if (doc?.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.name;
      a.click();
      toast.success(`Downloading "${doc.name}"`);
    } else {
      toast.info(`No file data stored for "${doc?.name || "document"}"`);
    }
  };

  const resetFilters = () => {
    clearFilter("tracking");
    toast.success("Filters cleared");
  };

  const getChronologicalTimeline = () => {
    if (!selectedApp) return [];
    
    // Parse status history safely
    let historyList: any[] = [];
    if (selectedApp.statusHistory) {
      historyList = Array.isArray(selectedApp.statusHistory)
        ? selectedApp.statusHistory
        : (typeof selectedApp.statusHistory === "string" 
            ? (() => { try { return JSON.parse(selectedApp.statusHistory); } catch { return []; } })()
            : []);
    }
    
    const events: any[] = [];
    
    // 1. Registration
    events.push({
      date: selectedApp.createdAt || selectedApp.applicationDate,
      type: "Registration",
      title: "Registration Date",
      desc: `Profile registered by consultant ${selectedApp.createdBy || "System"}`,
      notes: `Company: ${selectedApp.company} · Branch: ${selectedApp.branch}`
    });
    
    // 2. Status History changes
    historyList.forEach((h: any, idx: number) => {
      events.push({
        date: h.date || new Date().toISOString(),
        type: "StatusChange",
        title: `Status Stage: ${h.newStatus}`,
        desc: `Status updated by ${h.changedBy || "Manager"} (Previous: ${h.oldStatus})`,
        notes: h.reason || ""
      });
    });
    
    // 3. Interview History
    selectedAppInterviews.forEach((i: any) => {
      events.push({
        date: i.dateTime,
        type: "Interview",
        title: `${i.type || "Interview"} scheduled: ${i.onlinePhysical || "Online"}`,
        desc: `Position: ${i.interviewPosition || selectedApp.applyingPositions?.[0] || "N/A"} · Conducted by: ${i.conductPersonName} (${i.meetingMode || "Phone Call"})`,
        notes: `Status: ${i.status} · Feedback: ${i.feedback || "Pending"} · Result: ${i.interviewResult || "Awaiting Result"}`
      });
    });

    // 4. Visa Status
    if (selectedApp.visaExpiry) {
      events.push({
        date: selectedApp.visaExpiry,
        type: "Visa",
        title: "Visa Status Checkpoint",
        desc: `Visa Category: ${selectedApp.visaType} · Expiry: ${formatDate(selectedApp.visaExpiry)}`,
        notes: `Visa expiration remaining: ${selectedVisaDays !== null ? `${selectedVisaDays} days` : "N/A"}`
      });
    }

    // 5. Placement Details
    if (selectedAppPlacement) {
      events.push({
        date: selectedAppPlacement.placementDate || selectedAppPlacement.createdAt || new Date().toISOString(),
        type: "Placement",
        title: `Placement Confirmed`,
        desc: `Placed with company ${selectedAppPlacement.companyName} as ${selectedAppPlacement.position}`,
        notes: `Monthly Salary: AED ${selectedAppPlacement.salary?.toLocaleString()} · Start Date: ${selectedAppPlacement.joiningDate || "N/A"} · Agreement: ${selectedAppPlacement.agreementStatus}`
      });
    }
    
    // Sort chronological order (oldest to newest)
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  return (
    <div className="flex flex-col min-h-full select-none">
      <PageHeader
        title="Applicant Tracking Workflow"
        subtitle="Manage applicant pipeline, visa tracking and final placements"
        actions={
          <Link href="/">
            <Button variant="outline" className="text-xs h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 font-bold shadow-sm">
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Back to Dashboard
            </Button>
          </Link>
        }
      />

      {/* KPI Stats Bar showing members placement counts clearly */}
      <div className="bg-slate-50/60 border-b border-slate-100 p-4 md:px-6 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total in Pipeline</div>
              <div className="text-base font-extrabold text-slate-800">{baseApplicants.length} Candidates</div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Placed Placements</div>
              <div className="text-base font-extrabold text-slate-800">{totalPlacedInPipeline} Placed</div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Staff Members</div>
              <div className="text-base font-extrabold text-slate-800">{activeStaffCount} / {totalStaffCount} Active</div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Visa Processing</div>
              <div className="text-base font-extrabold text-slate-800">{baseApplicants.filter(a => a.status === "Visa Processing").length} Processing</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Interactive Status KPI Cards */}
      <div className="bg-slate-50/60 border-b border-slate-100 px-4 md:px-6 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Filter Pipeline by Status</h3>
            {statusFilter !== "all" && (
              <button 
                onClick={() => setFilter("tracking", { status: "all" })}
                className="text-[9px] font-bold text-purple-600 hover:text-purple-700"
              >
                Clear Status Filter
              </button>
            )}
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {/* 'All' Card */}
            <Card 
              onClick={() => setFilter("tracking", { status: "all", page: 1 })}
              className={cn(
                "flex-shrink-0 min-w-[110px] p-3 rounded-xl border transition-all cursor-pointer select-none",
                statusFilter === "all" 
                  ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/10" 
                  : "bg-white border-slate-100 hover:border-purple-200 text-slate-700"
              )}
            >
              <div className={cn("text-[9px] font-bold uppercase tracking-wider", statusFilter === "all" ? "text-purple-100" : "text-slate-400")}>
                All Stages
              </div>
              <div className="text-sm font-extrabold mt-0.5">
                {baseApplicants.length}
              </div>
            </Card>

            {STAGES.map(stage => {
              let stageFiltered = [...baseApplicants];
              if (companyFilter !== "all") stageFiltered = stageFiltered.filter(a => a.company === companyFilter);
              if (branchFilter !== "all") stageFiltered = stageFiltered.filter(a => a.branch === branchFilter);
              if (nationalityFilter !== "all") stageFiltered = stageFiltered.filter(a => a.nationality === nationalityFilter);
              if (positionFilter !== "all") stageFiltered = stageFiltered.filter(a => a.applyingPositions && Array.isArray(a.applyingPositions) && (a.applyingPositions as string[]).includes(positionFilter));
              if (visaStatusFilter !== "all") stageFiltered = stageFiltered.filter(a => a.visaType === visaStatusFilter);
              if (startDate) stageFiltered = stageFiltered.filter(a => a.applicationDate >= startDate);
              if (endDate) stageFiltered = stageFiltered.filter(a => a.applicationDate <= endDate);
              if (search) {
                const q = search.toLowerCase();
                stageFiltered = stageFiltered.filter(a =>
                  a.fullName.toLowerCase().includes(q) ||
                  a.id.toLowerCase().includes(q) ||
                  (a.applyingPositions && a.applyingPositions.join(", ").toLowerCase().includes(q))
                );
              }
              const count = stageFiltered.filter(a => a.status && a.status.trim().toLowerCase() === stage.trim().toLowerCase()).length;
              const isSelected = statusFilter.trim().toLowerCase() === stage.trim().toLowerCase();
              
              return (
                <Card
                  key={stage}
                  onClick={() => setFilter("tracking", { status: stage, page: 1 })}
                  className={cn(
                    "flex-shrink-0 min-w-[125px] p-3 rounded-xl border transition-all cursor-pointer select-none",
                    isSelected 
                      ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/10"
                      : "bg-white border-slate-100 hover:border-purple-200 text-slate-700"
                  )}
                >
                  <div className={cn("text-[9px] font-bold uppercase tracking-wider truncate", isSelected ? "text-purple-100" : "text-slate-400")}>
                    {stage}
                  </div>
                  <div className="text-sm font-extrabold mt-0.5">
                    {count}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Row with Advanced Controls */}
      <div className="bg-white border-b border-slate-100 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3 flex-1">
            {/* Search Input */}
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search candidates..."
                value={search}
                onChange={e => setFilter("tracking", { search: e.target.value, page: 1 })}
                className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:bg-white w-full"
              />
            </div>

            {/* Our Company Filter */}
            <div className="space-y-0.5">
              <select
                value={companyFilter}
                onChange={e => {
                  setFilter("tracking", { company: e.target.value, branch: "all", page: 1 });
                }}
                disabled={!isSuperAdmin}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700 disabled:opacity-50"
              >
                <option value="all">Our Company</option>
                {ownCompanies.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div className="space-y-0.5">
              <select
                value={branchFilter}
                onChange={e => setFilter("tracking", { branch: e.target.value, page: 1 })}
                disabled={!isSuperAdmin && !isCompanyAdmin}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700 disabled:opacity-50"
              >
                {isSuperAdmin && <option value="all">All Branches</option>}
                {branches
                  .filter(b => companyFilter === "all" || b.company === companyFilter)
                  .map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))
                }
              </select>
            </div>


            {/* Nationality Filter */}
            <div className="space-y-0.5">
              <select
                value={nationalityFilter}
                onChange={e => setFilter("tracking", { nationality: e.target.value, page: 1 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700"
              >
                <option value="all">Nationality</option>
                {NATIONALITIES.map(n => (
                  <option key={n.name} value={n.name}>{n.flag} {n.name}</option>
                ))}
              </select>
            </div>

            {/* Status / Stage Filter */}
            <div className="space-y-0.5">
              <select
                value={statusFilter}
                onChange={e => setFilter("tracking", { status: e.target.value, page: 1 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700"
              >
                <option value="all">Pipeline Stage</option>
                {STAGES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Position Filter */}
            <div className="space-y-0.5">
              <select
                value={positionFilter}
                onChange={e => setFilter("tracking", { position: e.target.value, page: 1 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700"
              >
                <option value="all">Position</option>
                {allPositions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Visa Status Filter */}
            <div className="space-y-0.5">
              <select
                value={visaStatusFilter}
                onChange={e => setFilter("tracking", { visaStatus: e.target.value, page: 1 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700"
              >
                <option value="all">Visa Status</option>
                {allVisaTypes.map(visa => (
                  <option key={visa} value={visa}>{visa}</option>
                ))}
              </select>
            </div>

            {/* Interview Date Filter */}
            <div className="relative">
              <Input
                type="date"
                value={interviewDateFilter}
                onChange={e => setFilter("tracking", { interviewDate: e.target.value, page: 1 })}
                className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:bg-white w-full px-3"
                title="Scheduled Interview Date"
              />
              <span className="absolute -top-3.5 left-1 text-[8px] font-bold text-slate-400 uppercase">Int. Date</span>
            </div>

            {/* Start Date */}
            <div className="relative">
              <Input
                type="date"
                value={startDate}
                onChange={e => setFilter("tracking", { fromDate: e.target.value, page: 1 })}
                className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:bg-white w-full px-3"
                title="Application Date From"
              />
              <span className="absolute -top-3.5 left-1 text-[8px] font-bold text-slate-400 uppercase">From Date</span>
            </div>

            {/* End Date */}
            <div className="relative">
              <Input
                type="date"
                value={endDate}
                onChange={e => setFilter("tracking", { toDate: e.target.value, page: 1 })}
                className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:bg-white w-full px-3"
                title="Application Date To"
              />
              <span className="absolute -top-3.5 left-1 text-[8px] font-bold text-slate-400 uppercase">To Date</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end lg:pl-3 flex-wrap items-center">
            {/* View Switcher Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg text-xs h-8 px-3 font-bold gap-1 ${
                  viewMode === "grid" 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 bg-transparent"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-lg text-xs h-8 px-3 font-bold gap-1 ${
                  viewMode === "table" 
                    ? "bg-white text-slate-800 shadow-sm" 
                    : "text-slate-500 hover:text-slate-800 bg-transparent"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List Table
              </Button>
            </div>

            <Button
              variant="outline"
              type="button"
              onClick={exportTrackingToCSV}
              className="text-xs h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 font-bold px-3 flex-shrink-0"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={printTrackingReport}
              className="text-xs h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 font-bold px-3 flex-shrink-0"
              title="Print Report"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={resetFilters}
              className="text-xs h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 font-bold px-3 flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        /* Kanban Board Container */
        <div className="flex-1 p-4 md:p-6 overflow-x-auto overflow-y-auto bg-slate-50/50 min-h-0">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {(statusFilter === "all" ? STAGES : STAGES.filter(s => s.trim().toLowerCase() === statusFilter.trim().toLowerCase())).map(stage => {
              const stageApplicants = filteredList.filter(a => a.status && a.status.trim().toLowerCase() === stage.trim().toLowerCase());
              return (
                <div key={stage}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDrop(e, stage)}
                  className={`w-72 sm:w-80 flex flex-col rounded-2xl border-2 ${getColColor(stage).split(" ")[1]} bg-slate-50/30 shadow-sm h-full`}
                >
                  <div className={`px-4 py-3 border-b border-inherit rounded-t-xl font-bold text-xs uppercase tracking-wider flex justify-between items-center ${getColColor(stage).split(" ")[0]} ${getColColor(stage).split(" ")[2]}`}>
                    {stage}
                    <span className="bg-white px-2 py-0.5 rounded text-[10px] shadow-sm font-extrabold">{stageApplicants.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                    {stageApplicants.map(app => (
                      <Card key={app.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData("appId", app.id)}
                        className="p-3.5 cursor-grab active:cursor-grabbing border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all bg-white rounded-2xl flex flex-col gap-2.5"
                      >
                        <div className="flex gap-3">
                          <Avatar className="w-10 h-10 rounded-xl border border-slate-100 flex-shrink-0 shadow-sm">
                            {app.photo ? (
                              <AvatarImage src={app.photo} className="object-cover rounded-xl" />
                            ) : (
                              <AvatarFallback className="rounded-xl bg-blue-50 text-[10px] font-bold text-blue-700">
                                {app.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <Link href={`/applicants/${app.id}`} className="text-xs font-bold text-slate-800 hover:text-blue-600 block truncate" title={app.fullName}>
                              {app.fullName}
                            </Link>
                            <div className="text-[10px] font-semibold text-slate-400 font-mono mt-0.5">{app.id} · {app.branch}</div>
                            <div className="text-[9px] font-bold text-slate-500 flex gap-1 items-center mt-1 truncate">
                              <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{app.applyingPositions ? app.applyingPositions.join(", ") : "N/A"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-1.5 flex-wrap pt-0.5">
                          <span className="text-[8px] font-extrabold uppercase bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">{app.nationality}</span>
                          <span className="text-[8px] font-extrabold uppercase bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">{app.visaType}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApp(app)}
                          className="w-full text-[9px] font-bold h-7 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-blue-600 gap-1 mt-1"
                        >
                          <Eye className="w-3 h-3" /> Track Details
                        </Button>
                      </Card>
                    ))}

                    {stageApplicants.length === 0 && (
                      <div className="text-center py-12 text-[10px] text-slate-400 italic">No candidates in this stage</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View Container */
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50/50 flex flex-col justify-between min-h-0">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-1 mb-4 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                    <th className="p-3.5 pl-6">Candidate</th>
                    <th className="p-3.5">Positions</th>
                    <th className="p-3.5">Nationality</th>
                    <th className="p-3.5">Visa Category</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Pipeline Stage</th>
                    <th className="p-3.5">Client Company</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {paginatedList.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 rounded-lg border border-slate-100 shadow-sm flex-shrink-0">
                            {app.photo ? (
                              <AvatarImage src={app.photo} className="object-cover rounded-lg" />
                            ) : (
                              <AvatarFallback className="rounded-lg bg-blue-50 text-[9px] font-black text-blue-700">
                                {app.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/applicants/${app.id}`} className="font-bold text-slate-900 hover:text-blue-600 truncate block max-w-[150px]">
                              {app.fullName}
                            </Link>
                            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{app.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[10px] text-slate-600 truncate max-w-[130px] block">
                          {app.applyingPositions ? app.applyingPositions.join(", ") : "N/A"}
                        </span>
                      </td>
                      <td className="p-3.5">{app.nationality}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-600 rounded px-2 py-0.5 text-[10px]">{app.visaType}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-500">{app.branch}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${getColColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800">{app.clientName || "-"}</span>
                      </td>
                      <td className="p-3.5 pr-6 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedApp(app)}
                            className="text-[10px] font-bold h-7 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-blue-600 gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> Track Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-xs text-slate-400 italic">
                        No candidates matching active filters found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 p-4 bg-slate-50/50 flex-shrink-0">
                <span className="text-xs text-slate-500 font-semibold">
                  Showing <strong className="text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredList.length)}</strong> of <strong className="text-slate-800">{filteredList.length}</strong> candidates
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="rounded-lg text-xs h-8 border-slate-200"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(p)}
                      className={`rounded-lg text-xs w-8 h-8 font-bold ${
                        currentPage === p 
                          ? "bg-blue-600 hover:bg-blue-700 text-white" 
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="rounded-lg text-xs h-8 border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Linked Info Tracking Dialog (Applicant Tracker Core Feature) */}
      <Dialog open={!!selectedApp} onOpenChange={open => !open && setSelectedApp(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Application Progress Tracker</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Live updates, visa expiration metrics, agreements, and support details for <span className="font-bold text-slate-700">{selectedApp?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-5 pt-3">
              {/* Snapshot Details Block */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-4">
                <Avatar className="w-16 h-16 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                  {selectedApp.photo ? (
                    <AvatarImage src={selectedApp.photo} className="object-cover rounded-xl" />
                  ) : (
                    <AvatarFallback className="rounded-xl bg-purple-100 text-sm font-black text-purple-700">
                      {selectedApp.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-800 truncate">{selectedApp.fullName}</h3>
                  <div className="text-[10px] font-semibold text-slate-400 font-mono mt-0.5">
                    ID: {selectedApp.id} · Tracking: {selectedApp.trackingCode || "N/A"}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 flex flex-wrap gap-1.5 items-center mt-1.5">
                    <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedApp.nationality}</span>
                    <span className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedApp.applyingPositions ? selectedApp.applyingPositions.join(", ") : "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Detail fields snapshot */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Passport Number</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.passportNumber || "N/A"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Mobile Number</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.mobile || "N/A"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Email Address</span>
                  <strong className="text-slate-800 font-bold text-[10px] truncate block">{selectedApp.email || "N/A"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Passport Expiry</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.passportExpiry ? formatDate(selectedApp.passportExpiry) : "N/A"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Internal Company</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.company || "N/A"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Branch</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.branch || "N/A"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Client Company</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.clientName || "Pending Placement"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Consultant</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.createdBy || "System"}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Registration Date</span>
                  <strong className="text-slate-800 font-bold text-[10px]">{selectedApp.createdAt ? formatDate(selectedApp.createdAt.slice(0, 10)) : formatDate(selectedApp.applicationDate)}</strong>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">Last Activity</span>
                  <strong className="text-slate-800 font-bold text-[10px] truncate block">
                    {selectedApp.statusHistory && (selectedApp.statusHistory as any[])[0] 
                      ? `${(selectedApp.statusHistory as any[])[0].newStatus} (${(selectedApp.statusHistory as any[])[0].date.slice(0, 10)})` 
                      : "Registered"}
                  </strong>
                </div>
              </div>

              {/* Status Change Dropdown Selector (Especially useful for Mobile/Tablet) */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Change Pipeline Stage / Status
                </Label>
                <div className="flex gap-2">
                  <select
                    value={selectedApp.status}
                    onChange={(e) => initiateStatusChange(selectedApp, e.target.value as Applicant["status"])}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 focus:bg-white font-medium outline-none text-slate-700"
                  >
                    {STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                  <Link href={`/applicants/${selectedApp.id}`}>
                    <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-bold h-9 border-slate-200 px-3">
                      Full Profile
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Chronological Tracking History Timeline */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <CalendarRange className="w-4 h-4 text-purple-600" /> Tracking History Timeline
                </h4>
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-4 pt-1 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {getChronologicalTimeline().map((evt: any, i: number) => (
                    <div key={i} className="relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute -left-[31px] top-1 w-3 h-3 rounded-full border-2 bg-white",
                        evt.type === "Registration" ? "border-indigo-500" :
                        evt.type === "StatusChange" ? "border-purple-500" :
                        evt.type === "Interview" ? "border-blue-500" :
                        evt.type === "Visa" ? "border-amber-500" :
                        evt.type === "Placement" ? "border-emerald-500" : "border-slate-400"
                      )} />
                      
                      <div className="text-[10px] text-slate-400 font-bold font-mono">{formatDate(evt.date.slice(0, 10))} {evt.date.length > 10 ? `· ${evt.date.slice(11, 16)}` : ""}</div>
                      <div className="text-[11px] font-extrabold text-slate-800 mt-0.5">{evt.title}</div>
                      <div className="text-[10px] font-semibold text-slate-500 leading-normal mt-0.5">{evt.desc}</div>
                      {evt.notes && (
                        <div className="text-[9px] bg-slate-50 border border-slate-100 rounded-lg p-1.5 mt-1 font-medium text-slate-600 leading-relaxed italic">
                          {evt.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  {getChronologicalTimeline().length === 0 && (
                    <p className="text-[10px] text-slate-400 italic">No tracking events logged yet.</p>
                  )}
                </div>
              </div>

              {/* Visa Expiry Countdown Widget (Required Section 15 Tracker) */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <CalendarRange className="w-4 h-4 text-blue-500" /> Visa Status & Remaining Date
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Visa Category</span>
                    <strong className="text-slate-800 font-bold text-xs">{selectedApp.visaType} Visa</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Visa Expiry Date</span>
                    <strong className="text-slate-800 font-bold text-xs">{selectedApp.visaExpiry ? formatDate(selectedApp.visaExpiry) : "Not Provided"}</strong>
                  </div>
                </div>

                {selectedApp.visaExpiry ? (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-semibold ${selectedVisaDays !== null && selectedVisaDays <= 20
                      ? "bg-rose-50 border-rose-100 text-rose-800"
                      : "bg-emerald-50 border-emerald-100 text-emerald-800"
                    }`}>
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${selectedVisaDays !== null && selectedVisaDays <= 20 ? "text-rose-500" : "text-emerald-500"}`} />
                    <div>
                      {selectedVisaDays !== null && selectedVisaDays < 0 ? (
                        <span>Visa expired <strong className="text-rose-600">{Math.abs(selectedVisaDays)} days ago</strong>. Urgent renewal required!</span>
                      ) : selectedVisaDays !== null && selectedVisaDays <= 20 ? (
                        <span>Visa is expiring in <strong className="text-rose-600">{selectedVisaDays} days</strong>. Coordinate documentation renewal.</span>
                      ) : (
                        <span>Visa is active with <strong className="text-emerald-600">{selectedVisaDays} days remaining</strong>. No immediate action needed.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">No visa expiry details logged to track remaining days.</p>
                )}
              </div>

              {/* Download Visa & Other Documents Area (Required Section 15 Documents Tracking) */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Download className="w-4 h-4 text-blue-500" /> Download Verification Documents
                </h4>

                {/* Visa Copy Download Slot */}
                {(() => {
                  const visaDoc = getVisaDocument(selectedApp);
                  return (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">Visa Copy Document</div>
                          <div className="text-[9px] text-slate-400 truncate">{visaDoc ? visaDoc.name : "Missing / Not Uploaded yet"}</div>
                        </div>
                      </div>
                      {visaDoc ? (
                        <Button
                          onClick={() => handleDownloadDoc(visaDoc)}
                          size="sm"
                          variant="ghost"
                          className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </Button>
                      ) : (
                        <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-400 px-2 py-0.5 rounded-md font-semibold select-none">Unavailable</span>
                      )}
                    </div>
                  );
                })()}

                {/* Other Documents List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Other Documents</span>
                  {selectedApp.documents && selectedApp.documents.filter(d => !d.name.toLowerCase().includes("visa")).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedApp.documents
                        .filter(d => !d.name.toLowerCase().includes("visa"))
                        .map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white">
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[130px]" title={doc.name}>{doc.name}</span>
                            <button
                              onClick={() => handleDownloadDoc(doc)}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded transition-colors"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No additional documents uploaded to download.</p>
                  )}
                </div>
              </div>

              {/* Placement Details updates */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Placement & Agreement Updates
                </h4>
                {selectedAppPlacement ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs font-semibold text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400">Hired Company:</span>
                      <p className="text-slate-800 font-bold mt-0.5">{selectedAppPlacement.companyName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Monthly Compensation:</span>
                      <p className="text-slate-800 font-bold mt-0.5">AED {selectedAppPlacement.salary?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Placement Date:</span>
                      <p className="text-slate-800 font-bold mt-0.5">{selectedAppPlacement.placementDate}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Contracts Agreement:</span>
                      <p className="mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedAppPlacement.agreementStatus === "Signed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-blue-50 text-blue-700"
                          }`}>
                          {selectedAppPlacement.agreementStatus}
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-2.5">No active placements registered for this applicant.</p>
                )}
              </div>

              {/* Interview updates */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-4 h-4 text-blue-500" /> Scheduled Interviews & Meetings
                </h4>
                {selectedAppInterviews.length > 0 ? (
                  <div className="space-y-2 pt-2.5">
                    {selectedAppInterviews.map(int => (
                      <div key={int.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-bold text-slate-800">{int.type}: {int.position || "Staffing Assessment"}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{int.dateTime}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${int.status === "Scheduled" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}>
                            {int.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">Mode: <strong className="text-slate-600">{int.mode}</strong></span>
                          {int.meetingLink && (
                            <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Join Meeting</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic pt-2.5">No upcoming interviews or meetings scheduled.</p>
                )}
              </div>

              {/* Support contact info */}
              <div className="border-t border-slate-100 pt-4">
                <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-blue-400">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase text-slate-400">Visa & Placement Support</div>
                      <div className="text-xs font-bold">Have questions regarding your application?</div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1 text-xs text-slate-300 font-semibold">
                    <a href="tel:+971501234567" className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors">
                      <PhoneCall className="w-3.5 h-3.5 text-blue-400" /> +971 50 123 4567
                    </a>
                    <a href="mailto:support@msmanagement.com" className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors">
                      <Mail className="w-3.5 h-3.5 text-blue-400" /> support@msmanagement.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-50 flex gap-2">
            <Button onClick={() => setSelectedApp(null)} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs px-5 h-9 font-bold ml-auto shadow-sm">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog for Kanban Drag & Drop Status Transition */}
      <Dialog open={isStatusDialogOpen} onOpenChange={open => !open && setIsStatusDialogOpen(false)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">
                Enforce Transition to {targetStatus}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Please complete the required validations to transition {draggedApplicant?.fullName} to {targetStatus}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 text-xs">
              {/* Conditional Processing: Interview / Processing Date */}
              {targetStatus === "Processing" && (
                <div className="space-y-1">
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

              {/* Conditional Placed: Company and Placement Date */}
              {targetStatus === "Placed" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Placed Company <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400"
                      value={placedCompany}
                      onChange={(e) => setPlacedCompany(e.target.value)}
                    >
                      <option value="">Select Company</option>
                      {companies.map((c: { id: string; name: string }) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Placement Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={placedDate}
                      onChange={(e) => setPlacedDate(e.target.value)}
                      className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                    />
                  </div>
                </div>
              )}

              {/* Conditional Rejected / Returned: Reason text */}
              {(targetStatus === "Rejected" || targetStatus === "Returned") && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Reason Validation <span className="text-rose-500">*</span>
                  </Label>
                  <textarea
                    rows={3}
                    placeholder={`Enter reason for moving candidate to ${targetStatus}...`}
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
                onClick={() => {
                  setIsStatusDialogOpen(false);
                  setDraggedApplicant(null);
                  setTargetStatus(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 shadow-lg shadow-blue-500/10"
              >
                Confirm Move
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
