"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { AttendanceRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Calendar, Save,
  Home, Monitor, ChevronLeft, ChevronRight, Users, Activity,
  ChevronDown, ChevronUp, Zap, Download, Search
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, {
  label: string;
  bg: string;
  text: string;
  border: string;
  rowBg: string;
  icon: React.ElementType;
  dot: string;
}> = {
  Present:        { label: "Present",    bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", rowBg: "bg-emerald-50/20", icon: CheckCircle2,  dot: "bg-emerald-500" },
  Absent:         { label: "Absent",     bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200",    rowBg: "bg-rose-50/30",    icon: XCircle,       dot: "bg-rose-500" },
  Late:           { label: "Late In",    bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   rowBg: "bg-amber-50/20",   icon: Clock,         dot: "bg-amber-500" },
  Leave:          { label: "Leave",      bg: "bg-slate-50",    text: "text-slate-600",   border: "border-slate-200",   rowBg: "bg-slate-50/30",   icon: AlertTriangle, dot: "bg-slate-400" },
  "Half Day":     { label: "Half Day",   bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-200",  rowBg: "bg-indigo-50/20",  icon: Clock,         dot: "bg-indigo-400" },
  Holiday:        { label: "Holiday",    bg: "bg-purple-50",   text: "text-purple-700",  border: "border-purple-200",  rowBg: "bg-purple-50/20",  icon: Home,          dot: "bg-purple-400" },
  Weekend:        { label: "Weekend",    bg: "bg-gray-50",     text: "text-gray-600",    border: "border-gray-200",    rowBg: "bg-gray-50/30",    icon: Home,          dot: "bg-gray-400" },
  "Work From Home": { label: "WFH",     bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    rowBg: "bg-blue-50/20",    icon: Monitor,       dot: "bg-blue-400" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);
const NO_TIME_STATUSES = ["Absent", "Leave", "Holiday", "Weekend"];

const DEFAULT_REC = { status: "Present", checkIn: "09:00", checkOut: "18:00", workingHours: 9, overtime: 0, notes: "" };

function calcHours(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`2000-01-01T${checkIn}`);
  const end = new Date(`2000-01-01T${checkOut}`);
  let diff = (end.getTime() - start.getTime()) / 3_600_000;
  if (diff < 0) diff += 24; // Handle overnight shifts
  return parseFloat(diff.toFixed(2));
}

function computeAttendanceMetrics(checkIn: string, checkOut: string, shift: any) {
  if (!checkIn || !checkOut) {
    return { workingHours: 0, overtime: 0, lateArrival: 0, earlyLeaving: 0, breakHours: 0 };
  }

  const shiftIn = shift ? (shift.clockIn || "09:00") : "09:00";
  const shiftOut = shift ? (shift.clockOut || "18:00") : "18:00";
  const breakMin = shift ? (shift.breakDuration || 0) : 60;
  const breakHours = breakMin / 60;

  const employeeElapsed = calcHours(checkIn, checkOut);
  const netWorkingHours = Math.max(0, employeeElapsed - breakHours);

  const shiftElapsed = calcHours(shiftIn, shiftOut);
  const shiftRequired = Math.max(0, shiftElapsed - breakHours);

  const isOTEligible = shift ? shift.overtimeEligible !== "No" : true;
  const overtime = (employeeElapsed > shiftElapsed && isOTEligible) 
    ? parseFloat((employeeElapsed - shiftElapsed).toFixed(2)) 
    : 0;

  let lateArrival = 0;
  try {
    const [empInH, empInM] = checkIn.split(":").map(Number);
    const [shInH, shInM] = shiftIn.split(":").map(Number);
    const empInMin = empInH * 60 + empInM;
    const shInMin = shInH * 60 + shInM;
    const grace = shift ? (shift.gracePeriod || 0) : 15;
    if (empInMin > (shInMin + grace)) {
      lateArrival = empInMin - shInMin;
    }
  } catch (e) {}

  let earlyLeaving = 0;
  try {
    const [empOutH, empOutM] = checkOut.split(":").map(Number);
    const [shOutH, shOutM] = shiftOut.split(":").map(Number);
    const empOutMin = empOutH * 60 + empOutM;
    const shOutMin = shOutH * 60 + shOutM;
    if (empOutMin < shOutMin) {
      earlyLeaving = shOutMin - empOutMin;
    }
  } catch (e) {}

  return {
    workingHours: parseFloat(netWorkingHours.toFixed(2)),
    overtime,
    lateArrival,
    earlyLeaving,
    breakHours
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Status Pill (click-to-cycle) ────────────────────────────────────────────
function StatusPill({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Present;
  const Icon = cfg.icon;
  return (
    <div className="relative group">
      <Select value={status} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger className={cn(
          "h-7 rounded-lg text-[11px] font-bold border px-2 gap-1.5 focus:ring-1 focus:ring-offset-0 min-w-[110px]",
          cfg.bg, cfg.text, cfg.border
        )}>
          <Icon className="w-3 h-3 flex-shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl bg-white border-slate-200 shadow-xl z-50">
          {ALL_STATUSES.map(s => {
            const c = STATUS_CONFIG[s];
            const SI = c.icon;
            return (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <div className={cn("w-2 h-2 rounded-full", c.dot)} />
                  <SI className={cn("w-3.5 h-3.5", c.text)} />
                  {c.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Mobile Staff Card ────────────────────────────────────────────────────────
function MobileStaffCard({
  staff: s,
  rec,
  onUpdate,
  shiftName,
}: {
  staff: any;
  rec: any;
  onUpdate: (id: string, field: string, val: any) => void;
  shiftName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Present;
  const noTime = NO_TIME_STATUSES.includes(rec.status);

  return (
    <div className={cn("rounded-xl border transition-all", cfg.border, cfg.rowBg)}>
      {/* Card header */}
      <div className="flex items-center gap-3 p-3" onClick={() => setExpanded(e => !e)}>
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0",
          cfg.bg, cfg.text
        )}>
          {s.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-sm truncate">{s.name}</div>
          <div className="text-[10px] text-slate-500 font-medium truncate">{s.position} · {shiftName}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusPill status={rec.status} onChange={v => onUpdate(s.id, "status", v)} />
          <button className="text-slate-400 hover:text-slate-600 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/50">
          {!noTime && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check In</div>
                <Input
                  type="time"
                  value={rec.checkIn || ""}
                  onChange={e => onUpdate(s.id, "checkIn", e.target.value)}
                  className="h-8 text-xs font-bold bg-white/70 border-white/60 rounded-lg text-center"
                />
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check Out</div>
                <Input
                  type="time"
                  value={rec.checkOut || ""}
                  onChange={e => onUpdate(s.id, "checkOut", e.target.value)}
                  className="h-8 text-xs font-bold bg-white/70 border-white/60 rounded-lg text-center"
                />
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hours</div>
                <div className={cn("h-8 flex items-center justify-center rounded-lg text-xs font-black bg-white/70",
                  rec.workingHours > 0 ? "text-emerald-600" : "text-slate-300"
                )}>
                  {rec.workingHours || 0}h
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Overtime</div>
                <div className={cn("h-8 flex items-center justify-center rounded-lg text-xs font-black bg-white/70",
                  rec.overtime > 0 ? "text-amber-600" : "text-slate-300"
                )}>
                  {rec.overtime || 0}h
                </div>
              </div>
            </div>
          )}
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</div>
            <Input
              placeholder="Optional note..."
              value={rec.notes || ""}
              onChange={e => onUpdate(s.id, "notes", e.target.value)}
              className="h-8 text-xs bg-white/70 border-white/60 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendanceRecords() {
  const { currentRole, currentUser, staff, staffAttendance, saveAttendance, addActivityLog, ownCompanies, branches, shifts, payroll, updatePayroll } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<"sheet" | "cards">("sheet");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("cards");
    }
  }, []);

  // ── Filtered staff ──
  const isSystemUser = currentUser?.company === "System";
  let allowedStaff = (currentRole === "Super Admin" || isSystemUser)
    ? staff
    : staff.filter(s => s.company === currentUser?.company);
  if (companyFilter !== "all") allowedStaff = allowedStaff.filter(s => s.company === companyFilter);
  if (branchFilter !== "all") allowedStaff = allowedStaff.filter(s => s.branch === branchFilter);
  if (searchTerm.trim() !== "") {
    allowedStaff = allowedStaff.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  // ── Build records map for the selected date ──
  const buildRecordsForDate = useCallback((d: string) => {
    const map: Record<string, any> = {};
    staffAttendance.forEach(record => {
      record.records.forEach((r: any) => {
        if (r.date === d) map[record.staffId] = r;
      });
    });
    const init: Record<string, any> = {};
    allowedStaff.forEach(s => {
      init[s.id] = map[s.id] || { ...DEFAULT_REC };
    });
    return init;
  }, [staffAttendance, allowedStaff]);

  const [records, setRecords] = useState<Record<string, any>>(() => buildRecordsForDate(today));

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setRecords(buildRecordsForDate(newDate));
    setSaved(false);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    setSaved(false);
    setRecords(prev => {
      const updated = { ...prev[id], [field]: value };
      const s = staff.find(st => st.id === id);
      const shift = s ? shifts.find(sh => sh.id === s.shiftId) : null;

      if (field === "status") {
        if (NO_TIME_STATUSES.includes(value)) {
          updated.checkIn = "";
          updated.checkOut = "";
          updated.workingHours = 0;
          updated.overtime = 0;
          updated.lateArrival = 0;
          updated.earlyLeaving = 0;
          updated.breakHours = 0;
        } else {
          if (value === "Present" || value === "Work From Home") {
            updated.checkIn = updated.checkIn || (shift ? shift.clockIn : "09:00");
            updated.checkOut = updated.checkOut || (shift ? shift.clockOut : "18:00");
          } else if (value === "Late") {
            const shiftIn = shift?.clockIn || "09:00";
            const [h, m] = shiftIn.split(":").map(Number);
            const lateTime = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            updated.checkIn = updated.checkIn || lateTime;
            updated.checkOut = updated.checkOut || (shift ? shift.clockOut : "18:00");
          } else if (value === "Half Day") {
            updated.checkIn = updated.checkIn || (shift ? shift.clockIn : "09:00");
            const shiftIn = shift?.clockIn || "09:00";
            const [h, m] = shiftIn.split(":").map(Number);
            const halfTime = `${String(h + 4).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            updated.checkOut = updated.checkOut || halfTime;
          }
          const metrics = computeAttendanceMetrics(updated.checkIn, updated.checkOut, shift);
          updated.workingHours = metrics.workingHours;
          updated.overtime = metrics.overtime;
          updated.lateArrival = metrics.lateArrival;
          updated.earlyLeaving = metrics.earlyLeaving;
          updated.breakHours = metrics.breakHours;
        }
      } else if (field === "checkIn" || field === "checkOut") {
        if (!NO_TIME_STATUSES.includes(updated.status)) {
          const checkInVal = field === "checkIn" ? value : updated.checkIn;
          const checkOutVal = field === "checkOut" ? value : updated.checkOut;

          // Auto-evaluate status between Present and Late In based on checkIn time vs shift schedule
          if (field === "checkIn" && checkInVal) {
            const shiftIn = shift ? (shift.clockIn || "09:00") : "09:00";
            const grace = shift ? (shift.gracePeriod || 0) : 15;
            try {
              const [empInH, empInM] = checkInVal.split(":").map(Number);
              const [shInH, shInM] = shiftIn.split(":").map(Number);
              const empInMin = empInH * 60 + empInM;
              const shInMin = shInH * 60 + shInM;
              if (empInMin > (shInMin + grace)) {
                updated.status = "Late";
              } else if (updated.status === "Late" && empInMin <= (shInMin + grace)) {
                updated.status = "Present";
              }
            } catch (e) {}
          }

          const metrics = computeAttendanceMetrics(checkInVal, checkOutVal, shift);
          updated.workingHours = metrics.workingHours;
          updated.overtime = metrics.overtime;
          updated.lateArrival = metrics.lateArrival;
          updated.earlyLeaving = metrics.earlyLeaving;
          updated.breakHours = metrics.breakHours;
        }
      }
      return { ...prev, [id]: updated };
    });
  };

  // ── Bulk actions ──
  const markAll = (status: string) => {
    const next: Record<string, any> = {};
    allowedStaff.forEach(s => {
      const base = { ...DEFAULT_REC, status };
      if (NO_TIME_STATUSES.includes(status)) { base.checkIn = ""; base.checkOut = ""; base.workingHours = 0; }
      next[s.id] = base;
    });
    setRecords(next);
    setSaved(false);
    toast.info(`All staff marked as ${status}`);
  };

  // ── Stats ──
  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, leave = 0, wfh = 0, unmarked = 0;
    allowedStaff.forEach(s => {
      const r = records[s.id];
      if (!r) { unmarked++; return; }
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "Late") late++;
      else if (r.status === "Leave" || r.status === "Half Day") leave++;
      else if (r.status === "Work From Home") wfh++;
    });
    const marked = present + absent + late + leave + wfh;
    unmarked = Math.max(0, allowedStaff.length - marked);
    return { present, absent, late, leave, wfh, unmarked, total: allowedStaff.length, marked };
  }, [records, allowedStaff]);

  const markPct = stats.total > 0 ? Math.round((stats.marked / stats.total) * 100) : 0;

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    const dateObj = new Date(date);
    const month = dateObj.toLocaleString("default", { month: "short" });
    const year = dateObj.getFullYear();

    for (const s of allowedStaff) {
      const existing = staffAttendance.find(a => a.staffId === s.id && a.month === month && a.year === year);
      const rec = records[s.id] || DEFAULT_REC;

      // Calculate shift hours
      let shiftRequiredHours = 9;
      const staffShift = shifts.find(sh => sh.id === s.shiftId);
      if (staffShift) {
        const shiftStart = staffShift.clockIn || "09:00";
        const shiftEnd = staffShift.clockOut || "18:00";
        const computedRequired = calcHours(shiftStart, shiftEnd);
        if (computedRequired > 0) {
          const breakHours = (staffShift.breakDuration || 0) / 60;
          shiftRequiredHours = Math.max(0, computedRequired - breakHours);
        }
      }

      const metrics = computeAttendanceMetrics(rec.checkIn, rec.checkOut, staffShift);

      const newRecord = {
        date,
        status: rec.status,
        checkIn: rec.checkIn || "",
        checkOut: rec.checkOut || "",
        workingHours: metrics.workingHours,
        notes: rec.notes || "",
        overtime: metrics.overtime,
        lateArrival: metrics.lateArrival,
        earlyLeaving: metrics.earlyLeaving,
        breakHours: metrics.breakHours,
      };

      let updatedRecordsList: AttendanceRecord[] = [newRecord];
      if (existing) {
        const filtered = existing.records.filter((r: any) => r.date !== date);
        updatedRecordsList = [...filtered, newRecord];
        await saveAttendance({ ...existing, records: updatedRecordsList });
      } else {
        await saveAttendance({ staffId: s.id, staffName: s.name, month, year, records: updatedRecordsList });
      }

      // Automatically recalculate monthly overtime and save into PayrollRecord if it exists
      const monthlyOvertimeHours = updatedRecordsList.reduce((sum: number, r: any) => sum + (r.overtime || 0), 0);
      const existingPay = payroll.find(p => p.staffId === s.id && p.month === month && p.year === year);
      if (existingPay) {
        const otRate = existingPay.overtimeRate || s.overtimeRate || 15;
        const newOtPay = parseFloat((monthlyOvertimeHours * otRate).toFixed(2));
        const diffOtPay = newOtPay - existingPay.overtime;
        
        await updatePayroll({
          ...existingPay,
          overtimeHours: monthlyOvertimeHours,
          overtime: newOtPay,
          netSalary: parseFloat((existingPay.netSalary + diffOtPay).toFixed(2))
        });
      }
    }

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name, role: currentUser.role, company: currentUser.company,
      branch: currentUser.branch, action: "Created", module: "Attendance",
      oldValue: null, newValue: `Saved attendance for ${date}`, ipAddress: "192.168.1.102"
    });

    setSaving(false);
    setSaved(true);
    toast.success(`✅ Attendance saved for ${formatDate(date)}`);
    setTimeout(() => setSaved(false), 3000);
  };

  const isToday = date === today;

  return (
    <div className="space-y-4">
      {/* ── Top Control Bar ── */}
      <Card className="rounded-2xl border-slate-100 bg-white shadow-sm p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Date Nav + Filters + Save */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date navigation */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-shrink-0">
              <button
                onClick={() => handleDateChange(addDays(date, -1))}
                className="w-6 h-6 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <input
                  type="date"
                  value={date}
                  onChange={e => handleDateChange(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
              <button
                onClick={() => handleDateChange(addDays(date, 1))}
                className="w-6 h-6 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!isToday && (
              <button
                onClick={() => handleDateChange(today)}
                className="text-[10px] font-bold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors flex-shrink-0"
              >
                Today
              </button>
            )}

            {/* Search Input for everyone */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search staff by name..."
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:border-blue-400"
              />
            </div>

            {/* Company filter for Super Admin / System User */}
            {(currentRole === "Super Admin" || isSystemUser) && (
              <div className="w-full max-w-[150px]">
                <Select value={companyFilter} onValueChange={v => { setCompanyFilter(v ?? "all"); setBranchFilter("all"); }}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9 min-w-0">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {ownCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Branch filter for Super Admin / System User OR Company Admin */}
            {(currentRole === "Super Admin" || isSystemUser || currentRole === "Company Admin") && (
              <div className="w-full max-w-[150px]">
                <Select value={branchFilter} onValueChange={v => setBranchFilter(v ?? "all")}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9 min-w-0">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentRole === "Super Admin" && <SelectItem value="all">All Branches</SelectItem>}
                    {branches
                      .filter(b => {
                        if (currentRole === "Super Admin" || isSystemUser) {
                          return companyFilter === "all" || b.company === companyFilter;
                        }
                        return b.company === currentUser?.company;
                      })
                      .map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View toggle + Save */}
            <div className="flex items-center gap-2 ml-auto">
              {/* View toggle: only show on larger screens */}
              <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setViewMode("sheet")}
                  className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                    viewMode === "sheet" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"
                  )}
                >Sheet</button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                    viewMode === "cards" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"
                  )}
                >Cards</button>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "h-9 rounded-xl text-xs font-bold px-5 gap-2 transition-all shadow-sm",
                  saved
                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-200",
                  "text-white"
                )}
              >
                {saving ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : saved ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saved ? "Saved!" : "Save"}
              </Button>
            </div>
          </div>

          {/* Row 2: Stats chips */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Total", value: stats.total, color: "bg-slate-100 text-slate-600", icon: Users },
              { label: "Present", value: stats.present, color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
              { label: "Absent", value: stats.absent, color: "bg-rose-100 text-rose-700", icon: XCircle },
              { label: "Late", value: stats.late, color: "bg-amber-100 text-amber-700", icon: Clock },
              { label: "Leave", value: stats.leave, color: "bg-slate-100 text-slate-600", icon: AlertTriangle },
              { label: "WFH", value: stats.wfh, color: "bg-blue-100 text-blue-700", icon: Monitor },
              { label: "Unmarked", value: stats.unmarked, color: "bg-gray-100 text-gray-500", icon: Activity },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold flex-shrink-0", color)}>
                <Icon className="w-3 h-3" />
                {label}: <span className="font-extrabold">{value}</span>
              </div>
            ))}

            {/* Progress bar */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                <div
                  className={cn("h-full rounded-full transition-all duration-500",
                    markPct === 100 ? "bg-emerald-500" : markPct > 60 ? "bg-blue-500" : "bg-amber-500"
                  )}
                  style={{ width: `${markPct}%` }}
                />
              </div>
              <span className={cn("text-[10px] font-extrabold",
                markPct === 100 ? "text-emerald-600" : markPct > 60 ? "text-blue-600" : "text-amber-600"
              )}>{markPct}% marked</span>
            </div>
          </div>

          {/* Row 3: Bulk actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> Bulk Mark:
            </span>
            {[
              { status: "Present", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" },
              { status: "Absent", color: "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" },
              { status: "Holiday", color: "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200" },
              { status: "Weekend", color: "bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200" },
            ].map(({ status, color }) => (
              <button
                key={status}
                onClick={() => markAll(status)}
                className={cn("text-[10px] font-bold border rounded-lg px-2.5 py-1 transition-all", color)}
              >
                All {status}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Attendance Sheet / Cards ── */}
      {allowedStaff.length === 0 ? (
        <Card className="p-12 rounded-2xl border-slate-100 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400">No staff members found</p>
          <p className="text-xs text-slate-300 mt-1">Adjust the company / branch filter.</p>
        </Card>
      ) : (
        <>
          {/* ── DESKTOP SPREADSHEET (hidden on mobile, always on sm+; also show when viewMode=sheet) ── */}
          <Card className={cn(
            "rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden",
            viewMode === "cards" ? "hidden" : "hidden sm:block"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-56 sticky left-0 bg-slate-800 z-10">
                      Staff Member
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-36">Shift</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-36">Status</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider w-28">Check In</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider w-28">Check Out</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider w-20">Hours</th>
                    <th className="text-center px-3 py-3 text-[10px] font-bold uppercase tracking-wider w-20">Overtime</th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {allowedStaff.map((s, i) => {
                    const rec = records[s.id] || DEFAULT_REC;
                    const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.Present;
                    const noTime = NO_TIME_STATUSES.includes(rec.status);
                    const isOdd = i % 2 === 0;
                    const staffShift = shifts.find(sh => sh.id === s.shiftId);

                    return (
                      <tr
                        key={s.id}
                        className={cn(
                          "border-b border-slate-100 transition-colors",
                          cfg.rowBg,
                          isOdd ? "bg-white/50" : ""
                        )}
                      >
                        {/* Staff name */}
                        <td className={cn("px-4 py-2.5 sticky left-0 z-10 border-r border-slate-100", cfg.rowBg || "bg-white")}>
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0",
                              cfg.bg, cfg.text
                            )}>
                              {s.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-xs truncate max-w-[140px]">{s.name}</div>
                              <div className="text-[9px] text-slate-400 font-semibold truncate">{s.position}</div>
                            </div>
                          </div>
                        </td>

                        {/* Shift */}
                        <td className="px-4 py-2.5 font-semibold text-slate-600 text-xs">
                          {staffShift ? staffShift.name : "No Shift"}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <StatusPill status={rec.status} onChange={v => handleUpdate(s.id, "status", v)} />
                        </td>

                        {/* Check In */}
                        <td className="px-3 py-2.5">
                          <Input
                            type="time"
                            disabled={noTime}
                            value={rec.checkIn || ""}
                            onChange={e => handleUpdate(s.id, "checkIn", e.target.value)}
                            className={cn(
                              "h-7 text-[11px] font-bold rounded-lg text-center",
                              noTime ? "bg-slate-100 text-slate-300 cursor-not-allowed border-transparent" : "bg-white border-slate-200"
                            )}
                          />
                        </td>

                        {/* Check Out */}
                        <td className="px-3 py-2.5">
                          <Input
                            type="time"
                            disabled={noTime}
                            value={rec.checkOut || ""}
                            onChange={e => handleUpdate(s.id, "checkOut", e.target.value)}
                            className={cn(
                              "h-7 text-[11px] font-bold rounded-lg text-center",
                              noTime ? "bg-slate-100 text-slate-300 cursor-not-allowed border-transparent" : "bg-white border-slate-200"
                            )}
                          />
                        </td>

                        {/* Hours */}
                        <td className="px-3 py-2.5 text-center">
                          <div className={cn(
                            "inline-flex items-center justify-center font-black text-sm w-12 h-7 rounded-lg",
                            rec.workingHours > 9
                              ? "bg-amber-50 text-amber-700"
                              : rec.workingHours > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-50 text-slate-300"
                          )}>
                            {rec.workingHours > 0 ? `${rec.workingHours}` : "—"}
                          </div>
                        </td>

                        {/* Overtime */}
                        <td className="px-3 py-2.5 text-center">
                          <div className={cn(
                            "inline-flex items-center justify-center font-black text-sm w-12 h-7 rounded-lg",
                            rec.overtime > 0
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-slate-50 text-slate-300"
                          )}>
                            {rec.overtime > 0 ? `${rec.overtime}h` : "—"}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-2.5">
                          <input
                            placeholder="Add note..."
                            value={rec.notes || ""}
                            onChange={e => handleUpdate(s.id, "notes", e.target.value)}
                            className="w-full h-7 text-[11px] bg-transparent placeholder:text-slate-300 outline-none text-slate-600 font-medium border-b border-transparent hover:border-slate-200 focus:border-blue-400 transition-colors px-1"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap gap-3 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{allowedStaff.length} Staff · {formatDate(date)}</span>
              <div className="flex gap-3 flex-wrap ml-auto">
                {Object.entries({
                  Present: stats.present,
                  Absent: stats.absent,
                  Late: stats.late,
                  Leave: stats.leave,
                  WFH: stats.wfh,
                }).map(([label, value]) => value > 0 && (
                  <div key={label} className={cn("text-[10px] font-extrabold flex items-center gap-1",
                    label === "Present" ? "text-emerald-600" :
                    label === "Absent" ? "text-rose-600" :
                    label === "Late" ? "text-amber-600" :
                    label === "WFH" ? "text-blue-600" : "text-slate-500"
                  )}>
                    <span>{label}</span>
                    <span className="font-black">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* ── MOBILE CARDS / Cards view ── */}
          <div className={cn(
            "space-y-2",
            viewMode === "cards" ? "block" : "sm:hidden"
          )}>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-3">
              {allowedStaff.length} staff · {formatDate(date)}
            </div>
            {allowedStaff.map(s => {
              const staffShift = shifts.find(sh => sh.id === s.shiftId);
              return (
                <MobileStaffCard
                  key={s.id}
                  staff={s}
                  rec={records[s.id] || DEFAULT_REC}
                  onUpdate={handleUpdate}
                  shiftName={staffShift ? staffShift.name : "No Shift"}
                />
              );
            })}

            {/* Mobile save button */}
            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-bold gap-2 transition-all",
                  saved ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-600 hover:bg-blue-700",
                  "text-white shadow-lg"
                )}
              >
                {saving ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : saved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? "Attendance Saved!" : "Save Attendance"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
