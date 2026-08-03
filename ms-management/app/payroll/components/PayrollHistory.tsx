"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { History, FileText, CheckCircle, CheckCircle2, DollarSign, Eye, Printer, Download, X, Search, Calendar, Landmark } from "lucide-react";
import { toast } from "sonner";
import { PayrollRecord } from "@/lib/types";

export default function PayrollHistory() {
  const { activityLogs, currentRole, currentUser, payroll, updatePayroll, addActivityLog, staff } = useAuthStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [viewPayslip, setViewPayslip] = useState<PayrollRecord | null>(null);
  const linkedStaff = staff.find(s => s.id === viewPayslip?.staffId);
  const [showLogs, setShowLogs] = useState(false);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const YEARS = Array.from<number>(new Set(payroll.map(p => p.year))).sort((a, b) => b - a);

  // Filter processed payroll records by company context
  let allowedPayroll = payroll;
  if (currentRole !== "Super Admin") {
    allowedPayroll = allowedPayroll.filter(p => p.company === currentUser.company);
  }

  // Calculate high-level stats
  const totalPaid = allowedPayroll.filter(p => p.status === "Paid").reduce((sum, p) => sum + p.netSalary, 0);
  const totalApproved = allowedPayroll.filter(p => p.status === "Approved").reduce((sum, p) => sum + p.netSalary, 0);
  const totalOTHours = allowedPayroll.reduce((sum, p) => sum + (p.overtimeHours || 0), 0);

  // Apply listing filters
  let filteredPayroll = allowedPayroll;
  if (search) {
    filteredPayroll = filteredPayroll.filter(p => p.staffName.toLowerCase().includes(search.toLowerCase()));
  }
  if (statusFilter !== "all") {
    filteredPayroll = filteredPayroll.filter(p => p.status === statusFilter);
  }
  if (monthFilter !== "all") {
    filteredPayroll = filteredPayroll.filter(p => p.month === monthFilter);
  }
  if (yearFilter !== "all") {
    filteredPayroll = filteredPayroll.filter(p => p.year === parseInt(yearFilter));
  }

  filteredPayroll = [...filteredPayroll].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
  });

  // Filter audit logs
  let logs = activityLogs.filter(log => log.module === "Payroll");
  if (currentRole !== "Super Admin") {
    logs = logs.filter(log => log.company === currentUser.company);
  }
  logs.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  const getLogIcon = (action: string) => {
    if (action === "Created") return <FileText className="w-4 h-4 text-blue-600" />;
    if (action.includes("Approved")) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (action.includes("Paid") || action.includes("Status Changed")) return <DollarSign className="w-4 h-4 text-emerald-600" />;
    return <History className="w-4 h-4 text-slate-500" />;
  };

  const handlePay = (p: PayrollRecord) => {
    updatePayroll({ ...p, status: "Paid" });
    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Status Changed",
      module: "Payroll",
      oldValue: p.status,
      newValue: "Paid",
      ipAddress: "192.168.1.102"
    });
    toast.success(`Salary marked as paid for ${p.staffName}`);
  };

  const downloadCSV = (data: any[], headers: string[], keys: string[], filename: string) => {
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        keys.map(key => {
          let val = row[key];
          if (val === undefined || val === null) return "";
          const valStr = String(val).replace(/"/g, '""');
          return valStr.includes(",") || valStr.includes("\n") || valStr.includes('"') ? `"${valStr}"` : valStr;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadHistory = () => {
    const headers = ["Employee Name", "Employee ID", "Position", "Period", "Basic Salary", "Allowances", "Overtime", "Deductions", "Net Salary", "Status", "Company", "Branch"];
    const keys = ["staffName", "staffId", "position", "period", "basicSalary", "allowances", "overtime", "totalDeductions", "netSalary", "status", "company", "branch"];
    
    const dataToExport = filteredPayroll.map(p => ({
      ...p,
      period: `${p.month} ${p.year}`,
      totalDeductions: (p.deductions || 0) + (p.advanceDeduction || 0) + (p.loanDeduction || 0)
    }));

    downloadCSV(dataToExport, headers, keys, `payroll_history_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Payroll history downloaded successfully as CSV");
  };

  const getPayslipHtml = (p: PayrollRecord, forPrint = true) => {
    const linkedStaff = staff.find(s => s.id === p.staffId);
    const allowancesHtml = (() => {
      const details = Array.isArray(p.allowanceDetails)
        ? p.allowanceDetails
        : (Array.isArray(p.allowances) ? p.allowances : []);
      if (details.length === 0 && typeof p.allowances === 'number' && p.allowances > 0) {
        return `<div class="row"><span>Standard Allowances</span><strong>AED ${p.allowances.toLocaleString()}</strong></div>`;
      }
      return (details as any[]).map(a => `<div class="row"><span>${a.name}</span><strong>AED ${a.amount.toLocaleString()}</strong></div>`).join("");
    })();

    const deductionsHtml = (() => {
      const details = Array.isArray(p.deductionDetails)
        ? p.deductionDetails
        : (Array.isArray(p.deductions) ? p.deductions : []);
      const listHtml = (details as any[]).map(d => `<div class="row"><span>${d.name}</span><strong class="deduct">AED ${d.amount.toLocaleString()}</strong></div>`).join("");
      const advanceHtml = p.advanceDeduction > 0 ? `<div class="row"><span>Advance Salary Deduction</span><strong class="deduct">AED ${p.advanceDeduction.toLocaleString()}</strong></div>` : "";
      const loanHtml = p.loanDeduction > 0 ? `<div class="row"><span>Company Loan Deduction</span><strong class="deduct">AED ${p.loanDeduction.toLocaleString()}</strong></div>` : "";
      const baseDeductions = listHtml + advanceHtml + loanHtml;
      if (!baseDeductions && typeof p.deductions === 'number' && p.deductions > 0) {
        return `<div class="row"><span>Standard Deductions</span><strong class="deduct">AED ${p.deductions.toLocaleString()}</strong></div>`;
      }
      return baseDeductions || '<div class="note">No deductions</div>';
    })();

    const overtimeHtml = p.overtime > 0 
      ? `<div class="row"><span>Overtime (${p.overtimeHours || 0} hrs @ ${p.overtimeRate || 0}/hr)</span><strong class="earn">AED ${p.overtime.toLocaleString()}</strong></div>` 
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
          <div class="footer-note">
            This is a computer generated payslip and does not require a physical signature.
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
    <div className="flex flex-col h-full space-y-4 select-none">
      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid Payouts</div>
            <div className="text-base font-black text-slate-800">AED {totalPaid.toLocaleString()}</div>
          </div>
        </Card>
        <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Approved Payouts</div>
            <div className="text-base font-black text-slate-800">AED {totalApproved.toLocaleString()}</div>
          </div>
        </Card>
        <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Overtime Hours</div>
            <div className="text-base font-black text-slate-800">{totalOTHours.toLocaleString()} Hrs</div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800">{showLogs ? "Payroll Audit Trail" : "Payroll Record History"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!showLogs && (
            <Button onClick={handleDownloadHistory} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-sm">
              <Download className="w-4 h-4" /> Download History CSV
            </Button>
          )}
          <Button onClick={() => setShowLogs(!showLogs)} variant="outline" className="text-xs rounded-xl h-9 px-4 gap-1.5 border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
            <History className="w-4 h-4" /> {showLogs ? "Show Payroll Records" : "View Action Logs"}
          </Button>
        </div>
      </div>

      {!showLogs ? (
        <>
          {/* Filters Bar */}
          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200" />
            </div>

            <Select value={statusFilter} onValueChange={v => setStatusFilter(v || "all")}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent className="bg-white rounded-xl text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select value={monthFilter} onValueChange={v => setMonthFilter(v || "all")}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="All Months" /></SelectTrigger>
              <SelectContent className="bg-white rounded-xl text-xs">
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={v => setYearFilter(v || "all")}>
              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="All Years" /></SelectTrigger>
              <SelectContent className="bg-white rounded-xl text-xs">
                <SelectItem value="all">All Years</SelectItem>
                {YEARS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </Card>

          {/* Table Container */}
          <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden flex-1">
            {filteredPayroll.length === 0 ? (
              <EmptyState title="No payroll records found" description="Adjust filters or generate payroll records." />
            ) : (
              <>
                {/* Mobile Portrait View */}
                <div className="space-y-3 p-4 md:hidden">
                  {filteredPayroll.map(p => {
                    const totalDeductions = (p.advanceDeduction || 0) + (p.loanDeduction || 0) + (p.deductions || 0);
                    return (
                      <Card key={p.id} className="rounded-2xl border-slate-100 p-4 bg-white shadow-xs flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{p.staffName}</div>
                            <div className="text-[10px] text-slate-400">{p.position}</div>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <div><strong>Month:</strong> {p.month} {p.year}</div>
                          <div><strong>Basic Salary:</strong> AED {p.basicSalary.toLocaleString()}</div>
                          <div>
                            <strong>Overtime:</strong>{" "}
                            {p.overtimeHours && p.overtimeHours > 0 ? (
                              <span className="font-bold text-emerald-600">
                                AED {p.overtime.toLocaleString()} ({p.overtimeHours} hrs)
                              </span>
                            ) : (
                              "None"
                            )}
                          </div>
                          <div>
                            <strong>Deductions:</strong>{" "}
                            {totalDeductions > 0 ? (
                              <span className="font-bold text-rose-600">AED {totalDeductions.toLocaleString()}</span>
                            ) : (
                              "None"
                            )}
                          </div>
                          <div className="mt-1 pt-1 border-t border-slate-200/50 font-black text-slate-800">
                            Net Salary: AED {p.netSalary.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                          {p.status === "Approved" && (
                            <Button size="sm" onClick={() => handlePay(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[10px] h-8 px-3 gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Pay
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setViewPayslip(p)} className="border-slate-200 text-slate-600 font-bold rounded-xl text-[10px] h-8 px-3 gap-1">
                            <Eye className="w-3.5 h-3.5" /> Payslip
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Employee</th>
                        <th className="text-left px-4 py-3 w-28">Month</th>
                        <th className="text-left px-4 py-3 w-32">Basic Salary</th>
                        <th className="text-left px-4 py-3 w-56">Hourly Overtime</th>
                        <th className="text-left px-4 py-3 w-32">Deductions</th>
                        <th className="text-left px-4 py-3 w-32">Net Salary</th>
                        <th className="text-left px-4 py-3 w-28">Status</th>
                        <th className="text-right px-4 py-3 w-44">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayroll.map(p => {
                        const totalDeductions = (p.advanceDeduction || 0) + (p.loanDeduction || 0) + (p.deductions || 0);
                        return (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/30 text-slate-600">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{p.staffName}</div>
                              <div className="text-[10px] text-slate-400">{p.position}</div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">{p.month} {p.year}</td>
                            <td className="px-4 py-3 font-medium text-slate-700">AED {p.basicSalary.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {p.overtimeHours && p.overtimeHours > 0 ? (
                                <div>
                                  <span className="font-bold text-emerald-600">AED {p.overtime.toLocaleString()}</span>
                                  <div className="text-[9px] text-slate-400 mt-0.5 font-medium">
                                    {p.overtimeHours} hrs @ AED {p.overtimeRate}/hr
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No Overtime</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-rose-600">
                              {totalDeductions > 0 ? `-AED ${totalDeductions.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-black text-slate-800">AED {p.netSalary.toLocaleString()}</td>
                            <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex gap-1.5 justify-end">
                                {p.status === "Approved" && (
                                  <Button size="sm" onClick={() => handlePay(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] h-7 px-2.5 gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Pay
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => setViewPayslip(p)} className="border-slate-200 text-slate-600 font-bold rounded-lg text-[10px] h-7 px-2.5 gap-1 hover:bg-slate-50">
                                  <Eye className="w-3.5 h-3.5" /> Payslip
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </>
      ) : (
        /* Action Audit Log View */
        <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <History className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-xs font-medium">No payroll history logs recorded.</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pt-4 w-[95vw] sm:w-full max-w-3xl mx-auto">
              {logs.map((log) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {getLogIcon(log.action)}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-600">
                        {log.action}
                      </span>
                      <time className="text-[10px] font-bold text-slate-400">{new Date(log.dateTime).toLocaleString()}</time>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 mt-2">{log.newValue || log.action}</h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                      Performed by <strong>{log.userName}</strong> ({log.role}) 
                      {log.company && ` from ${log.company}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Payslip Modal Dialog */}
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
                      {(Array.isArray(viewPayslip.allowanceDetails) ? viewPayslip.allowanceDetails : []).map((a, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-600">{a.name}</span>
                          <span className="font-bold text-slate-800">AED {(a.amount || 0).toLocaleString()}</span>
                        </div>
                      ))}
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
                      {(Array.isArray(viewPayslip.deductionDetails) ? viewPayslip.deductionDetails : []).map((d, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-600">{d.name}</span>
                          <span className="font-bold text-rose-600">AED {(d.amount || 0).toLocaleString()}</span>
                        </div>
                      ))}
                      {viewPayslip.advanceDeduction > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Advance Salary Deduction</span>
                          <span className="font-bold text-rose-600">AED {viewPayslip.advanceDeduction.toLocaleString()}</span>
                        </div>
                      )}
                      {viewPayslip.loanDeduction > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600">Company Loan Deduction</span>
                          <span className="font-bold text-rose-600">AED {viewPayslip.loanDeduction.toLocaleString()}</span>
                        </div>
                      )}
                      {(viewPayslip.deductionDetails || []).length === 0 && viewPayslip.advanceDeduction === 0 && viewPayslip.loanDeduction === 0 && (
                        <div className="text-xs text-slate-400 italic">No deductions</div>
                      )}
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
