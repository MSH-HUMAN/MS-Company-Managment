"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, UserCheck, CheckSquare, AlertTriangle, Calendar, Plus,
  ArrowRight, Cake, Sparkles, Car, FileSpreadsheet, TrendingUp,
  TrendingDown, Shield, Bell, ClipboardList, Building2, Clock,
  Zap, Activity, LogIn, LogOut, DollarSign, Target, Briefcase,
  BarChart3, UserPlus, GitBranch, Home
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { formatDate, exportToCSV, cn } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import AlertBanner from "@/components/shared/AlertBanner";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";

/* ─── Stat card themes ─── */
const STAT_THEMES = {
  blue:    { bg: "from-blue-500 to-blue-600",    icon: "bg-blue-400/30",    ring: "ring-blue-300" },
  emerald: { bg: "from-emerald-500 to-teal-500",  icon: "bg-emerald-400/30", ring: "ring-emerald-300" },
  amber:   { bg: "from-amber-400 to-orange-500",  icon: "bg-amber-400/30",   ring: "ring-amber-300" },
  rose:    { bg: "from-rose-500 to-pink-600",     icon: "bg-rose-400/30",    ring: "ring-rose-300" },
  purple:  { bg: "from-violet-500 to-purple-600", icon: "bg-violet-400/30",  ring: "ring-violet-300" },
  cyan:    { bg: "from-cyan-500 to-sky-500",      icon: "bg-cyan-400/30",    ring: "ring-cyan-300" },
  slate:   { bg: "from-slate-600 to-slate-700",   icon: "bg-slate-400/30",   ring: "ring-slate-300" },
};
type StatTheme = keyof typeof STAT_THEMES;

