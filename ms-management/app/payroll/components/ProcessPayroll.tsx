"use client";

import { useState, useEffect } from "react";
import { Plus, DollarSign, CheckCircle, Trash2, CheckCircle2, Settings } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayrollRecord } from "@/lib/types";
import { toast } from "sonner";

export default function ProcessPayroll() {
  const { currentRole, currentUser, payroll, staff, updatePayroll, addPayroll, addActivityLog, salarySetups, staffAttendance, overtimeRequests, leaveRequests, staffRequests, payrollRules, updatePayrollRules } = useAuthStore();
  const { filters } = useFilterStore();
  const [modal, setModal] = useState(false);
  const [editPay, setEditPay] = useState<PayrollRecord | null>(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [rulesModal, setRulesModal] = useState(false);
  const [localRules, setLocalRules] = useState(payrollRules);
  const [form, setForm] = useState({ staffId: "", basicSalary: 0, advanceDeduction: 0, loanDeduction: 0, overtimeHours: 0, overtimeRate: 0, overtime: 0, status: "Draft" as PayrollRecord["status"] });

  useEffect(() => {
    setLocalRules(payrollRules);
  }, [payrollRules]);

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();
  const [genMonth, setGenMonth] = useState(MONTHS[today.getMonth()]);
  const [genYear, setGenYear] = useState(today.getFullYear());

  const f = filters.payroll;
  let list = payroll.filter(p => p.status === "Draft" || p.status === "Pending Approval");
  if (currentRole !== "Super Admin") list = list.filter(p => p.company === currentUser.company);
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(p => p.staffName.toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(p => p.status === f.status);
  
  list = [...list].sort((a,b) => {
    if (a.year !== b.year) return b.year - a.year;
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
  });
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPay) return;
    const computedOvertime = form.overtime;
    const totalAllowances = Number(editPay.allowances) || 0;
    const totalDeductions = (Number(editPay.deductions) || 0) + form.advanceDeduction + form.loanDeduction;
    const netSalary = Math.max(0, parseFloat((form.basicSalary + totalAllowances + computedOvertime - totalDeductions).toFixed(2)));
    updatePayroll({ 
      ...editPay, 
      ...form, 
      overtime: computedOvertime, 
      netSalary 
    });
    toast.success("Payroll record updated");
    setModal(false); setEditPay(null);
  };

  const handleApprove = (p: PayrollRecord) => {
    updatePayroll({ ...p, status: "Approved" });
    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Status Changed", module: "Payroll", oldValue: p.status, newValue: "Approved", ipAddress: "192.168.1.102" });
    toast.success(`Payroll for ${p.staffName} approved`);
  };

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayrollRules(localRules);
    toast.success("Payroll rules updated successfully");
    setRulesModal(false);
  };

  const handleGeneratePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const allowedStaff = currentRole === "Super Admin" ? staff : staff.filter(s => s.company === currentUser.company);
    const existing = payroll.filter(p => p.month === genMonth && p.year === genYear).map(p => p.staffId);
    const toGenerate = allowedStaff.filter(s => !existing.includes(s.id));

    if (toGenerate.length === 0) {
      toast.info(`All staff already have payroll records for ${genMonth} ${genYear}.`);
      return;
    }

    toGenerate.forEach(s => {
      // Get salary setup or default
      const setup = salarySetups.find(u => u.staffId === s.id) || { basic: 3000, housing: 1000, transport: 500 };
      
      const basicRate = s.basicSalary !== undefined && s.basicSalary !== null ? s.basicSalary : setup.basic;
      const housing = s.housingAllowance !== undefined && s.housingAllowance !== null ? s.housingAllowance : setup.housing;
      const transport = s.transportAllowance !== undefined && s.transportAllowance !== null ? s.transportAllowance : setup.transport;
      const rate = s.overtimeRate !== undefined && s.overtimeRate !== null ? s.overtimeRate : 15;

      // Calculate attendance parameters
      const attendance = staffAttendance.find(a => a.staffId === s.id && a.month.toLowerCase() === genMonth.toLowerCase() && a.year === genYear);
      let absentDays = 0;
      let unpaidLeaveDays = 0;
      let lateDays = 0;
      let presentDays = 0;
      let attendanceOvertimeHours = 0;

      if (attendance) {
        attendance.records.forEach(r => {
          if (["Present", "Late", "Half Day", "Work From Home"].includes(r.status)) {
            presentDays++;
          }
          if (r.status === "Absent") absentDays++;
          if (r.status === "Leave") {
            // Unpaid leave check (find approved unpaid leave request for the date)
            const isUnpaid = leaveRequests.some(l => 
              l.staffId === s.id && 
              l.leaveType === "Unpaid" && 
              l.status === "Approved" &&
              r.date >= l.fromDate && 
              r.date <= l.toDate
            );
            if (isUnpaid) unpaidLeaveDays++;
          }
          if (r.status === "Late") lateDays++;
          if (r.overtime && r.overtime > 0) {
            attendanceOvertimeHours += r.overtime;
          }
        });
      }

      const isDaily = s.salaryType === "Daily";
      const isHourly = s.salaryType === "Hourly";

      let totalWorkedHours = 0;
      if (attendance) {
        attendance.records.forEach((r: any) => {
          if (["Present", "Late", "Half Day", "Work From Home"].includes(r.status)) {
            totalWorkedHours += r.workingHours || 0;
          }
        });
      }

      const basic = isHourly ? (basicRate * totalWorkedHours) : (isDaily ? (basicRate * presentDays) : basicRate);

      // Calculate allowances & deductions
      const allowancesList = [
        { name: "Housing Allowance", amount: housing },
        { name: "Transport Allowance", amount: transport }
      ];

      const deductionsList: { name: string; amount: number }[] = [];
      
      // Auto-deductions calculations
      const dailyRate = isDaily ? basicRate : (basicRate / 30);
      if (!isDaily && !isHourly) {
        if (payrollRules.deductAbsences && absentDays > 0) {
          deductionsList.push({
            name: `Absent Mark Deduction (${absentDays} days @ ${payrollRules.absenceMultiplier}x)`,
            amount: Math.round(dailyRate * absentDays * payrollRules.absenceMultiplier)
          });
        }
        
        if (payrollRules.deductHalfDays && lateDays > 0) {
          deductionsList.push({
            name: `Late / Half Day Deduction (${lateDays} days @ ${payrollRules.halfDayMultiplier}x)`,
            amount: Math.round(dailyRate * lateDays * payrollRules.halfDayMultiplier)
          });
        }

        if (unpaidLeaveDays > 0 && payrollRules.leaveDeductionRule === "unpaid") {
          deductionsList.push({
            name: `Unpaid Leave Deduction (${unpaidLeaveDays} days @ ${payrollRules.leaveMultiplier}x)`,
            amount: Math.round(dailyRate * unpaidLeaveDays * payrollRules.leaveMultiplier)
          });
        }
        
        const totalLeaveDays = attendance ? attendance.records.filter((r: any) => r.status === "Leave").length : 0;
        if (totalLeaveDays > 0 && payrollRules.leaveDeductionRule === "all") {
          deductionsList.push({
            name: `Leave Deduction (All) (${totalLeaveDays} days @ ${payrollRules.leaveMultiplier}x)`,
            amount: Math.round(dailyRate * totalLeaveDays * payrollRules.leaveMultiplier)
          });
        }
      } else if (isDaily) {
        // Daily rate employees only get late / half day deduction
        if (payrollRules.deductHalfDays && lateDays > 0) {
          deductionsList.push({
            name: `Late / Half Day Deduction (${lateDays} days @ ${payrollRules.halfDayMultiplier}x)`,
            amount: Math.round(dailyRate * lateDays * payrollRules.halfDayMultiplier)
          });
        }
      }

      // Auto-deduction for advance salary requests approved for this month
      const advances = staffRequests.filter(req => 
        req.staffId === s.id && 
        req.requestType === "Salary Advance" && 
        req.status === "Approved" &&
        req.date.includes(`${genYear}-${String(MONTHS.indexOf(genMonth) + 1).padStart(2, "0")}`)
      );
      const advanceDeduction = advances.reduce((sum, current) => {
        // extract amount from description if present or default
        const match = current.description.match(/AED\s*([\d,]+)/i);
        const amt = match ? parseInt(match[1].replace(/,/g, "")) : 1000;
        return sum + amt;
      }, 0);

      // Auto-deduction for company loans approved
      const loans = staffRequests.filter(req => 
        req.staffId === s.id && 
        req.requestType === "Company Loan" && 
        req.status === "Approved"
      );
      const loanDeduction = loans.length > 0 ? 500 : 0; // standard 500 AED per month

      // Calculate approved overtime
      const overtimeHours = attendanceOvertimeHours;
      const overtimeRate = rate;
      const overtime = parseFloat((overtimeHours * overtimeRate).toFixed(2));

      const totalAllowances = allowancesList.reduce((sum, current) => sum + current.amount, 0);
      const totalDeductions = deductionsList.reduce((sum, current) => sum + current.amount, 0);
      
      const netSalary = basic + totalAllowances + overtime - totalDeductions - advanceDeduction - loanDeduction;

      const record: PayrollRecord = {
        id: `PAY-${s.id}-${genMonth}${genYear}`,
        staffId: s.id,
        staffName: s.name,
        position: s.position,
        month: genMonth,
        year: genYear,
        basicSalary: basic,
        allowances: totalAllowances,
        deductions: totalDeductions,
        allowanceDetails: allowancesList,
        deductionDetails: deductionsList,
        advanceDeduction,
        loanDeduction,
        overtimeHours,
        overtimeRate,
        overtime,
        netSalary: Math.max(0, parseFloat(netSalary.toFixed(2))),
        status: "Draft",
        company: s.company,
        branch: s.branch,
      };
      addPayroll(record);
    });

    addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Payroll", oldValue: null, newValue: `Generated ${toGenerate.length} payroll records for ${genMonth} ${genYear}`, ipAddress: "192.168.1.102" });
    toast.success(`Generated ${toGenerate.length} payroll records for ${genMonth} ${genYear}`);
    setGenerateModal(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-800">Process Payroll</h2>
        <div className="flex gap-2">
          {currentRole === "Super Admin" && (
            <Button onClick={() => setRulesModal(true)} variant="outline" className="text-slate-600 font-bold rounded-xl text-xs h-9 px-4 gap-1.5 border-slate-200 hover:bg-slate-50">
              <Settings className="w-4 h-4" /> Rules
            </Button>
          )}
          <Button onClick={() => setGenerateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
            <Plus className="w-4 h-4" /> Generate Monthly
          </Button>
        </div>
      </div>

      <FilterBar moduleKey="payroll" statusOptions={["Draft","Pending Approval"]} />

      <div className="flex-1">
        {paginated.length === 0 ? (
          <EmptyState 
            title="No pending payrolls" 
            description="Generate payroll for a month to begin processing." 
            action={
              <Button onClick={() => setGenerateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-md shadow-blue-500/10">
                <Plus className="w-4 h-4" /> Generate Monthly Payroll
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginated.map(p => (
              <Card key={p.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100"><DollarSign className="w-4 h-4"/></div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{p.staffName}</div>
                        <div className="text-[10px] text-slate-400">{p.id} · {p.month} {p.year}</div>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Basic</div>
                      <div className="text-xs font-bold text-slate-700">{p.basicSalary.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Overtime</div>
                      <div className="text-xs font-bold text-emerald-600">+{p.overtime.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg text-center">
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Deductions</div>
                      <div className="text-xs font-bold text-rose-600">-{((p.deductions||0) + (p.advanceDeduction||0) + (p.loanDeduction||0)).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center">
                      <div className="text-[9px] font-extrabold text-slate-500 uppercase">Net Salary</div>
                      <div className="text-xs font-extrabold text-slate-900">{p.netSalary.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 flex gap-1.5 flex-wrap justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setEditPay(p); setForm({ staffId:p.staffId, basicSalary:p.basicSalary, advanceDeduction:p.advanceDeduction, loanDeduction:p.loanDeduction, overtimeHours:p.overtimeHours||0, overtimeRate:p.overtimeRate||0, overtime:p.overtime, status:p.status }); setModal(true); }} className="border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] h-8 px-3">Edit Details</Button>
                  <Button size="sm" onClick={() => handleApprove(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><CheckCircle className="w-3.5 h-3.5"/>Approve</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Pagination moduleKey="payroll" totalItems={totalItems} />

      <Dialog open={generateModal} onOpenChange={setGenerateModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-sm">
          <form onSubmit={handleGeneratePayroll} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Generate Monthly Payroll</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Creates Draft payroll records for all staff who don't yet have one for the selected period.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month</Label>
                <Select value={genMonth} onValueChange={v => setGenMonth(v || genMonth)}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Year</Label>
                <Input type="number" value={genYear} onChange={e => setGenYear(parseInt(e.target.value) || genYear)} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setGenerateModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Generate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rulesModal} onOpenChange={setRulesModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg">
          <form onSubmit={handleSaveRules} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Payroll Calculation Rules</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Configure how deductions and overtime are calculated globally.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Deduct Absences</Label>
                  <input type="checkbox" checked={localRules.deductAbsences} onChange={e => setLocalRules(r => ({...r, deductAbsences: e.target.checked}))} className="rounded text-blue-600" />
                </div>
                {localRules.deductAbsences && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase">Multiplier</Label>
                    <Input type="number" step="0.1" value={localRules.absenceMultiplier} onChange={e => setLocalRules(r => ({...r, absenceMultiplier: parseFloat(e.target.value)||1}))} className="h-8 text-xs bg-white rounded-lg" />
                  </div>
                )}
              </div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700">Deduct Lates/Half Days</Label>
                  <input type="checkbox" checked={localRules.deductHalfDays} onChange={e => setLocalRules(r => ({...r, deductHalfDays: e.target.checked}))} className="rounded text-blue-600" />
                </div>
                {localRules.deductHalfDays && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase">Multiplier</Label>
                    <Input type="number" step="0.1" value={localRules.halfDayMultiplier} onChange={e => setLocalRules(r => ({...r, halfDayMultiplier: parseFloat(e.target.value)||0.5}))} className="h-8 text-xs bg-white rounded-lg" />
                  </div>
                )}
              </div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-1 md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase">Leave Deduction Rule</Label>
                    <Select value={localRules.leaveDeductionRule} onValueChange={v => setLocalRules(r => ({...r, leaveDeductionRule: v as any}))}>
                      <SelectTrigger className="bg-white rounded-lg h-8 text-xs"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid Leave Only</SelectItem>
                        <SelectItem value="all">All Leave</SelectItem>
                        <SelectItem value="none">No Deduction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {localRules.leaveDeductionRule !== "none" && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500 uppercase">Multiplier</Label>
                      <Input type="number" step="0.1" value={localRules.leaveMultiplier} onChange={e => setLocalRules(r => ({...r, leaveMultiplier: parseFloat(e.target.value)||1}))} className="h-8 text-xs bg-white rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-1 md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase">Overtime Base Rate (AED/hr)</Label>
                    <Input type="number" value={localRules.overtimeHourlyRate} onChange={e => setLocalRules(r => ({...r, overtimeHourlyRate: parseFloat(e.target.value)||25}))} className="h-8 text-xs bg-white rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500 uppercase">Rate Multiplier</Label>
                    <Input type="number" step="0.1" value={localRules.overtimeMultiplier} onChange={e => setLocalRules(r => ({...r, overtimeMultiplier: parseFloat(e.target.value)||1}))} className="h-8 text-xs bg-white rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setRulesModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Save Rules</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent 
          className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-5 md:p-6 w-[95vw] sm:w-full max-w-2xl overflow-y-auto"
          style={{ maxHeight: "90vh" }}
        >
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-800">Edit Payroll Record</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Modify salary details for {editPay?.staffName}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Basic Salary</Label>
                  <Input type="number" required value={form.basicSalary} onChange={e => setForm(f => ({...f, basicSalary: parseInt(e.target.value)||0}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 w-full" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v as any}))}>
                    <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9 w-full"><SelectValue/></SelectTrigger>
                    <SelectContent className="bg-white rounded-xl text-xs">
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Overtime Details Group */}
                <div className="col-span-2 bg-slate-50/50 border border-slate-100 p-3 rounded-xl space-y-2">
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Overtime Calculations</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overtime Hours</Label>
                      <Input type="number" step="0.5" value={form.overtimeHours} onChange={e => {
                        const hours = parseFloat(e.target.value) || 0;
                        setForm(f => ({ ...f, overtimeHours: hours, overtime: Math.round(hours * f.overtimeRate) }));
                      }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hourly Rate (AED)</Label>
                      <Input type="number" step="0.5" value={form.overtimeRate} onChange={e => {
                        const rate = parseFloat(e.target.value) || 0;
                        setForm(f => ({ ...f, overtimeRate: rate, overtime: Math.round(f.overtimeHours * rate) }));
                      }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overtime Amount (AED)</Label>
                      <Input type="number" value={form.overtime} onChange={e => {
                        const val = parseInt(e.target.value)||0;
                        setForm(f => ({ ...f, overtime: val }));
                      }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Deductions Group */}
                <div className="col-span-2 bg-slate-50/50 border border-slate-100 p-3 rounded-xl space-y-2">
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Deductions</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Advance Deduction</Label>
                      <Input type="number" value={form.advanceDeduction} onChange={e => setForm(f => ({...f, advanceDeduction: parseInt(e.target.value)||0}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Loan Deduction</Label>
                      <Input type="number" value={form.loanDeduction} onChange={e => setForm(f => ({...f, loanDeduction: parseInt(e.target.value)||0}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                    </div>
                  </div>
                </div>

                {/* Net Salary Preview Banner */}
                <div className="col-span-2 bg-blue-50/70 border border-blue-100 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-600">Preview Net Salary</span>
                    <span className="text-sm font-black text-blue-700">AED {(form.basicSalary + (Number(editPay?.allowances) || 0) + form.overtime - (Number(editPay?.deductions) || 0) - form.advanceDeduction - form.loanDeduction).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Attendance & Time Tracking History panel */}
              <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 mb-1">Attendance History Breakdown</h3>
                  <p className="text-[10px] text-slate-400 mb-3">Time present / out history for {editPay?.month} {editPay?.year}</p>

                  {(() => {
                    const attendance = staffAttendance.find(a => a.staffId === editPay?.staffId && a.month.toLowerCase() === editPay?.month.toLowerCase() && a.year === editPay?.year);
                    if (!attendance || attendance.records.length === 0) {
                      return <div className="text-xs text-slate-400 bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">No attendance history records found for this period.</div>;
                    }

                    const totalPresent = attendance.records.filter(r => r.status === "Present" || r.status === "Late").length;
                    const totalAbsent = attendance.records.filter(r => r.status === "Absent").length;
                    const totalLeave = attendance.records.filter(r => r.status === "Leave").length;

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-emerald-600 uppercase">Present</div>
                            <div className="text-xs font-black text-emerald-800">{totalPresent} Days</div>
                          </div>
                          <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-rose-600 uppercase">Absent</div>
                            <div className="text-xs font-black text-rose-800">{totalAbsent} Days</div>
                          </div>
                          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2 text-center">
                            <div className="text-[9px] font-bold text-amber-600 uppercase">Leave</div>
                            <div className="text-xs font-black text-amber-800">{totalLeave} Days</div>
                          </div>
                        </div>

                        <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 bg-slate-50/50">
                          {attendance.records.map((r, i) => (
                            <div key={i} className="p-2 flex justify-between items-center text-[10px]">
                              <div>
                                <span className="font-bold text-slate-700">{r.date}</span>
                                {r.status === "Late" && <span className="ml-1.5 text-[8px] bg-amber-100 text-amber-800 font-bold px-1 rounded-sm">Late ({r.checkIn})</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {r.status === "Present" && <span className="text-slate-500 font-medium">In: {r.checkIn} - Out: {r.checkOut}</span>}
                                {r.status === "Absent" && <span className="text-rose-500 font-bold">Absent (Unpaid)</span>}
                                {r.status === "Leave" && <span className="text-amber-600 font-bold">On Leave</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-slate-100 pt-4 flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10">Save Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
