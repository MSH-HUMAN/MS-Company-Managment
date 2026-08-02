"use client";

import { useState } from "react";
import { Download, DollarSign, CheckCircle2, Eye, Printer, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PayrollRecord } from "@/lib/types";

export default function Payslips() {
  const { currentRole, currentUser, payroll, updatePayroll, addActivityLog, siteSettings, staff } = useAuthStore();
  const { filters } = useFilterStore();
  const [viewPayslip, setViewPayslip] = useState<PayrollRecord | null>(null);
  const linkedStaff = staff.find(s => s.id === viewPayslip?.staffId);
  
  const f = filters.payroll;
  let list = Array.isArray(payroll) ? payroll.filter(p => p.status === "Approved" || p.status === "Paid") : [];
  if (currentRole === "Staff" && currentUser?.name) {
    list = list.filter(p => p.staffName?.toLowerCase() === currentUser.name.toLowerCase());
  } else if (currentRole !== "Super Admin" && currentUser?.company) {
    list = list.filter(p => p.company === currentUser.company);
  }
  if (f.search) {
    const q = f.search.toLowerCase();
    list = list.filter(p => (p.staffName || "").toLowerCase().includes(q));
  }
  if (f.status && f.status !== "all") list = list.filter(p => p.status === f.status);
  
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  list = [...list].sort((a,b) => {
    if (a.year !== b.year) return b.year - a.year;
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
  });
  
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const handlePay = (p: PayrollRecord) => {
    updatePayroll({ ...p, status: "Paid" });
    if (currentUser) {
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name || "User", role: currentUser.role || currentRole, company: currentUser.company || "", branch: currentUser.branch || "", action: "Status Changed", module: "Payroll", oldValue: p.status, newValue: "Paid", ipAddress: "192.168.1.102" });
    }
    toast.success(`Salary marked as paid for ${p.staffName}`);
  };

  const getPayslipHtml = (p: PayrollRecord, forPrint = true) => {
    const linkedStaff = Array.isArray(staff) ? staff.find(s => s.id === p.staffId) : undefined;
    const allowancesHtml = (() => {
      let rows: { name: string; amount: number }[] = [];
      const details = p.allowanceDetails;
      if (Array.isArray(details)) {
        rows = details.map(item => ({
          name: item.name || item.type || "Allowance",
          amount: Number(item.amount) || Number(item.val) || 0
        }));
      } else if (details && typeof details === 'object') {
        rows = Object.entries(details).map(([k, v]) => ({
          name: k.charAt(0).toUpperCase() + k.slice(1) + " Allowance",
          amount: Number(v) || 0
        }));
      }
      if (rows.length === 0 && typeof p.allowances === 'number' && p.allowances > 0) {
        rows.push({ name: "Standard Allowances", amount: p.allowances });
      }
      if (rows.length === 0) return '<div class="note">No allowances</div>';
      return rows.map(r => `<div class="row"><span>${r.name}</span><strong>AED ${(r.amount || 0).toLocaleString()}</strong></div>`).join("");
    })();

    const deductionsHtml = (() => {
      let rows: { name: string; amount: number }[] = [];
      const details = p.deductionDetails;
      if (Array.isArray(details)) {
        rows = details.map(item => ({
          name: item.name || item.type || "Deduction",
          amount: Number(item.amount) || Number(item.val) || 0
        }));
      } else if (details && typeof details === 'object') {
        rows = Object.entries(details).map(([k, v]) => ({
          name: k.charAt(0).toUpperCase() + k.slice(1) + " Deduction",
          amount: Number(v) || 0
        }));
      }
      let listHtml = rows.map(r => `<div class="row"><span>${r.name}</span><strong class="deduct">AED ${(r.amount || 0).toLocaleString()}</strong></div>`).join("");
      const advanceHtml = (p.advanceDeduction || 0) > 0 ? `<div class="row"><span>Advance Salary Deduction</span><strong class="deduct">AED ${(p.advanceDeduction || 0).toLocaleString()}</strong></div>` : "";
      const loanHtml = (p.loanDeduction || 0) > 0 ? `<div class="row"><span>Company Loan Deduction</span><strong class="deduct">AED ${(p.loanDeduction || 0).toLocaleString()}</strong></div>` : "";
      const baseDeductions = listHtml + advanceHtml + loanHtml;
      if (!baseDeductions && typeof p.deductions === 'number' && p.deductions > 0) {
        return `<div class="row"><span>Standard Deductions</span><strong class="deduct">AED ${(p.deductions || 0).toLocaleString()}</strong></div>`;
      }
      return baseDeductions || '<div class="note">No deductions</div>';
    })();

    const overtimeHtml = (p.overtime || 0) > 0 
      ? `<div class="row"><span>Overtime (${p.overtimeHours || 0} hrs @ ${p.overtimeRate || 0}/hr)</span><strong class="earn">AED ${(p.overtime || 0).toLocaleString()}</strong></div>` 
      : "";

    return `
      <html>
        <head>
          <title>Payslip - ${p.staffName} - ${p.month} ${p.year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
            body { font-family: 'Outfit', sans-serif; margin: 0; padding: 40px; color: #1e293b; background-color: #ffffff; }
            .letterhead { border-top: 6px solid #3b82f6; padding-top: 24px; margin-bottom: 40px; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .logo-text { font-size: 24px; font-weight: 900; color: #1e293b; }
            .company-info { font-size: 11px; color: #64748b; }
            .document-title { font-size: 20px; font-weight: 800; text-align: right; color: #0f172a; }
            .period-text { font-size: 12px; font-weight: 600; text-align: right; color: #64748b; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 40px; }
            .details-block h4 { margin: 0 0 8px 0; font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
            .details-block .name { font-size: 14px; font-weight: 800; }
            .details-block .meta { font-size: 11px; color: #64748b; }
            .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; }
            .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
            .row strong { color: #0f172a; }
            .row strong.earn { color: #059669; }
            .row strong.deduct { color: #dc2626; }
            .net-pay-banner { background: linear-gradient(135deg, #eff6ff, #f0fdf4); border: 1px solid #bfdbfe; border-radius: 16px; padding: 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
            .net-pay-label { font-size: 14px; font-weight: 800; color: #1e3a8a; }
            .net-pay-value { font-size: 24px; font-weight: 900; color: #1e3a8a; }
            .footer-note { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 60px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <table class="header-table">
              <tr>
                <td>
                  <div class="logo-text">${p.company}</div>
                  <div class="company-info">${p.branch}</div>
                </td>
                <td style="text-align: right; vertical-align: top;">
                  <div class="document-title">PAYSLIP</div>
                  <div class="period-text">${p.month} ${p.year}</div>
                  <div class="period-text" style="font-size: 10px; font-weight: normal; margin-top: 2px;">Generated Date: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </td>
              </tr>
            </table>
          </div>
          <div class="details-grid">
            <div class="details-block">
              <h4>Employee Details</h4>
              <div class="name">${p.staffName}</div>
              <div class="meta">${p.position}</div>
              <div class="meta">ID: ${p.staffId}</div>
              ${linkedStaff?.email ? `<div class="meta">Email: ${linkedStaff.email}</div>` : ""}
              ${linkedStaff?.mobile ? `<div class="meta">Mobile: ${linkedStaff.mobile}</div>` : ""}
              ${linkedStaff?.emiratesId ? `<div class="meta">Emirates ID: ${linkedStaff.emiratesId}</div>` : ""}
              ${linkedStaff?.joiningDate ? `<div class="meta">Joining Date: ${linkedStaff.joiningDate}</div>` : ""}
              ${linkedStaff?.nationality ? `<div class="meta">Nationality: ${linkedStaff.nationality}</div>` : ""}
            </div>
            <div class="details-block" style="text-align: right;">
              <h4>Payment details</h4>
              <div class="meta">Status: <strong>${p.status}</strong></div>
            </div>
          </div>
          <div class="breakdown-grid">
            <div>
              <div class="section-title">Earnings</div>
              <div class="row"><span>Basic Salary</span><strong>AED ${p.basicSalary.toLocaleString()}</strong></div>
              ${allowancesHtml}
              ${overtimeHtml}
            </div>
            <div>
              <div class="section-title">Deductions</div>
              ${deductionsHtml}
            </div>
          </div>
          <div class="net-pay-banner">
            <div class="net-pay-label">Net Take-Home Pay</div>
            <div class="net-pay-value">AED ${p.netSalary.toLocaleString()}</div>
          </div>
          </div>

          ${
            forPrint
              ? `
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
          `
              : ""
          }
        </body>
      </html>
    `;
  };

  const handlePrint = (p: PayrollRecord) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented opening the print window.");
      return;
    }
    printWindow.document.write(getPayslipHtml(p, true));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDownloadPayslip = (p: PayrollRecord) => {
    const html = getPayslipHtml(p, false);
    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payslip_${p.staffName.replace(/\s+/g, '_')}_${p.month}_${p.year}.html`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Payslip HTML downloaded successfully`);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-800">Approved Payslips</h2>
      </div>

      <FilterBar moduleKey="payroll" statusOptions={["Approved","Paid"]} />

      <div className="flex-1">
        {paginated.length === 0 ? (
          <EmptyState title="No payslips available" description="Approve payroll records to generate payslips." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginated.map(p => (
              <Card key={p.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100"><DollarSign className="w-4 h-4"/></div>
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
                      <div className="text-xs font-bold text-rose-600">-{((p.advanceDeduction||0) + (p.loanDeduction||0)).toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center">
                      <div className="text-[9px] font-extrabold text-slate-500 uppercase">Net Salary</div>
                      <div className="text-xs font-extrabold text-slate-900">{p.netSalary.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 flex gap-1.5 flex-wrap justify-end">
                  {p.status === "Approved" && currentRole !== "Staff" && (
                    <Button size="sm" onClick={() => handlePay(p)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Mark as Paid</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setViewPayslip(p)} className="border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] h-8 px-3 gap-1"><Eye className="w-3.5 h-3.5"/>View Payslip</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Pagination moduleKey="payroll" totalItems={totalItems} />

      <Dialog open={!!viewPayslip} onOpenChange={(o) => !o && setViewPayslip(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 w-[95vw] sm:w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {viewPayslip && (
            <>
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <DialogTitle className="text-base font-bold text-slate-800">Payslip - {viewPayslip.month} {viewPayslip.year}</DialogTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handlePrint(viewPayslip)} className="h-8 gap-1.5 text-xs rounded-lg print:hidden">
                    <Printer className="w-3.5 h-3.5" /> Print
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDownloadPayslip(viewPayslip)} className="h-8 gap-1.5 text-xs rounded-lg print:hidden">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                  <button onClick={() => setViewPayslip(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors print:hidden"><X className="w-4 h-4"/></button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 min-h-0" id="printable-payslip">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{viewPayslip.company}</h1>
                    <p className="text-xs text-slate-500 mt-1">{viewPayslip.branch}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800 tracking-tight">PAYSLIP</div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">{viewPayslip.month} {viewPayslip.year}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Employee Details</div>
                    <div className="text-sm font-bold text-slate-800">{viewPayslip.staffName}</div>
                    <div className="text-xs text-slate-600">{viewPayslip.position}</div>
                    <div className="text-xs text-slate-500 mt-1">ID: {viewPayslip.staffId}</div>
                    {linkedStaff && (
                      <div className="text-[10px] text-slate-500 mt-2 space-y-0.5 border-t border-slate-200/50 pt-1.5">
                        {linkedStaff.email && <div>Email: <span className="font-semibold text-slate-700">{linkedStaff.email}</span></div>}
                        {linkedStaff.mobile && <div>Mobile: <span className="font-semibold text-slate-700">{linkedStaff.mobile}</span></div>}
                        {linkedStaff.emiratesId && <div>Emirates ID: <span className="font-semibold text-slate-700">{linkedStaff.emiratesId}</span></div>}
                        {linkedStaff.joiningDate && <div>Joining Date: <span className="font-semibold text-slate-700">{linkedStaff.joiningDate}</span></div>}
                        {linkedStaff.nationality && <div>Nationality: <span className="font-semibold text-slate-700">{linkedStaff.nationality}</span></div>}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Payment Details</div>
                    <div className="text-xs text-slate-600 mb-1">Status: <span className="font-bold text-slate-800">{viewPayslip.status}</span></div>
                    <div className="text-xs text-slate-600">Net Salary: <span className="font-bold text-blue-600 text-sm">AED {viewPayslip.netSalary.toLocaleString()}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div>
                    <div className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Earnings</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Basic Salary</span>
                        <span className="font-bold text-slate-800">AED {viewPayslip.basicSalary.toLocaleString()}</span>
                      </div>
                      {(() => {
                        const details = Array.isArray(viewPayslip.allowanceDetails)
                          ? viewPayslip.allowanceDetails
                          : (Array.isArray(viewPayslip.allowances) ? viewPayslip.allowances : []);
                        if (details.length === 0 && typeof viewPayslip.allowances === 'number' && viewPayslip.allowances > 0) {
                          return (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">Standard Allowances</span>
                              <span className="font-bold text-slate-800">AED {viewPayslip.allowances.toLocaleString()}</span>
                            </div>
                          );
                        }
                        return (details as any[]).map((a, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-600">{a.name}</span>
                            <span className="font-bold text-slate-800">AED {a.amount.toLocaleString()}</span>
                          </div>
                        ));
                      })()}
                      {viewPayslip.overtime > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Overtime ({viewPayslip.overtimeHours} hrs @ {viewPayslip.overtimeRate})</span>
                          <span className="font-bold text-emerald-600">AED {viewPayslip.overtime.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Deductions</div>
                    <div className="space-y-2">
                      {(() => {
                        const details = Array.isArray(viewPayslip.deductionDetails)
                          ? viewPayslip.deductionDetails
                          : (Array.isArray(viewPayslip.deductions) ? viewPayslip.deductions : []);
                        const listItems = (details as any[]).map((d, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-slate-600">{d.name}</span>
                            <span className="font-bold text-rose-600">AED {d.amount.toLocaleString()}</span>
                          </div>
                        ));
                        const hasDetails = listItems.length > 0;
                        const hasAdvance = viewPayslip.advanceDeduction > 0;
                        const hasLoan = viewPayslip.loanDeduction > 0;
                        
                        if (!hasDetails && !hasAdvance && !hasLoan && typeof viewPayslip.deductions === 'number' && viewPayslip.deductions > 0) {
                          return (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">Standard Deductions</span>
                              <span className="font-bold text-rose-600">AED {viewPayslip.deductions.toLocaleString()}</span>
                            </div>
                          );
                        }

                        return (
                          <>
                            {listItems}
                            {hasAdvance && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Advance Salary Deduction</span>
                                <span className="font-bold text-rose-600">AED {viewPayslip.advanceDeduction.toLocaleString()}</span>
                              </div>
                            )}
                            {hasLoan && (
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Company Loan Deduction</span>
                                <span className="font-bold text-rose-600">AED {viewPayslip.loanDeduction.toLocaleString()}</span>
                              </div>
                            )}
                            {!hasDetails && !hasAdvance && !hasLoan && (
                              <div className="text-xs text-slate-400 italic">No deductions</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl">
                  <div className="text-sm font-bold text-slate-800">Net Pay</div>
                  <div className="text-xl font-black text-blue-600 tracking-tight">AED {viewPayslip.netSalary.toLocaleString()}</div>
                </div>
                
                <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                  <div className="text-center">
                    <div className="border-b border-slate-300 w-32 pb-6 mb-2"></div>
                    <div>Employer Signature</div>
                  </div>
                  <div className="text-center">
                    <div className="border-b border-slate-300 w-32 pb-6 mb-2"></div>
                    <div>Employee Signature</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
