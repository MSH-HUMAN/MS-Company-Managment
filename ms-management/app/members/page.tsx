"use client";

import { useState } from "react";
import { Search, Mail, Phone, Building2, User, Clock, FileText, Eye, History, ChevronRight, Check, Sparkles, Send, Gift, Award } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import Pagination from "@/components/shared/Pagination";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import AccessDenied from "@/components/shared/AccessDenied";

export default function MembersPage() {
  const { currentRole, currentUser, applicants, updateApplicant, addActivityLog, companies, branches, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();

  const canView = hasPermission("members", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [search, setSearch] = useState("");
  const [historyMember, setHistoryMember] = useState<any | null>(null);

  // Email Broadcaster modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetMode, setEmailTargetMode] = useState<"all" | "company" | "branch" | "specific">("all");
  const [emailTargetCompany, setEmailTargetCompany] = useState("");
  const [emailTargetBranch, setEmailTargetBranch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  const [emailTemplateType, setEmailTemplateType] = useState<"Promotion" | "Gift" | "Job Offer" | "Custom">("Custom");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [specificMemberSearch, setSpecificMemberSearch] = useState("");

  const isSuperAdmin = currentRole === "Super Admin";
  const f = filters.members || { page: 1, pageSize: 10 };

  // Enforce company isolation: Super Admin sees all, Company Admin/Branch Admin sees own company applicants
  let allowedApplicants = isSuperAdmin 
    ? applicants 
    : applicants.filter(a => a.company === currentUser.company);

  if (currentUser.branch !== "All" && currentRole !== "Super Admin") {
    allowedApplicants = allowedApplicants.filter(a => a.branch === currentUser.branch);
  }

  // Filter based on search query
  let filteredList = allowedApplicants;
  if (search) {
    const q = search.toLowerCase();
    filteredList = filteredList.filter(a => 
      a.fullName.toLowerCase().includes(q) || 
      a.email.toLowerCase().includes(q) || 
      a.id.toLowerCase().includes(q)
    );
  }

  // Sorting: alphabetical by name
  filteredList = [...filteredList].sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Pagination
  const totalItems = filteredList.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 8;
  const paginated = filteredList.slice((page - 1) * pageSize, page * pageSize);

  const handleToggleMember = (applicant: any, name: string) => {
    const isCurrentlyInactive = applicant.memberActive === false;
    const newActive = isCurrentlyInactive;
    
    updateApplicant({ ...applicant, memberActive: newActive });

    // Add activity log
    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Status Changed",
      module: "Members",
      oldValue: isCurrentlyInactive ? "Inactive" : "Active",
      newValue: isCurrentlyInactive ? "Active" : "Inactive",
      ipAddress: "192.168.1.102"
    });

    toast.success(`Member status set to ${newActive ? "Active" : "Inactive"} for ${name}`);
  };

  // Pre-fill email body based on template selection
  const handleTemplateChange = (type: "Promotion" | "Gift" | "Job Offer" | "Custom") => {
    setEmailTemplateType(type);
    if (type === "Promotion") {
      setEmailSubject("Exclusive Career Growth & Placement Promotion");
      setEmailBody("Dear Candidate,\n\nWe are excited to share an exclusive career promotion with you! We have matched your profile with multiple premium roles in your industry. Complete your profile review today and unlock priority access to top hiring companies.\n\nBest Regards,\nMS Company Placement Team");
    } else if (type === "Gift") {
      setEmailSubject("A Special Gift Awaits You - Talent Ecosystem Rewards");
      setEmailBody("Dear Candidate,\n\nThank you for being a valued member of our platform. As a token of appreciation, we have prepared a special candidate welcome reward gift pack for you. Please coordinate with your local branch representative to claim your gift voucher.\n\nBest Regards,\nMS Company Support Team");
    } else if (type === "Job Offer") {
      setEmailSubject("Urgent Placement Proposal / Job Invitation");
      setEmailBody("Dear Candidate,\n\nWe have reviewed your application and would like to propose an immediate placement opportunity. Please check your candidate portal for interview details or contact our coordinator.\n\nBest Regards,\nMS Recruiting Team");
    } else {
      setEmailSubject("");
      setEmailBody("");
    }
  };

  // Open email broadcaster with specific candidate pre-selected
  const handleOpenSpecificEmail = (candidate: any) => {
    setEmailTargetMode("specific");
    setSelectedMemberIds([candidate.id]);
    setEmailTemplateType("Custom");
    setEmailSubject("");
    setEmailBody("");
    setIsEmailModalOpen(true);
  };

  // Submit broadcasting broadcaster
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Subject and Body are required fields.");
      return;
    }

    // Determine target members list based on filters
    let targets = allowedApplicants;
    if (emailTargetMode === "company") {
      if (!emailTargetCompany) { toast.error("Please select a target company."); return; }
      targets = targets.filter(a => a.company === emailTargetCompany);
    } else if (emailTargetMode === "branch") {
      if (!emailTargetBranch) { toast.error("Please select a target branch."); return; }
      targets = targets.filter(a => a.branch === emailTargetBranch);
    } else if (emailTargetMode === "specific") {
      if (selectedMemberIds.length === 0) { toast.error("Please select at least one specific candidate."); return; }
      targets = targets.filter(a => selectedMemberIds.includes(a.id));
    }

    if (targets.length === 0) {
      toast.error("No recipients found matching the chosen filters.");
      return;
    }

    setIsSending(true);

    // Simulate dispatch processing
    setTimeout(() => {
      setIsSending(false);
      setIsEmailModalOpen(false);
      
      // Log broadcast to system activity logs
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Email Sent",
        module: "Members",
        oldValue: null,
        newValue: `Broadcasted "${emailSubject}" via ${emailTemplateType} template to ${targets.length} candidates. Filter Mode: ${emailTargetMode}`,
        ipAddress: "192.168.1.102"
      });

      toast.success(`Successfully dispatched ${targets.length} emails to targeted candidates!`);
      
      // Reset broadcast states
      setEmailSubject("");
      setEmailBody("");
      setSelectedMemberIds([]);
    }, 1200);
  };

  const filteredSpecificMembers = allowedApplicants.filter(a =>
    a.fullName.toLowerCase().includes(specificMemberSearch.toLowerCase()) ||
    a.id.toLowerCase().includes(specificMemberSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title="Member Management" 
        subtitle="List of all registered candidates automatically enrolled as platform members" 
        actions={
          <Button 
            onClick={() => {
              setEmailTargetMode("all");
              setSelectedMemberIds([]);
              setEmailTemplateType("Custom");
              setEmailSubject("");
              setEmailBody("");
              setIsEmailModalOpen(true);
            }} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5 shadow-md shadow-blue-500/10"
          >
            <Mail className="w-4 h-4" />
            Email Promotions
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="text-xs font-bold text-slate-500">
          Showing {totalItems} auto-enrolled members
        </div>
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search members..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 bg-slate-50 border-slate-100 rounded-xl text-xs h-9 focus:border-blue-400 focus:bg-white transition-colors w-full" 
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No members found" description="Try adjusting your search criteria." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(a => {
              const isInactive = a.memberActive === false;
              return (
                <Card key={a.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      
                    <Avatar className="w-12 h-12 rounded-xl border border-slate-100">
  {a.photo ? (
    <img src={a.photo} alt="Avatar" className="object-cover rounded-xl w-full h-full" />
  ) : (
    <AvatarFallback className="rounded-xl font-extrabold text-sm bg-blue-50">
      {a.fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
    </AvatarFallback>
  )}
  </Avatar>
                      <div className="min-w-0">
                        <Link href={`/applicants/${a.id}`} className="text-sm font-bold text-slate-800 hover:text-blue-600 block truncate" title={a.fullName}>
                          {a.fullName}
                        </Link>
                        <div className="text-[10px] font-semibold text-slate-400 font-mono mt-0.5">{a.id}</div>
                      </div>
                    </div>
                    {/* Active/Inactive custom Toggle Switch */}
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                        isInactive 
                          ? "bg-slate-50 text-slate-500 border-slate-200" 
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      }`}>
                        {isInactive ? "Inactive" : "Active"}
                      </span>
                      <button
                        onClick={() => handleToggleMember(a, a.fullName)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          isInactive ? "bg-slate-300" : "bg-blue-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            isInactive ? "translate-x-1" : "translate-x-4"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 space-y-2 text-[11px] font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${a.email}`} className="hover:text-blue-600 truncate">{a.email}</a>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <a href={`tel:${a.mobile}`} className="hover:text-blue-600">{a.mobile}</a>
                    </div>
                    <div className="flex items-center gap-2 truncate text-[10px]">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{a.company || "Not Placed"} · {a.branch || "Not Placed"}</span>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between items-center border-t border-slate-50 flex-wrap gap-2">
                    <button 
                      onClick={() => setHistoryMember(a)}
                      className="text-[10px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 focus:outline-none"
                    >
                      <History className="w-3.5 h-3.5" /> History
                    </button>
                    <button 
                      onClick={() => handleOpenSpecificEmail(a)}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 focus:outline-none"
                      title="Send Promo / Gift Offer to this person"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-500" /> Send Offer
                    </button>
                    <Link href={`/applicants/${a.id}`} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 ml-auto">
                      View Profile <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Pagination moduleKey="members" totalItems={totalItems} />

      {/* Member History Modal */}
      <Dialog open={!!historyMember} onOpenChange={open => !open && setHistoryMember(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Member Status History</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Historical timeline of application transitions and status changes for <span className="font-bold text-slate-700">{historyMember?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {(!historyMember?.statusHistory || historyMember.statusHistory.length === 0) ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">No transition history logged for this member.</div>
            ) : (
              <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-4">
                {historyMember.statusHistory.map((hist: any, index: number) => (
                  <div key={index} className="relative">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-700">{hist.newStatus}</span>
                        {hist.oldStatus && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            (was {hist.oldStatus})
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {hist.date} · By {hist.changedBy}
                      </div>
                      {hist.reason && (
                        <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-600 italic">
                          "{hist.reason}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-50 mt-4">
            <Button onClick={() => setHistoryMember(null)} className="bg-slate-900 text-white rounded-xl text-xs px-5 h-9 font-bold">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email broadcasting / Promotion Center Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Talent Promotion & Email Broadcaster
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Send targeted job promotions, reward gifts, or custom notifications to talent segments.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Recipient Targeting Mode */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Recipient Group</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "all", label: "All Members" },
                    { key: "company", label: "By Company" },
                    { key: "branch", label: "By Branch" },
                    { key: "specific", label: "Select Specific" }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setEmailTargetMode(opt.key as any)}
                      className={`py-2 px-3 text-center border rounded-xl font-bold transition-all text-[11px] ${
                        emailTargetMode === opt.key 
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Recipient selection inputs */}
              {emailTargetMode === "company" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Target Company</Label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-10 px-3 focus:bg-white focus:border-blue-400"
                    value={emailTargetCompany}
                    onChange={(e) => setEmailTargetCompany(e.target.value)}
                  >
                    <option value="">Select Company</option>
                    {companies.map((c: any) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {emailTargetMode === "branch" && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose Target Branch</Label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-10 px-3 focus:bg-white focus:border-blue-400"
                    value={emailTargetBranch}
                    onChange={(e) => setEmailTargetBranch(e.target.value)}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {emailTargetMode === "specific" && (
                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Choose Recipients Checklist</Label>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search candidate name..."
                      value={specificMemberSearch}
                      onChange={e => setSpecificMemberSearch(e.target.value)}
                      className="pl-8 bg-white border-slate-200 text-[11px] h-8 rounded-lg"
                    />
                  </div>
                  <div className="max-h-[140px] overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-100">
                    {filteredSpecificMembers.map(m => {
                      const isSelected = selectedMemberIds.includes(m.id);
                      return (
                        <div 
                          key={m.id} 
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                            } else {
                              setSelectedMemberIds([...selectedMemberIds, m.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-[11px] font-semibold ${
                            isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span>{m.fullName} <span className="text-[9px] text-slate-400 font-normal">({m.id})</span></span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      );
                    })}
                    {filteredSpecificMembers.length === 0 && (
                      <div className="text-center py-4 text-slate-400 italic">No candidates found</div>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    {selectedMemberIds.length} candidate(s) selected
                  </div>
                </div>
              )}

              {/* Template selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Promotion Template Type</Label>
                <div className="flex gap-2">
                  {[
                    { key: "Custom", label: "Custom Msg" },
                    { key: "Promotion", label: "Career Promo" },
                    { key: "Gift", label: "Gift Pack" },
                    { key: "Job Offer", label: "Job Proposal" }
                  ].map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleTemplateChange(t.key as any)}
                      className={`flex-1 py-1.5 border rounded-lg text-center font-bold text-[10px] ${
                        emailTemplateType === t.key 
                          ? "bg-slate-900 border-slate-900 text-white" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Subject Line</Label>
                <Input
                  required
                  placeholder="Job opportunity updates..."
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Message Content</Label>
                <textarea
                  required
                  rows={5}
                  placeholder="Type email body template..."
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none font-sans"
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-xs rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 gap-1.5 shadow-md shadow-blue-500/10"
              >
                {isSending ? (
                  <span className="flex items-center gap-1"><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Broadcasting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Broadcast
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
