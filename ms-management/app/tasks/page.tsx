"use client";

import { useState } from "react";
import { Plus, CheckSquare, Clock, CheckCircle2, XCircle, RefreshCw, Trash2, Filter, ArrowRightLeft, History, AlertTriangle, Send, UploadCloud, Paperclip, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, exportToCSV, cn } from "@/lib/utils";
import AccessDenied from "@/components/shared/AccessDenied";
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
import { Task } from "@/lib/types";
import { toast } from "sonner";

const KANBAN_COLS = [
  { key: "Pending", label: "Pending", icon: Clock, color: "border-t-amber-400 bg-amber-50/30" },
  { key: "Processing", label: "In Progress", icon: RefreshCw, color: "border-t-blue-400 bg-blue-50/30" },
  { key: "Reassigned", label: "Reassigned", icon: ArrowRightLeft, color: "border-t-indigo-400 bg-indigo-50/30" },
  { key: "Incomplete", label: "Incomplete", icon: XCircle, color: "border-t-rose-400 bg-rose-50/30" },
];

const isOverdue = (task: Task) => {
  if (task.status === "Completed" || !task.deadline) return false;
  // Normalize: replace space separator, add :00 seconds if missing (Safari compatibility)
  let deadlineStr = task.deadline.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadlineStr)) deadlineStr += ":00";
  const deadlineTime = new Date(deadlineStr).getTime();
  return deadlineTime < Date.now();
};

