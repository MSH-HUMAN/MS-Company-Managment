"use strict";
"use client";

import { X } from "lucide-react";
import { useFilterStore } from "@/store/filterStore";
import { DEFAULT_FILTER_STATE } from "@/store/filterStore";
import { Button } from "@/components/ui/button";

interface FilterChipsProps {
  moduleKey: string;
}

export default function FilterChips({ moduleKey }: FilterChipsProps) {
  const { filters, setFilter, clearFilter } = useFilterStore();
  const currentFilters = filters[moduleKey];

  if (!currentFilters) return null;

  const activeChips: { key: string; label: string; value: string }[] = [];

  // Parse active filters to chips
  if (currentFilters.status && currentFilters.status !== "all") {
    activeChips.push({ key: "status", label: "Status", value: currentFilters.status });
  }
  if (currentFilters.company && currentFilters.company !== "all") {
    activeChips.push({ key: "company", label: "Company", value: currentFilters.company });
  }
  if (currentFilters.branch && currentFilters.branch !== "all") {
    activeChips.push({ key: "branch", label: "Branch", value: currentFilters.branch });
  }
  if (currentFilters.nationality && currentFilters.nationality !== "all") {
    activeChips.push({ key: "nationality", label: "Nationality", value: currentFilters.nationality });
  }
  if (currentFilters.fromDate) {
    activeChips.push({ key: "fromDate", label: "From", value: currentFilters.fromDate });
  }
  if (currentFilters.toDate) {
    activeChips.push({ key: "toDate", label: "To", value: currentFilters.toDate });
  }
  if (currentFilters.search) {
    activeChips.push({ key: "search", label: "Search", value: currentFilters.search });
  }
  if (currentFilters.interviewType && currentFilters.interviewType !== "all") {
    activeChips.push({ key: "interviewType", label: "Type", value: currentFilters.interviewType });
  }
  if (currentFilters.interviewMode && currentFilters.interviewMode !== "all") {
    activeChips.push({ key: "interviewMode", label: "Mode", value: currentFilters.interviewMode });
  }
  if (currentFilters.mobileSearch) {
    activeChips.push({ key: "mobileSearch", label: "Phone", value: currentFilters.mobileSearch });
  }

  if (activeChips.length === 0) return null;

  const handleRemoveChip = (key: string) => {
    setFilter(moduleKey, { [key]: DEFAULT_FILTER_STATE[key as keyof typeof DEFAULT_FILTER_STATE] });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-2 bg-slate-50/50 border-b border-slate-100 select-none">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
        Active Filters:
      </span>
      {activeChips.map((chip) => (
        <div
          key={chip.key}
          className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm hover:border-slate-300 transition-all"
        >
          <span>
            {chip.label}: <span className="text-blue-600 font-semibold">{chip.value}</span>
          </span>
          <button
            onClick={() => handleRemoveChip(chip.key)}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-0.5 rounded-full transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        onClick={() => clearFilter(moduleKey)}
        className="text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 h-5 rounded-full font-bold ml-1"
      >
        Clear All
      </Button>
    </div>
  );
}
