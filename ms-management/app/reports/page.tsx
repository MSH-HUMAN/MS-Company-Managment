"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportToCSV, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from "recharts";
import {
  Users, Briefcase, Building2, Car, CheckSquare, Clock, DollarSign,
  Activity, Shield, Printer, Download, BarChart3, FileText, UserCheck,
  Calendar, Package, TrendingUp, TrendingDown, AlertTriangle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const REPORT_TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "applicants", label: "Applicants", icon: Users },
  { key: "staff", label: "Staff", icon: Briefcase },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "suppliers", label: "Suppliers", icon: Package },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "interviews", label: "Interviews", icon: Calendar },
  { key: "visaPassport", label: "Visa & Passport", icon: Shield },
  { key: "vehicles", label: "Vehicles", icon: Car },
  { key: "attendance", label: "Attendance", icon: Activity },
  { key: "payroll", label: "Payroll", icon: DollarSign },
  { key: "activityLog", label: "Activity Log", icon: FileText },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

export default function ReportsPage() {
  const { currentRole, currentUser, applicants, staff, companies, branches, tasks, interviews, vehicles, suppliers, payroll, activityLogs, leaveRequests, siteSettings, placements, staffAttendance, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canView = hasPermission("reports", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [activeTab, setActiveTab] = useState("overview");

  const isSuperAdmin = currentRole === "Super Admin";
  const userCompany = currentUser.company;

  // Scoped data
  const applyBranchFilter = (list: any[]) => {
    if (isSuperAdmin || currentRole === "Company Admin" || currentUser.branch === "All") return list;
    return list.filter(item => !item.branch || item.branch === currentUser.branch);
  };

  const appList = applyBranchFilter(isSuperAdmin ? applicants : applicants.filter(a => a.company === userCompany || a.clientName === userCompany));
  const staffList = applyBranchFilter(isSuperAdmin ? staff : staff.filter(s => s.company === userCompany));
  const companyList = isSuperAdmin ? companies : companies.filter(c => c.name === userCompany);
  const taskList = applyBranchFilter(isSuperAdmin ? tasks : tasks.filter(t => t.company === userCompany));
  const interviewList = applyBranchFilter(isSuperAdmin ? interviews : interviews.filter(i => i.company === userCompany));
  const vehicleList = applyBranchFilter(isSuperAdmin ? vehicles : vehicles.filter(v => v.company === userCompany));
  const supplierList = isSuperAdmin ? suppliers : suppliers.filter(s => s.company === userCompany);
  const payrollList = applyBranchFilter(isSuperAdmin ? payroll : payroll.filter(p => p.company === userCompany));
  const logList = applyBranchFilter(isSuperAdmin ? activityLogs : activityLogs.filter(l => l.company === userCompany));
  const leaveList = applyBranchFilter(isSuperAdmin ? leaveRequests : leaveRequests.filter(l => l.company === userCompany));
  const placementList = applyBranchFilter(isSuperAdmin ? placements : placements.filter(p => p.companyName === userCompany || p.company === userCompany));

  // Applicant Stats
  const appByStatus = {
    Pending: appList.filter(a => a.status === "Pending").length,
    Processing: appList.filter(a => a.status === "Processing").length,
    "Interview Scheduled": appList.filter(a => a.status === "Interview Scheduled").length,
    Selected: appList.filter(a => a.status === "Selected").length,
    "Visa Processing": appList.filter(a => a.status === "Visa Processing").length,
    Placed: appList.filter(a => a.status === "Placed").length,
    Rejected: appList.filter(a => a.status === "Rejected").length,
    Returned: appList.filter(a => a.status === "Returned").length,
  };
  const appPieData = Object.entries(appByStatus).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  // Staff stats
  const staffByStatus = {
    Active: staffList.filter(s => s.status === "Active").length,
    Inactive: staffList.filter(s => s.status === "Inactive").length,
    Suspended: staffList.filter(s => s.status === "Suspended").length,
  };
  const staffPieData = Object.entries(staffByStatus).map(([name, value]) => ({ name, value }));

  // Nationality breakdown
  const nationalityMap: Record<string, number> = {};
  appList.forEach(a => {
    nationalityMap[a.nationality] = (nationalityMap[a.nationality] || 0) + 1;
  });
  const nationalityData = Object.entries(nationalityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // Task stats
  const taskByStatus = {
    Pending: taskList.filter(t => t.status === "Pending").length,
    Processing: taskList.filter(t => t.status === "Processing").length,
    Completed: taskList.filter(t => t.status === "Completed").length,
    Incomplete: taskList.filter(t => t.status === "Incomplete").length,
    Reassigned: taskList.filter(t => t.status === "Reassigned").length,
  };

  // Interview stats
  const intByType = {
    Interview: interviewList.filter(i => i.type === "Interview").length,
    Meeting: interviewList.filter(i => i.type === "Meeting").length,
  };
  const intByStatus = {
    Scheduled: interviewList.filter(i => i.status === "Scheduled").length,
    Completed: interviewList.filter(i => i.status === "Completed").length,
    Cancelled: interviewList.filter(i => i.status === "Cancelled").length,
    Rescheduled: interviewList.filter(i => i.status === "Rescheduled").length,
  };

  // Vehicle stats
  const vehByStatus = {
    Available: vehicleList.filter(v => v.status === "Available").length,
    Assigned: vehicleList.filter(v => v.status === "Assigned").length,
    Maintenance: vehicleList.filter(v => v.status === "Maintenance").length,
    Returned: vehicleList.filter(v => v.status === "Returned").length,
  };

  // Payroll stats
  const totalPayroll = payrollList.reduce((s, p) => s + p.netSalary, 0);
  const payrollByStatus = {
    Draft: payrollList.filter(p => p.status === "Draft").length,
    "Pending Approval": payrollList.filter(p => p.status === "Pending Approval").length,
    Approved: payrollList.filter(p => p.status === "Approved").length,
    Paid: payrollList.filter(p => p.status === "Paid").length,
  };

  // Visa expiry alerts
  const today = new Date();
  const visaAlerts = [...staffList, ...appList].filter((p: any) => {
    const name = (p as any).fullName || (p as any).name;
    const visaExpiry = (p as any).visaExpiry;
    if (!visaExpiry) return false;
    const days = Math.ceil((new Date(visaExpiry).getTime() - today.getTime()) / 86400000);
    return days <= 30;
  });

  const passportAlerts = [...staffList, ...appList].filter((p: any) => {
    const passportExpiry = (p as any).passportExpiry;
    if (!passportExpiry) return false;
    const days = Math.ceil((new Date(passportExpiry).getTime() - today.getTime()) / 86400000);
    return days <= 30;
  });

  // Monthly trend data calculated dynamically based on registration/joining timestamps
  const monthlyTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const result: any[] = [];
    const todayDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
      const mLabel = months[d.getMonth()];
      const yearVal = d.getFullYear();
      const monthVal = d.getMonth();
      
      const appCount = appList.filter(a => {
        const date = new Date(a.applicationDate || a.createdAt);
        return date.getMonth() === monthVal && date.getFullYear() === yearVal;
      }).length;
      
      const staffCount = staffList.filter(s => {
        const date = new Date(s.joiningDate || s.createdAt);
        return date.getMonth() === monthVal && date.getFullYear() === yearVal;
      }).length;
      
      const placedCount = placementList.filter(p => {
        const date = new Date(p.placementDate || p.createdAt);
        return p.status === "Placed" && date.getMonth() === monthVal && date.getFullYear() === yearVal;
      }).length;
      
      result.push({
        month: mLabel,
        Applicants: appCount,
        Staff: staffCount,
        Placed: placedCount
      });
    }
    
    return result;
  }, [appList, staffList, placementList]);

  // Weekly attendance data calculated dynamically from staffAttendance
  const weeklyAttendance = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const todayDate = new Date();
    
    const currentDay = todayDate.getDay();
    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(todayDate);
    monday.setDate(todayDate.getDate() + mondayDiff);
    
    return days.map((dayName, idx) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + idx);
      const dateStr = targetDate.toISOString().slice(0, 10);
      
       const targetYear = targetDate.getFullYear();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const targetMonthLabel = months[targetDate.getMonth()];
      
      let present = 0;
      let absent = 0;
      let late = 0;
      
      staffList.forEach(s => {
        const att = staffAttendance.find(a => a.staffId === s.id && a.month === targetMonthLabel && a.year === targetYear);
        if (att) {
          const rec = att.records.find(r => r.date === dateStr);
          if (rec) {
            if (rec.status === "Present" || rec.status === "Work From Home") present++;
            else if (rec.status === "Absent") absent++;
            else if (rec.status === "Late" || rec.status === "Half Day") late++;
          }
        }
      });
      
      return {
        day: dayName,
        Present: present,
        Absent: absent,
        Late: late
      };
    });
  }, [staffList, staffAttendance]);

  const StatBox = ({ label, value, icon: Icon, color, sub }: any) => (
    <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-extrabold text-slate-800">{value}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</div>
        {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </Card>
  );

  const handleExport = (data: any[], filename: string) => {
    exportToCSV(data, filename);
    toast.success("Report exported to CSV");
  };

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Print-only Letterhead */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-200 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {siteSettings?.logo ? (
              <img src={siteSettings.logo} alt="Logo" className="h-10 w-auto rounded-lg" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block' }}>
                <rect width="32" height="32" rx="8" fill="url(#grad1)"/>
                <path d="M9 22V10L16 17L23 10V22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3b82f6"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            )}
            <div>
              <div className="text-lg font-black text-slate-800">{siteSettings?.siteName || "MS Horizon F.Z.E"}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {siteSettings?.address || "Office 101, Business Bay, Dubai, UAE"}<br />
                Email: {siteSettings?.email || "hr@mshorizon.ae"} | Tel: {siteSettings?.phone || "+971 4 123 4567"}
                {siteSettings?.website && ` | Website: ${siteSettings.website}`}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold tracking-wider text-slate-800">SYSTEM REPORT</div>
            <div className="text-[10px] text-slate-400 mt-1">Generated: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
        </div>
      </div>
      <PageHeader
        title="Analytics & Reports"
        subtitle="Comprehensive system reports and data insights"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9 px-3 gap-1.5">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button variant="outline" onClick={() => handleExport(appList.map(a => ({ ID: a.id, Name: a.fullName, Status: a.status, Company: a.company })), "full-report")} className="border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9 px-3 gap-1.5">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-100 px-4 flex gap-0.5 overflow-x-auto scrollbar-none py-1.5 flex-shrink-0">
        {REPORT_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatBox label="Total Applicants" value={appList.length} icon={Users} color="bg-blue-50 text-blue-600" sub={`${appByStatus.Placed} placed`} />
              <StatBox label="Active Staff" value={staffList.length} icon={Briefcase} color="bg-emerald-50 text-emerald-600" sub={`${staffByStatus.Active} active`} />
              <StatBox label="Companies" value={companyList.length} icon={Building2} color="bg-purple-50 text-purple-600" sub={`${branches.length} branches`} />
              <StatBox label="Open Tasks" value={taskList.filter(t => t.status !== "Completed").length} icon={CheckSquare} color="bg-amber-50 text-amber-600" sub={`${taskList.filter(t => t.priority === "High").length} high priority`} />
              <StatBox label="Vehicles" value={vehicleList.length} icon={Car} color="bg-rose-50 text-rose-600" sub={`${vehByStatus.Available} available`} />
              <StatBox label="Visa Alerts" value={visaAlerts.length} icon={AlertTriangle} color="bg-orange-50 text-orange-600" sub="Expiring ≤30 days" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Applicant Status Pie */}
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Applicant Pipeline</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Current status distribution</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={appPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {appPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                      <Legend verticalAlign="bottom" iconSize={8} formatter={(v) => <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Monthly Trend Line */}
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm lg:col-span-2">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Monthly Trends (6 Months)</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Applicants, Staff, and Placements</p>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
                      <Legend verticalAlign="top" iconSize={8} formatter={(v) => <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>{v}</span>} />
                      <Area type="monotone" dataKey="Applicants" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
                      <Area type="monotone" dataKey="Placed" stroke="#10b981" fill="#f0fdf4" strokeWidth={2} />
                      <Area type="monotone" dataKey="Staff" stroke="#8b5cf6" fill="#faf5ff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Second row charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Nationality breakdown */}
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Top Nationalities</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Applicant nationality distribution</p>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nationalityData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} width={60} />
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none" }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Task Status */}
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Task Status Summary</h3>
                  <p className="text-[10px] text-slate-400 font-medium">All tasks breakdown</p>
                </div>
                <div className="space-y-2.5 pt-2">
                  {Object.entries(taskByStatus).map(([status, count], i) => (
                    <div key={status} className="flex items-center gap-3">
                      <div className="text-[10px] font-bold text-slate-600 w-20 truncate">{status}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: taskList.length > 0 ? `${(count / taskList.length) * 100}%` : '0%',
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                      <div className="text-[10px] font-extrabold text-slate-700 w-6 text-right">{count}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Vehicle Status */}
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Vehicle Fleet Status</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Fleet availability overview</p>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.entries(vehByStatus).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {Object.entries(vehByStatus).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* APPLICANTS TAB */}
        {activeTab === "applicants" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Applicant Report</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport(appList.map(a => ({ ID: a.id, Name: a.fullName, Email: a.email, Mobile: a.mobile, Nationality: a.nationality, Status: a.status, Company: a.company, Branch: a.branch, "Applied Date": a.applicationDate, "Visa Expiry": a.visaExpiry })), "applicants-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
                <Button size="sm" variant="outline" onClick={handlePrint} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Printer className="w-3.5 h-3.5" />Print</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(appByStatus).slice(0, 4).map(([status, count], i) => (
                <Card key={status} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm text-center">
                  <div className="text-2xl font-extrabold text-slate-800">{count}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{status}</div>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <div className="p-4 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-600">Total: {appList.length} applicants</div>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Position(s)</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Visa Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appList.slice(0, 50).map(a => (
                    <TableRow key={a.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{a.id}</TableCell>
                      <TableCell className="font-bold text-slate-800">{a.fullName}</TableCell>
                      <TableCell><span className="mr-1">{a.nationalityFlag}</span>{a.nationality}</TableCell>
                      <TableCell className="text-[10px] max-w-[120px] truncate">{a.applyingPositions.join(", ")}</TableCell>
                      <TableCell className="text-[10px]">{a.company}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-[10px]">{formatDate(a.applicationDate)}</TableCell>
                      <TableCell className="text-[10px]">{formatDate(a.visaExpiry)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* STAFF TAB */}
        {activeTab === "staff" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Staff Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(staffList.map(s => ({ ID: s.id, Name: s.name, Position: s.position, Nationality: s.nationality, Email: s.email, Mobile: s.mobile, Company: s.company, Branch: s.branch, "Joining Date": s.joiningDate, "Visa Expiry": s.visaExpiry, Status: s.status })), "staff-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(staffByStatus).map(([status, count]) => (
                <Card key={status} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm text-center">
                  <div className="text-2xl font-extrabold text-slate-800">{count}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{status}</div>
                </Card>
              ))}
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Position</TableHead>
                    <TableHead>Nationality</TableHead><TableHead>Company</TableHead>
                    <TableHead>Joining Date</TableHead><TableHead>Visa Expiry</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.slice(0, 50).map(s => (
                    <TableRow key={s.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{s.id}</TableCell>
                      <TableCell className="font-bold text-slate-800">{s.name}</TableCell>
                      <TableCell>{s.position}</TableCell>
                      <TableCell><span className="mr-1">{s.nationalityFlag}</span>{s.nationality}</TableCell>
                      <TableCell className="text-[10px]">{s.company}<br/><span className="text-slate-400">{s.branch}</span></TableCell>
                      <TableCell className="text-[10px]">{formatDate(s.joiningDate)}</TableCell>
                      <TableCell className="text-[10px]">{formatDate(s.visaExpiry)}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* COMPANIES TAB */}
        {activeTab === "companies" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Company Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(companyList.map(c => ({ ID: c.id, Name: c.name, Email: c.email, Branches: c.branches, Staff: c.staff, Applicants: c.applicants, Status: c.status })), "companies-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead><TableHead>Company Name</TableHead><TableHead>Email</TableHead>
                    <TableHead>Branches</TableHead><TableHead>Staff</TableHead><TableHead>Applicants</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyList.map(c => (
                    <TableRow key={c.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{c.id}</TableCell>
                      <TableCell className="font-bold text-slate-800">{c.name}</TableCell>
                      <TableCell className="text-[10px]">{c.email}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.branches}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.staff}</TableCell>
                      <TableCell className="text-center font-bold text-slate-700">{c.applicants}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* SUPPLIERS TAB */}
        {activeTab === "suppliers" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Supplier Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(supplierList.map(s => ({ ID: s.id, Name: s.name, Nationality: s.nationality, Email: s.email, Mobile: s.mobile, Status: s.status })), "suppliers-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead><TableHead>Supplier Name</TableHead><TableHead>Nationality</TableHead>
                    <TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead>WhatsApp</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierList.map(s => (
                    <TableRow key={s.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{s.id}</TableCell>
                      <TableCell className="font-bold text-slate-800">{s.name}</TableCell>
                      <TableCell><span className="mr-1">{s.nationalityFlag}</span>{s.nationality}</TableCell>
                      <TableCell className="text-[10px]">{s.email}</TableCell>
                      <TableCell className="text-[10px]">{s.mobile}</TableCell>
                      <TableCell className="text-[10px]">{s.whatsapp}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Task Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(taskList.map(t => ({ ID: t.id, Title: t.title, AssignedTo: t.assignedTo, Priority: t.priority, Deadline: t.deadline, Status: t.status, Company: t.company })), "tasks-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(taskByStatus).map(([status, count]) => (
                <Card key={status} className="rounded-2xl border-slate-100 p-3 bg-white shadow-sm text-center">
                  <div className="text-xl font-extrabold text-slate-800">{count}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{status}</div>
                </Card>
              ))}
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Assigned To</TableHead>
                    <TableHead>Priority</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskList.slice(0, 50).map(t => (
                    <TableRow key={t.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{t.id}</TableCell>
                      <TableCell className="font-bold text-slate-800">{t.title}</TableCell>
                      <TableCell>{t.assignedTo}</TableCell>
                      <TableCell><span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${t.priority === "High" ? "bg-rose-50 text-rose-700 border-rose-200" : t.priority === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>{t.priority}</span></TableCell>
                      <TableCell className="text-[10px]">{formatDate(t.deadline)}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* INTERVIEWS TAB */}
        {activeTab === "interviews" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Interview & Meeting Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(interviewList.map(i => ({ ID: i.id, Type: i.type, Person: i.personName, Mode: i.mode, DateTime: i.dateTime, Status: i.status, Company: i.company })), "interviews-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-2xl p-3 bg-white shadow-sm border-slate-100 text-center"><div className="text-xl font-extrabold text-slate-800">{intByType.Interview}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Interviews</div></Card>
              <Card className="rounded-2xl p-3 bg-white shadow-sm border-slate-100 text-center"><div className="text-xl font-extrabold text-slate-800">{intByType.Meeting}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Meetings</div></Card>
              <Card className="rounded-2xl p-3 bg-white shadow-sm border-slate-100 text-center"><div className="text-xl font-extrabold text-emerald-700">{intByStatus.Completed}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Completed</div></Card>
              <Card className="rounded-2xl p-3 bg-white shadow-sm border-slate-100 text-center"><div className="text-xl font-extrabold text-amber-700">{intByStatus.Scheduled}</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Scheduled</div></Card>
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead>Person</TableHead>
                    <TableHead>Mode</TableHead><TableHead>Date & Time</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviewList.slice(0, 50).map(i => (
                    <TableRow key={i.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{i.id}</TableCell>
                      <TableCell><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${i.type === "Interview" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>{i.type}</span></TableCell>
                      <TableCell className="font-bold text-slate-800">{i.personName}</TableCell>
                      <TableCell className="text-[10px]">{i.mode}</TableCell>
                      <TableCell className="text-[10px]">{i.dateTime}</TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* VISA & PASSPORT TAB */}
        {activeTab === "visaPassport" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Visa & Passport Expiry Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(visaAlerts.map((p: any) => ({ ID: p.id, Name: (p as any).fullName || (p as any).name, "Visa Expiry": (p as any).visaExpiry, Company: p.company })), "visa-expiry-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="rounded-2xl p-4 bg-rose-50 border-rose-200 shadow-sm text-center"><div className="text-2xl font-extrabold text-rose-700">{visaAlerts.length}</div><div className="text-[10px] font-bold text-rose-500 uppercase mt-1">Visa Expiring ≤30 Days</div></Card>
              <Card className="rounded-2xl p-4 bg-amber-50 border-amber-200 shadow-sm text-center"><div className="text-2xl font-extrabold text-amber-700">{passportAlerts.length}</div><div className="text-[10px] font-bold text-amber-500 uppercase mt-1">Passport Expiring ≤30 Days</div></Card>
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <div className="p-3 border-b border-slate-100 bg-rose-50/30">
                <div className="text-xs font-bold text-rose-700">⚠️ Visa Expiry Watchlist (≤ 30 days)</div>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Company</TableHead>
                    <TableHead>Visa Expiry</TableHead><TableHead>Days Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visaAlerts.slice(0, 50).map((p: any, idx: number) => {
                    const name = p.fullName || p.name;
                    const expDate = p.visaExpiry;
                    const days = Math.ceil((new Date(expDate).getTime() - today.getTime()) / 86400000);
                    return (
                      <TableRow key={idx} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                        <TableCell className="font-bold text-slate-800">{name}</TableCell>
                        <TableCell><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.position ? "Staff" : "Applicant"}</span></TableCell>
                        <TableCell className="text-[10px]">{p.company}</TableCell>
                        <TableCell className="text-[10px]">{formatDate(expDate)}</TableCell>
                        <TableCell><span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${days < 0 ? "bg-rose-100 text-rose-700 border-rose-200" : days <= 7 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days`}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* VEHICLES TAB */}
        {activeTab === "vehicles" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Vehicle Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(vehicleList.map(v => ({ ID: v.id, Brand: v.brand, Plate: `${v.plateCode} ${v.plateNumber}`, Colour: v.colour, Status: v.status, "Insurance Expiry": v.insuranceExpiry, "Reg Expiry": v.registrationExpiry, "License Expiry": v.licenseExpiry, Company: v.company })), "vehicles-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(vehByStatus).map(([status, count]) => (
                <Card key={status} className="rounded-2xl border-slate-100 p-3 bg-white shadow-sm text-center">
                  <div className="text-xl font-extrabold text-slate-800">{count}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{status}</div>
                </Card>
              ))}
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>ID</TableHead><TableHead>Brand</TableHead><TableHead>Plate</TableHead>
                    <TableHead>Colour</TableHead><TableHead>Assigned To</TableHead>
                    <TableHead>Insurance Exp</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleList.slice(0, 50).map(v => (
                    <TableRow key={v.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-mono text-[10px] text-blue-600">{v.id}</TableCell>
                      <TableCell className="font-bold text-slate-800">{v.brand}</TableCell>
                      <TableCell className="font-bold">{v.plateCode} {v.plateNumber}</TableCell>
                      <TableCell>{v.colour}</TableCell>
                      <TableCell className="text-[10px]">{v.assignedTo || "—"}</TableCell>
                      <TableCell className="text-[10px]">{formatDate(v.insuranceExpiry)}</TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Attendance Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(staffList.map(s => ({ Staff: s.name, Position: s.position, Company: s.company, "Joining Date": s.joiningDate, Status: s.status })), "attendance-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-800">Weekly Attendance Overview</h3>
                <p className="text-[10px] text-slate-400 font-medium">Weekly attendance trends for {staffList.length} staff members</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyAttendance} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none" }} />
                    <Legend verticalAlign="top" iconSize={8} formatter={(v) => <span style={{ fontSize: "9px", fontWeight: 700 }}>{v}</span>} />
                    <Bar dataKey="Present" fill="#10b981" radius={[3, 3, 0, 0]} barSize={16} />
                    <Bar dataKey="Late" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={16} />
                    <Bar dataKey="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* PAYROLL TAB */}
        {activeTab === "payroll" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Payroll Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(payrollList.map(p => ({ ID: p.id, Staff: p.staffName, Month: p.month, Year: p.year, Basic: p.basicSalary, Overtime: p.overtime, Deductions: (p.advanceDeduction || 0) + (p.loanDeduction || 0), Net: p.netSalary, Status: p.status })), "payroll-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(payrollByStatus).map(([status, count]) => (
                <Card key={status} className="rounded-2xl border-slate-100 p-3 bg-white shadow-sm text-center">
                  <div className="text-xl font-extrabold text-slate-800">{count}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{status}</div>
                </Card>
              ))}
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-x-auto">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="text-xs font-bold text-slate-600">Total Payroll: <span className="text-slate-900 font-extrabold">AED {totalPayroll.toLocaleString()}</span></div>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>Staff</TableHead><TableHead>Period</TableHead><TableHead>Basic</TableHead>
                    <TableHead>Overtime</TableHead><TableHead>Deductions</TableHead><TableHead>Net Salary</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollList.slice(0, 50).map(p => (
                    <TableRow key={p.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="font-bold text-slate-800">{p.staffName}</TableCell>
                      <TableCell className="text-[10px]">{p.month} {p.year}</TableCell>
                      <TableCell>AED {p.basicSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600">+{p.overtime.toLocaleString()}</TableCell>
                      <TableCell className="text-rose-600">-{((p.advanceDeduction || 0) + (p.loanDeduction || 0)).toLocaleString()}</TableCell>
                      <TableCell className="font-extrabold text-slate-900">AED {p.netSalary.toLocaleString()}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === "activityLog" && (
          <div className="space-y-5 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">Activity Log Report</h2>
              <Button size="sm" variant="outline" onClick={() => handleExport(logList.slice(0, 200).map(l => ({ Time: l.dateTime, User: l.userName, Role: l.role, Module: l.module, Action: l.action, Details: l.newValue, IP: l.ipAddress })), "activity-log-report")} className="rounded-xl text-xs border-slate-200 font-bold gap-1.5 h-8"><Download className="w-3.5 h-3.5" />Export</Button>
            </div>
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <TableHead>Date & Time</TableHead><TableHead>User</TableHead><TableHead>Module</TableHead>
                    <TableHead>Action</TableHead><TableHead>Details</TableHead><TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logList.slice(0, 50).map((l: any) => (
                    <TableRow key={l.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                      <TableCell className="text-[10px]">{l.dateTime}</TableCell>
                      <TableCell><div className="font-bold text-slate-800">{l.userName}</div><div className="text-[9px] text-slate-400">{l.role}</div></TableCell>
                      <TableCell>{l.module}</TableCell>
                      <TableCell><span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${l.action.includes("Created") || l.action === "Login" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : l.action.includes("Delete") || l.action === "Logout" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{l.action}</span></TableCell>
                      <TableCell className="text-[10px] max-w-[160px] truncate" title={l.newValue || ""}>{l.newValue}</TableCell>
                      <TableCell className="text-[10px] font-mono">{l.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>

      {/* Print-only Footer */}
      <div className="hidden print:block text-center text-[9px] text-slate-400 mt-auto pt-4 border-t border-slate-100">
        {siteSettings?.footerText || "© 2026 MS Horizon F.Z.E. All Rights Reserved."}
      </div>
    </div>
  );
}