export default function TasksPage() {
  const { currentRole, currentUser, tasks, staff, companies, ownCompanies, branches, applicants, addTask, updateTask, deleteTask, hasPermission, addActivityLog } = useAuthStore();
  const { filters } = useFilterStore();

  const canViewTasks = hasPermission("tasks", "view");
  const canCreateTasks = hasPermission("tasks", "create") || hasPermission("tasks", "assign");
  const canDeleteTasks = hasPermission("tasks", "delete");
  const canEditTasks = hasPermission("tasks", "edit");

  const isAdmin = currentRole === "Super Admin" || 
                  currentRole === "Company Admin" || 
                  currentRole === "Branch Admin" || 
                  currentRole === "HR Manager" || 
                  currentRole === "Admin" || 
                  currentRole === "HR";

  // System-wide users (Super Admin or company = "System") can see and manage all
  const isSystemWide = currentRole === "Super Admin" || currentUser.company === "System";

  const [modal, setModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [uploadedProofFiles, setUploadedProofFiles] = useState<File[]>([]);
  const [completionComments, setCompletionComments] = useState("");
  // For system-wide users creating tasks, allow selecting target company/branch
  const [formCompany, setFormCompany] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [form, setForm] = useState({ 
    title: "", 
    description: "", 
    priority: "Medium" as Task["priority"], 
    assignedTo: null as string | null, 
    assignedDate: "", 
    deadline: "",
    applicantId: null as string | null,
    applicantName: null as string | null,
    targetDocument: null as string | null,
    notes: "",
    attachmentName: ""
  });

  const [taskTab, setTaskTab] = useState<"active" | "history">("active");
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);

  // Status logic state
  const [incompleteModalOpen, setIncompleteModalOpen] = useState(false);
  const [incompleteTask, setIncompleteTask] = useState<Task | null>(null);
  const [incompleteReasonInput, setIncompleteReasonInput] = useState("");

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [reassignTask, setReassignTask] = useState<Task | null>(null);
  const [reassignStaffName, setReassignStaffName] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  const f = filters.tasks || { page: 1, pageSize: 20 };
  let list = tasks;

  if (!canViewTasks) {
    return <AccessDenied />;
  }

  // Role scope filter
  if (!isSystemWide) {
    if (isAdmin) {
      list = list.filter(t => t.company === currentUser.company);
      if (currentRole !== "Company Admin" && currentUser.branch && currentUser.branch !== "All") {
        list = list.filter(t => t.branch === currentUser.branch);
      }
    } else {
      // Staff can see only tasks assigned to or created by them
      list = list.filter(t => 
        t.assignedToId === currentUser.id || 
        t.assignedTo.toLowerCase() === currentUser.name.toLowerCase() ||
        t.createdBy === currentUser.name
      );
    }
  }

  // Stats calculation scoped per user visibility (always from full scoped list, before tab/search filter)
  const stats = {
    total: list.length,
    pending: list.filter(t => t.status === "Pending").length,
    processing: list.filter(t => t.status === "Processing").length,
    incomplete: list.filter(t => t.status === "Incomplete").length,
    completed: list.filter(t => t.status === "Completed").length,
    overdue: list.filter(t => isOverdue(t)).length
  };

  const statsItems = isAdmin ? [
    { label: "Total Tasks", value: stats.total, color: "text-blue-600 bg-blue-50 border-blue-100", tab: "active" as const },
    { label: "Pending", value: stats.pending, color: "text-amber-600 bg-amber-50 border-amber-100", tab: "active" as const },
    { label: "In Progress", value: stats.processing, color: "text-sky-600 bg-sky-50 border-sky-100", tab: "active" as const },
    { label: "Overdue", value: stats.overdue, color: "text-rose-600 bg-rose-50 border-rose-100 font-extrabold", tab: "active" as const },
    { label: "Incomplete", value: stats.incomplete, color: "text-rose-600 bg-rose-50 border-rose-100", tab: "active" as const },
    { label: "Completed", value: stats.completed, color: "text-emerald-700 bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300", tab: "history" as const },
  ] : [
    { label: "My Total Tasks", value: stats.total, color: "text-blue-600 bg-blue-50 border-blue-100", tab: "active" as const },
    { label: "My Open Tasks", value: stats.pending + stats.processing + stats.incomplete, color: "text-amber-600 bg-amber-50 border-amber-100", tab: "active" as const },
    { label: "My Overdue Tasks", value: stats.overdue, color: "text-rose-600 bg-rose-50 border-rose-100 font-extrabold", tab: "active" as const },
    { label: "My Completed", value: stats.completed, color: "text-emerald-700 bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300", tab: "history" as const },
  ];


  if (showOnlyMyTasks) {
    list = list.filter(t => t.assignedTo === currentUser.name);
  }

  // Search text filter
  if (f.search) {
    const q = f.search.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q));
  }

  // Status filter (or tab filter)
  if (f.status && f.status !== "all") {
    list = list.filter(t => t.status === f.status);
  } else {
    if (taskTab === "active") {
      list = list.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
    } else {
      list = list.filter(t => t.status === "Completed" || t.status === "Cancelled");
    }
  }

  // Company / Assigned Person filters
  if (f.company && f.company !== "all") list = list.filter(t => t.company === f.company);
  if (f.assignedTo && f.assignedTo !== "all") list = list.filter(t => t.assignedTo === f.assignedTo || t.assignedToId === f.assignedTo);

  // Unique list of all companies for task targeting (both internal ownCompanies and client companies)
  const allCompaniesForTasks = Array.from(
    new Map(
      [...(ownCompanies || []), ...(companies || [])].map(c => [c.name, c])
    ).values()
  );

  const targetCompanyToUse = formCompany || (isSystemWide ? "" : currentUser.company);

  // Available branches for current target company selection
  const allowedBranchesForTasks = (branches || []).filter(b => 
    !targetCompanyToUse || b.company === targetCompanyToUse
  );

  // Staff available for task assignment
  const allowedStaffForTasks = (staff || []).filter(s => {
    // If target company is selected/set, match company
    if (targetCompanyToUse && s.company !== targetCompanyToUse) return false;
    // If target branch is selected/set, match branch
    if (formBranch && formBranch !== "All" && s.branch && s.branch !== formBranch) return false;
    return true;
  });

  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 20;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const formatForInputDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    const clean = dateStr.replace(" ", "T");
    if (clean.includes("T")) {
      if (clean.length === 10) return `${clean}T09:00`;
      return clean.slice(0, 16);
    }
    return `${clean}T09:00`;
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return "-";
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    } catch (e) {
      return dtStr;
    }
  };

  const handleOpenTaskModal = (task?: Task | null) => {
    if (task) {
      setEditTask(task);
      setFormCompany(task.company || currentUser.company || "");
      setFormBranch(task.branch || "");
      setForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignedTo: task.assignedTo,
        assignedDate: formatForInputDateTime(task.assignedDate),
        deadline: formatForInputDateTime(task.deadline),
        applicantId: task.applicantId || null,
        applicantName: task.applicantName || null,
        targetDocument: task.targetDocument || null,
        notes: task.notes || "",
        attachmentName: task.attachmentName || ""
      });
    } else {
      setEditTask(null);
      setFormCompany(currentUser.company !== "System" ? currentUser.company : (ownCompanies[0]?.name || ""));
      setFormBranch(currentUser.branch !== "All" ? (currentUser.branch || "") : "");
      setForm({
        title: "",
        description: "",
        priority: "Medium",
        assignedTo: null,
        assignedDate: formatForInputDateTime(new Date().toISOString()),
        deadline: "",
        applicantId: null,
        applicantName: null,
        targetDocument: null,
        notes: "",
        attachmentName: ""
      });
    }
    setModal(true);
  };

  const sendMockEmail = (assigneeName: string, taskTitle: string) => {
    toast.success(`Email notification dispatched to ${assigneeName}`, { icon: <Send className="w-4 h-4" /> });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Email Sent", module: "Tasks", oldValue: null, newValue: `Email assigned task notification to ${assigneeName}: ${taskTitle}`, ipAddress: "192.168.1.102" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.assignedTo || !form.deadline || !form.assignedDate) { toast.error("Title, assignee, assign date, and deadline are required"); return; }
    
    // Client-side validations — normalize to full ISO for Safari/mobile compatibility
    const normalizeDateTime = (dt: string) => {
      if (!dt) return "";
      // Replace space with T, pad to full ISO format (add :00 seconds if missing)
      const clean = dt.replace(" ", "T");
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) return `${clean}:00`;
      return clean;
    };
    if (new Date(normalizeDateTime(form.deadline)) <= new Date(normalizeDateTime(form.assignedDate))) {
      toast.error("Deadline must be after the Assign Date");
      return;
    }
    if (!editTask && new Date(normalizeDateTime(form.deadline)) < new Date()) {
      toast.error("Deadline cannot be in the past for new tasks");
      return;
    }

    if (editTask && !canEditTasks) {
      toast.error("You do not have permission to edit this task");
      return;
    }
    if (!editTask && !canCreateTasks) {
      toast.error("You do not have permission to assign tasks");
      return;
    }

    // Determine company/branch for the task
    const taskCompany = isSystemWide
      ? (formCompany || (companies && companies[0]?.name) || "General")
      : currentUser.company;
    const taskBranch = isSystemWide
      ? (formBranch || "Main Branch")
      : (currentUser.branch === "All" ? "Main Branch" : currentUser.branch);

    const assignedStaff = staff.find(s => s.name === form.assignedTo);
    const formattedDeadline = form.deadline.replace("T", " ");
    const formattedAssignedDate = form.assignedDate.replace("T", " ");
    const now = new Date().toISOString().replace("T"," ").slice(0,19);

    if (editTask) {
      if (editTask.status === "Completed" && uploadedProofFiles.length === 0) {
        toast.error("Proof of completion is required to mark this task as Completed.");
        return;
      }

      const history = editTask.history || [];
      if (editTask.assignedTo !== form.assignedTo) {
         history.push({ action: "Reassigned", date: now, by: currentUser.name, note: `Reassigned from ${editTask.assignedTo} to ${form.assignedTo}` });
         sendMockEmail(form.assignedTo, form.title);
      }
      
      let updatedTask = { 
        ...editTask, 
        ...form, 
        assignedTo: form.assignedTo || "", 
        assignedDate: formattedAssignedDate, 
        deadline: formattedDeadline, 
        assignedToId: assignedStaff?.id || "", 
        applicantId: form.applicantId || undefined, 
        applicantName: form.applicantName || undefined, 
        targetDocument: form.targetDocument || undefined, 
        history 
      };

      let currentFeedback = editTask.feedback ? JSON.parse(editTask.feedback) : { comments: "", proofs: [] };
      
      if (uploadedProofFiles.length > 0) {
         const proofNames = uploadedProofFiles.map(f => f.name).join(", ");
         const proofData = uploadedProofFiles.map(f => ({ name: f.name, url: `/uploads/${f.name}`, date: now, by: currentUser.name }));
         currentFeedback.proofs = [...(currentFeedback.proofs || []), ...proofData];
         updatedTask.history.push({ action: "Attached Files", date: now, by: currentUser.name, note: `Uploaded Documents: ${proofNames}` });
      }
      
      if (editTask.status === "Completed") {
         if (completionComments) {
           currentFeedback.comments = completionComments;
           updatedTask.history.push({ action: "Status: Completed", date: now, by: currentUser.name, note: `Comments: ${completionComments}` });
         } else if (editTask.status !== "Completed") {
           updatedTask.history.push({ action: "Status: Completed", date: now, by: currentUser.name });
         }
         (updatedTask as any).completedAt = now;
      }
      
      (updatedTask as any).feedback = JSON.stringify(currentFeedback);

      updateTask(updatedTask);
      toast.success("Task updated");
    } else {
      const id = `TSK-${Math.floor(100+Math.random()*900)}`;
      const history = [{ action: "Created", date: now, by: currentUser.name, note: `Assigned to ${form.assignedTo}` }];      let newFeedback = { comments: "", proofs: [] as any[] };
      if (uploadedProofFiles.length > 0) {
         const proofNames = uploadedProofFiles.map(f => f.name).join(", ");
         const proofData = uploadedProofFiles.map(f => ({ name: f.name, url: `/uploads/${f.name}`, date: now, by: currentUser.name }));
         newFeedback.proofs = proofData;
         history.push({ action: "Attached Files", date: now, by: currentUser.name, note: `Uploaded Documents: ${proofNames}` });
      }

      addTask({ 
        ...form, 
        assignedTo: form.assignedTo ?? "",
        id, 
        deadline: formattedDeadline,
        assignedDate: formattedAssignedDate,
        assignedToId: assignedStaff?.id || "",
        assignedToRole: assignedStaff?.role || null,
        applicantId: form.applicantId || undefined,
        applicantName: form.applicantName || undefined,
        targetDocument: form.targetDocument || undefined,
        status: "Pending", 
        history,
        company: taskCompany, 
        branch: taskBranch, 
        createdBy: currentUser.name, 
        createdAt: now,
        feedback: JSON.stringify(newFeedback)
      });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: now, userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Tasks", oldValue: null, newValue: `Created task: ${form.title} for ${taskCompany}`, ipAddress: "192.168.1.102" });
      toast.success(`Task "${form.title}" created`);
      sendMockEmail(form.assignedTo, form.title);
    }
    setModal(false); setEditTask(null);
      setFormCompany(""); setFormBranch("");
      setUploadedProofFiles([]);
      setCompletionComments("");
      setForm({ title:"", description:"", priority:"Medium", assignedTo:null, assignedDate:"", deadline:"", applicantId: null, applicantName: null, targetDocument: null, notes: "", attachmentName: "" });
    };

  const handleStatusChange = (task: Task, status: Task["status"], fromModal = false) => {
    if (!canEditTasks && currentUser.name !== task.assignedTo) {
      toast.error("You do not have permission to update this task status");
      return;
    }

    if (status === "Incomplete") {
      setIncompleteTask(task);
      setIncompleteReasonInput(task.incompleteReason || "");
      setIncompleteModalOpen(true);
      if (fromModal) { setModal(false); setEditTask(null); }
    } else if (status === "Reassigned") {
      setReassignTask(task);
      setReassignStaffName(task.assignedTo);
      setReassignModalOpen(true);
      if (fromModal) { setModal(false); setEditTask(null); }
    } else {
      const now = new Date().toISOString().replace("T"," ").slice(0,19);
      const history = [...(task.history || []), { action: `Status: ${status}`, date: now, by: currentUser.name }];
      const updatedTask = { 
        ...task, 
        status, 
        history,
        completedAt: status === "Completed" ? now : (task as any).completedAt
      };
      updateTask(updatedTask);
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: now, userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Tasks", oldValue: task.status, newValue: status, ipAddress: "192.168.1.102" });
      toast.success(status === "Completed" ? `✅ Task marked as Completed!` : `Task status → ${status}`);
      // Close modal if status changed from inside the edit modal
      if (fromModal) {
        setModal(false);
        setEditTask(null);
        setForm({ title:"", description:"", priority:"Medium", assignedTo:null, assignedDate:"", deadline:"", applicantId: null, applicantName: null, targetDocument: null, notes: "", attachmentName: "" });
      }
    }
  };

  const handleIncompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incompleteReasonInput.trim()) { toast.error("Please enter a reason"); return; }
    if (incompleteTask) {
      const now = new Date().toISOString().replace("T"," ").slice(0,19);
      const history = [...(incompleteTask.history || []), { action: "Status: Incomplete", date: now, by: currentUser.name, note: incompleteReasonInput }];
      updateTask({ ...incompleteTask, status: "Incomplete", incompleteReason: incompleteReasonInput, history });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: now, userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Tasks", oldValue: incompleteTask.status, newValue: "Incomplete", ipAddress: "192.168.1.102" });
      toast.success("Task marked incomplete");
      setIncompleteModalOpen(false); setIncompleteTask(null); setIncompleteReasonInput("");
    }
  };

  const handleReassignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignStaffName) { toast.error("Please select an employee"); return; }
    if (reassignTask) {
      const assignedStaff = staff.find(s => s.name === reassignStaffName);
      const now = new Date().toISOString().replace("T"," ").slice(0,19);
      const history = [...(reassignTask.history || []), { action: "Reassigned", date: now, by: currentUser.name, note: `From ${reassignTask.assignedTo} to ${reassignStaffName}` }];
      updateTask({ ...reassignTask, status: "Reassigned", assignedTo: reassignStaffName, assignedToId: assignedStaff?.id || "", history });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: now, userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Tasks", oldValue: reassignTask.status, newValue: `Reassigned task to ${reassignStaffName}`, ipAddress: "192.168.1.102" });
      toast.success(`Task reassigned to ${reassignStaffName}`);
      sendMockEmail(reassignStaffName, reassignTask.title);
      setReassignModalOpen(false); setReassignTask(null); setReassignStaffName("");
    }
  };

  const priorityColor = (p: string) => p === "High" ? "text-rose-600 bg-rose-50 border-rose-100" : p === "Medium" ? "text-amber-600 bg-amber-50 border-amber-100" : "text-slate-500 bg-slate-50 border-slate-200";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title={isAdmin ? "Task Management Dashboard" : "My Work Dashboard"} 
        subtitle={isAdmin ? "Assign, track, and manage company-wide operational tasks" : "Review and update tasks assigned to you"}
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                variant={showOnlyMyTasks ? "default" : "outline"}
                onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
                className={`rounded-xl text-xs h-9 px-4 font-bold ${showOnlyMyTasks ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" : "text-indigo-600 border-indigo-200 hover:bg-indigo-50"}`}
              >
                My Tasks
              </Button>
            )}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              {(["kanban","table"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === v ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}>{v === "kanban" ? "Board" : "List"}</button>
              ))}
            </div>
            {canCreateTasks && (
              <Button onClick={() => handleOpenTaskModal()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-md shadow-blue-600/10"><Plus className="w-4 h-4"/>New Task</Button>
            )}
          </div>
        }
      />

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-6 mt-4 select-none">
        {statsItems.map((item, idx) => (
          <Card
            key={idx}
            onClick={() => setTaskTab(item.tab)}
            className={cn("p-4 rounded-2xl border flex flex-col items-center justify-center text-center shadow-xs cursor-pointer hover:scale-[1.03] transition-transform duration-150", item.color, taskTab === item.tab && item.tab === "history" ? "ring-2 ring-emerald-400" : "")}
          >
            <div className="text-2xl font-black mb-0.5">{item.value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-85">{item.label}</div>
            {item.tab === "history" && <div className="text-[8px] opacity-50 mt-0.5">↗ View</div>}
          </Card>
        ))}
      </div>


      <div className="px-4 md:px-6 mt-3 flex border-b border-slate-100">
        <button onClick={() => setTaskTab("active")} className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 ${taskTab === "active" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>Active Board</button>
        <button onClick={() => setTaskTab("history")} className={`pb-2 px-4 text-xs font-bold transition-all border-b-2 ${taskTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>Archive (Completed/Cancelled)</button>
      </div>

      <FilterBar moduleKey="tasks" statusOptions={["Pending","Processing","Completed","Incomplete","Reassigned","Cancelled"]} showAssignee onExport={() => { exportToCSV(list.map(t=>({ID:t.id,Title:t.title,Assignee:t.assignedTo,Priority:t.priority,Deadline:t.deadline,Status:t.status})),"tasks"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-x-auto overflow-y-auto min-h-0 pb-28 md:pb-6">
        {taskTab === "history" ? (
          /* ── Completed Tasks View ── */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-300"/>
                <div className="text-sm font-bold text-slate-400">No archived tasks yet</div>
                <div className="text-[11px] text-slate-300">Tasks marked as Completed or Cancelled will appear here</div>
              </div>
            ) : (
              <>
                {/* Mobile View for History */}
                <div className="space-y-3 p-4 md:hidden">
                  {paginated.map(t => (
                    <Card key={t.id} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-800 text-xs flex gap-1.5 items-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"/>
                            {t.title}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">{t.id} • <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${priorityColor(t.priority)}`}>{t.priority}</span></div>
                        </div>
                        <StatusBadge status={t.status}/>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div><strong>Assignee:</strong> {t.assignedTo}</div>
                        <div><strong>Assigned Date:</strong> {formatDateTime(t.assignedDate)}</div>
                        <div><strong>Due Date:</strong> {formatDateTime(t.deadline)}</div>
                        {t.applicantName && <div className="text-blue-600 font-bold mt-1">👤 Candidate: {t.applicantName}</div>}
                      </div>
                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                        <Button variant="ghost" size="icon" onClick={() => { setHistoryTask(t); setHistoryModalOpen(true); }} className="w-7 h-7 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="History"><History className="w-4 h-4"/></Button>
                        {canDeleteTasks && <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop View for History */}
                <div className="hidden md:block">
                  <table className="w-full text-xs">
                    <thead className="bg-emerald-50/60 border-b border-emerald-100">
                      <tr className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Task</th>
                        <th className="text-left px-4 py-3">Assignee</th>
                        <th className="text-left px-4 py-3">Dates</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(t => (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-emerald-50/20 font-semibold text-slate-600">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 flex gap-2 items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"/>
                              {t.title}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 pl-5">{t.id} • <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded uppercase ${priorityColor(t.priority)}`}>{t.priority}</span></div>
                            {t.applicantName && <div className="text-[9px] text-blue-600 font-bold mt-1 pl-5">👤 {t.applicantName}</div>}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{t.assignedTo}</td>
                          <td className="px-4 py-3 text-[10px]">
                            <div className="text-slate-400">Assigned: {formatDateTime(t.assignedDate)}</div>
                            <div className="font-bold mt-0.5 text-slate-700">Due: {formatDateTime(t.deadline)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={t.status}/>
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => { setHistoryTask(t); setHistoryModalOpen(true); }} className="w-7 h-7 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="History"><History className="w-4 h-4"/></Button>
                            {canDeleteTasks && <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : view === "kanban" ? (
          <div className="flex gap-4 min-w-max">
            {KANBAN_COLS.map(col => {
              const Icon = col.icon;
              const colTasks = list.filter(t => t.status === col.key);
              return (
                <div key={col.key} className="w-72 flex-shrink-0">
                  <div className={`rounded-2xl border-t-4 bg-white border border-slate-100 shadow-sm p-4 ${col.color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-500"/>
                        <span className="text-xs font-bold text-slate-800">{col.label}</span>
                      </div>
                      <span className="text-[10px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-0.5">
                      {colTasks.length === 0 ? (
                        <div className="text-center py-6 text-[10px] text-slate-400 font-semibold">No tasks here</div>
                      ) : colTasks.map(t => {
                        const overdue = isOverdue(t);
                        return (
                          <Card key={t.id} className={`rounded-xl p-3.5 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer ${overdue ? "border border-rose-300 shadow-rose-500/10" : "border-slate-100"}`} onClick={() => handleOpenTaskModal(t)}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex gap-1 flex-wrap">
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${priorityColor(t.priority)}`}>{t.priority}</span>
                                {overdue && <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase text-rose-600 bg-rose-50 border-rose-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Overdue</span>}
                              </div>
                              <div className="flex gap-1 items-center">
                                <button onClick={e => { e.stopPropagation(); setHistoryTask(t); setHistoryModalOpen(true); }} className="text-slate-400 hover:text-indigo-500 transition-colors" title="View History"><History className="w-3.5 h-3.5"/></button>
                                {canDeleteTasks && <button onClick={e => { e.stopPropagation(); setDeleteId(t.id); }} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>}
                              </div>
                            </div>
                            <div className="text-xs font-bold text-slate-800 leading-tight mb-1">{t.title}</div>
                            <div className="text-[10px] text-slate-500 mb-2 line-clamp-2">{t.description}</div>
                            {t.incompleteReason && <div className="text-[9px] text-rose-600 font-bold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mb-2 leading-tight">Reason: {t.incompleteReason}</div>}
                            {t.applicantName && (
                              <div className="text-[9px] text-blue-700 font-bold bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mb-2 leading-tight flex flex-col gap-1 select-none">
                                <div className="flex items-center gap-1">👤 Candidate: {t.applicantName}</div>
                                {t.targetDocument && (
                                  <div className="text-[9px] text-indigo-700 font-extrabold bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5 mt-1 flex items-center gap-1 select-none w-fit">
                                    📄 Verify: {t.targetDocument}
                                  </div>
                                )}
                              </div>
                            )}
                            {t.attachmentName && (
                              <div className="text-[9px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mb-2 leading-tight flex items-center gap-1 w-fit select-none">
                                📎 {t.attachmentName}
                              </div>
                            )}
                            {t.notes && (
                              <div className="text-[9px] text-slate-500 italic bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 mb-2 leading-tight">
                                📝 {t.notes}
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 border-t border-slate-50 pt-2">
                              <span>→ {t.assignedTo}</span>
                              <span className={`text-[9px] ${overdue ? "text-rose-600" : ""}`}>📅 {formatDateTime(t.deadline)}</span>
                            </div>
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {(["Pending","Processing","Completed","Incomplete","Reassigned","Cancelled"] as Task["status"][]).filter(s => s !== t.status).map(s => (
                                <button key={s} onClick={e => { e.stopPropagation(); handleStatusChange(t, s); }} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">→{s}</button>
                              ))}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {list.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <EmptyState title="No tasks found" />
              </div>
            ) : (
              <>
                {/* Mobile Portrait View */}
                <div className="space-y-3 p-4 md:hidden">
                  {paginated.map(t => {
                    const overdue = isOverdue(t);
                    return (
                      <Card key={t.id} className={`rounded-2xl p-4 bg-white shadow-sm flex flex-col gap-3 ${overdue ? "border border-rose-300" : "border-slate-100"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800 text-xs flex gap-1.5 items-center flex-wrap">
                              {t.title}
                              {overdue && <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase text-rose-600 bg-rose-50 border border-rose-200">Overdue</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">{t.id} • <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${priorityColor(t.priority)}`}>{t.priority}</span></div>
                          </div>
                          <StatusBadge status={t.status}/>
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div><strong>Assignee:</strong> {t.assignedTo}</div>
                          <div><strong>Assigned Date:</strong> {formatDateTime(t.assignedDate)}</div>
                          <div className={overdue ? "text-rose-600 font-bold" : ""}><strong>Due Date:</strong> {formatDateTime(t.deadline)}</div>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                          <div className="flex gap-1 flex-wrap">
                            {(["Pending","Processing","Completed","Incomplete","Reassigned","Cancelled"] as Task["status"][]).filter(s => s !== t.status).map(s => (
                              <button key={s} onClick={e => { e.stopPropagation(); handleStatusChange(t, s); }} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">→{s}</button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setHistoryTask(t); setHistoryModalOpen(true); }} className="w-7 h-7 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="History"><History className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditTask(t); setForm({ title: t.title, description: t.description, priority: t.priority, assignedTo: t.assignedTo, assignedDate: formatForInputDateTime(t.assignedDate), deadline: formatForInputDateTime(t.deadline), applicantId: t.applicantId || null, applicantName: t.applicantName || null, targetDocument: t.targetDocument || null, notes: t.notes || "", attachmentName: t.attachmentName || "" }); setModal(true); }} className="w-7 h-7 text-blue-500 hover:bg-blue-50 rounded-lg"><CheckSquare className="w-4 h-4"/></Button>
                            {canDeleteTasks && <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto flex-1">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Task</th>
                        <th className="text-left px-4 py-3">Assignee</th>
                        <th className="text-left px-4 py-3">Dates</th>
                        <th className="text-left px-4 py-3">Status</th>
                        <th className="text-right px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(t => {
                        const overdue = isOverdue(t);
                        return (
                          <tr key={t.id} className={`border-b border-slate-50 hover:bg-slate-50/30 font-semibold text-slate-600 ${overdue ? "bg-rose-50/10" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800 flex gap-2 items-center">
                                {t.title} 
                                {overdue && <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase text-rose-600 bg-rose-50 border border-rose-200">Overdue</span>}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{t.id} • <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded uppercase ${priorityColor(t.priority)}`}>{t.priority}</span></div>
                            </td>
                            <td className="px-4 py-3">{t.assignedTo}</td>
                            <td className="px-4 py-3 text-[10px]">
                              <div className="text-slate-400">Assigned: {formatDateTime(t.assignedDate)}</div>
                              <div className={`font-bold mt-0.5 ${overdue ? "text-rose-600" : "text-slate-700"}`}>Due: {formatDateTime(t.deadline)}</div>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={t.status}/></td>
                            <td className="px-4 py-3 text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => { setHistoryTask(t); setHistoryModalOpen(true); }} className="w-7 h-7 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="History"><History className="w-4 h-4"/></Button>
                              <Button variant="ghost" size="icon" onClick={() => { setEditTask(t); setForm({ title: t.title, description: t.description, priority: t.priority, assignedTo: t.assignedTo, assignedDate: formatForInputDateTime(t.assignedDate), deadline: formatForInputDateTime(t.deadline), applicantId: t.applicantId || null, applicantName: t.applicantName || null, targetDocument: t.targetDocument || null, notes: t.notes || "", attachmentName: t.attachmentName || "" }); setModal(true); }} className="w-7 h-7 text-blue-500 hover:bg-blue-50 rounded-lg"><CheckSquare className="w-4 h-4"/></Button>
                              {canDeleteTasks && <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></Button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {view === "table" && <Pagination moduleKey="tasks" totalItems={totalItems} />}

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-md w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <DialogTitle className="text-base font-bold text-slate-800">{editTask ? "Edit Task" : "Create New Task"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Assign the task with specific start and deadline dates.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task Title <span className="text-rose-500">*</span></Label>
                <Input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" placeholder="e.g. Process applicant visa" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</Label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" />
              </div>
              {/* Target Company & Target Branch Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-blue-50/60 border border-blue-100/80">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Target Company <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={formCompany}
                    onChange={e => {
                      const val = e.target.value;
                      setFormCompany(val);
                      setFormBranch("");
                      setForm(f => ({ ...f, assignedTo: null }));
                    }}
                    disabled={editTask ? !canEditTasks : false}
                    className="w-full bg-white border border-blue-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700 disabled:opacity-50"
                  >
                    <option value="">Select Company...</option>
                    {allCompaniesForTasks.map(c => (
                      <option key={c.id || c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    Target Branch
                  </Label>
                  <select
                    value={formBranch}
                    onChange={e => {
                      const val = e.target.value;
                      setFormBranch(val);
                      setForm(f => ({ ...f, assignedTo: null }));
                    }}
                    disabled={editTask ? !canEditTasks : false}
                    className="w-full bg-white border border-blue-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700 disabled:opacity-50"
                  >
                    <option value="">All / Main Branch</option>
                    {allowedBranchesForTasks.map(b => (
                      <option key={b.id || b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & Assign To Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700"
                  >
                    {["Urgent", "High", "Medium", "Low"].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Assign To <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    required
                    value={form.assignedTo || ""}
                    onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value || null }))}
                    disabled={editTask ? !canEditTasks : !canCreateTasks}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700 disabled:opacity-50"
                  >
                    <option value="">Select staff member...</option>
                    {allowedStaffForTasks.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} · {s.position} ({s.company}{s.branch ? ` - ${s.branch}` : ""})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign Date <span className="text-rose-500">*</span></Label>
                  <Input required type="datetime-local" value={form.assignedDate} onChange={e => setForm(f => ({...f, assignedDate: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" disabled={editTask ? !canEditTasks : !canCreateTasks} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deadline <span className="text-rose-500">*</span></Label>
                  <Input required type="datetime-local" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" disabled={editTask ? !canEditTasks : !canCreateTasks} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Linked Candidate / Applicant (Optional)</Label>
                <select
                  value={form.applicantId || "none"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "none") {
                      setForm(f => ({ ...f, applicantId: null, applicantName: null, targetDocument: null }));
                    } else {
                      const app = applicants.find(a => a.id === val);
                      setForm(f => ({ ...f, applicantId: val, applicantName: app ? app.fullName : null }));
                    }
                  }}
                  disabled={editTask ? !canEditTasks : !canCreateTasks}
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700 disabled:opacity-50"
                >
                  <option value="none">None / No Applicant</option>
                  {applicants.map(app => (
                    <option key={app.id} value={app.id}>{app.fullName} ({app.trackingCode})</option>
                  ))}
                </select>
              </div>

              {form.applicantId && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document to Verify (Optional)</Label>
                  <select
                    value={form.targetDocument || "none"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm(f => ({ ...f, targetDocument: val === "none" ? null : val }));
                    }}
                    disabled={editTask ? !canEditTasks : !canCreateTasks}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700 disabled:opacity-50"
                  >
                    <option value="none">All Documents / General Review</option>
                    <option value="Passport Copy">Passport Copy</option>
                    <option value="Visa Page">Visa Page</option>
                    <option value="Applicant Photo">Applicant Photo</option>
                    <option value="Other">Other / Additional Documents</option>
                  </select>
                </div>
              )}

              {form.applicantId && (
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Candidate Verification Documents</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full select-none">
                      {(applicants.find(a => a.id === form.applicantId)?.documents || []).length} files
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                    {(() => {
                      const linkedApp = applicants.find(a => a.id === form.applicantId);
                      const docs = linkedApp?.documents || [];
                      if (docs.length === 0) {
                        return <div className="text-[10px] text-slate-400 font-semibold italic text-center py-2">No documents uploaded for this applicant.</div>;
                      }
                      return docs.map(doc => {
                        const isTarget = form.targetDocument === doc.name || doc.name.toLowerCase().includes((form.targetDocument || "").toLowerCase());
                        return (
                          <div key={doc.id} className={cn("flex items-center justify-between p-2 rounded-xl border bg-white text-[10px] font-semibold", isTarget ? "border-indigo-200 bg-indigo-50/20 shadow-xs" : "border-slate-100")}>
                            <span className="text-slate-700 truncate max-w-[180px]">{doc.name}</span>
                            <div className="flex gap-1">
                              {doc.url && (
                                <button type="button" onClick={() => {
                                  if (doc.url) {
                                    const a = document.createElement("a");
                                    a.href = doc.url;
                                    a.download = doc.name;
                                    a.click();
                                    toast.success(`Downloading ${doc.name}`);
                                  }
                                }} className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded text-[9px] font-bold">Download</button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes / Guidelines</Label>
                <textarea 
                  rows={2} 
                  value={form.notes} 
                  onChange={e => setForm(f => ({...f, notes: e.target.value}))} 
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" 
                  placeholder="Additional task guidelines or notes..."
                  disabled={editTask ? !canEditTasks : !canCreateTasks}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task Attachment</Label>
                {form.attachmentName ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <span className="truncate max-w-[200px]">📎 {form.attachmentName}</span>
                    <button 
                      type="button" 
                      onClick={() => setForm(f => ({ ...f, attachmentName: "" }))} 
                      className="text-rose-500 hover:text-rose-600 font-bold px-1"
                      disabled={editTask ? !canEditTasks : !canCreateTasks}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-slate-300 rounded-xl p-3 text-center hover:bg-slate-50 transition-colors">
                    <input 
                      type="file" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setForm(f => ({ ...f, attachmentName: file.name }));
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={editTask ? !canEditTasks : !canCreateTasks}
                    />
                    <div className="text-[10px] text-slate-400 font-medium">Click or drag file here to attach</div>
                  </div>
                )}
              </div>

              {editTask && (
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                  <select
                    value={editTask.status}
                    onChange={e => {
                      const newStatus = e.target.value as Task["status"];
                      setEditTask(prev => prev ? { ...prev, status: newStatus } : prev);
                      if (newStatus !== "Completed") {
                        handleStatusChange(editTask, newStatus, true);
                      }
                    }}
                    disabled={!canEditTasks && currentUser.name !== editTask.assignedTo}
                    className={`w-full border border-slate-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700 disabled:opacity-50 ${editTask.status === "Completed" ? "border-emerald-300 bg-emerald-50" : editTask.status === "Processing" ? "border-blue-300 bg-blue-50" : "bg-white"}`}
                  >
                    <option value="Pending">⏳ Pending</option>
                    <option value="Processing">🔄 In Progress</option>
                    <option value="Completed">✅ Completed</option>
                    <option value="Incomplete">❌ Incomplete</option>
                    <option value="Reassigned">↔️ Reassigned</option>
                    <option value="Cancelled">🚫 Cancelled</option>
                  </select>
                  {editTask.status !== "Completed" && editTask.status !== "Cancelled" && (
                    <p className="text-[9px] text-slate-400 mt-1">Changing to <strong>Completed</strong> or <strong>Cancelled</strong> will move this task to the Task Archive.</p>
                  )}
                </div>
              )}

              {/* Universal Attachment / Proof Upload */}
              <div className="space-y-2 mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Task Attachments & Proofs</Label>
                <p className="text-[9px] text-slate-500 mb-2">Upload any documents or proofs related to this task.</p>
                
                {editTask?.feedback && (() => {
                  try {
                    const fb = JSON.parse(editTask.feedback);
                    if (fb.proofs && fb.proofs.length > 0) {
                      return (
                        <div className="mb-3 space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                          {fb.proofs.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs px-2 py-1.5 rounded hover:bg-slate-50">
                              <span className="truncate flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-500"/> {p.name}</span>
                              <a href={p.url} download target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">Download</a>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch(e) {}
                  return null;
                })()}

                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                      <p className="text-xs text-slate-600"><span className="font-semibold">Click to attach files</span> or drag and drop</p>
                    </div>
                    <input type="file" multiple className="hidden" onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setUploadedProofFiles(prev => [...prev, ...files]);
                      toast.success(`Attached ${files.length} document(s).`);
                    }} />
                  </label>
                </div>

                {uploadedProofFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {uploadedProofFiles.map((f, i) => (
                      <div key={i} className="text-[10px] text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded flex justify-between items-center">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => setUploadedProofFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500 font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {editTask?.status === "Completed" && (
                  <div className="mt-3">
                    <Label className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Completion Comments</Label>
                    <textarea
                      rows={2}
                      value={completionComments}
                      onChange={e => setCompletionComments(e.target.value)}
                      placeholder="Add any final notes or comments about this task..."
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl text-xs p-2 outline-none focus:border-blue-400 resize-none text-slate-700"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">{editTask ? "Update Task" : "Create Task"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteTask(deleteId!); toast.success("Task deleted"); setDeleteId(null); }} title="Delete Task" description="Remove this task permanently." confirmText="Delete" variant="danger" />

      {/* Incomplete Reason Modal */}
      <Dialog open={incompleteModalOpen} onOpenChange={setIncompleteModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-sm w-[95vw] max-h-[80vh] flex flex-col overflow-hidden">
          <form onSubmit={handleIncompleteSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <DialogTitle className="text-base font-bold text-slate-800">Task Incomplete Reason</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Please provide a reason why this task cannot be completed.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 min-h-0">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason <span className="text-rose-500">*</span></Label>
              <textarea required rows={3} value={incompleteReasonInput} onChange={e => setIncompleteReasonInput(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" placeholder="e.g. Awaiting client signature copy..." />
            </div>
            <DialogFooter className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
              <Button type="button" variant="ghost" onClick={() => setIncompleteModalOpen(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 h-10">Confirm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-sm">
          <form onSubmit={handleReassignSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Reassign Task</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Select another employee to take over this task.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reassign To <span className="text-rose-500">*</span></Label>
              <select
                required
                value={reassignStaffName}
                onChange={e => setReassignStaffName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 outline-none focus:border-blue-400 font-semibold text-slate-700"
              >
                <option value="">Select staff member...</option>
                {allowedStaffForTasks.map(s => (
                  <option key={s.id} value={s.name}>{s.name} · {s.position} ({s.company})</option>
                ))}
              </select>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setReassignModalOpen(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10">Reassign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Task Timeline History
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 truncate">
              {historyTask?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {historyTask?.feedback && (() => {
                 try {
                   const fb = JSON.parse(historyTask.feedback);
                   if (fb.proofs && fb.proofs.length > 0) {
                      return (
                         <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4 shadow-sm">
                           <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-500"/> Task Attachments</div>
                           <div className="space-y-1.5">
                             {fb.proofs.map((p: any, idx: number) => (
                               <a key={idx} href={p.url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-700 bg-white hover:bg-blue-50 p-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                                 <FileText className="w-4 h-4 text-blue-500"/>
                                 <span className="truncate flex-1 font-semibold">{p.name}</span>
                                 <span className="text-[9px] text-slate-400 font-medium">by {p.by}</span>
                               </a>
                             ))}
                           </div>
                         </div>
                      );
                   }
                 } catch(e) {}
                 return null;
            })()}

            {!historyTask?.history || historyTask.history.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-100">
                No recorded history events yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-indigo-100 ml-3 space-y-6">
                {historyTask.history.map((event, idx) => (
                  <div key={idx} className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-400 shadow-sm" />
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-bold text-slate-800">{event.action}</div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        By {event.by} • {formatDateTime(event.date)}
                      </div>
                      {event.note && (
                        <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {event.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setHistoryModalOpen(false)} className="text-xs rounded-xl px-4 w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold">
              Close Timeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
