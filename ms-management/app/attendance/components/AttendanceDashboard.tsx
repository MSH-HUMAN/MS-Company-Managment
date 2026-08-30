"use client";

import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Users, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import { AttendanceWidget } from "@/components/dashboard/attendance-widget";

export default function AttendanceDashboard() {
  const { currentRole, currentUser, staff, staffAttendance, hasPermission } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);

  const isSuperAdmin = currentRole === "Super Admin";
  const isSystemUser = currentUser.company === "System";
  const allowedStaff = (isSuperAdmin || isSystemUser) ? staff : staff.filter(s => s.company === currentUser.company);

  const isAdmin = isSuperAdmin || 
                  hasPermission("attendance", "edit") || 
                  hasPermission("attendance", "create");

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <AttendanceWidget />
      </div>
    );
  }

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, leave = 0, overtimeCount = 0;
    
    (staffAttendance || []).forEach(record => {
      (Array.isArray(record?.records) ? record.records : []).forEach(r => {
        if (r && r.date === today && (allowedStaff || []).some(s => s.id === record.staffId)) {
          if (r.status === "Present" || r.status === "Work From Home") present++;
          if (r.status === "Absent") absent++;
          if (r.status === "Late") late++;
          if (r.status === "Leave" || r.status === "Half Day") leave++;
          if (Number(r.overtime) > 0) overtimeCount++;
        }
      });
    });

    const totalRecorded = present + absent + late + leave;
    const notMarked = allowedStaff.length - totalRecorded;

    return { present, absent, late, leave, overtimeCount, notMarked, total: allowedStaff.length };
  }, [staffAttendance, allowedStaff, today]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Staff", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Present Today", value: stats.present, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Absent", value: stats.absent, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Late In", value: stats.late, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "On Leave", value: stats.leave, icon: AlertTriangle, color: "text-slate-600", bg: "bg-slate-50" },
          { label: "Not Marked", value: stats.notMarked, icon: Users, color: "text-gray-400", bg: "bg-gray-100" },
        ].map((stat, i) => (
          <Card key={i} className="p-4 rounded-2xl border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-slate-800 mb-1">{stat.value}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 rounded-2xl border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Today's Attendance Overview</h3>
        <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100">
          {stats.total > 0 && (
            <>
              <div style={{ width: `${(stats.present / stats.total) * 100}%` }} className="bg-emerald-500 h-full transition-all" title="Present" />
              <div style={{ width: `${(stats.late / stats.total) * 100}%` }} className="bg-amber-500 h-full transition-all" title="Late" />
              <div style={{ width: `${(stats.leave / stats.total) * 100}%` }} className="bg-slate-500 h-full transition-all" title="Leave" />
              <div style={{ width: `${(stats.absent / stats.total) * 100}%` }} className="bg-rose-500 h-full transition-all" title="Absent" />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs font-semibold text-slate-500 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present ({(stats.total > 0 ? (stats.present / stats.total * 100).toFixed(0) : 0)}%)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late ({(stats.total > 0 ? (stats.late / stats.total * 100).toFixed(0) : 0)}%)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Leave ({(stats.total > 0 ? (stats.leave / stats.total * 100).toFixed(0) : 0)}%)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent ({(stats.total > 0 ? (stats.absent / stats.total * 100).toFixed(0) : 0)}%)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Unmarked ({(stats.total > 0 ? (stats.notMarked / stats.total * 100).toFixed(0) : 0)}%)</div>
        </div>
      </Card>

      {/* Daily Attendance Operations — shown only for non-Super-Admin admins */}
      {!isSuperAdmin && (
        <Card className="p-6 rounded-2xl border-slate-100 shadow-sm bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Daily Attendance Operations
          </h3>
          <AttendanceWidget />
        </Card>
      )}
    </div>
  );
}

