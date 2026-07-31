"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, exportToCSV } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { History, Shield, Trash2, RotateCcw, Archive } from "lucide-react";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";

export default function ActivityLogPage() {
  const { currentRole, currentUser, activityLogs, archivedActivityLogs, clearActivityLogs, restoreActivityLogs, deleteArchivedLog, hasPermission } = useAuthStore();

  const canView = hasPermission("activityLog", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const { filters } = useFilterStore();
  const isSuperAdmin = currentRole === "Super Admin";
  const [showArchived, setShowArchived] = useState(false);

  const f = filters.activityLog;
  let source = showArchived ? archivedActivityLogs : activityLogs;
  let list = source;
  if (!isSuperAdmin) list = list.filter((l: any) => l.company === currentUser.company);
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter((l: any) => l.userName.toLowerCase().includes(q) || l.module.toLowerCase().includes(q) || (l.newValue||"").toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter((l: any) => l.action === f.status);
  
  list = [...list].sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 20;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const getActionColor = (action: string) => {
    if (action.includes("Created") || action.includes("Login")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (action.includes("Deleted") || action.includes("Logout")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (action.includes("Edited") || action.includes("Changed")) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const handleClear = () => {
    if (!isSuperAdmin) { toast.error("Only Super Admin can archive logs"); return; }
    if (window.confirm("Archive all active logs? They can be restored by Super Admin at any time.")) {
      clearActivityLogs();
      toast.success("Activity logs archived. Use 'Restore Logs' to bring them back.");
    }
  };

  const handleRestore = () => {
    if (!isSuperAdmin) { toast.error("Only Super Admin can restore logs"); return; }
    restoreActivityLogs();
    setShowArchived(false);
    toast.success("All archived logs have been restored to the active log.");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Activity Logs" subtitle="Audit trail of all system actions and user events"
        actions={
          isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchived(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-bold rounded-xl px-3 h-9 border transition-all ${showArchived ? "bg-amber-500 border-amber-500 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <Archive className="w-4 h-4"/>
                {showArchived ? "Viewing Archive" : "View Archive"}
                {archivedActivityLogs.length > 0 && (
                  <span className={`ml-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${showArchived ? "bg-white text-amber-600" : "bg-amber-500 text-white"}`}>
                    {archivedActivityLogs.length}
                  </span>
                )}
              </button>

              {archivedActivityLogs.length > 0 && (
                <Button
                  onClick={handleRestore}
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl text-xs h-9 px-4 gap-1.5"
                >
                  <RotateCcw className="w-4 h-4"/>Restore Logs
                </Button>
              )}

              {activityLogs.length > 0 && (
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs h-9 px-4 gap-1.5"
                >
                  <Trash2 className="w-4 h-4"/>Archive Logs
                </Button>
              )}
            </div>
          ) : null
        }
      />

      {showArchived && (
        <div className="mx-4 md:mx-6 mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-semibold">
          <Archive className="w-4 h-4 flex-shrink-0 text-amber-600" />
          You are viewing <strong className="mx-1">{archivedActivityLogs.length} archived</strong> log entries. Only Super Admin can view, restore or permanently delete these.
        </div>
      )}

      <FilterBar moduleKey="activityLog" statusOptions={["Created","Edited","Deleted","Status Changed","Login","Logout"]} onExport={() => { exportToCSV(list.map((l: any)=>({ID:l.id,Time:l.dateTime,User:l.userName,Role:l.role,Company:l.company,Module:l.module,Action:l.action,Details:l.newValue,IP:l.ipAddress})),"activity-logs"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
            <EmptyState
              title={showArchived ? "No archived logs" : "No activity recorded"}
              description={showArchived ? "No logs have been archived yet." : "System activity will appear here as actions are performed."}
            />
          </Card>
        ) : (
          <>
            {/* Mobile Portrait View */}
            <div className="space-y-3 md:hidden">
              {paginated.map((log: any) => (
                <Card key={log.id} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-700 text-xs">{log.dateTime.split(" ")[0]}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1"><History className="w-3 h-3"/>{log.dateTime.split(" ")[1]}</div>
                    </div>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${getActionColor(log.action)}`}>{log.action}</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div><strong>User / Role:</strong> {log.userName} ({log.role})</div>
                    <div><strong>Module:</strong> {log.module}</div>
                    <div><strong>Company/Branch:</strong> {log.company} / {log.branch}</div>
                    <div className="mt-1 pt-1 border-t border-slate-200/50 text-[10px] text-slate-500 font-medium">
                      {log.oldValue && <span className="line-through text-slate-300 mr-1">{log.oldValue}</span>}
                      {log.newValue}
                    </div>
                    <div className="text-[8px] text-slate-400 mt-1">IP Address: {log.ipAddress}</div>
                  </div>
                  {showArchived && (
                    <div className="flex justify-end pt-1 border-t border-slate-100">
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                          if (confirm("Are you sure you want to permanently delete this archived log entry?")) {
                            deleteArchivedLog(log.id);
                            toast.success("Log entry deleted permanently");
                          }
                        }}
                        className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl h-8 px-3 gap-1 font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5"/> Delete Log
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <TableHead>Date & Time</TableHead>
                      <TableHead>User / Role</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Company</TableHead>
                      {showArchived && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((log: any) => (
                      <TableRow key={log.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                        <TableCell>
                          <div className="font-bold text-slate-700">{log.dateTime.split(" ")[0]}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1"><History className="w-3 h-3"/>{log.dateTime.split(" ")[1]}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7 rounded border border-slate-100"><AvatarFallback className="rounded bg-slate-100 text-[10px] font-bold text-slate-600">{log.userName.charAt(0)}</AvatarFallback></Avatar>
                            <div>
                              <div className="font-bold text-slate-800">{log.userName}</div>
                              <div className="text-[9px] text-slate-400 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5"/>{log.role}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">{log.module}</TableCell>
                        <TableCell><span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${getActionColor(log.action)}`}>{log.action}</span></TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate text-[10px] text-slate-500" title={log.newValue || ""}>
                            {log.oldValue && <span className="line-through text-slate-300 mr-1">{log.oldValue}</span>}
                            {log.newValue}
                          </div>
                          <div className="text-[8px] text-slate-300 mt-0.5">IP: {log.ipAddress}</div>
                        </TableCell>
                        <TableCell className="text-[10px]">{log.company}<br/><span className="text-slate-400">{log.branch}</span></TableCell>
                        {showArchived && (
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                if (confirm("Are you sure you want to permanently delete this archived log entry?")) {
                                  deleteArchivedLog(log.id);
                                  toast.success("Log entry deleted permanently");
                                }
                              }}
                              className="w-7 h-7 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </>
        )}
      </div>
      <Pagination moduleKey="activityLog" totalItems={totalItems} />
    </div>
  );
}