function StatCard({ title, value, icon: Icon, sub, trend, theme }: {
  title: string; value: number | string; icon: React.ElementType;
  sub?: string; trend?: { val: string; up: boolean }; theme: StatTheme;
}) {
  const t = STAT_THEMES[theme];
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.bg} p-5 text-white shadow-lg`}>
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${t.icon} flex items-center justify-center ring-1 ${t.ring}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.up ? "bg-white/20" : "bg-black/15"}`}>
              {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.val}
            </span>
          )}
        </div>
        <div className="text-3xl font-black tracking-tight">{value}</div>
        <div className="text-sm font-semibold text-white/90 mt-0.5">{title}</div>
        {sub && <div className="text-[10px] text-white/60 mt-1 font-medium">{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Shortcut card ─── */
const SHORTCUT_THEMES: Record<string, { bg: string; icon: string; hover: string }> = {
  blue:   { bg: "bg-blue-50 border-blue-100",       icon: "bg-blue-500",    hover: "hover:bg-blue-100 hover:border-blue-300" },
  green:  { bg: "bg-emerald-50 border-emerald-100",  icon: "bg-emerald-500", hover: "hover:bg-emerald-100 hover:border-emerald-300" },
  amber:  { bg: "bg-amber-50 border-amber-100",      icon: "bg-amber-500",   hover: "hover:bg-amber-100 hover:border-amber-300" },
  purple: { bg: "bg-violet-50 border-violet-100",    icon: "bg-violet-500",  hover: "hover:bg-violet-100 hover:border-violet-300" },
  rose:   { bg: "bg-rose-50 border-rose-100",        icon: "bg-rose-500",    hover: "hover:bg-rose-100 hover:border-rose-300" },
  slate:  { bg: "bg-slate-50 border-slate-200",      icon: "bg-slate-600",   hover: "hover:bg-slate-100 hover:border-slate-400" },
  cyan:   { bg: "bg-cyan-50 border-cyan-100",        icon: "bg-cyan-500",    hover: "hover:bg-cyan-100 hover:border-cyan-300" },
};

function ShortcutCard({ label, href, icon: Icon, color, permissionKey }: { label: string; href: string; icon: React.ElementType; color: string; permissionKey?: string }) {
  const { hasPermission } = useAuthStore();
  if (permissionKey && !hasPermission(permissionKey, "view")) return null;
  const t = SHORTCUT_THEMES[color] ?? SHORTCUT_THEMES.slate;
  return (
    <Link href={href}
      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border ${t.bg} ${t.hover} transition-all duration-200 group cursor-pointer`}>
      <div className={`w-10 h-10 rounded-xl ${t.icon} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

/* ─── Live clock ─── */
function useLiveDate() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ─── Section heading ─── */
function SectionHeader({ icon: Icon, title, href, linkLabel }: {
  icon: React.ElementType; title: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
          {linkLabel ?? "View all"} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function ApplicantAnalyticsWidget({ applicants, isSuperAdmin, isCompanyAdmin }: { applicants: any[], isSuperAdmin: boolean, isCompanyAdmin: boolean }) {
  const companyCounts = applicants.reduce((acc, curr) => {
    const comp = curr.company || "Unknown";
    acc[comp] = (acc[comp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const branchCounts = applicants.reduce((acc, curr) => {
    const branch = curr.branch || "Unknown";
    acc[branch] = (acc[branch] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pending = applicants.filter(a => a.status === "Pending").length;
  const processing = applicants.filter(a => a.status === "Processing" || a.status === "Interview Scheduled" || a.status === "Selected" || a.status === "Visa Processing").length;
  const placed = applicants.filter(a => a.status === "Placed").length;
  const rejected = applicants.filter(a => a.status === "Rejected" || a.status === "Returned").length;

  return (
    <div className="mt-8 mb-4">
      <SectionHeader icon={Users} title="Applicant Analytics" href="/tracking" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard title="Pending" value={pending} icon={Clock} theme="slate" />
        <StatCard title="Processing" value={processing} icon={Activity} theme="blue" />
        <StatCard title="Placed" value={placed} icon={CheckSquare} theme="emerald" />
        <StatCard title="Rejected" value={rejected} icon={AlertTriangle} theme="rose" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isSuperAdmin && (
          <Card className="p-4 rounded-2xl shadow-sm border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Applicants by Company</h3>
            <div className="space-y-2">
              {Object.entries(companyCounts).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{count as number}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {(isSuperAdmin || isCompanyAdmin) && (
          <Card className="p-4 rounded-2xl shadow-sm border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Applicants by Branch</h3>
            <div className="space-y-2">
              {Object.entries(branchCounts).map(([name, count]) => (
                <div key={name} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{count as number}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ROLE-SPECIFIC DASHBOARD SECTIONS
   ════════════════════════════════════════════ */

/* ── Staff personal dashboard ── */
function StaffDashboard({ currentUser, now, tasks, leaveRequests, notifications, payroll, staffAttendance, shifts }: {
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
  now: Date;
  tasks: ReturnType<typeof useAuthStore.getState>["tasks"];
  leaveRequests: ReturnType<typeof useAuthStore.getState>["leaveRequests"];
  notifications: ReturnType<typeof useAuthStore.getState>["notifications"];
  payroll: ReturnType<typeof useAuthStore.getState>["payroll"];
  staffAttendance: ReturnType<typeof useAuthStore.getState>["staffAttendance"];
  shifts: ReturnType<typeof useAuthStore.getState>["shifts"];
}) {
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const myPendingTasks = tasks.filter(t =>
    (t.status === "Pending" || t.status === "Processing" || t.status === "Reassigned") &&
    (t.assignedToId === currentUser.id || t.assignedTo.toLowerCase() === currentUser.name.toLowerCase())
  );

  const myLeave = leaveRequests.filter(l =>
    l.staffName?.toLowerCase() === currentUser.name.toLowerCase() ||
    l.staffId === currentUser.id
  );
  const myPendingLeave = myLeave.filter(l => l.status === "Pending").length;
  const myApprovedLeave = myLeave.filter(l => l.status === "Approved").length;

  const unreadNotifs = notifications.filter(n => !n.read && (!n.company || n.company === currentUser.company)).length;

  // Attendance Calendar Calculations
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthName = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  
  const myAttendanceRecord = staffAttendance.find(a => 
    a.staffId === currentUser.id || a.staffName?.toLowerCase() === currentUser.name.toLowerCase()
  );
  
  const totalDaysInMonth = new Date(currentYear, now.getMonth() + 1, 0).getDate();
  const daysArray = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

  // My Payslips list
  const myPayslips = payroll.filter(p => 
    p.staffId === currentUser.id || p.staffName?.toLowerCase() === currentUser.name.toLowerCase()
  );

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="My Pending Tasks" value={myPendingTasks.length} icon={CheckSquare} sub="Open tasks" theme="amber" />
        <StatCard title="Leave Pending" value={myPendingLeave} icon={Clock} sub="Awaiting approval" theme="purple" />
        <StatCard title="Leave Approved" value={myApprovedLeave} icon={UserCheck} sub="This year" theme="emerald" />
        <StatCard title="Notifications" value={unreadNotifs} icon={Bell} sub="Unread" theme="rose" />
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={CheckSquare} title="My Pending Tasks" href="/tasks" linkLabel="View all" />
            {myPendingTasks.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">All caught up! 🎉</div>
              : <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                  {myPendingTasks.slice(0, 6).map(task => (
                    <div key={task.id} className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-slate-50 border border-amber-100 hover:border-amber-300 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate">{task.title}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Due: {formatDate(task.deadline)}</div>
                        </div>
                        <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase flex-shrink-0",
                          task.priority === "High" || task.priority === "Urgent" ? "bg-rose-100 text-rose-700" :
                          task.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}>{task.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Card>

          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Clock} title="My Leave Requests" href="/leave" linkLabel="Apply" />
            {myLeave.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No leave requests yet</div>
              : <div className="space-y-2.5 overflow-y-auto max-h-64 pr-1">
                  {myLeave.slice(0, 5).map(l => (
                    <div key={l.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{l.leaveType}</div>
                        <div className="text-[10px] text-slate-400">{formatDate(l.fromDate)} → {formatDate(l.toDate)}</div>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                  ))}
                </div>
            }
          </Card>
        </div>

        <div className="space-y-5">
          {/* Attendance Calendar */}
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Calendar} title="My Attendance Calendar" />
            <p className="text-[10px] text-slate-400 mb-3 font-medium">Monthly view for {currentMonthName} {currentYear}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} className="text-center text-[9px] font-bold text-slate-400 uppercase">{d}</div>
              ))}
              {daysArray.map(day => {
                const dayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const record = myAttendanceRecord?.records.find(r => r.date === dayStr);
                
                let bgClass = "bg-slate-50 text-slate-600 hover:bg-slate-100";
                let statusText = "No Record";
                if (record) {
                  if (record.status === "Present") {
                    bgClass = "bg-emerald-500 text-white shadow-xs font-bold";
                    statusText = "Present";
                  } else if (record.status === "Late") {
                    bgClass = "bg-amber-400 text-slate-900 shadow-xs font-bold";
                    statusText = `Late (${record.checkIn})`;
                  } else if (record.status === "Absent") {
                    bgClass = "bg-rose-500 text-white shadow-xs font-bold";
                    statusText = "Absent";
                  } else if (record.status === "Leave") {
                    bgClass = "bg-blue-500 text-white shadow-xs font-bold";
                    statusText = "On Leave";
                  }
                }
                
                const isTodayDay = day === now.getDate();
                
                return (
                  <div 
                    key={day} 
                    title={`Day ${day}: ${statusText}`} 
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-[10px] transition-all cursor-help relative", 
                      bgClass,
                      isTodayDay ? "ring-2 ring-blue-600 ring-offset-1" : ""
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2.5 flex-wrap mt-3 pt-2.5 border-t border-slate-100 text-[8px] font-bold text-slate-500 uppercase">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"/> Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400"/> Late</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500"/> Absent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500"/> Leave</span>
            </div>
          </Card>

          {/* Payslips */}
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={DollarSign} title="My Payslips" />
            {myPayslips.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No payslips generated yet</div>
              : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                  {myPayslips.map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all flex items-center justify-between cursor-pointer" onClick={() => setSelectedPayslip(p)}>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{p.month} {p.year}</div>
                        <div className="text-[10px] text-slate-400">Net Salary: AED {(p.netSalary || 0).toLocaleString()}</div>
                      </div>
                      <span className="text-[9px] bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-bold">View Payslip ↗</span>
                    </div>
                  ))}
                </div>
            }
          </Card>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <SectionHeader icon={Zap} title="Quick Access" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <ShortcutCard label="Attendance" href="/attendance" icon={Activity} color="green" permissionKey="attendance" />
          <ShortcutCard label="My Leave" href="/leave" icon={Clock} color="purple" permissionKey="leave" />
          <ShortcutCard label="My Tasks" href="/tasks" icon={CheckSquare} color="amber" permissionKey="tasks" />
          <ShortcutCard label="My Requests" href="/requests" icon={ClipboardList} color="cyan" permissionKey="requests" />
          <ShortcutCard label="Notifications" href="/notifications" icon={Bell} color="rose" />
        </div>
      </div>

      {/* Payslip Modal Dialog */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <Card className="w-full w-[95vw] sm:w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">MS HORIZON F.Z.E</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Official Payslip Statement</p>
              </div>
              <button 
                onClick={() => setSelectedPayslip(null)} 
                className="text-slate-400 hover:text-slate-600 font-black text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Employee Name:</span>
                <p className="font-bold text-slate-800">{selectedPayslip.staffName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Pay Period:</span>
                <p className="font-bold text-slate-800">{selectedPayslip.month} {selectedPayslip.year}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Company:</span>
                <p className="font-bold text-slate-800">{selectedPayslip.company}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Status:</span>
                <p className="font-bold text-emerald-600">PAID</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-b border-slate-100 pb-4 mb-4">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Basic Salary</span>
                <span>AED {(selectedPayslip.basicSalary || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-700">
                <span>Allowances (Housing, Transport, etc.)</span>
                <span>AED {(selectedPayslip.allowances || 0).toLocaleString()}</span>
              </div>
              {selectedPayslip.overtime > 0 && (
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span>Overtime Pay ({selectedPayslip.overtimeHours || 0} hrs)</span>
                  <span>AED {(selectedPayslip.overtime || 0).toLocaleString()}</span>
                </div>
              )}
              {selectedPayslip.deductions > 0 && (
                <div className="flex justify-between font-semibold text-rose-500">
                  <span>Deductions / Absences</span>
                  <span>- AED {(selectedPayslip.deductions || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-2xl mb-4">
              <span className="text-xs font-bold text-emerald-800">Net Salary (Paid)</span>
              <span className="text-base font-black text-emerald-800">AED {(selectedPayslip.netSalary || 0).toLocaleString()}</span>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedPayslip(null)} 
                className="text-xs rounded-xl"
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  toast.success("Initiating Print Dialog...");
                  window.print();
                }} 
                className="bg-blue-600 text-white font-bold text-xs rounded-xl h-10 px-4"
              >
                🖨️ Print / Download
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Recruiter dashboard ── */
function RecruiterDashboard({ fApplicants, fInterviews, placements, now, companies, currentUser }: {
  fApplicants: ReturnType<typeof useAuthStore.getState>["applicants"];
  fInterviews: ReturnType<typeof useAuthStore.getState>["interviews"];
  placements: ReturnType<typeof useAuthStore.getState>["placements"];
  now: Date;
  companies: ReturnType<typeof useAuthStore.getState>["companies"];
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
}) {
  const todayStr = now.toISOString().slice(0, 10);
  const pendingApp = fApplicants.filter(a => a.status === "Pending").length;
  const processingApp = fApplicants.filter(a => a.status === "Processing").length;
  const placedApp = fApplicants.filter(a => a.status === "Placed").length;
  const todayInterviews = fInterviews.filter(i => i.dateTime.startsWith(todayStr));

  const visaAlerts = fApplicants.filter(a => {
    if (!a.visaExpiry) return false;
    const days = Math.ceil((new Date(a.visaExpiry).getTime() - now.getTime()) / 86_400_000);
    return days <= 20;
  });

  const pieData = [
    { name: "Pending", value: pendingApp, color: "#F59E0B" },
    { name: "Processing", value: processingApp, color: "#3B82F6" },
    { name: "Placed", value: placedApp, color: "#10B981" },
    { name: "Rejected", value: fApplicants.filter(a => a.status === "Rejected").length, color: "#EF4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Applicants" value={fApplicants.length} icon={Users} sub={`${pendingApp} pending`} theme="blue" />
        <StatCard title="Processing" value={processingApp} icon={Activity} sub="In pipeline" theme="amber" />
        <StatCard title="Placed" value={placedApp} icon={UserCheck} sub="Successfully placed" theme="emerald" />
        <StatCard title="Visa Alerts" value={visaAlerts.length} icon={Shield} sub="Expiring ≤ 20 days" theme="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Users} title="Applicant Pipeline" />
          <div className="h-52">
            {pieData.length === 0
              ? <div className="flex h-full items-center justify-center text-xs text-slate-400">No data</div>
              : <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)" }} />
                    <Legend verticalAlign="bottom" iconSize={8} formatter={v => <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Calendar} title="Today's Interviews" href="/interviews" />
          {todayInterviews.length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No interviews today</div>
            : <div className="space-y-2.5 overflow-y-auto max-h-56 pr-1">
                {todayInterviews.map(int => (
                  <div key={int.id} className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{int.personName}</div>
                        <div className="text-[10px] text-slate-500">{int.type} · {int.position || int.meetingType}</div>
                      </div>
                      <StatusBadge status={int.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{int.dateTime.split(" ")[1]}</span>
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{int.mode}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>

      <div>
        <SectionHeader icon={Zap} title="Quick Access" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <ShortcutCard label="Add Applicant" href="/applicants/new" icon={Plus} color="blue" permissionKey="applicants" />
          <ShortcutCard label="Interviews" href="/interviews" icon={Calendar} color="purple" permissionKey="interviews" />
          <ShortcutCard label="Placements" href="/placement" icon={ClipboardList} color="green" permissionKey="placement" />
          <ShortcutCard label="Members" href="/members" icon={UserCheck} color="amber" permissionKey="members" />
          <ShortcutCard label="Visa Expiry" href="/visa-expiry" icon={Shield} color="rose" permissionKey="visaExpiry" />
        </div>
      </div>
    </div>
  );
}

/* ── HR Manager dashboard ── */
function HRDashboard({ fStaff, leaveRequests, staffRequests, staffAttendance, now, upcomingBirthdays, currentUser }: {
  fStaff: ReturnType<typeof useAuthStore.getState>["staff"];
  leaveRequests: ReturnType<typeof useAuthStore.getState>["leaveRequests"];
  staffRequests: ReturnType<typeof useAuthStore.getState>["staffRequests"];
  staffAttendance: ReturnType<typeof useAuthStore.getState>["staffAttendance"];
  now: Date;
  upcomingBirthdays: ReturnType<typeof useAuthStore.getState>["staff"];
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
}) {
  const userCompany = currentUser.company;
  const companyLeave = leaveRequests.filter(l => l.company === userCompany);
  const companyRequests = staffRequests.filter(r => r.company === userCompany);

  const pendingLeave = companyLeave.filter(l => l.status === "Pending").length;
  const pendingRequests = companyRequests.filter(r => r.status === "Pending").length;
  const activeStaff = fStaff.filter(s => s.status === "Active").length;

  const visaExpiring = fStaff.filter(s => {
    if (!s.visaExpiry) return false;
    const days = Math.ceil((new Date(s.visaExpiry).getTime() - now.getTime()) / 86_400_000);
    return days <= 20;
  }).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active Staff" value={activeStaff} icon={UserCheck} sub={`${fStaff.length} total`} theme="emerald" />
        <StatCard title="Leave Pending" value={pendingLeave} icon={Clock} sub="Awaiting approval" theme="amber" />
        <StatCard title="Staff Requests" value={pendingRequests} icon={ClipboardList} sub="Pending review" theme="purple" />
        <StatCard title="Visa Alerts" value={visaExpiring} icon={Shield} sub="Expiring ≤ 20 days" theme="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Pending Leave */}
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Clock} title="Pending Leave Requests" href="/leave" />
          {companyLeave.filter(l => l.status === "Pending").length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No pending requests</div>
            : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                {companyLeave.filter(l => l.status === "Pending").slice(0, 5).map(l => (
                  <div key={l.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{l.staffName}</div>
                      <div className="text-[10px] text-slate-400">{l.leaveType} · {formatDate(l.fromDate)}</div>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Staff Requests */}
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={ClipboardList} title="Staff Requests" href="/requests" />
          {companyRequests.filter(r => r.status === "Pending").length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No pending requests</div>
            : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                {companyRequests.filter(r => r.status === "Pending").slice(0, 5).map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{r.staffName}</div>
                      <div className="text-[10px] text-slate-400">{r.requestType}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Birthdays */}
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Cake} title="Upcoming Birthdays" href="/birthday" />
          {upcomingBirthdays.length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No birthdays this week</div>
            : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                {upcomingBirthdays.map(s => {
                  const b = new Date(s.birthday);
                  const isToday = b.getDate() === now.getDate() && b.getMonth() === now.getMonth();
                  return (
                    <div key={s.id} className={cn("p-3 rounded-xl border flex items-center gap-3", isToday ? "bg-pink-50 border-pink-200" : "bg-slate-50 border-slate-100")}>
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black text-sm">{s.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          {s.name}
                          {isToday && <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold bg-pink-500 text-white px-1.5 py-0.5 rounded-full uppercase"><Sparkles className="w-2.5 h-2.5" /> Today</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">{s.position}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Card>
      </div>

      <div>
        <SectionHeader icon={Zap} title="Quick Access" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <ShortcutCard label="Staff List" href="/staff" icon={Briefcase} color="green" permissionKey="staff" />
          <ShortcutCard label="Add Staff" href="/staff/new" icon={UserPlus} color="blue" permissionKey="staff" />
          <ShortcutCard label="Leave Requests" href="/leave" icon={Clock} color="purple" permissionKey="leave" />
          <ShortcutCard label="Attendance" href="/attendance" icon={Activity} color="amber" permissionKey="attendance" />
          <ShortcutCard label="Visa Expiry" href="/visa-expiry" icon={Shield} color="rose" permissionKey="visaExpiry" />
        </div>
      </div>
    </div>
  );
}

/* ── Accountant dashboard ── */
function AccountantDashboard({ payroll, fStaff, currentUser }: {
  payroll: ReturnType<typeof useAuthStore.getState>["payroll"];
  fStaff: ReturnType<typeof useAuthStore.getState>["staff"];
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
}) {
  const userCompany = currentUser.company;
  const companyPayroll = payroll.filter(p => p.company === userCompany);
  const draftPayroll = companyPayroll.filter(p => p.status === "Draft").length;
  const pendingPayroll = companyPayroll.filter(p => p.status === "Pending Approval").length;
  const approvedPayroll = companyPayroll.filter(p => p.status === "Approved").length;
  const paidPayroll = companyPayroll.filter(p => p.status === "Paid").length;
  const totalPayable = companyPayroll.filter(p => p.status === "Approved").reduce((sum, p) => sum + (p.netSalary || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Draft Payroll" value={draftPayroll} icon={FileSpreadsheet} sub="Pending preparation" theme="slate" />
        <StatCard title="Pending Approval" value={pendingPayroll} icon={AlertTriangle} sub="Awaiting sign-off" theme="amber" />
        <StatCard title="Approved" value={approvedPayroll} icon={UserCheck} sub="Ready for payment" theme="emerald" />
        <StatCard title="Total Staff" value={fStaff.filter(s => s.status === "Active").length} icon={Users} sub="Active staff" theme="blue" />
      </div>

      {approvedPayroll > 0 && (
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Payable (Approved)</p>
              <p className="text-3xl font-black text-slate-800 mt-1">AED {totalPayable.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={DollarSign} title="Recent Payroll Records" href="/payroll" />
          {companyPayroll.length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No payroll records</div>
            : <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                {companyPayroll.slice(0, 6).map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{p.staffName}</div>
                      <div className="text-[10px] text-slate-400">{p.month} {p.year}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">AED {(p.netSalary || 0).toLocaleString()}</div>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Users} title="Active Staff" href="/staff" />
          {fStaff.filter(s => s.status === "Active").length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No active staff</div>
            : <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                {fStaff.filter(s => s.status === "Active").slice(0, 6).map(s => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">{s.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{s.position}</div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>

      <div>
        <SectionHeader icon={Zap} title="Quick Access" />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <ShortcutCard label="Payroll" href="/payroll" icon={DollarSign} color="green" permissionKey="payroll" />
          <ShortcutCard label="Staff" href="/staff" icon={Briefcase} color="blue" permissionKey="staff" />
          <ShortcutCard label="Attendance" href="/attendance" icon={Activity} color="amber" permissionKey="attendance" />
          <ShortcutCard label="Reports" href="/reports" icon={BarChart3} color="purple" permissionKey="reports" />
        </div>
      </div>
    </div>
  );
}

/* ── Company Admin / Branch Admin dashboard ── */
function CompanyDashboard({ fApplicants, fStaff, fTasks, fInterviews, leaveRequests, staffRequests, payroll,
  vehicles, notifications, companies, now, upcomingBirthdays, visaAlerts, passportAlerts,
  currentUser, currentRole, isBranchAdmin }: {
  fApplicants: ReturnType<typeof useAuthStore.getState>["applicants"];
  fStaff: ReturnType<typeof useAuthStore.getState>["staff"];
  fTasks: ReturnType<typeof useAuthStore.getState>["tasks"];
  fInterviews: ReturnType<typeof useAuthStore.getState>["interviews"];
  leaveRequests: ReturnType<typeof useAuthStore.getState>["leaveRequests"];
  staffRequests: ReturnType<typeof useAuthStore.getState>["staffRequests"];
  payroll: ReturnType<typeof useAuthStore.getState>["payroll"];
  vehicles: ReturnType<typeof useAuthStore.getState>["vehicles"];
  notifications: ReturnType<typeof useAuthStore.getState>["notifications"];
  companies: ReturnType<typeof useAuthStore.getState>["companies"];
  now: Date;
  upcomingBirthdays: ReturnType<typeof useAuthStore.getState>["staff"];
  visaAlerts: (ReturnType<typeof useAuthStore.getState>["applicants"][0] | ReturnType<typeof useAuthStore.getState>["staff"][0])[];
  passportAlerts: (ReturnType<typeof useAuthStore.getState>["applicants"][0] | ReturnType<typeof useAuthStore.getState>["staff"][0])[];
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
  currentRole: string;
  isBranchAdmin: boolean;
}) {
  const { hasPermission } = useAuthStore();
  const userCompany = currentUser.company;
  const userBranch = currentUser.branch;
  const todayStr = now.toISOString().slice(0, 10);

  const companyLeave = leaveRequests.filter(l => l.company === userCompany);
  const companyRequests = staffRequests.filter(r => r.company === userCompany);
  const companyPayroll = payroll.filter(p => p.company === userCompany);
  const companyVehicles = vehicles.filter(v => v.company === userCompany);

  const pendingApp = fApplicants.filter(a => a.status === "Pending").length;
  const placedApp = fApplicants.filter(a => a.status === "Placed").length;
  const activeTasks = fTasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
  const urgentTasks = activeTasks.filter(t => t.priority === "High" || t.priority === "Urgent").length;
  const pendingLeave = companyLeave.filter(l => l.status === "Pending").length;
  const pendingRequests = companyRequests.filter(r => r.status === "Pending").length;
  const todayInterviews = fInterviews.filter(i => i.dateTime.startsWith(todayStr));
  const availableVehicles = companyVehicles.filter(v => v.status === "Available").length;
  const pendingPayroll = companyPayroll.filter(p => p.status === "Draft" || p.status === "Pending Approval").length;
  const unreadNotifs = notifications.filter(n => !n.read && n.company === userCompany).length;

  const pieData = [
    { name: "Pending", value: pendingApp, color: "#F59E0B" },
    { name: "Processing", value: fApplicants.filter(a => a.status === "Processing").length, color: "#3B82F6" },
    { name: "Placed", value: placedApp, color: "#10B981" },
    { name: "Rejected", value: fApplicants.filter(a => a.status === "Rejected").length, color: "#EF4444" },
  ].filter(d => d.value > 0);

  // Manager metrics calculations
  const totalTasks = fTasks.length;
  const pendingTasks = fTasks.filter(t => t.status === "Pending").length;
  const processingTasks = fTasks.filter(t => t.status === "Processing").length;
  const completedTasks = fTasks.filter(t => t.status === "Completed").length;
  const incompleteTasks = fTasks.filter(t => t.status === "Incomplete").length;
  const reassignedTasks = fTasks.filter(t => t.status === "Reassigned").length;
  
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const delayedTasks = fTasks.filter(t => {
    if (t.status === "Completed" || t.status === "Cancelled" || !t.deadline) return false;
    const dl = new Date(t.deadline.replace(" ", "T")).getTime();
    return dl < now.getTime();
  });

  const employeePerformance = fStaff.map(member => {
    const memberTasks = fTasks.filter(t => t.assignedToId === member.id || t.assignedTo.toLowerCase() === member.name.toLowerCase());
    const completed = memberTasks.filter(t => t.status === "Completed").length;
    return {
      name: member.name,
      position: member.position,
      completed,
      assigned: memberTasks.length
    };
  }).sort((a, b) => b.completed - a.completed);

  return (
    <div className="space-y-5">
      {/* Stats Grid - Scoped by Permissions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {hasPermission("applicants", "view") && <StatCard title="Total Applicants" value={fApplicants.length} icon={Users} sub={`${placedApp} placed`} theme="blue" />}
        {hasPermission("staff", "view") && <StatCard title="Active Staff" value={fStaff.filter(s => s.status === "Active").length} icon={UserCheck} sub={`${fStaff.length} total`} theme="emerald" />}
        {hasPermission("tasks", "view") && <StatCard title="Active Tasks" value={activeTasks.length} icon={CheckSquare} sub={`${urgentTasks} high priority`} theme="amber" />}
        {hasPermission("visaExpiry", "view") && <StatCard title="Visa Alerts" value={visaAlerts.length} icon={AlertTriangle} sub="Expiring ≤ 20 days" theme="rose" />}
        {hasPermission("leave", "view") && <StatCard title="Leave Pending" value={pendingLeave} icon={Clock} sub="Awaiting approval" theme="purple" />}
        {hasPermission("requests", "view") && <StatCard title="Staff Requests" value={pendingRequests} icon={ClipboardList} sub="Pending review" theme="cyan" />}
        {hasPermission("interviews", "view") && <StatCard title="Today Interviews" value={todayInterviews.length} icon={Calendar} sub="Scheduled today" theme="blue" />}
        {hasPermission("staff", "view") && <StatCard title="Passport Alerts" value={passportAlerts.length} icon={Shield} sub="Expiring ≤ 30 days" theme="amber" />}
        {!isBranchAdmin && hasPermission("vehicles", "view") && <StatCard title="Vehicles Available" value={availableVehicles} icon={Car} sub={`${companyVehicles.length} fleet`} theme="emerald" />}
        {hasPermission("payroll", "view") && <StatCard title="Payroll Pending" value={pendingPayroll} icon={FileSpreadsheet} sub="Awaiting approval" theme="rose" />}
        {unreadNotifs > 0 && <StatCard title="Notifications" value={unreadNotifs} icon={Bell} sub="Unread" theme="purple" />}
      </div>

      {/* Manager Specific Tasks Dashboard (Team Performance Leaderboard, Completion Rate & Delayed tasks) */}
      {hasPermission("tasks", "view") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Team Task Summary & Completion Rate */}
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={CheckSquare} title="Team Task Summary" />
            <div className="flex items-center justify-between mb-4 mt-2">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completion Rate</div>
                <div className="text-3xl font-black text-slate-800">{taskCompletionRate}%</div>
              </div>
              <div className="w-16 h-16 relative flex items-center justify-center bg-slate-50 rounded-full border border-slate-100">
                <span className="text-[10px] font-black text-slate-600">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                <div className="font-extrabold text-amber-700">{pendingTasks + processingTasks}</div>
                <div className="text-[9px] text-amber-600 font-semibold uppercase tracking-wider mt-0.5">Open</div>
              </div>
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                <div className="font-extrabold text-emerald-700">{completedTasks}</div>
                <div className="text-[9px] text-emerald-600 font-semibold uppercase tracking-wider mt-0.5">Completed</div>
              </div>
              <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                <div className="font-extrabold text-rose-700">{incompleteTasks}</div>
                <div className="text-[9px] text-rose-600 font-semibold uppercase tracking-wider mt-0.5">Incomplete</div>
              </div>
              <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                <div className="font-extrabold text-indigo-700">{reassignedTasks}</div>
                <div className="text-[9px] text-indigo-600 font-semibold uppercase tracking-wider mt-0.5">Reassigned</div>
              </div>
            </div>
          </Card>

          {/* Employee Performance Leaderboard */}
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Briefcase} title="Employee Performance" />
            <div className="space-y-2 overflow-y-auto max-h-48 pr-1 mt-2">
              {employeePerformance.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-semibold">No employee data found.</div>
              ) : employeePerformance.slice(0, 5).map(member => (
                <div key={member.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{member.name}</div>
                    <div className="text-[9px] text-slate-400">{member.position}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-black uppercase">{member.completed} Done</span>
                    <div className="text-[9px] text-slate-400 mt-1">{member.assigned} assigned</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Delayed Tasks Watchlist */}
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={AlertTriangle} title="Delayed Tasks Watchlist" />
            {delayedTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-semibold italic">All tasks on schedule! ✓</div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-48 pr-1 mt-2">
                {delayedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800 truncate">{task.title}</span>
                      <span className="text-[8px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full font-extrabold uppercase">Overdue</span>
                    </div>
                    <div className="text-[9px] text-rose-600 font-semibold">Assignee: {task.assignedTo}</div>
                    <div className="text-[9px] text-slate-500 font-medium">Due: {formatDate(task.deadline)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Charts Grid - Scoped by Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {hasPermission("applicants", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Users} title="Applicant Pipeline" />
            <div className="h-52">
              {pieData.length === 0
                ? <div className="flex h-full items-center justify-center text-xs text-slate-400">No data</div>
                : <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none" }} />
                      <Legend verticalAlign="bottom" iconSize={8} formatter={v => <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>
          </Card>
        )}

        {hasPermission("visaExpiry", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={AlertTriangle} title="Visa Expiry Watchlist" href="/visa-expiry" />
            {visaAlerts.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">All visas are valid ✓</div>
              : <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
                  {visaAlerts.slice(0, 5).map((person: any) => {
                    const days = Math.ceil((new Date(person.visaExpiry).getTime() - now.getTime()) / 86_400_000);
                    const expired = days <= 0;
                    return (
                      <div key={person.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${expired ? "bg-rose-500 text-white" : "bg-amber-100 text-amber-700"}`}>{expired ? "!" : days}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{person.fullName || person.name}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(person.visaExpiry)}</div>
                        </div>
                        <span className={`text-[9px] font-extrabold px-2 py-1 rounded-lg uppercase ${expired ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{expired ? "EXPIRED" : `${days}d`}</span>
                      </div>
                    );
                  })}
                </div>
            }
          </Card>
        )}
      </div>

      {/* Tasks + Interviews + Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {hasPermission("tasks", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={CheckSquare} title="Active Tasks" href="/tasks" />
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{activeTasks.length} Active</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{fTasks.filter(t => t.status === "Completed").length} Completed</span>
              {urgentTasks > 0 && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">{urgentTasks} Urgent</span>}
            </div>
            {activeTasks.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">All caught up! 🎉</div>
              : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                  {activeTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="text-xs font-bold text-slate-800 truncate">{task.title}</div>
                      <div className="text-[10px] text-slate-400">→ {task.assignedTo} · {formatDate(task.deadline)}</div>
                    </div>
                  ))}
                </div>
            }
          </Card>
        )}

        {hasPermission("interviews", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Calendar} title="Today's Schedule" href="/interviews" />
            {todayInterviews.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No meetings today</div>
              : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                  {todayInterviews.map(int => (
                    <div key={int.id} className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-xs font-bold text-slate-800">{int.personName}</div>
                      <div className="text-[10px] text-slate-400">{int.type} · {int.dateTime.split(" ")[1]} · {int.mode}</div>
                    </div>
                  ))}
                </div>
            }
          </Card>
        )}

        {hasPermission("leave", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Clock} title="Pending Leave Requests" href="/leave" />
            {companyLeave.filter(l => l.status === "Pending").length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-semibold">No pending leave requests</div>
              : <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1 mt-2">
                  {companyLeave.filter(l => l.status === "Pending").slice(0, 5).map(l => (
                    <div key={l.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{l.staffName}</div>
                        <div className="text-[10px] text-slate-500">{l.leaveType} · {formatDate(l.fromDate)} to {formatDate(l.toDate)}</div>
                      </div>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-800">{l.days} days</span>
                    </div>
                  ))}
                </div>
            }
          </Card>
        )}

        {hasPermission("requests", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={ClipboardList} title="Pending Requests" href="/requests" />
            {companyRequests.filter(r => r.status === "Pending").length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No pending requests</div>
              : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                  {companyRequests.filter(r => r.status === "Pending").slice(0, 5).map(r => (
                    <div key={r.id} className="p-3 rounded-xl bg-cyan-50 border border-cyan-100">
                      <div className="text-xs font-bold text-slate-800">{r.staffName}</div>
                      <div className="text-[10px] text-slate-400">{r.requestType}</div>
                    </div>
                  ))}
                </div>
            }
          </Card>
        )}

        {hasPermission("payroll", "view") && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={DollarSign} title="Recent Payroll" href="/payroll" />
            {companyPayroll.length === 0
              ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 font-semibold">No payroll records</div>
              : <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1 mt-2">
                  {companyPayroll.slice(0, 5).map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{p.staffName}</div>
                        <div className="text-[10px] text-slate-400">{p.month} {p.year}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800">AED {(p.netSalary || 0).toLocaleString()}</div>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Card>
        )}

        {hasPermission("staff", "view") && upcomingBirthdays.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
            <SectionHeader icon={Cake} title="Upcoming Birthdays" />
            <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1 mt-2">
              {upcomingBirthdays.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-pink-50/30 border border-pink-100">
                  <div className="w-8.5 h-8.5 rounded-full bg-pink-100 text-pink-700 font-bold text-xs flex items-center justify-center">
                    <Cake className="w-4 h-4 text-pink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{s.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{s.position}</div>
                  </div>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-pink-100 text-pink-800">{formatDate(s.birthday)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Quick shortcuts */}
      <div>
        <SectionHeader icon={Zap} title="Quick Access" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <ShortcutCard label="Add Applicant" href="/applicants/new" icon={Plus} color="blue" permissionKey="applicants" />
          <ShortcutCard label="Add Staff" href="/staff/new" icon={UserCheck} color="green" permissionKey="staff" />
          <ShortcutCard label="Create Task" href="/tasks" icon={CheckSquare} color="amber" permissionKey="tasks" />
          <ShortcutCard label="Interviews" href="/interviews" icon={Calendar} color="purple" permissionKey="interviews" />
          <ShortcutCard label="Attendance" href="/attendance" icon={Activity} color="cyan" permissionKey="attendance" />
          <ShortcutCard label="Reports" href="/reports" icon={BarChart3} color="slate" permissionKey="reports" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUPER ADMIN DASHBOARD (full system overview)
   ═══════════════════════════════════════════════ */
function SuperAdminDashboard({ applicants, staff, tasks, interviews, leaveRequests, staffRequests,
  vehicles, notifications, companies, payroll, staffAttendance, saveAttendance, addActivityLog, updatePayroll, now }: {
  applicants: ReturnType<typeof useAuthStore.getState>["applicants"];
  staff: ReturnType<typeof useAuthStore.getState>["staff"];
  tasks: ReturnType<typeof useAuthStore.getState>["tasks"];
  interviews: ReturnType<typeof useAuthStore.getState>["interviews"];
  leaveRequests: ReturnType<typeof useAuthStore.getState>["leaveRequests"];
  staffRequests: ReturnType<typeof useAuthStore.getState>["staffRequests"];
  vehicles: ReturnType<typeof useAuthStore.getState>["vehicles"];
  notifications: ReturnType<typeof useAuthStore.getState>["notifications"];
  companies: ReturnType<typeof useAuthStore.getState>["companies"];
  payroll: ReturnType<typeof useAuthStore.getState>["payroll"];
  staffAttendance: ReturnType<typeof useAuthStore.getState>["staffAttendance"];
  saveAttendance: ReturnType<typeof useAuthStore.getState>["saveAttendance"];
  addActivityLog: ReturnType<typeof useAuthStore.getState>["addActivityLog"];
  updatePayroll: ReturnType<typeof useAuthStore.getState>["updatePayroll"];
  now: Date;
}) {
  const todayStr = now.toISOString().slice(0, 10);

  const pendingApp = applicants.filter(a => a.status === "Pending").length;
  const processingApp = applicants.filter(a => a.status === "Processing").length;
  const placedApp = applicants.filter(a => a.status === "Placed").length;
  const rejectedApp = applicants.filter(a => a.status === "Rejected").length;
  const activeTasks = tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
  const urgentTasks = activeTasks.filter(t => t.priority === "High" || t.priority === "Urgent").length;
  const pendingLeave = leaveRequests.filter(l => l.status === "Pending").length;
  const pendingRequests = staffRequests.filter(r => r.status === "Pending").length;
  const unreadNotifs = notifications.filter(n => !n.read).length;
  const todayInterviews = interviews.filter(i => i.dateTime.startsWith(todayStr));
  const todayMeetings = todayInterviews.filter(i => i.type === "Meeting");
  const todayOnlyInterviews = todayInterviews.filter(i => i.type === "Interview");
  const availableVehicles = vehicles.filter(v => v.status === "Available").length;
  const pendingPayroll = payroll.filter(p => p.status === "Draft" || p.status === "Pending Approval").length;

  const visaAlerts = [...applicants, ...staff].filter(p => {
    if (!p.visaExpiry) return false;
    const days = Math.ceil((new Date(p.visaExpiry).getTime() - now.getTime()) / 86_400_000);
    return days <= 20;
  });

  const passportAlerts = [...applicants, ...staff].filter(p => {
    const exp = (p as any).passportExpiry;
    if (!exp) return false;
    const days = Math.ceil((new Date(exp).getTime() - now.getTime()) / 86_400_000);
    return days <= 30;
  });

  const upcomingBirthdays = staff.filter(s => {
    if (!s.birthday) return false;
    const b = new Date(s.birthday);
    const tDay = now.getDate(), tMonth = now.getMonth();
    return b.getMonth() === tMonth && b.getDate() >= tDay && b.getDate() <= tDay + 7;
  });

  const pieData = [
    { name: "Pending", value: pendingApp, color: "#F59E0B" },
    { name: "Processing", value: processingApp, color: "#3B82F6" },
    { name: "Placed", value: placedApp, color: "#10B981" },
    { name: "Rejected", value: rejectedApp, color: "#EF4444" },
  ].filter(d => d.value > 0);

  const barData = [
    { name: "Jan", Placements: 4 }, { name: "Feb", Placements: 6 },
    { name: "Mar", Placements: 8 }, { name: "Apr", Placements: 12 },
    { name: "May", Placements: 15 }, { name: "Jun", Placements: placedApp },
  ];

  const areaData = [
    { name: "Mon", Present: 9, Absent: 0, Late: 1 }, { name: "Tue", Present: 8, Absent: 1, Late: 1 },
    { name: "Wed", Present: 10, Absent: 0, Late: 0 }, { name: "Thu", Present: 7, Absent: 2, Late: 1 },
    { name: "Fri", Present: 9, Absent: 0, Late: 1 },
  ];

  // Company-wise stats
  const companyStats = companies.map(c => ({
    name: c.name,
    applicants: applicants.filter(a => a.company === c.name).length,
    staff: staff.filter(s => s.company === c.name).length,
    status: c.status
  }));

  // Super Admin payroll metrics
  const totalMonthlyCost = payroll.filter(p => p.status === "Approved" || p.status === "Paid").reduce((sum, p) => sum + (p.netSalary || 0), 0);
  const totalOvertimeHours = payroll.reduce((sum, p) => sum + (p.overtimeHours || 0), 0);
  const totalOvertimeCost = payroll.reduce((sum, p) => sum + (p.overtime || 0), 0);

  return (
    <div className="space-y-5">
      {/* Main stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard title="Total Applicants" value={applicants.length} icon={Users} sub={`${placedApp} placed`} trend={{ val: "12%", up: true }} theme="blue" />
        <StatCard title="Active Staff" value={staff.filter(s => s.status === "Active").length} icon={UserCheck} sub={`${staff.length} total`} trend={{ val: "3%", up: true }} theme="emerald" />
        <StatCard title="Active Tasks" value={activeTasks.length} icon={CheckSquare} sub={`${urgentTasks} high priority`} theme="amber" />
        <StatCard title="Visa Warnings" value={visaAlerts.length} icon={AlertTriangle} sub="Expiring ≤ 20 days" theme="rose" />
        <StatCard title="Companies" value={companies.length} icon={Building2} sub="Active tenants" theme="purple" />
        <StatCard title="Leave Requests" value={pendingLeave} icon={Clock} sub="Awaiting approval" theme="cyan" />
        <StatCard title="Staff Requests" value={pendingRequests} icon={ClipboardList} sub="Pending review" theme="blue" />
        <StatCard title="Today Interviews" value={todayOnlyInterviews.length} icon={Calendar} sub={`${todayMeetings.length} meetings`} theme="emerald" />
        <StatCard title="Passport Alerts" value={passportAlerts.length} icon={Shield} sub="Expiring ≤ 30 days" theme="amber" />
        <StatCard title="Vehicles Available" value={availableVehicles} icon={Car} sub={`${vehicles.length} total fleet`} theme="cyan" />
        <StatCard title="Placed Applicants" value={placedApp} icon={UserCheck} sub="Successfully placed" theme="emerald" />
        <StatCard title="Payroll Pending" value={pendingPayroll} icon={FileSpreadsheet} sub="Awaiting approval" theme="rose" />
      </div>

      {/* Quick shortcuts */}
      <div>
        <SectionHeader icon={Zap} title="Quick Access" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <ShortcutCard label="Add Applicant" href="/applicants/new" icon={Plus} color="blue" />
          <ShortcutCard label="Add Staff" href="/staff/new" icon={UserCheck} color="green" />
          <ShortcutCard label="Create Task" href="/tasks" icon={CheckSquare} color="amber" />
          <ShortcutCard label="Schedule Meeting" href="/interviews" icon={Calendar} color="purple" />
          <ShortcutCard label="Add Vehicle" href="/vehicles" icon={Car} color="rose" />
          <ShortcutCard label="Reports" href="/reports" icon={BarChart3} color="slate" />
        </div>
      </div>

      {/* Super Admin Payroll Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Payroll Stats Widget */}
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col justify-between">
          <SectionHeader icon={DollarSign} title="Payroll Cost Audit" />
          <div className="space-y-4 my-2">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Total Monthly Cost</span>
                <p className="text-xl font-black text-emerald-950 mt-0.5">AED {totalMonthlyCost.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600 opacity-80" />
            </div>

            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">Overtime Summary</span>
                <p className="text-xl font-black text-blue-950 mt-0.5">AED {totalOvertimeCost.toLocaleString()}</p>
                <span className="text-[9px] text-blue-500 font-semibold">{totalOvertimeHours} total overtime hours</span>
              </div>
              <Clock className="w-8 h-8 text-blue-600 opacity-80" />
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button 
              onClick={() => {
                exportToCSV(payroll.map(p => ({
                  ID: p.id,
                  Employee: p.staffName,
                  Company: p.company,
                  Period: `${p.month} ${p.year}`,
                  Basic: p.basicSalary,
                  Allowances: p.allowances || 0,
                  Deductions: p.deductions || 0,
                  NetPay: p.netSalary,
                  Status: p.status
                })), "salary_audit_report");
                toast.success("CSV salary audit report exported!");
              }} 
              className="flex-1 bg-slate-800 text-white font-bold text-xs h-10 rounded-xl"
            >
              Export CSV Report
            </Button>
            <Button 
              onClick={() => {
                toast.success("Preparing PDF salary breakdown audit report...");
                window.print();
              }}
              variant="outline"
              className="flex-1 text-slate-700 font-bold text-xs h-10 border-slate-200 rounded-xl"
            >
              Print Audit PDF
            </Button>
          </div>
        </Card>

        {/* Pending Payroll Approvals List with Quick Actions */}
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 lg:col-span-2 flex flex-col">
          <SectionHeader icon={FileSpreadsheet} title="Pending Payroll Approvals" />
          <div className="flex-1 overflow-y-auto max-h-56 pr-1 mt-2 min-h-0">
            {payroll.filter(p => p.status === "Pending Approval").length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold italic text-center py-6">No pending payroll approvals.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Company</th>
                    <th className="pb-2">Month</th>
                    <th className="pb-2">Net Salary</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.filter(p => p.status === "Pending Approval").map(p => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-800">{p.staffName}</td>
                      <td className="py-2.5 text-slate-500">{p.company}</td>
                      <td className="py-2.5 font-semibold text-slate-700">{p.month} {p.year}</td>
                      <td className="py-2.5 font-black text-slate-800">AED {(p.netSalary || 0).toLocaleString()}</td>
                      <td className="py-2.5 text-right space-x-1">
                        <Button 
                          onClick={() => {
                            updatePayroll({ ...p, status: "Approved" });
                            toast.success(`Approved payroll for ${p.staffName}`);
                          }} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] h-7 px-2.5 rounded-lg"
                        >
                          Approve
                        </Button>
                        <Button 
                          onClick={() => {
                            updatePayroll({ ...p, status: "Draft" });
                            toast.info(`Rejected payroll for ${p.staffName}`);
                          }} 
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] h-7 px-2.5 rounded-lg border-0"
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Users} title="Applicant Pipeline" />
          <div className="h-52 mt-2">
            {pieData.length === 0
              ? <div className="flex h-full items-center justify-center text-xs text-slate-400">No data</div>
              : <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.12)" }} />
                    <Legend verticalAlign="bottom" iconSize={8} formatter={v => <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={TrendingUp} title="Placement Trend" />
          <div className="h-52 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none" }} />
                <Bar dataKey="Placements" radius={[5, 5, 0, 0]} fill="url(#barGrad)" />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Activity} title="Attendance Overview" />
          <div className="h-52 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "none" }} />
                <Legend verticalAlign="top" height={28} iconSize={7} formatter={v => <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b" }}>{v}</span>} />
                <Area type="monotone" dataKey="Present" stroke="#10b981" fill="url(#gPresent)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Company-wise overview (Super Admin only) */}
      <Card className="rounded-2xl border-0 shadow-md bg-white p-5">
        <SectionHeader icon={Building2} title="Company-wise Overview" href="/companies" linkLabel="Manage" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {companyStats.slice(0, 6).map(c => (
            <div key={c.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-800 truncate flex-1 mr-2">{c.name}</div>
                <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase", c.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>{c.status}</span>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-sm font-black text-blue-600">{c.applicants}</div>
                  <div className="text-[9px] text-slate-400 font-medium">Applicants</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-black text-emerald-600">{c.staff}</div>
                  <div className="text-[9px] text-slate-400 font-medium">Staff</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Alerts + Birthdays + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Shield} title="Visa Expiry Watchlist" href="/visa-expiry" />
          {visaAlerts.length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">All visas valid ✓</div>
            : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                {visaAlerts.slice(0, 5).map((person: any) => {
                  const days = Math.ceil((new Date(person.visaExpiry).getTime() - now.getTime()) / 86_400_000);
                  return (
                    <div key={person.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${days <= 0 ? "bg-rose-500 text-white" : "bg-amber-100 text-amber-700"}`}>{days <= 0 ? "!" : days}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">{person.fullName || person.name}</div>
                        <div className="text-[10px] text-slate-400">{person.company} · {formatDate(person.visaExpiry)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={Cake} title="Birthday Celebrations" href="/birthday" />
          {upcomingBirthdays.length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">No birthdays this week</div>
            : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                {upcomingBirthdays.map(s => {
                  const b = new Date(s.birthday);
                  const isToday = b.getDate() === now.getDate() && b.getMonth() === now.getMonth();
                  return (
                    <div key={s.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", isToday ? "bg-pink-50 border-pink-200" : "bg-slate-50 border-slate-100")}>
                      <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600 font-black">{s.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1 truncate">
                          {s.name}
                          {isToday && <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold bg-pink-500 text-white px-1.5 py-0.5 rounded-full uppercase"><Sparkles className="w-2.5 h-2.5" />Today</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{s.company}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Card>

        <Card className="rounded-2xl border-0 shadow-md bg-white p-5 flex flex-col">
          <SectionHeader icon={CheckSquare} title="Active Tasks" href="/tasks" />
          {activeTasks.length === 0
            ? <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400">All caught up! 🎉</div>
            : <div className="space-y-2 overflow-y-auto max-h-60 pr-1">
                {activeTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">{task.title}</div>
                        <div className="text-[10px] text-slate-400">→ {task.assignedTo}</div>
                      </div>
                      <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase flex-shrink-0",
                        task.priority === "High" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                      )}>{task.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>
    </div>
  );
}

function AttendanceWidget({ currentUser, now, staffAttendance, saveAttendance, addActivityLog, staff, shifts }: {
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
  now: Date;
  staffAttendance: ReturnType<typeof useAuthStore.getState>["staffAttendance"];
  saveAttendance: ReturnType<typeof useAuthStore.getState>["saveAttendance"];
  addActivityLog: ReturnType<typeof useAuthStore.getState>["addActivityLog"];
  staff: ReturnType<typeof useAuthStore.getState>["staff"];
  shifts: ReturnType<typeof useAuthStore.getState>["shifts"];
}) {
  const todayStr = now.toISOString().slice(0, 10);
  const month = now.toLocaleDateString("en-US", { month: "short" });
  const year = now.getFullYear();

  const loggedInStaff = staff.find(s =>
    s.email.toLowerCase() === currentUser.email.toLowerCase() ||
    s.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  const lookupId = loggedInStaff?.id || currentUser.id;

  const myAttendanceRecord = staffAttendance.find(a =>
    a.staffId === lookupId && a.month === month && a.year === year
  );
  const todayAttendance = myAttendanceRecord?.records.find(r => r.date === todayStr);
  const hasCheckedIn = !!todayAttendance;

  const calcHours = (t1: string, t2: string) => {
    const d1 = new Date(`2000-01-01T${t1}`);
    const d2 = new Date(`2000-01-01T${t2}`);
    let df = (d2.getTime() - d1.getTime()) / 3_600_000;
    if (df < 0) df += 24;
    return parseFloat(df.toFixed(2));
  };

  const handleCheckIn = () => {
    const checkInTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    
    // Find staff shift
    const staffShift = shifts.find(s => s.id === loggedInStaff?.shiftId);
    const shiftIn = staffShift ? (staffShift.clockIn || staffShift.startTime || "09:00") : "09:00";
    const grace = staffShift ? (staffShift.gracePeriod || 0) : 15;
    
    let status: "Present" | "Late" | "Absent" | "Leave" | "Half Day" = "Present";
    let lateArrival = 0;
    try {
      const [empInH, empInM] = checkInTime.split(":").map(Number);
      const [shInH, shInM] = shiftIn.split(":").map(Number);
      const empInMin = empInH * 60 + empInM;
      const shInMin = shInH * 60 + shInM;
      if (empInMin > (shInMin + grace)) {
        status = "Late" as const;
        lateArrival = empInMin - shInMin;
      }
    } catch (e) {}

    const newRecord = { 
      date: todayStr, 
      status, 
      checkIn: checkInTime, 
      checkOut: "", 
      workingHours: 0, 
      overtime: 0,
      lateArrival,
      earlyLeaving: 0
    };

    if (myAttendanceRecord) {
      saveAttendance({ ...myAttendanceRecord, records: [...myAttendanceRecord.records.filter(r => r.date !== todayStr), newRecord] });
    } else {
      saveAttendance({ staffId: lookupId, staffName: currentUser.name, month, year, records: [newRecord] });
    }
    
    addActivityLog({
      id: `LOG-${Date.now()}`, dateTime: now.toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch,
      action: "Created", module: "Attendance", oldValue: null, newValue: `Checked in at ${checkInTime} (Status: ${status}, Late: ${lateArrival}m)`, ipAddress: "192.168.1.102"
    });
    
    // Send check-in email notification
    toast.success(`Successfully checked in! Status: ${status}`);
  };

  const handleCheckOut = () => {
    if (!myAttendanceRecord || !todayAttendance) return;
    const checkoutTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    
    // Calculate working hours
    const checkInStr = todayAttendance.checkIn || "09:00";
    const workingHours = calcHours(checkInStr, checkoutTime);
 
    // Calculate shift details
    const staffShift = shifts.find(s => s.id === loggedInStaff?.shiftId);
    const shiftIn = staffShift ? (staffShift.clockIn || staffShift.startTime || "09:00") : "09:00";
    const shiftOut = staffShift ? (staffShift.clockOut || staffShift.endTime || "18:00") : "18:00";
    const breakMin = staffShift ? (staffShift.breakDuration || 0) : 60;
    const breakHours = breakMin / 60;

    const netWorkingHours = Math.max(0, workingHours - breakHours);
    const shiftElapsed = calcHours(shiftIn, shiftOut);
    const isOTEligible = staffShift ? staffShift.overtimeEligible !== "No" : true;
    
    const overtime = (workingHours > shiftElapsed && isOTEligible) 
      ? parseFloat((workingHours - shiftElapsed).toFixed(2)) 
      : 0;

    let earlyLeaving = 0;
    try {
      const [empOutH, empOutM] = checkoutTime.split(":").map(Number);
      const [shOutH, shOutM] = shiftOut.split(":").map(Number);
      const empOutMin = empOutH * 60 + empOutM;
      const shOutMin = shOutH * 60 + shOutM;
      if (empOutMin < shOutMin) {
        earlyLeaving = shOutMin - empOutMin;
      }
    } catch (e) {}

    saveAttendance({
      ...myAttendanceRecord,
      records: [
        ...myAttendanceRecord.records.filter(r => r.date !== todayStr),
        { 
          ...todayAttendance, 
          checkOut: checkoutTime, 
          workingHours: parseFloat(netWorkingHours.toFixed(2)), 
          overtime,
          earlyLeaving
        }
      ]
    });

    addActivityLog({
      id: `LOG-${Date.now()}`, dateTime: now.toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch,
      action: "Edited", module: "Attendance", oldValue: `Checked in at ${todayAttendance.checkIn}`, newValue: `Checked out at ${checkoutTime} (Worked: ${netWorkingHours.toFixed(2)}h, OT: ${overtime}h, Early Leave: ${earlyLeaving}m)`, ipAddress: "192.168.1.102"
    });

    toast.success(`Successfully checked out! Worked: ${netWorkingHours.toFixed(2)}h, OT: ${overtime}h`);
  };

  return (
    <Card className="rounded-3xl border-0 shadow-xl bg-white p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-60" />
      <div className="flex items-center gap-5 z-10">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${hasCheckedIn ? "bg-emerald-500 shadow-emerald-200" : "bg-blue-600 shadow-blue-200"}`}>
          {hasCheckedIn && todayAttendance?.checkOut ? <LogOut className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Daily Attendance</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            {hasCheckedIn && todayAttendance?.checkOut
              ? `Checked out at ${todayAttendance.checkOut}`
              : hasCheckedIn
                ? `Checked in at ${todayAttendance?.checkIn}. Have a great shift!`
                : "You haven't checked in for today yet."}
          </p>
        </div>
      </div>
      <div className="flex gap-3 w-full md:w-auto z-10">
        {!hasCheckedIn ? (
          <Button onClick={handleCheckIn} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-emerald-200 gap-2">
            <LogIn className="w-5 h-5" /> Check In Now
          </Button>
        ) : (
          <Button onClick={handleCheckOut} disabled={!!todayAttendance?.checkOut} className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl h-12 px-8 shadow-lg shadow-amber-200 gap-2">
            <LogOut className="w-5 h-5" /> {todayAttendance?.checkOut ? "Checked Out" : "Check Out"}
          </Button>
        )}
        <Link href="/leave">
          <Button variant="outline" className="rounded-xl h-12 px-5 border-slate-200 text-slate-700 font-bold">Apply Leave</Button>
        </Link>
      </div>
    </Card>
  );
}

/* ════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ════════════════════════════════════════════ */
export default function DashboardPage() {
  const {
    currentRole, currentUser,
    applicants, staff, tasks, interviews, leaveRequests, staffRequests,
    vehicles, notifications, companies, payroll,
    staffAttendance, saveAttendance, addActivityLog, placements, shifts, updatePayroll,
    initStore, isStoreLoaded
  } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const now = useLiveDate();

  useEffect(() => { 
    setMounted(true); 
    if (initStore) {
      initStore().catch(console.error);
    }
  }, [initStore]);

  if (!mounted) return null;

  if (!isStoreLoaded) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-12 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const loggedInStaffRecord = staff.find(s =>
    s.email.toLowerCase() === currentUser.email.toLowerCase() ||
    s.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  const staffPosition = loggedInStaffRecord?.position?.toLowerCase() || "";
  const roleName = currentRole.toLowerCase();

  const isSuperAdmin = roleName === "super admin" || staffPosition === "super admin";
  const isCompanyAdmin = roleName === "company admin" || staffPosition === "company admin";
  const isBranchAdmin = roleName === "branch admin" || staffPosition === "branch admin";
  const isHRManager = roleName === "hr manager" || staffPosition === "hr manager" || staffPosition === "hr" || staffPosition === "hr operations" || staffPosition === "hr assistant";
  const isRecruiter = roleName === "recruiter" || staffPosition === "recruiter" || staffPosition === "recruitment coordinator" || staffPosition === "recruitment manager";
  const isAccountant = roleName === "accountant" || staffPosition === "accountant" || staffPosition === "finance manager" || staffPosition === "accounts executive";
  const isStaff = roleName === "staff" || staffPosition === "staff" || (!isSuperAdmin && !isCompanyAdmin && !isBranchAdmin && !isHRManager && !isRecruiter && !isAccountant);

  const userCompany = currentUser.company;
  const userBranch = currentUser.branch;

  // Treat company="System" users same as Super Admin for data scoping
  const isSystemWide = isSuperAdmin || currentUser.company === "System";

  // Scoped data based on role
  const applyBranchFilter = (list: any[]) => {
    if (isSystemWide || isCompanyAdmin || userBranch === "All") return list;
    return list.filter(item => !item.branch || item.branch === userBranch);
  };

  const fApplicants = applyBranchFilter(isSystemWide ? applicants : applicants.filter(a => a.company === userCompany));
  const fStaff = applyBranchFilter(isSystemWide ? staff : staff.filter(s => s.company === userCompany));
  
  const fTasks = isSystemWide ? tasks : isCompanyAdmin
    ? tasks.filter(t => t.company === userCompany)
    : isStaff
      ? tasks.filter(t => t.company === userCompany && (
          t.assignedToId === currentUser.id ||
          t.assignedTo.toLowerCase() === currentUser.name.toLowerCase() ||
          t.createdBy === currentUser.name
        ))
      : tasks.filter(t => t.company === userCompany && t.branch === userBranch);

  const fInterviews = applyBranchFilter(isSystemWide ? interviews : interviews.filter(i => i.company === userCompany));

  const visaAlerts = [...fApplicants, ...fStaff].filter((p: any) => {
    if (!p.visaExpiry) return false;
    const days = Math.ceil((new Date(p.visaExpiry).getTime() - now.getTime()) / 86_400_000);
    return days <= 20;
  });

  const passportAlerts = [...fApplicants, ...fStaff].filter((p: any) => {
    const exp = p.passportExpiry;
    if (!exp) return false;
    const days = Math.ceil((new Date(exp).getTime() - now.getTime()) / 86_400_000);
    return days <= 30;
  });

  const upcomingBirthdays = fStaff.filter(s => {
    if (!s.birthday) return false;
    const b = new Date(s.birthday);
    const tDay = now.getDate(), tMonth = now.getMonth();
    return b.getMonth() === tMonth && b.getDate() >= tDay && b.getDate() <= tDay + 7;
  });

  const isBirthdayToday = (() => {
    if (!loggedInStaffRecord?.birthday) return false;
    const b = new Date(loggedInStaffRecord.birthday);
    return b.getDate() === now.getDate() && b.getMonth() === now.getMonth();
  })();

  const liveDateLabel = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const unreadNotifs = notifications.filter(n => !n.read && (!n.company || n.company === userCompany || isSuperAdmin)).length;

  // Role label for hero
  const displayPosition = loggedInStaffRecord?.position || currentRole;
  const roleLabel = isSuperAdmin ? "Super Administrator" : isCompanyAdmin ? `Company Admin · ${userCompany}` :
    isBranchAdmin ? `Branch Admin · ${userBranch}` : `${displayPosition} · ${userCompany}`;

  const heroGradient = isSuperAdmin
    ? "from-blue-600 via-blue-700 to-violet-700"
    : isCompanyAdmin || isBranchAdmin
      ? "from-slate-700 via-slate-800 to-blue-900"
      : isHRManager
        ? "from-emerald-600 via-emerald-700 to-teal-800"
        : isRecruiter
          ? "from-violet-600 via-violet-700 to-purple-800"
          : isAccountant
            ? "from-amber-600 via-amber-700 to-orange-800"
            : "from-slate-700 via-slate-800 to-slate-900";

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20 pb-32 md:pb-6">
      <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* Birthday banner */}
        {isBirthdayToday && (
          <AlertBanner type="success"
            message={`🎉 Happy Birthday, ${currentUser.name}! 🎂 Wishing you a fantastic year!`}
            className="rounded-2xl border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 shadow-sm" />
        )}

        {/* Hero header */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroGradient} p-6 md:p-8 text-white shadow-2xl`}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full bg-white/5 translate-y-1/2" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span className="text-blue-200 text-xs font-semibold uppercase tracking-widest">{roleLabel}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Welcome back, {currentUser.name.split(" ")[0]} 👋
              </h1>
              <p className="text-white/70 text-sm mt-1 font-medium">
                {isSuperAdmin
                  ? "Full system overview — all companies and branches"
                  : isCompanyAdmin
                    ? `Managing ${userCompany}`
                    : isBranchAdmin
                      ? `Managing ${userBranch} · ${userCompany}`
                      : isStaff
                        ? "Your personal workspace"
                        : `${displayPosition} dashboard`}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/20">
                <Calendar className="w-4 h-4 text-blue-200" />
                <div>
                  <div className="text-xs font-bold text-white">{liveDateLabel}</div>
                  <div className="text-[10px] text-blue-300 font-medium">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
              {unreadNotifs > 0 && (
                <Link href="/notifications"
                  className="flex items-center gap-1.5 bg-rose-500/90 hover:bg-rose-500 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors">
                  <Bell className="w-3.5 h-3.5" />
                  {unreadNotifs} unread notification{unreadNotifs !== 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>

          {/* Mini KPI strip — scoped data */}
          {!isStaff && (
            <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: isSuperAdmin ? "All Applicants" : "Applicants", val: fApplicants.length, color: "bg-white/10 border-white/20" },
                { label: "Active Staff", val: fStaff.filter(s => s.status === "Active").length, color: "bg-white/10 border-white/20" },
                { label: "Active Tasks", val: fTasks.filter(t => t.status !== "Completed").length, color: "bg-amber-500/30 border-amber-300/30" },
                { label: "Completed", val: fTasks.filter(t => t.status === "Completed").length, color: "bg-emerald-500/30 border-emerald-300/30" },
              ].map(k => (
                <div key={k.label} className={`${k.color} rounded-xl border px-4 py-2.5`}>
                  <div className="text-xl font-black">{k.val}</div>
                  <div className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(!isStaff && !isAccountant) && (
          <ApplicantAnalyticsWidget applicants={fApplicants} isSuperAdmin={isSuperAdmin} isCompanyAdmin={isCompanyAdmin} />
        )}

        {/* Attendance widget — Super Admin sees system-wide summary; others see personal check-in */}
        <div className="mb-2">
          {isSuperAdmin ? (() => {
            const todayStr = now.toISOString().slice(0, 10);
            let present = 0, absent = 0, late = 0, leave = 0;
            staffAttendance.forEach(sa => {
              const rec = (sa.records || []).find((r: any) => r.date === todayStr);
              if (!rec) return;
              if (rec.status === "Present" || rec.status === "Work From Home") present++;
              else if (rec.status === "Absent") absent++;
              else if (rec.status === "Late") late++;
              else if (rec.status === "Leave" || rec.status === "Half Day") leave++;
            });
            const totalMarked = present + absent + late + leave;
            const notMarked = Math.max(0, staff.length - totalMarked);
            const currentMonth = now.toLocaleString("en-US", { month: "short" });
            const currentYear = now.getFullYear();
            const monthPayroll = payroll.filter((p: any) => p.month && p.month.includes(currentMonth) && (p.year === currentYear || String(p.month).startsWith(String(currentYear))));
            const totalPayroll = monthPayroll.reduce((acc: number, p: any) => acc + (Number(p.netSalary) || 0), 0);
            return (
              <Card className="rounded-3xl border-0 shadow-xl bg-white p-6 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60" />
                <div className="flex items-center justify-between mb-5 z-10 relative">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">System Attendance Overview</h2>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Today · {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                  </div>
                  <Link href="/attendance">
                    <Button variant="outline" className="rounded-xl h-9 px-4 border-slate-200 text-blue-600 font-bold text-xs gap-1.5 hover:bg-blue-50">
                      <Users className="w-3.5 h-3.5" /> Manage Attendance
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 z-10 relative">
                  {[
                    { label: "Total Staff", value: staff.length, color: "text-blue-600", bg: "bg-blue-50", icon: Users },
                    { label: "Present", value: present, color: "text-emerald-600", bg: "bg-emerald-50", icon: UserCheck },
                    { label: "Absent", value: absent, color: "text-rose-600", bg: "bg-rose-50", icon: AlertTriangle },
                    { label: "Late", value: late, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
                    { label: "On Leave", value: leave, color: "text-slate-600", bg: "bg-slate-100", icon: Calendar },
                    { label: "Not Marked", value: notMarked, color: "text-gray-400", bg: "bg-gray-100", icon: CheckSquare },
                  ].map((stat, i) => (
                    <div key={i} className={`rounded-2xl ${stat.bg} p-3.5 flex flex-col items-center text-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
                      <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {totalPayroll > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-between z-10 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-600">Monthly Payroll ({currentMonth} {currentYear})</div>
                        <div className="text-[10px] text-slate-400">{monthPayroll.length} payslip{monthPayroll.length !== 1 ? "s" : ""} processed</div>
                      </div>
                    </div>
                    <div className="text-xl font-black text-indigo-700">AED {totalPayroll.toLocaleString()}</div>
                  </div>
                )}
              </Card>
            );
          })() : (
            <AttendanceWidget
              currentUser={currentUser}
              now={now}
              staffAttendance={staffAttendance}
              saveAttendance={saveAttendance}
              addActivityLog={addActivityLog}
              staff={staff}
              shifts={shifts}
            />
          )}
        </div>

        {/* Role-based dashboard content */}
        {isStaff ? (
          <StaffDashboard
            currentUser={currentUser} now={now} tasks={tasks} leaveRequests={leaveRequests}
            notifications={notifications} payroll={payroll} staffAttendance={staffAttendance}
            shifts={shifts}
          />
        ) : isSuperAdmin ? (
          <SuperAdminDashboard
            applicants={applicants} staff={staff} tasks={tasks} interviews={interviews}
            leaveRequests={leaveRequests} staffRequests={staffRequests} vehicles={vehicles}
            notifications={notifications} companies={companies} payroll={payroll}
            staffAttendance={staffAttendance} saveAttendance={saveAttendance}
            addActivityLog={addActivityLog} updatePayroll={updatePayroll} now={now}
          />
        ) : isRecruiter ? (
          <RecruiterDashboard
            fApplicants={fApplicants} fInterviews={fInterviews} placements={placements}
            now={now} companies={companies} currentUser={currentUser}
          />
        ) : isHRManager ? (
          <HRDashboard
            fStaff={fStaff} leaveRequests={leaveRequests} staffRequests={staffRequests}
            staffAttendance={staffAttendance} now={now} upcomingBirthdays={upcomingBirthdays}
            currentUser={currentUser}
          />
        ) : isAccountant ? (
          <AccountantDashboard
            payroll={payroll} fStaff={fStaff} currentUser={currentUser}
          />
        ) : (
          /* Render Dynamic Permission-based CompanyDashboard for all other roles/positions */
          <CompanyDashboard
            fApplicants={fApplicants} fStaff={fStaff} fTasks={fTasks} fInterviews={fInterviews}
            leaveRequests={leaveRequests} staffRequests={staffRequests} payroll={payroll}
            vehicles={vehicles} notifications={notifications} companies={companies}
            now={now} upcomingBirthdays={upcomingBirthdays} visaAlerts={visaAlerts}
            passportAlerts={passportAlerts} currentUser={currentUser} currentRole={currentRole}
            isBranchAdmin={isBranchAdmin}
          />
        )}
      </div>
    </div>
  );
}
