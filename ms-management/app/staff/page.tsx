"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, Trash2, Phone, Mail, MessageCircle, Eye, Download } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, getStatusColor, exportToCSV } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AccessDenied from "@/components/shared/AccessDenied";
import { filterRecordsByPermission } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Safe initials helper
function getInitials(name: string): string {
  return (name || "")
    .split(" ")
    .map(w => w[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export default function StaffPage() {
  const router = useRouter();
  const { currentRole, currentUser, staff, deleteStaff, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openDocsId, setOpenDocsId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("grid");
    }
  }, []);

  const canViewStaff = hasPermission("staff", "view");
  const canCreateStaff = hasPermission("staff", "create");
  const canDeleteStaff = hasPermission("staff", "delete");
  const canExportStaff = hasPermission("staff", "export");

  if (!canViewStaff) {
    return <AccessDenied />;
  }

  const f = filters.staff || {};

  let list = filterRecordsByPermission("staff", Array.isArray(staff) ? staff : [], currentUser, currentRole, hasPermission);

  if (f.search) {
    const q = f.search.toLowerCase();
    list = list.filter(s =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.position || "").toLowerCase().includes(q)
    );
  }
  if (f.mobileSearch) list = list.filter(s => (s.mobile || "").includes(f.mobileSearch));
  if (f.status && f.status !== "all") list = list.filter(s => s.status === f.status);
  if (f.company && f.company !== "all") list = list.filter(s => s.company === f.company);
  if (f.branch && f.branch !== "all") list = list.filter(s => s.branch === f.branch);
  if (f.nationality && f.nationality !== "all") list = list.filter(s => s.nationality === f.nationality);
  if (f.fromDate) list = list.filter(s => s.joiningDate && new Date(s.joiningDate) >= new Date(f.fromDate));
  if (f.toDate) list = list.filter(s => s.joiningDate && new Date(s.joiningDate) <= new Date(f.toDate));

  const sortBy = f.sortBy || "newest";
  list = list.sort((a, b) => {
    if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
    if (sortBy === "oldest") return new Date(a.joiningDate || "").getTime() - new Date(b.joiningDate || "").getTime();
    return new Date(b.joiningDate || "").getTime() - new Date(a.joiningDate || "").getTime();
  });

  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page - 1) * pageSize, page * pageSize);

  const handleExport = () => {
    exportToCSV(list.map(s => ({
      ID: s.id, Name: s.name, Position: s.position, Email: s.email,
      Mobile: s.mobile, Nationality: s.nationality, "Joining Date": s.joiningDate,
      "Visa Expiry": s.visaExpiry, Status: s.status, Company: s.company, Branch: s.branch
    })), "staff-list");
    toast.success("CSV export ready");
  };

  const handleViewProfile = (id: string) => {
    router.push(`/staff/${id}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="Staff Management"
        subtitle="Manage all onboarded employees and their profiles"
        actions={
          canCreateStaff ? (
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
              <Link href="/staff/new"><Plus className="w-4 h-4" /> Add Staff</Link>
            </Button>
          ) : null
        }
      />
      <FilterBar
        moduleKey="staff"
        statusOptions={["Active","Inactive","Suspended"]}
        showNationality
        onExport={canExportStaff ? handleExport : undefined}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode)}
      />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState
            title="No staff members found"
            description="Add your first staff member to get started."
            action={
              <Button asChild className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">
                <Link href="/staff/new">Add Staff</Link>
              </Button>
            }
          />
        ) : viewMode === "grid" ? (
          /* ── GRID / CARD VIEW (mobile default) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(s => {
              const visaExpiry = s.visaExpiry ? new Date(s.visaExpiry) : null;
              const passportExpiry = s.passportExpiry ? new Date(s.passportExpiry) : null;
              const today = new Date();

              const visaDaysLeft = visaExpiry ? Math.ceil((visaExpiry.getTime() - today.getTime()) / 86400000) : null;
              const passportDaysLeft = passportExpiry ? Math.ceil((passportExpiry.getTime() - today.getTime()) / 86400000) : null;
              const docs = Array.isArray(s.documents) ? s.documents : [];

              return (
                <Card key={s.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                  {/* Header: avatar + name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl border border-slate-100 overflow-hidden bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        {s.photo ? (
                          <img src={s.photo} className="w-full h-full object-cover" alt={s.name || "Staff"} />
                        ) : (
                          <span className="text-emerald-700 font-bold text-sm">{getInitials(s.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 leading-tight truncate" title={s.name}>{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate" title={s.position}>{s.position}</div>
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  {/* Expiry alerts */}
                  {visaDaysLeft !== null && visaDaysLeft <= 30 && (
                    <div className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${visaDaysLeft <= 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                      ⚠️ Visa {visaDaysLeft <= 0 ? "EXPIRED" : `expires in ${visaDaysLeft} days`}
                    </div>
                  )}
                  {passportDaysLeft !== null && passportDaysLeft <= 30 && (
                    <div className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${passportDaysLeft <= 0 ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                      ⚠️ Passport {passportDaysLeft <= 0 ? "EXPIRED" : `expires in ${passportDaysLeft} days`}
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-50 pt-2 min-w-0">
                    <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <span>{s.nationalityFlag}</span>
                      <span>{s.nationality}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate flex-1 text-[10px]" title={s.email}>{s.email}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px]">{s.mobile}</span>
                      </div>
                      {s.whatsapp && (
                        <a
                          href={`https://wa.me/${(s.whatsapp || "").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp
                        </a>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">Joined: {formatDate(s.joiningDate)}</div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">{s.company} · {s.branch}</div>
                  </div>

                  {/* Documents */}
                  {docs.length > 0 && (
                    <div className="border-t border-slate-50 pt-2">
                      <button
                        type="button"
                        onClick={() => setOpenDocsId(openDocsId === s.id ? null : s.id)}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        📄 View Attachments ({docs.length})
                      </button>
                      {openDocsId === s.id && (
                        <div className="mt-1.5 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-24 overflow-y-auto">
                          {docs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between text-[9px] font-semibold text-slate-600 bg-white px-2 py-1 rounded border border-slate-50 gap-1.5">
                              <span className="truncate flex-1" title={doc.name}>{doc.name}</span>
                              <div className="flex gap-1 flex-shrink-0">
                                <button type="button" onClick={() => toast.success(`Viewing ${doc.name}`)} className="text-slate-400 hover:text-blue-600"><Eye className="w-3 h-3"/></button>
                                <button type="button" onClick={() => toast.success(`Downloading ${doc.name}`)} className="text-slate-400 hover:text-blue-600"><Download className="w-3 h-3"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer: ID + View Profile button */}
                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-auto">
                    <span className="text-[9px] text-slate-400 font-bold">{s.id}</span>
                    <button
                      type="button"
                      onClick={() => handleViewProfile(s.id)}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 rounded-xl px-2 h-7 font-bold transition-colors"
                    >
                      View Profile <FileText className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* ── TABLE VIEW (desktop default) ── */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Company/Branch</TableHead>
                  <TableHead>Visa Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(s => (
                  <TableRow key={s.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                    <TableCell className="font-bold text-slate-400 text-[10px]">{s.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg border border-slate-100 bg-emerald-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.photo ? (
                            <img src={s.photo} className="w-full h-full object-cover" alt={s.name || "Staff"} />
                          ) : (
                            <span className="text-emerald-700 font-bold text-[11px]">{getInitials(s.name)}</span>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleViewProfile(s.id)}
                            className="font-bold text-slate-800 hover:text-blue-600 block text-left"
                          >
                            {s.name}
                          </button>
                          <div className="text-[10px] text-slate-400 max-w-[160px] truncate">{s.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{s.position}</TableCell>
                    <TableCell><span className="mr-1">{s.nationalityFlag}</span>{s.nationality}</TableCell>
                    <TableCell className="text-[10px]">{s.company}<br/><span className="text-slate-400">{s.branch}</span></TableCell>
                    <TableCell className="text-[10px]">{formatDate(s.visaExpiry)}</TableCell>
                    <TableCell><span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${getStatusColor(s.status)}`}>{s.status}</span></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleViewProfile(s.id)}
                          className="w-7 h-7 inline-flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <FileText className="w-4 h-4"/>
                        </button>
                        {canDeleteStaff && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(s.id)}
                            className="w-7 h-7 inline-flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Staff"
                          >
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Pagination moduleKey="staff" totalItems={totalItems} />
      <ConfirmDialog
        isOpen={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={() => { deleteStaff(deleteId!); toast.success("Staff member removed"); setDeleteId(null); }}
        title="Remove Staff Member"
        description="This will archive the staff member's profile. Their history will be preserved."
        confirmText="Remove Staff"
        variant="danger"
      />
    </div>
  );
}
