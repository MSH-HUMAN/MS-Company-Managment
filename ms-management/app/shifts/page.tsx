"use client";
 
import ShiftManagement from "../attendance/components/ShiftManagement";
import PageHeader from "@/components/shared/PageHeader";
 
export default function ShiftsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Shift Management"
        subtitle="Manage employee shifts, working hours, and grace periods"
      />
      <div className="p-4 md:p-6 w-full max-w-7xl mx-auto">
        <ShiftManagement />
      </div>
    </div>
  );
}
