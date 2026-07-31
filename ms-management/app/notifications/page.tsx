"use client";

import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bell, CheckCircle2, Clock, Calendar, Briefcase, FileText, 
  Settings, Car, Mail, Smartphone, ToggleLeft, ToggleRight, 
  Search, Inbox, AlertTriangle, ChevronDown, ChevronUp,
  Building2, MapPin, Share2
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const getBadgeStyles = (type: string) => {
  switch (type) {
    case "visa_expiry":
      return { text: "Visa Expiry", className: "bg-amber-50 text-amber-700 border-amber-100" };
    case "passport_expiry":
      return { text: "Passport Expiry", className: "bg-amber-50 text-amber-700 border-amber-100" };
    case "birthday":
      return { text: "Birthday", className: "bg-pink-50 text-pink-700 border-pink-100" };
    case "task":
      return { text: "Task", className: "bg-blue-50 text-blue-700 border-blue-100" };
    case "leave":
      return { text: "Leave", className: "bg-purple-50 text-purple-700 border-purple-100" };
    case "request":
      return { text: "Request", className: "bg-purple-50 text-purple-700 border-purple-100" };
    case "vehicle_expiry":
      return { text: "Vehicle Expiry", className: "bg-rose-50 text-rose-700 border-rose-100" };
    case "payment":
      return { text: "Payment", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "company_registration":
      return { text: "Company Reg", className: "bg-indigo-50 text-indigo-700 border-indigo-100" };
    case "vehicle_return":
      return { text: "Vehicle Return", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    case "request_rejected":
      return { text: "Rejected", className: "bg-rose-50 text-rose-700 border-rose-100" };
    case "activity":
      return { text: "Activity", className: "bg-slate-50 text-slate-700 border-slate-200" };
    case "transport":
      return { text: "Transport", className: "bg-sky-50 text-sky-700 border-sky-100" };
    default:
      return { text: "Notification", className: "bg-slate-50 text-slate-700 border-slate-200" };
  }
};

export default function NotificationsPage() {
  const { 
    currentRole, currentUser, notifications, markNotificationRead, 
    markAllNotificationsRead, sentEmails, sentWhatsApp, 
    whatsappEnabled, toggleWhatsApp, hasPermission 
  } = useAuthStore();

  const canView = hasPermission("notifications", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  const [activeTab, setActiveTab] = useState<"dashboard" | "emails" | "whatsapp" | "settings">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState<{ subject: string; body: string; to: string } | null>(null);

  const isSuperAdmin = currentRole === "Super Admin";

  // Alert metrics calculation
  const { unreadCount, readCount, clientNotificationsDone } = useMemo(() => {
    let visibleList = notifications;
    if (!isSuperAdmin) {
      visibleList = visibleList.filter(n => n.company === currentUser.company || !n.company);
    }
    const unread = visibleList.filter(n => !n.read).length;
    const read = visibleList.filter(n => n.read).length;
    const clientDone = visibleList.filter(
      n => n.read && n.company && n.company !== "Global Recruits LLC"
    ).length;
    
    return {
      unreadCount: unread,
      readCount: read,
      clientNotificationsDone: clientDone
    };
  }, [notifications, isSuperAdmin, currentUser]);

  // Filter Dashboard Alerts
  const filteredNotifications = useMemo(() => {
    let list = notifications;
    if (!isSuperAdmin) {
      list = list.filter(n => n.company === currentUser.company || !n.company);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.message.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [notifications, searchQuery, isSuperAdmin, currentUser]);

  // Filter Automated Emails
  const filteredEmails = useMemo(() => {
    let list = sentEmails;
    if (!isSuperAdmin) {
      list = list.filter(e => e.company === currentUser.company);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => 
        e.to.toLowerCase().includes(q) || 
        e.subject.toLowerCase().includes(q) || 
        e.body.toLowerCase().includes(q) ||
        e.candidateName?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.sentAt || b.createdAt || 0).getTime() - new Date(a.sentAt || a.createdAt || 0).getTime());
  }, [sentEmails, searchQuery, isSuperAdmin, currentUser]);
 
  // Filter WhatsApp Logs
  const filteredWhatsApp = useMemo(() => {
    let list = sentWhatsApp;
    if (!isSuperAdmin) {
      list = list.filter(w => w.company === currentUser.company);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => 
        w.to.toLowerCase().includes(q) || 
        w.message.toLowerCase().includes(q) ||
        w.candidateName?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => new Date(b.sentAt || b.createdAt || 0).getTime() - new Date(a.sentAt || a.createdAt || 0).getTime());
  }, [sentWhatsApp, searchQuery, isSuperAdmin, currentUser]);

  const handleMarkAll = () => {
    markAllNotificationsRead();
    toast.success("All notifications marked as read");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "visa_expiry": 
      case "passport_expiry": 
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "birthday": 
        return <Calendar className="w-5 h-5 text-pink-500" />;
      case "task": 
        return <Briefcase className="w-5 h-5 text-blue-500" />;
      case "leave": 
      case "request": 
        return <FileText className="w-5 h-5 text-purple-500" />;
      case "vehicle_expiry": 
        return <Car className="w-5 h-5 text-rose-500" />;
      case "payment": 
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "company_registration":
        return <Building2 className="w-5 h-5 text-indigo-500" />;
      case "vehicle_return":
        return <Car className="w-5 h-5 text-emerald-500" />;
      case "request_rejected":
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case "activity":
        return <Settings className="w-5 h-5 text-slate-500" />;
      case "transport":
        return <Car className="w-5 h-5 text-sky-500" />;
      default: 
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBg = (type: string, read: boolean) => {
    if (read) return "bg-white border-slate-100 opacity-70";
    switch (type) {
      case "visa_expiry": 
      case "passport_expiry": 
        return "bg-amber-50 border-amber-100";
      case "birthday": 
        return "bg-pink-50 border-pink-100";
      case "task": 
        return "bg-blue-50 border-blue-100";
      case "leave": 
      case "request": 
        return "bg-purple-50 border-purple-100";
      case "vehicle_expiry": 
        return "bg-rose-50 border-rose-100";
      case "payment": 
        return "bg-emerald-50 border-emerald-100";
      case "company_registration":
        return "bg-indigo-50 border-indigo-100";
      case "vehicle_return":
        return "bg-emerald-50 border-emerald-100";
      case "request_rejected":
        return "bg-rose-50 border-rose-100";
      case "activity":
        return "bg-slate-50 border-slate-100";
      case "transport":
        return "bg-sky-50 border-sky-100";
      default: 
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title="Notification Center" 
        subtitle="Automated reminders, email outbox, and WhatsApp API alerts"
        actions={
          activeTab === "dashboard" && filteredNotifications.length > 0 && (
            <Button variant="outline" onClick={handleMarkAll} className="border-slate-200 text-slate-600 font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
              <CheckCircle2 className="w-4 h-4"/>
              Mark all as read
            </Button>
          )
        }
      />

      {/* Tabs list */}
      <div className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 rounded-xl p-1 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {[
            { id: "dashboard", label: "Dashboard Alerts", icon: <Bell className="w-3.5 h-3.5" /> },
            { id: "emails", label: "Automated Emails", icon: <Mail className="w-3.5 h-3.5" /> },
            { id: "whatsapp", label: "WhatsApp Logs", icon: <Smartphone className="w-3.5 h-3.5" /> },
            { id: "settings", label: "API Configuration", icon: <Settings className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id as any); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                activeTab === t.id
                  ? "bg-white shadow-sm text-blue-600 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {t.icon}
              {t.label}
              {t.id === "dashboard" && notifications.filter(n => !n.read).length > 0 && (
                <span className="bg-rose-500 text-white text-[8px] font-extrabold rounded-full px-1.5 py-0.2">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab !== "settings" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder={`Search ${activeTab === "dashboard" ? "alerts" : activeTab === "emails" ? "emails" : "messages"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 bg-slate-50 border-slate-200 rounded-xl text-xs h-9 w-full"
            />
          </div>
        )}
      </div>

      <div className="flex-1 p-4 md:p-6 w-full max-w-4xl mx-auto overflow-y-auto min-h-0 pb-28 md:pb-6">
        
        {/* ─── DASHBOARD ALERTS TAB ─── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Analytics Dashboard Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Active Alerts */}
              <div className="bg-rose-50/40 border border-rose-100/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-100/70 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[9px] text-rose-700 font-extrabold uppercase tracking-wider">Active Alerts</div>
                  <div className="text-2xl font-black text-slate-800 leading-none mt-1">{unreadCount}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">Requires attention</div>
                </div>
              </div>

              {/* Card 2: Resolved Alerts */}
              <div className="bg-emerald-50/40 border border-emerald-100/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-wider">Resolved Alerts</div>
                  <div className="text-2xl font-black text-slate-800 leading-none mt-1">{readCount}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">Marked as completed</div>
                </div>
              </div>

              {/* Card 3: Client Alerts Done */}
              <div className="bg-blue-50/40 border border-blue-100/60 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-100/70 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[9px] text-blue-700 font-extrabold uppercase tracking-wider">Client Alerts Done</div>
                  <div className="text-2xl font-black text-slate-800 leading-none mt-1">{clientNotificationsDone}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-1">Completed client tasks</div>
                </div>
              </div>
            </div>

            {filteredNotifications.length === 0 ? (
              <EmptyState title="No notifications" description="You are all caught up!" />
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map(n => (
                  <Card key={n.id} className={`rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border flex gap-4 ${getBg(n.type, n.read)}`}>
                    <div className="flex-shrink-0 mt-1">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <Link 
                          href={n.link} 
                          onClick={() => !n.read && markNotificationRead(n.id)} 
                          className={cn(
                            "block text-sm hover:underline leading-tight",
                            n.read ? "font-semibold text-slate-600" : "font-extrabold text-slate-800"
                          )}
                        >
                          {n.title}
                        </Link>
                        <div className="text-[10px] text-slate-400 font-bold flex-shrink-0">{formatDate(n.time)}</div>
                      </div>
                      <div className={cn("text-xs mt-1 leading-relaxed", n.read ? "text-slate-500" : "text-slate-600 font-medium")}>
                        {n.message}
                      </div>

                      {/* Metadata Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border select-none", getBadgeStyles(n.type).className)}>
                          {getBadgeStyles(n.type).text}
                        </span>
                        {n.company && (
                          <span className="text-[9px] font-extrabold uppercase bg-slate-50 text-slate-600 border border-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {n.company}
                          </span>
                        )}
                        {n.branch && (
                          <span className="text-[9px] font-extrabold uppercase bg-slate-50 text-slate-600 border border-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 select-none">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {n.branch}
                          </span>
                        )}
                      </div>

                    </div>
                    {!n.read && (
                      <div className="flex-shrink-0 flex items-center">
                        <button 
                          onClick={() => markNotificationRead(n.id)} 
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-blue-600 transition-colors" 
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-4 h-4"/>
                        </button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── AUTOMATED EMAILS TAB ─── */}
        {activeTab === "emails" && (
          filteredEmails.length === 0 ? (
            <EmptyState title="No sent emails" description="Automated visa expiries in <= 20 days trigger emails automatically." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2 p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                These are automated notification emails triggered at the 20-day visa expiry threshold, sent to company HR, branch office, and the candidate.
              </div>
              {filteredEmails.map(email => {
                const isExpanded = expandedEmailId === email.id;
                return (
                  <Card key={email.id} className="rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-slate-100 bg-white">
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 flex-shrink-0 text-blue-600">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate" title={email.subject}>{email.subject}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">To: <span className="text-slate-700 select-all font-mono text-[9px]">{email.to}</span></p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{email.candidateName}</span>
                            <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{email.company}</span>
                            <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{email.branch}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                        <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap">{formatDate(email.sentAt)}</span>
                        <div className="flex gap-1.5 justify-end w-full">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShareEmail({ to: email.to, subject: email.subject, body: email.body })}
                            className="h-7 text-xs gap-1 hover:bg-slate-50 text-slate-500 px-2 rounded-lg"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                            className="h-7 text-xs gap-1 hover:bg-slate-50 text-slate-500 px-2 rounded-lg"
                          >
                            {isExpanded ? <><ChevronUp className="w-3.5 h-3.5"/> Hide Body</> : <><ChevronDown className="w-3.5 h-3.5"/> View Body</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-slate-50 font-mono text-[10px] text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed overflow-x-auto break-words">
                        {email.body}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* ─── WHATSAPP LOGS TAB ─── */}
        {activeTab === "whatsapp" && (
          filteredWhatsApp.length === 0 ? (
            <EmptyState title="No WhatsApp logs" description="Enable WhatsApp API notifications under API Configuration to track sent messages." />
          ) : (
            <div className="space-y-3">
              {filteredWhatsApp.map(wa => (
                <Card key={wa.id} className="rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-slate-100 bg-white flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 flex-shrink-0 text-emerald-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">WhatsApp Reminder to {wa.candidateName}</h4>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">Mobile: {wa.to}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold">{formatDate(wa.sentAt)}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-600 bg-emerald-50/50 border border-emerald-100/50 p-3 rounded-xl">
                      "{wa.message}"
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{wa.company}</span>
                      <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{wa.branch}</span>
                      <span className="text-[8px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">STATUS: DELIVERED</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}

        {/* ─── API CONFIGURATION TAB ─── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Automated Messaging Configurations</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Manage simulated notification channels, scheduler thresholds, and API parameters.</p>
              </div>

              {/* WhatsApp Toggle */}
              <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800">Enable WhatsApp API integration (Simulated)</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Automatically trigger WhatsApp alerts to staff/candidates with visas expiring in less than or equal to 20 days.</div>
                </div>
                <button 
                  onClick={toggleWhatsApp}
                  className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-800"
                >
                  {whatsappEnabled ? (
                    <ToggleRight className="w-9 h-9 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Reminder Thresholds info */}
              <div className="space-y-4 pt-2">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Reminder Protocols</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white">
                    <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Dashboard Alerts Threshold
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium">Alerts for visa expirations, passport expirations, and vehicle registrations are created in the Dashboard Center automatically at <span className="font-extrabold text-blue-600">30 days left</span>.</p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-100 bg-white">
                    <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Email Alerts Threshold
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium">Automatic alerts sent directly to candidate email, branch admin email, and company HR are generated at <span className="font-extrabold text-blue-600">20 days left</span>.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>

      {shareEmail && (
        <Dialog open={!!shareEmail} onOpenChange={(open) => !open && setShareEmail(null)}>
          <DialogContent className="max-w-full sm:w-[95vw] sm:w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                Share Notification Email
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-medium">
                Copy the email details, share it on WhatsApp, or forward it using your default email client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Recipient</span>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-700 font-mono select-all">
                  {shareEmail.to}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Subject</span>
                <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-slate-800 font-bold leading-tight">
                  {shareEmail.subject}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Email Body</span>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl max-h-40 overflow-y-auto overflow-x-auto font-mono text-[10px] leading-relaxed text-slate-600 whitespace-pre-wrap break-words">
                  {shareEmail.body}
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-slate-50 pt-4 mt-2">
              <Button
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs h-9 px-4 flex-1 flex gap-1.5 items-center justify-center hover:bg-slate-50"
                onClick={() => {
                  const shareText = `Subject: ${shareEmail.subject}\nTo: ${shareEmail.to}\n\n${shareEmail.body}`;
                  navigator.clipboard.writeText(shareText);
                  toast.success("Copied to clipboard!");
                }}
              >
                Copy Content
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs h-9 px-4 flex-1 flex gap-1.5 items-center justify-center"
                onClick={() => {
                  const shareText = `Subject: ${shareEmail.subject}\nTo: ${shareEmail.to}\n\n${shareEmail.body}`;
                  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
                  window.open(url, "_blank");
                }}
              >
                WhatsApp Web
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs h-9 px-4 flex-1 flex gap-1.5 items-center justify-center"
                onClick={() => {
                  const url = `mailto:${shareEmail.to}?subject=${encodeURIComponent(shareEmail.subject)}&body=${encodeURIComponent(shareEmail.body)}`;
                  window.open(url, "_blank");
                }}
              >
                Forward Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
