"use strict";
"use client";

import { useState, useEffect } from "react";
import type { Applicant } from "@/lib/types";
import Link from "next/link";
import { Plus, Table as TableIcon, LayoutGrid, FileText, Trash2, Edit, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, getStatusColor, exportToCSV } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import ProfileCard from "@/components/shared/ProfileCard";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AccessDenied from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function ApplicantsPage() {
  const { currentRole, currentUser, applicants, deleteApplicant, updateApplicant, hasPermission, companies, isStoreLoaded } = useAuthStore();
  const { filters, setFilter } = useFilterStore();
  
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("grid");
    }
  }, []);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
 
  const currentFilters = filters.applicants;
  const canViewApplicants = hasPermission("applicants", "view");
  const canCreateApplicants = hasPermission("applicants", "create");
  const canDeleteApplicants = hasPermission("applicants", "delete");
  const canExportApplicants = hasPermission("applicants", "export");
  const canPrintApplicants = hasPermission("applicants", "print");
  const canEditApplicants = hasPermission("applicants", "edit");
 
  if (!isStoreLoaded) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-12 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading applicants data...</p>
        </div>
      </div>
    );
  }

  if (!canViewApplicants) {
    return <AccessDenied />;
  }
 
  // 1. Role-based filtering
  let allowedApplicants: Applicant[] = applicants;
  
  if (currentRole !== "Super Admin") {
    allowedApplicants = applicants.filter(a => a.company === currentUser.company);
    
    // Strict Branch Validation: If not a Company Admin, restrict to own branch.
    if (currentRole !== "Company Admin" && currentUser.branch && currentUser.branch !== "All") {
      allowedApplicants = allowedApplicants.filter(a => a.branch === currentUser.branch);
    }
  }

  // 2. Apply filters
  let filtered = allowedApplicants.filter((item) => {
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      const match = 
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.trackingCode.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (currentFilters.mobileSearch) {
      const q = currentFilters.mobileSearch;
      if (!item.mobile.includes(q)) return false;
    }
    if (currentFilters.status && currentFilters.status !== "all") {
      if (item.status !== currentFilters.status) return false;
    }
    if (currentFilters.company && currentFilters.company !== "all") {
      if (item.company !== currentFilters.company) return false;
    }
    if (currentFilters.branch && currentFilters.branch !== "all") {
      if (item.branch !== currentFilters.branch) return false;
    }
    if (currentFilters.nationality && currentFilters.nationality !== "all") {
      if (item.nationality !== currentFilters.nationality) return false;
    }
    if (currentFilters.fromDate) {
      const itemDate = new Date(item.applicationDate);
      const fromDate = new Date(currentFilters.fromDate);
      if (itemDate < fromDate) return false;
    }
    if (currentFilters.toDate) {
      const itemDate = new Date(item.applicationDate);
      const toDate = new Date(currentFilters.toDate);
      if (itemDate > toDate) return false;
    }
    return true;
  });

  // 3. Sorting
  const sortBy = currentFilters.sortBy || "newest";
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime();
    }
    if (sortBy === "name_asc") {
      return a.fullName.localeCompare(b.fullName);
    }
    if (sortBy === "name_desc") {
      return b.fullName.localeCompare(a.fullName);
    }
    return 0;
  });

  // 4. Pagination
  const totalItems = filtered.length;
  const page = currentFilters.page || 1;
  const pageSize = currentFilters.pageSize || 10;
  const paginatedList = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Actions
  const handleExport = () => {
    const exportData = filtered.map(a => ({
      ID: a.id,
      Name: a.fullName,
      Email: a.email,
      Mobile: a.mobile,
      Nationality: a.nationality,
      "Visa Type": a.visaType,
      "Visa Expiry": a.visaExpiry,
      Status: a.status,
      "Tracking Code": a.trackingCode,
      Company: a.company,
      Branch: a.branch,
      "Applied Date": a.applicationDate
    }));
    exportToCSV(exportData, "applicants-list");
    toast.success("CSV export initiated");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteClick = (id: string) => {
    setSelectedApplicantId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedApplicantId) {
      deleteApplicant(selectedApplicantId);
      toast.success("Applicant record deleted successfully (Soft delete simulated)");
      setSelectedApplicantId(null);
    }
  };

  const handleStatusUpdate = (id: string, newStatus: Applicant["status"]) => {
    const applicant = applicants.find(a => a.id === id);
    if (applicant) {
      const updated: Applicant = {
        ...applicant,
        status: newStatus,
        statusHistory: [
          {
            oldStatus: applicant.status,
            newStatus,
            changedBy: currentUser.name,
            date: new Date().toISOString().slice(0, 10),
            reason: "Status changed from list view"
          },
          ...applicant.statusHistory
        ]
      };
      updateApplicant(updated);
      toast.success(`Updated status to ${newStatus}`);
    }
  };

  return (
    <div className="flex flex-col min-h-full select-none">
      <PageHeader
        title="Applicant Management"
        subtitle="Manage recruitments, profile cards, and placement pipelines"
        actions={
          canCreateApplicants ? (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-sm">
              <Link href="/applicants/new">
                <Plus className="w-4 h-4" />
                Add Applicant
              </Link>
            </Button>
          ) : null
        }
      />

      <FilterBar
        moduleKey="applicants"
        statusOptions={["Pending", "Processing", "Placed", "Rejected", "Returned"]}
        showNationality={true}
        onExport={canExportApplicants ? handleExport : undefined}
        onPrint={canPrintApplicants ? handlePrint : undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        actions={
          canCreateApplicants ? (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 px-4 gap-1.5 shadow-sm">
              <Link href="/applicants/new">
                <Plus className="w-4 h-4" />
                Add Applicant
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex-1 p-4 md:p-6">
        {paginatedList.length === 0 ? (
          <EmptyState
            title="No applicants found"
            description="Adjust your search filters or add a new applicant profile to get started."
            action={
              canCreateApplicants ? (
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-4 h-9">
                  <Link href="/applicants/new">Add First Applicant</Link>
                </Button>
              ) : null
            }
          />
        ) : viewMode === "grid" ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedList.map((app) => {
              // Calculate critical alerts
              let alert: { message: string; type: "critical" | "warning" } | null = null;
              if (app.visaExpiry) {
                const expiry = new Date(app.visaExpiry);
                const today = new Date("2026-06-04");
                const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (days <= 0) {
                  alert = { message: "Visa has already expired!", type: "critical" as const };
                } else if (days <= 8) {
                  alert = { message: `Visa expires in ${days} days!`, type: "critical" as const };
                } else if (days <= 20) {
                  alert = { message: `Visa expiring in ${days} days.`, type: "warning" as const };
                }
              }

              return (
                <ProfileCard
                  key={app.id}
                  type="applicant"
                  id={app.id}
                  name={app.fullName}
                  subtitle={`${app.applyingPositions.join(", ")}`}
                  status={app.status}
                  image={app.photo}
                  flag={app.nationalityFlag}
                  nationality={app.nationality}
                  email={app.email}
                  phone={app.mobile}
                  whatsapp={app.whatsapp}
                  visaExpiry={app.visaExpiry}
                  passportExpiry={app.passportExpiry}
                  statusHistory={app.statusHistory}
                  documents={app.documents}
                  extraInfo={`Applied: ${formatDate(app.applicationDate)}`}
                  alert={alert}
                  detailUrl={`/applicants/${app.id}`}
                  editUrl={canEditApplicants ? `/applicants/edit/${app.id}` : undefined}
                  onDelete={canDeleteApplicants ? () => handleDeleteClick(app.id) : undefined}
                />
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Applied Position</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Applied Company</TableHead>
                  <TableHead>Visa Exp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.map((app) => (
                  <TableRow key={app.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                    <TableCell className="font-bold text-slate-400">{app.id}</TableCell>
                    <TableCell className="font-bold text-slate-800">
                      <Link href={`/applicants/${app.id}`} className="hover:text-blue-600 transition-colors">
                        {app.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500">{app.applyingPositions.join(", ")}</TableCell>
                    <TableCell>
                      <span className="mr-1.5">{app.nationalityFlag}</span>
                      {app.nationality}
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500">{app.company}</TableCell>
                    <TableCell className="text-[11px]">{formatDate(app.visaExpiry)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Button asChild variant="ghost" size="icon" className="w-7 h-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Link href={`/applicants/${app.id}`}>
                          <FileText className="w-4 h-4" />
                        </Link>
                      </Button>
                      {canEditApplicants ? (
                        <Button asChild variant="ghost" size="icon" className="w-7 h-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit Applicant">
                          <Link href={`/applicants/edit/${app.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                      ) : null}
                      {canDeleteApplicants ? (
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(app.id)} className="w-7 h-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Pagination moduleKey="applicants" totalItems={totalItems} />

      {/* Mobile Floating Action Button (FAB) */}
      {canCreateApplicants && (
        <Button
          asChild
          className="fixed bottom-6 right-6 md:hidden w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl z-50 flex items-center justify-center p-0 border border-blue-400"
        >
          <Link href="/applicants/new">
            <Plus className="w-6 h-6" />
          </Link>
        </Button>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Applicant Record"
        description="Are you sure you want to delete this applicant profile? This action will archive their record in history."
        confirmText="Archive Profile"
        variant="danger"
      />
    </div>
  );
}
