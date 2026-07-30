"use strict";
"use client";

import { useEffect, useState } from "react";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { NATIONALITIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdvancedFilterProps {
  moduleKey: string;
  statusOptions?: string[];
  showNationality?: boolean;
  showAssignee?: boolean;
}

export default function AdvancedFilter({
  moduleKey,
  statusOptions = [],
  showNationality = false,
  showAssignee = false
}: AdvancedFilterProps) {
  const { filters, setFilter } = useFilterStore();
  const { currentRole, currentUser, ownCompanies, branches, staff } = useAuthStore();
  
  const currentFilters = filters[moduleKey];

  // Derive allowed companies and branches based on role permissions
  const isSuperAdmin = currentRole === "Super Admin";
  const userCompany = currentUser.company;
  const userBranch = currentUser.branch;

  const allowedCompanies = isSuperAdmin
    ? ownCompanies
    : ownCompanies.filter((c) => c.name === userCompany);

  const selectedCompany = currentFilters?.company || "all";
  
  const allowedBranches = isSuperAdmin
    ? branches.filter((b) => selectedCompany === "all" || b.company === selectedCompany)
    : branches.filter((b) => b.company === userCompany && (userBranch === "All" || b.name === userBranch));

  // If user is restricted, automatically enforce company/branch filters in the store
  useEffect(() => {
    if (!isSuperAdmin) {
      const updates: any = {};
      if (currentFilters?.company !== userCompany) {
        updates.company = userCompany;
      }
      if (userBranch !== "All" && currentFilters?.branch !== userBranch) {
        updates.branch = userBranch;
      }
      if (Object.keys(updates).length > 0) {
        setFilter(moduleKey, updates);
      }
    }
  }, [currentRole, currentUser, moduleKey]);

  if (!currentFilters) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 md:p-6 bg-slate-50 border-b border-slate-200 select-none">
      {/* 1. Mobile Number search */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Mobile Number
        </Label>
        <Input
          type="tel"
          placeholder="Search mobile..."
          value={currentFilters.mobileSearch || ""}
          onChange={(e) => setFilter(moduleKey, { mobileSearch: e.target.value, page: 1 })}
          className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* 2. WhatsApp search */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          WhatsApp Number
        </Label>
        <Input
          type="tel"
          placeholder="Search WhatsApp..."
          value={currentFilters.whatsappSearch || ""}
          onChange={(e) => setFilter(moduleKey, { whatsappSearch: e.target.value, page: 1 })}
          className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* 3. Email search */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Email Address
        </Label>
        <Input
          type="email"
          placeholder="Search email..."
          value={currentFilters.emailSearch || ""}
          onChange={(e) => setFilter(moduleKey, { emailSearch: e.target.value, page: 1 })}
          className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* 4. Status filter */}
      {statusOptions.length > 0 && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Status
          </Label>
          <Select
            value={currentFilters.status || "all"}
            onValueChange={(val) => setFilter(moduleKey, { status: val || "", page: 1 })}
          >
            <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 3. Company filter */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Company
        </Label>
        <Select
          value={currentFilters.company || "all"}
          onValueChange={(val) => setFilter(moduleKey, { company: val || "", branch: "all", page: 1 })}
          disabled={!isSuperAdmin}
        >
          <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9 disabled:opacity-75 disabled:bg-slate-100">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
            {isSuperAdmin && <SelectItem value="all">All Companies</SelectItem>}
            {allowedCompanies.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Branch filter */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Branch
        </Label>
        <Select
          value={currentFilters.branch || "all"}
          onValueChange={(val) => setFilter(moduleKey, { branch: val || "", page: 1 })}
          disabled={!isSuperAdmin && currentRole !== "Company Admin"}
        >
          <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9 disabled:opacity-75 disabled:bg-slate-100">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
            {isSuperAdmin && <SelectItem value="all">All Branches</SelectItem>}
            {allowedBranches.map((b) => (
              <SelectItem key={b.id} value={b.name}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 5. Nationality filter (where applicable) */}
      {showNationality && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Nationality
          </Label>
          <Select
            value={currentFilters.nationality || "all"}
            onValueChange={(val) => setFilter(moduleKey, { nationality: val || "", page: 1 })}
          >
            <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
              <SelectValue placeholder="All Nationalities" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
              <SelectItem value="all">All Nationalities</SelectItem>
              {NATIONALITIES.map((n) => (
                <SelectItem key={n.name} value={n.name}>
                  <span className="mr-1.5">{n.flag}</span>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 6. Assignee filter (where applicable) */}
      {showAssignee && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Assigned To
          </Label>
          <Select
            value={currentFilters.assignedTo || "all"}
            onValueChange={(val) => setFilter(moduleKey, { assignedTo: val || "", page: 1 })}
          >
            <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
              <SelectItem value="all">All Assignees</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 6.5. Interview Type (For Interviews module only) */}
      {moduleKey === "interviews" && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Interview Type
            </Label>
            <Select
              value={currentFilters.interviewType || "all"}
              onValueChange={(val) => setFilter(moduleKey, { interviewType: val || "", page: 1 })}
            >
              <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Physical">Physical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Interview Mode
            </Label>
            <Select
              value={currentFilters.interviewMode || "all"}
              onValueChange={(val) => setFilter(moduleKey, { interviewMode: val || "", page: 1 })}
            >
              <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Physical Interview">Physical Interview</SelectItem>
                <SelectItem value="Zoom Meeting">Zoom Meeting</SelectItem>
                <SelectItem value="Google Meet">Google Meet</SelectItem>
                <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                <SelectItem value="Telephone Interview">Telephone Interview</SelectItem>
                <SelectItem value="Online Interview">Online Interview</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                {/* Deprecated modes support */}
                <SelectItem value="Zoom">Zoom</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Phone call">Phone call</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* 7. From Date */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          From Date
        </Label>
        <Input
          type="date"
          value={currentFilters.fromDate || ""}
          onChange={(e) => setFilter(moduleKey, { fromDate: e.target.value, page: 1 })}
          className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* 8. To Date */}
      <div className="space-y-1">
        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          To Date
        </Label>
        <Input
          type="date"
          value={currentFilters.toDate || ""}
          onChange={(e) => setFilter(moduleKey, { toDate: e.target.value, page: 1 })}
          className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
}
