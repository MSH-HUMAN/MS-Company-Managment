"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import AccessDenied from "@/components/shared/AccessDenied";
import AttendanceDashboard from "./components/AttendanceDashboard";
import AttendanceRecords from "./components/AttendanceRecords";
import AttendanceCalendar from "./components/AttendanceCalendar";
import ShiftManagement from "./components/ShiftManagement";
import OvertimeManagement from "./components/OvertimeManagement";
import AttendanceCorrections from "./components/AttendanceCorrections";
import AttendanceReports from "./components/AttendanceReports";
import AttendanceSettings from "./components/AttendanceSettings";

const ALL_TABS = [
  "Dashboard",
  "Records",
  "Calendar",
  "Shifts",
  "Overtime",
  "Corrections",
  "Reports",
  "Settings"
];

function AttendanceContent() {
  const { currentRole, hasPermission } = useAuthStore();
  const canView = hasPermission("attendance", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [activeTab, setActiveTab] = useState("Dashboard");
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const isAdmin = currentRole === "Super Admin" || 
                  hasPermission("attendance", "edit") || 
                  hasPermission("attendance", "create");

  const visibleTabs = useMemo(() => {
    if (isAdmin) {
      return ALL_TABS;
    }
    return ["Dashboard", "Calendar", "Overtime", "Corrections"];
  }, [isAdmin]);

  useEffect(() => {
    if (tabParam && visibleTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("Dashboard");
    }
  }, [tabParam, visibleTabs]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Attendance Management"
        subtitle="Comprehensive tracking for time, shifts, and overtime"
      />

      <div className="px-4 md:px-6 pt-2 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
          {visibleTabs.map((tab) => (
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
        {activeTab === "Dashboard" && <AttendanceDashboard />}
        {activeTab === "Records" && <AttendanceRecords />}
        {activeTab === "Calendar" && <AttendanceCalendar />}
        {activeTab === "Shifts" && <ShiftManagement />}
        {activeTab === "Overtime" && <OvertimeManagement />}
        {activeTab === "Corrections" && <AttendanceCorrections />}
        {activeTab === "Reports" && <AttendanceReports />}
        {activeTab === "Settings" && <AttendanceSettings />}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-400">Loading...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}
