"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import PayrollDashboard from "./components/PayrollDashboard";
import SalarySetup from "./components/SalarySetup";
import ProcessPayroll from "./components/ProcessPayroll";
import Payslips from "./components/Payslips";
import PayrollReports from "./components/PayrollReports";
import PayrollHistory from "./components/PayrollHistory";
import { useAuthStore } from "@/store/authStore";
import AccessDenied from "@/components/shared/AccessDenied";

export default function PayrollPage() {
  const { currentRole, hasPermission } = useAuthStore();

  const canView = hasPermission("payroll", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  // Role-based access levels
  const isStaff = currentRole === "Staff";
  const isSuperAdmin = currentRole === "Super Admin";
  const isAdminLevel = isSuperAdmin ||
    currentRole === "Company Admin" ||
    currentRole === "Branch Admin" ||
    currentRole === "HR Manager" ||
    currentRole === "Admin" ||
    currentRole === "HR" ||
    currentRole === "Accountant";

  // Staff can only see Payslips — their own
  // Admin-level: all tabs, but Process Payroll requires create permission
  const canProcess = hasPermission("payroll", "create");

  const availableTabs = isStaff
    ? ["Payslips"]
    : isAdminLevel
      ? [
          "Dashboard",
          "Salary Setup",
          ...(canProcess ? ["Process Payroll"] : []),
          "Payslips",
          "Reports",
          "History"
        ]
      : ["Payslips"]; // fallback for unknown roles

  const [activeTab, setActiveTab] = useState(availableTabs[0]);

  useEffect(() => {
    // Reset to first available tab if current tab is no longer available
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [currentRole]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Payroll Management"
        subtitle={isStaff ? "View your payslips and salary history" : "Manage salaries, deductions, and issue payslips"}
      />

      <div className="px-4 md:px-6 pt-2 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 w-full max-w-7xl mx-auto space-y-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {activeTab === "Dashboard" && isAdminLevel && <PayrollDashboard />}
        {activeTab === "Salary Setup" && isAdminLevel && <SalarySetup />}
        {activeTab === "Process Payroll" && isAdminLevel && canProcess && <ProcessPayroll />}
        {activeTab === "Payslips" && <Payslips />}
        {activeTab === "Reports" && isAdminLevel && <PayrollReports />}
        {activeTab === "History" && isAdminLevel && <PayrollHistory />}
      </div>
    </div>
  );
}
