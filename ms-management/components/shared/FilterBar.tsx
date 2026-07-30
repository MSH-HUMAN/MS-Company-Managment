"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, Download, Printer, LayoutGrid, List } from "lucide-react";
import { useFilterStore } from "@/store/filterStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdvancedFilter from "./AdvancedFilter";
import FilterChips from "./FilterChips";

interface FilterBarProps {
  moduleKey: string;
  statusOptions?: string[];
  showNationality?: boolean;
  showAssignee?: boolean;
  onExport?: () => void;
  onPrint?: () => void;
  viewMode?: "grid" | "table";
  onViewModeChange?: (mode: "grid" | "table") => void;
  actions?: React.ReactNode;
}

export default function FilterBar({
  moduleKey,
  statusOptions = [],
  showNationality = false,
  showAssignee = false,
  onExport,
  onPrint,
  viewMode,
  onViewModeChange,
  actions
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { filters, setFilter, clearFilter } = useFilterStore();
  const currentFilters = filters[moduleKey];

  if (!currentFilters) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(moduleKey, { search: e.target.value, page: 1 });
  };

  const hasActiveFilters = 
    (currentFilters.status && currentFilters.status !== "all") ||
    (currentFilters.company && currentFilters.company !== "all") ||
    (currentFilters.branch && currentFilters.branch !== "all") ||
    (currentFilters.nationality && currentFilters.nationality !== "all") ||
    currentFilters.fromDate ||
    currentFilters.toDate ||
    currentFilters.search ||
    currentFilters.mobileSearch;

  return (
    <div className="flex flex-col bg-white border-b border-slate-200 select-none shadow-sm">
      {/* ROW 1: General search + tools */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-4 md:px-6">
        {/* Main Search Input */}
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name, email, details..."
            value={currentFilters.search || ""}
            onChange={handleSearchChange}
            className="pl-9 pr-4 bg-slate-50 border-slate-200 hover:border-slate-300 rounded-xl text-xs h-10 w-full focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Buttons and dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pb-1 md:pb-0">
          {/* Advanced toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "text-xs h-10 rounded-xl px-3 border-slate-200 gap-1.5",
              showAdvanced && "border-blue-400 bg-blue-50/50 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </Button>

          {/* Clear button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() => clearFilter(moduleKey)}
              className="text-xs h-10 rounded-xl px-3 border-slate-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </Button>
          )}

          {/* Sort dropdown */}
          <Select
            value={currentFilters.sortBy ?? undefined}
            onValueChange={(val) => setFilter(moduleKey, { sortBy: val ?? undefined, page: 1 })}
          >
            <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10 w-32 focus:ring-blue-100">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-xl text-xs">
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              className="text-xs h-10 rounded-xl px-3 border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          )}

          {/* Print */}
          {onPrint && (
            <Button
              variant="outline"
              onClick={onPrint}
              className="text-xs h-10 rounded-xl px-3 border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
          )}

          {/* Grid/Table view toggles */}
          {viewMode && onViewModeChange && (
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
              <button
                onClick={() => onViewModeChange("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange("table")}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === "table" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Custom actions slot */}
          {actions}
        </div>
      </div>

      {/* ROW 2: Advanced Panel */}
      {showAdvanced && (
        <AdvancedFilter
          moduleKey={moduleKey}
          statusOptions={statusOptions}
          showNationality={showNationality}
          showAssignee={showAssignee}
        />
      )}

      {/* ROW 3: Active Filter Chips */}
      <FilterChips moduleKey={moduleKey} />
    </div>
  );
}
