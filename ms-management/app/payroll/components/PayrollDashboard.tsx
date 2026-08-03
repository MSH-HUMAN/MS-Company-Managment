"use client";

import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Users, FileCheck, Plus, PieChart, Layers } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

export default function PayrollDashboard({ onNavigateToProcess }: { onNavigateToProcess?: () => void }) {
  const { currentRole, currentUser, payroll, staff } = useAuthStore();

  const allowedStaff = currentRole === "Super Admin" ? staff : staff.filter(s => s.company === currentUser.company);
  let visiblePayroll = currentRole === "Super Admin" ? payroll : payroll.filter(p => p.company === currentUser.company);

  const stats = useMemo(() => {
    const currentMonth = new Date().toLocaleString('default', { month: 'short' }).toLowerCase();
    const currentYear = new Date().getFullYear();

    // Match month by prefix (e.g. "aug" matches "Aug" or "August")
    let targetPayroll = visiblePayroll.filter(p => 
      p.month?.toLowerCase().startsWith(currentMonth.slice(0, 3)) && p.year === currentYear
    );

    // Fallback to all latest records if current month hasn't been generated yet
    if (targetPayroll.length === 0 && visiblePayroll.length > 0) {
      targetPayroll = visiblePayroll;
    }

    const totalNet = targetPayroll.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0);
    const approvedCount = targetPayroll.filter(p => p.status === "Approved" || p.status === "Paid").length;
    const draftCount = targetPayroll.filter(p => p.status === "Draft" || p.status === "Pending Approval").length;
    
    return {
      totalNet,
      totalStaff: allowedStaff.length,
      processedStaff: targetPayroll.length,
      approvedCount,
      draftCount,
      hasData: targetPayroll.length > 0
    };
  }, [visiblePayroll, allowedStaff]);

  return (
    <div className="space-y-6 select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 rounded-2xl border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Monthly Payroll</span>
            <div className="text-xl font-black text-slate-800">AED {stats.totalNet.toLocaleString()}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Processed Staff</span>
            <div className="text-xl font-black text-slate-800">{stats.processedStaff} / {stats.totalStaff}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Net Salary</span>
            <div className="text-xl font-black text-slate-800">
              AED {stats.processedStaff > 0 ? Math.round(stats.totalNet / stats.processedStaff).toLocaleString() : 0}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/50">
            <TrendingUp className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 rounded-2xl border-slate-100/80 bg-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved / Paid</span>
            <div className="text-xl font-black text-slate-800">{stats.approvedCount} / {stats.processedStaff}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/50">
            <FileCheck className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Overview Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-3xl border-slate-100 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Payroll Status Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Active Cycle</span>
          </div>

          {stats.hasData ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Draft / Pending</span>
                <div className="text-2xl font-black text-amber-900">{stats.draftCount}</div>
                <p className="text-[10px] text-amber-700 font-medium">Requires approval</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Approved / Disbursed</span>
                <div className="text-2xl font-black text-emerald-900">{stats.approvedCount}</div>
                <p className="text-[10px] text-emerald-700 font-medium">Ready for payslip download</p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Expenditure</span>
                <div className="text-xl font-black text-blue-900">AED {stats.totalNet.toLocaleString()}</div>
                <p className="text-[10px] text-blue-700 font-medium">Monthly staff liability</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
              <DollarSign className="w-10 h-10 text-slate-300" />
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-slate-700">No active monthly payroll generated yet</p>
                <p className="text-xs text-slate-400">Generate payroll for active staff to begin processing and tracking payslips.</p>
              </div>
              {onNavigateToProcess && (
                <Button onClick={onNavigateToProcess} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-4 h-9 gap-1.5 shadow-md shadow-blue-500/10">
                  <Plus className="w-4 h-4" /> Go to Process Payroll
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card className="rounded-3xl border-slate-100 bg-white shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">Quick Actions</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">Active Staff Count</span>
                <span className="font-extrabold text-blue-600">{allowedStaff.length} Employees</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">Total Payroll Records</span>
                <span className="font-extrabold text-purple-600">{visiblePayroll.length} Records</span>
              </div>
            </div>
          </div>

          {onNavigateToProcess && (
            <Button onClick={onNavigateToProcess} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-10 mt-4">
              Process Payroll Records
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
