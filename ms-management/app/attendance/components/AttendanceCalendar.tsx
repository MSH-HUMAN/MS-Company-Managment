"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmptyState from "@/components/shared/EmptyState";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AttendanceCalendar() {
  const { currentRole, currentUser, staff, staffAttendance, ownCompanies, branches, hasPermission } = useAuthStore();
  const today = new Date();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[today.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [companyFilter, setCompanyFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const isSystemUser = currentUser.company === "System";
  const isAdmin = currentRole === "Super Admin" || 
                  hasPermission("attendance", "edit") || 
                  hasPermission("attendance", "create");

  const currentStaff = staff.find(
    s => s.email?.toLowerCase() === currentUser.email?.toLowerCase() || 
         s.name?.toLowerCase() === currentUser.name?.toLowerCase()
  );

  let allowedStaff = (currentRole === "Super Admin" || isSystemUser) ? staff : staff.filter(s => s.company === currentUser.company);
  
  if (!isAdmin) {
    allowedStaff = currentStaff ? [currentStaff] : [];
  } else {
    if (companyFilter !== "all") allowedStaff = allowedStaff.filter(s => s.company === companyFilter);
    if (branchFilter !== "all") allowedStaff = allowedStaff.filter(s => s.branch === branchFilter);
  }

  const monthlySummary = useMemo(() => {
    return allowedStaff.map(s => {
      const record = staffAttendance.find(a => a.staffId === s.id && a.month === selectedMonth && a.year === selectedYear);
      const records = Array.isArray(record?.records) ? record.records : [];
      const present = records.filter(r => r.status === "Present" || r.status === "Work From Home").length;
      const absent  = records.filter(r => r.status === "Absent").length;
      const late    = records.filter(r => r.status === "Late").length;
      const leave   = records.filter(r => r.status === "Leave" || r.status === "Half Day").length;
      const holiday = records.filter(r => r.status === "Holiday" || r.status === "Weekend").length;
      
      const workingDays = records.length - holiday;
      return { ...s, present, absent, late, leave, holiday, total: workingDays, recordsLength: records.length };
    });
  }, [staffAttendance, allowedStaff, selectedMonth, selectedYear]);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm flex items-center gap-3">
        <BarChart2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { const idx = MONTHS.indexOf(selectedMonth); if (idx === 0) { setSelectedMonth("Dec"); setSelectedYear(y => y - 1); } else setSelectedMonth(MONTHS[idx - 1]); }} className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-[100px] text-center">{selectedMonth} {selectedYear}</span>
          <button onClick={() => { const idx = MONTHS.indexOf(selectedMonth); if (idx === 11) { setSelectedMonth("Jan"); setSelectedYear(y => y + 1); } else setSelectedMonth(MONTHS[idx + 1]); }} className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          {(currentRole === "Super Admin" || isSystemUser) && (
            <div className="flex gap-2 w-full max-w-[300px]">
              <Select value={companyFilter} onValueChange={v => { setCompanyFilter(v || "all"); setBranchFilter("all"); }}>
                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="All Companies" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Companies</SelectItem>{ownCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={v => setBranchFilter(v || "all")}>
                <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="All Branches" /></SelectTrigger>
                <SelectContent>{currentRole === "Super Admin" && <SelectItem value="all">All Branches</SelectItem>}{branches.filter(b => companyFilter === "all" || b.company === companyFilter).map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="text-[10px] text-slate-400 font-semibold hidden sm:block">{allowedStaff.length} staff members</div>
        </div>
      </Card>

      {allowedStaff.length === 0 ? (
        <EmptyState title="No staff members found" />
      ) : (
        <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Staff Member</th>
                  <th className="text-center px-4 py-3">Working Days</th>
                  <th className="text-center px-4 py-3 text-emerald-600">Present</th>
                  <th className="text-center px-4 py-3 text-rose-600">Absent</th>
                  <th className="text-center px-4 py-3 text-amber-600">Late In</th>
                  <th className="text-center px-4 py-3 text-slate-500">Leave</th>
                  <th className="text-center px-4 py-3 text-purple-600">Holidays</th>
                  <th className="text-center px-4 py-3">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map(s => {
                  const pct = s.total > 0 ? Math.round((s.present / s.total) * 100) : null;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/30 font-semibold text-slate-600">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{s.position}</div>
                        <div className="text-[9px] text-blue-600 font-medium mt-0.5">{s.company} · {s.branch}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{s.total}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-600">{s.present}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-rose-600">{s.absent}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-amber-600">{s.late}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-slate-500">{s.leave}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-purple-600">{s.holiday}</td>
                      <td className="px-4 py-3 text-center">
                        {pct === null ? (
                          <span className="text-[10px] text-slate-300 font-semibold italic">No data</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`font-extrabold text-[10px] ${pct >= 90 ? "text-emerald-600" : pct >= 70 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
