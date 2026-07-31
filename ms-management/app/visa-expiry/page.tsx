"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { SearchIcon, InfoIcon, FileTextIcon, PhoneIcon, MailIcon, MapPinIcon } from "lucide-react";
import AccessDenied from "@/components/shared/AccessDenied";

type VisaRecord = {
  id: string;
  name: string;
  type: "Staff" | "Applicant";
  company: string;
  branch: string;
  expDate: string;
  daysLeft: number;
  link: string;
  documents: { type: string; name: string; url?: string }[];
  email: string;
  mobile: string;
  whatsapp?: string;
};

export default function VisaExpiryPage() {
  const { currentRole, currentUser, staff, applicants, addActivityLog, companies, addSentEmail, hasPermission } = useAuthStore();

  const canView = hasPermission("visaExpiry", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [reminders, setReminders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedRecord, setSelectedRecord] = useState<VisaRecord | null>(null);

  const today = new Date();

  const list: VisaRecord[] = [];

  const allowedStaff = currentRole === "Super Admin" ? staff : staff.filter(s => s.company === currentUser.company);
  allowedStaff.forEach(s => {
    if (s.visaExpiry) {
      const exp = new Date(s.visaExpiry);
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      list.push({ ...s, type: "Staff", daysLeft: days, expDate: s.visaExpiry, link: `/staff/${s.id}` });
    }
  });

  const allowedApp = currentRole === "Super Admin" ? applicants : applicants.filter(a => a.company === currentUser.company);
  allowedApp.forEach(a => {
    if (a.visaExpiry) {
      const exp = new Date(a.visaExpiry);
      const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
      list.push({ ...a, name: a.fullName, type: "Applicant", daysLeft: days, expDate: a.visaExpiry, link: `/applicants/${a.id}` });
    }
  });

  list.sort((a,b) => a.daysLeft - b.daysLeft);

  const filteredList = list.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (days: number) => {
    if (days < 0) return "bg-rose-50 border-rose-100 text-rose-700";
    if (days <= 30) return "bg-orange-50 border-orange-100 text-orange-700";
    if (days <= 90) return "bg-amber-50 border-amber-100 text-amber-700";
    return "bg-emerald-50 border-emerald-100 text-emerald-700";
  };

  const getStatusText = (days: number) => {
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return "Expires Today";
    return `Expires in ${days} days`;
  };

  const handleSendReminder = (item: VisaRecord) => {
    if (reminders.includes(item.id)) {
      toast(`Reminder already queued for ${item.name}`);
      return;
    }
    setReminders(prev => [...prev, item.id]);
    
    if (item.type === "Applicant") {
      const clientCompany = companies.find(c => c.name === item.company);
      const recipientEmails = [item.email, clientCompany?.email].filter((email): email is string => Boolean(email && email.includes("@") && email.trim() !== ""));
      if (recipientEmails.length === 0) {
        toast.error(`No valid email addresses found to send reminder for ${item.name}.`);
        return;
      }
      
      recipientEmails.forEach(email => {
        addSentEmail({
          id: `EMAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          to: email,
          subject: `Visa Expiry Warning - ${item.name}`,
          body: `Dear recipient, this is a notice that the visa of applicant ${item.name} is expiring on ${formatDate(item.expDate)} (${item.daysLeft} days remaining). Please take necessary action.`,
          sentAt: new Date().toISOString(),
          company: item.company,
          branch: item.branch,
          candidateName: item.name,
        });
      });

      toast.success(`Visa expiry reminder queued for ${item.name}.`);
      addActivityLog({
        id: `LOG-${item.id}-visa-reminder`,
        dateTime: new Date().toISOString(),
        userName: currentUser.name,
        role: currentRole,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Email Sent",
        module: "Visa Expiry",
        oldValue: null,
        newValue: `Reminder sent for applicant ${item.name}`,
        ipAddress: "127.0.0.1",
      });
    } else {
      if (!item.email || !item.email.includes("@")) {
        toast.error(`No valid email address found to send reminder for staff ${item.name}.`);
        return;
      }
      addSentEmail({
        id: `EMAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        to: item.email,
        subject: `Visa Expiry Warning - ${item.name}`,
        body: `Dear ${item.name}, this is a notice that your visa is expiring on ${formatDate(item.expDate)} (${item.daysLeft} days remaining). Please submit renewal documents.`,
        sentAt: new Date().toISOString(),
        company: item.company,
        branch: item.branch,
        candidateName: item.name,
      });

      toast.success(`Visa expiry reminder sent to Staff member (${item.email})`);
      addActivityLog({
        id: `LOG-${item.id}-visa-reminder`,
        dateTime: new Date().toISOString(),
        userName: currentUser.name,
        role: currentRole,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Email Sent",
        module: "Visa Expiry",
        oldValue: null,
        newValue: `Reminder sent to ${item.name} (${item.email})`,
        ipAddress: "127.0.0.1",
      });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Visa Expiry Tracking" subtitle="Monitor visa expirations for staff and applicants" />
      
      <div className="p-4 md:p-6 pb-0">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full sm:w-[95vw] sm:w-full max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search by name, ID, or company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select value={filterType} onValueChange={(val) => setFilterType(val || "All")}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Applicant">Applicant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-auto min-h-0">
        {filteredList.length === 0 ? (
          <EmptyState title="No visa records found" />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredList.map(item => {
              const visaDocs = item.documents?.filter((doc) => doc.type.toLowerCase().includes("visa"));
              const reminderSent = reminders.includes(item.id);

              return (
                <Card key={item.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12 rounded-2xl border border-slate-200 bg-slate-100">
                        <AvatarFallback className="rounded-2xl bg-slate-100 text-slate-700 font-bold text-base">{item.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={item.link} className="font-semibold text-slate-900 text-sm hover:text-blue-600">{item.name}</Link>
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.id} • {item.type}</div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase ${getStatusColor(item.daysLeft)}`}>
                      {getStatusText(item.daysLeft)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-600 font-semibold mb-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <div className="text-slate-400 uppercase tracking-[0.2em] text-[9px]">Company</div>
                      <div className="mt-1 text-slate-800 truncate">{item.company}</div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <div className="text-slate-400 uppercase tracking-[0.2em] text-[9px]">Visa Expiry</div>
                      <div className="mt-1 text-slate-800">{formatDate(item.expDate)}</div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <Button size="sm" onClick={() => handleSendReminder(item)} className="rounded-xl text-xs font-bold h-9">
                      {reminderSent ? "Reminder Sent" : "Send Reminder"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setSelectedRecord(item)} className="rounded-xl text-xs font-bold h-9 bg-blue-50 text-blue-700 hover:bg-blue-100">
                      <InfoIcon className="w-3 h-3 mr-1.5" />
                      Full Details
                    </Button>
                    <a href={visaDocs?.[0]?.url || "#"} target="_blank" rel="noreferrer" className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold h-9 px-3 ${visaDocs?.[0]?.url ? "text-slate-900 hover:bg-slate-50" : "pointer-events-none opacity-50 text-slate-400"}`}>
                      View Visa Copy
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white rounded-2xl">
          {selectedRecord && (
            <>
              <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-start gap-4 relative">
                <Avatar className="w-16 h-16 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <AvatarFallback className="rounded-2xl bg-white text-slate-700 font-bold text-xl">{selectedRecord.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedRecord.name}</h3>
                  <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <span className="font-medium">{selectedRecord.id}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{selectedRecord.type}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-full uppercase ${getStatusColor(selectedRecord.daysLeft)}`}>
                      {getStatusText(selectedRecord.daysLeft)} • {formatDate(selectedRecord.expDate)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      <MapPinIcon className="w-3 h-3" /> Company
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{selectedRecord.company}</span>
                    <span className="text-xs text-slate-500">{selectedRecord.branch}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      <MailIcon className="w-3 h-3" /> Contact Info
                    </span>
                    <span className="text-sm font-semibold text-slate-800 truncate" title={selectedRecord.email}>{selectedRecord.email}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <PhoneIcon className="w-3 h-3" /> {selectedRecord.mobile}
                    </span>
                    {selectedRecord.whatsapp && (
                       <span className="text-xs text-emerald-600 flex items-center gap-1">
                         WA: {selectedRecord.whatsapp}
                       </span>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4" /> Attached Documents
                  </h4>
                  {selectedRecord.documents && selectedRecord.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRecord.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{doc.name}</div>
                            <div className="text-xs text-slate-400">{doc.type}</div>
                          </div>
                          {doc.url ? (
                             <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                               View
                             </a>
                          ) : (
                             <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 font-medium">Pending</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 bg-slate-50">
                      No documents uploaded yet
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 sm:justify-between items-center rounded-b-2xl">
                <Button variant="outline" className="rounded-xl" onClick={() => handleSendReminder(selectedRecord)}>
                  Send Reminder
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setSelectedRecord(null)}>Close</Button>
                  <Link href={selectedRecord.link} passHref>
                    <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800">Go to Profile</Button>
                  </Link>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

