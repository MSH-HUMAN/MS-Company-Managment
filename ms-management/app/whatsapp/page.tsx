"use client";

import { useState, useMemo, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import {
  MessageCircle, Send, Search, Users, Clock, CheckCheck,
  X, Plus, ExternalLink, Copy, Zap,
  User, Phone, AlertCircle, Paperclip
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccessDenied from "@/components/shared/AccessDenied";

const TEMPLATES = [
  {
    id: "interview",
    label: "Interview Invitation",
    icon: "📅",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    message: `Dear {name},\n\nWe are pleased to invite you for an interview for the position you applied for.\n\nDate & Time: [DATE & TIME]\nVenue: [LOCATION / ZOOM LINK]\n\nPlease confirm your availability by replying to this message.\n\nBest regards,\nMS Horizon F.Z.E`,
  },
  {
    id: "offer",
    label: "Offer Letter",
    icon: "🎉",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    message: `Dear {name},\n\nCongratulations! We are delighted to offer you the position of [POSITION] at [COMPANY NAME].\n\nYour joining date will be [DATE]. Please reply to confirm your acceptance.\n\nWelcome to the team!\n\nBest regards,\nMS Horizon F.Z.E`,
  },
  {
    id: "followup",
    label: "Follow-up",
    icon: "🔔",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    message: `Dear {name},\n\nThis is a follow-up regarding your application with us. We would like to know if you are still interested in the position.\n\nPlease reply at your earliest convenience.\n\nBest regards,\nMS Horizon F.Z.E`,
  },
  {
    id: "leave",
    label: "Leave Approved",
    icon: "✅",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    message: `Dear {name},\n\nYour leave request has been approved.\n\nLeave Period: [START DATE] to [END DATE]\nTotal Days: [DAYS]\n\nEnjoy your time off!\n\nBest regards,\nMS Horizon F.Z.E`,
  },
  {
    id: "doc",
    label: "Document Required",
    icon: "📄",
    color: "bg-slate-50 text-slate-700 border-slate-200",
    message: `Dear {name},\n\nKindly submit the following documents at the earliest:\n\n• [DOCUMENT 1]\n• [DOCUMENT 2]\n\nPlease submit to the HR department or email us.\n\nBest regards,\nMS Horizon F.Z.E`,
  },
  {
    id: "visa",
    label: "Visa Reminder",
    icon: "🛂",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    message: `Dear {name},\n\nThis is a reminder that your visa/passport is expiring soon. Please make arrangements for renewal at the earliest.\n\nExpiry Date: [DATE]\n\nFor assistance, contact HR.\n\nBest regards,\nMS Horizon F.Z.E`,
  },
];

type Recipient = {
  id: string;
  name: string;
  number: string;
  type: "staff" | "applicant" | "custom";
  company?: string;
};

export default function WhatsAppPage() {
  const { staff, applicants, sentWhatsApp, currentUser, currentRole, hasPermission } = useAuthStore();

  const canView = currentRole === "Super Admin" || hasPermission("emails", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [localSent, setLocalSent] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customNumber, setCustomNumber] = useState("");
  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [historySearch, setHistorySearch] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Build contact pool from staff + applicants
  const contactPool = useMemo<Recipient[]>(() => {
    const s: Recipient[] = staff
      .filter(s => s.whatsapp || s.mobile)
      .map(s => ({ id: `staff-${s.id}`, name: s.name, number: s.whatsapp || s.mobile, type: "staff", company: s.company }));
    const a: Recipient[] = applicants
      .filter(a => a.whatsapp || a.mobile)
      .map(a => ({ id: `app-${a.id}`, name: a.fullName, number: a.whatsapp || a.mobile, type: "applicant", company: a.company }));
    
    const seen = new Set<string>();
    const pool: Recipient[] = [];
    for (const item of [...s, ...a]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        pool.push(item);
      }
    }
    return pool;
  }, [staff, applicants]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return contactPool.slice(0, 8);
    const q = search.toLowerCase();
    return contactPool
      .filter(c => c.name.toLowerCase().includes(q) || c.number.includes(q))
      .filter(c => !recipients.some(r => r.id === c.id))
      .slice(0, 8);
  }, [search, contactPool, recipients]);

  const addRecipient = (r: Recipient) => {
    setRecipients(prev => [...prev, r]);
    setSearch("");
    setShowSuggestions(false);
  };

  const addCustomNumber = () => {
    const num = customNumber.trim().replace(/\s/g, "");
    if (!num) return;
    addRecipient({ id: `custom-${Date.now()}`, name: num, number: num, type: "custom" });
    setCustomNumber("");
  };

  const removeRecipient = (id: string) => setRecipients(prev => prev.filter(r => r.id !== id));

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setActiveTemplate(t.id);
    const first = recipients[0];
    setMessage(t.message.replace("{name}", first?.name?.split(" ")[0] || "[Name]"));
  };

  const charCount = message.length;
  const msgCount = Math.ceil(charCount / 160);

  const buildWaLink = (number: string, msg: string) => {
    const clean = number.replace(/[^0-9]/g, "");
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Please write a message."); return; }
    if (recipients.length === 0) { toast.error("Please add at least one recipient."); return; }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    const finalMessage = attachment
      ? `${message}\n\n[Attachment: ${attachment.name}]`
      : message;

    // Open direct WhatsApp links synchronously BEFORE async await calls to prevent browser popup blocking
    if (typeof window !== "undefined") {
      for (const r of recipients) {
        window.open(buildWaLink(r.number, finalMessage), "_blank");
      }
    }

    for (const r of recipients) {
      try {
        const res = await fetch("/api/whatsapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: r.number,
            message: finalMessage,
            candidateName: r.name,
            company: currentUser.company,
            branch: currentUser.branch,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          if (saved) setLocalSent(prev => [saved, ...prev]);
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setSending(false);
    if (successCount > 0) toast.success(`Message sent/forwarded to ${successCount} recipient${successCount > 1 ? "s" : ""}.`);
    if (failCount > 0) toast.warning(`Twilio API not configured/failed. Direct WhatsApp fallback links opened.`);
    
    if (successCount > 0 || failCount > 0) {
      setMessage("");
      setRecipients([]);
      setActiveTemplate(null);
      setAttachment(null);
      setTab("history");
    }
  };

  const tabHistoryCount = sentWhatsApp.length + localSent.length;

  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase();
    const allIds = new Set(localSent.map((m: any) => m.id));
    const combined = [...localSent, ...sentWhatsApp.filter((m: any) => !allIds.has(m.id))]
      .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    return combined.filter((m: any) =>
      !q ||
      m.to?.toLowerCase().includes(q) ||
      m.candidateName?.toLowerCase().includes(q) ||
      m.message?.toLowerCase().includes(q)
    );
  }, [sentWhatsApp, localSent, historySearch]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader
        title="WhatsApp Messages"
        subtitle="Send messages to staff, applicants, and contacts"
      />

      {/* Tabs */}
      <div className="px-4 md:px-6 pt-2 pb-0">
        <div className="flex gap-1 border-b border-slate-100">
          {[
            { key: "compose", label: "Compose", icon: Send },
            { key: "history", label: `History (${tabHistoryCount})`, icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                tab === key
                  ? "border-green-500 text-green-700 bg-green-50/40"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto w-full min-h-0">
        {/* ─── COMPOSE TAB ─── */}
        {tab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left panel: Recipients + Templates */}
            <div className="lg:col-span-1 space-y-4">
              {/* Recipient Selector */}
              <Card className="p-4 rounded-2xl border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Recipients</span>
                  {recipients.length > 0 && (
                    <span className="ml-auto text-[10px] font-extrabold bg-green-500 text-white rounded-full px-2 py-0.5">
                      {recipients.length}
                    </span>
                  )}
                </div>

                {/* Added recipients */}
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {recipients.map(r => (
                      <div key={r.id} className={cn(
                        "flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 border",
                        r.type === "staff" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        r.type === "applicant" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-slate-100 text-slate-700 border-slate-200"
                      )}>
                        {r.type === "staff" ? <User className="w-3 h-3" /> :
                         r.type === "applicant" ? <Users className="w-3 h-3" /> :
                         <Phone className="w-3 h-3" />}
                        <span className="max-w-[90px] truncate">{r.name}</span>
                        <button onClick={() => removeRecipient(r.id)} className="ml-0.5 hover:text-rose-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search box */}
                <div className="relative" ref={searchRef as any}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Search staff or applicant..."
                    className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200 focus:border-green-400"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden max-h-56 overflow-y-auto">
                      {suggestions.map(c => (
                        <button
                          key={c.id}
                          onMouseDown={() => addRecipient(c)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0",
                            c.type === "staff" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {c.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 truncate">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{c.number}</div>
                          </div>
                          <span className={cn(
                            "ml-auto text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0",
                            c.type === "staff" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          )}>
                            {c.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom number */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <Input
                      value={customNumber}
                      onChange={e => setCustomNumber(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCustomNumber()}
                      placeholder="+971 50 000 0000"
                      className="pl-9 h-9 text-xs rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>
                  <Button onClick={addCustomNumber} size="sm" className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>

              {/* Templates */}
              <Card className="p-4 rounded-2xl border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Quick Templates</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className={cn(
                        "flex flex-col items-start gap-1 p-2.5 rounded-xl border text-left transition-all hover:shadow-sm",
                        activeTemplate === t.id ? t.color + " ring-2 ring-offset-1 ring-green-400" : "bg-slate-50 border-slate-200 hover:bg-white"
                      )}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[10px] font-bold leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right panel: Message composer */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 rounded-2xl border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-md shadow-green-500/20">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">Compose Message</div>
                    <div className="text-[10px] text-slate-400 font-medium">WhatsApp — plain text supported</div>
                  </div>
                  {recipients.length > 0 && (
                    <div className="ml-auto text-[10px] font-bold text-slate-500">
                      Sending to <span className="text-green-600 font-extrabold">{recipients.length}</span> recipient{recipients.length > 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here...&#10;&#10;You can use line breaks for formatting."
                  rows={10}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-800 resize-none focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 placeholder:text-slate-400 leading-relaxed transition-all"
                />

                {/* Attachment Selector */}
                <div className="flex items-center gap-2 mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <Paperclip className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600 font-semibold truncate flex-1">
                    {attachment ? `${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)` : "Attach PDF or Document"}
                  </span>
                  {attachment ? (
                    <button type="button" onClick={() => setAttachment(null)} className="text-xs text-rose-500 font-bold hover:text-rose-700">
                      Remove
                    </button>
                  ) : (
                    <label className="text-xs text-blue-600 font-bold hover:text-blue-700 cursor-pointer">
                      Browse
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => {
                        if (e.target.files?.[0]) setAttachment(e.target.files[0]);
                      }} />
                    </label>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                    <span>{charCount} chars</span>
                    <span>·</span>
                    <span>{msgCount} SMS part{msgCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* wa.me fallback for single recipient */}
                    {recipients.length === 1 && message.trim() && (
                      <a
                        href={buildWaLink(recipients[0].number, message)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 hover:text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in WhatsApp
                      </a>
                    )}
                    <Button
                      onClick={handleSend}
                      disabled={sending || !message.trim() || recipients.length === 0}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs h-9 px-5 gap-2 shadow-lg shadow-green-500/20 disabled:opacity-50 transition-all"
                    >
                      {sending ? (
                        <>
                          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send {recipients.length > 1 ? `to ${recipients.length}` : "Message"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Bulk wa.me links for multiple recipients */}
              {recipients.length > 1 && message.trim() && (
                <Card className="p-4 rounded-2xl border-amber-100 bg-amber-50/50 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-amber-800 mb-2">WhatsApp Web Fallback Links</p>
                      <p className="text-[10px] text-amber-700 mb-3">If API sending fails, use these direct links:</p>
                      <div className="space-y-1.5">
                        {recipients.map(r => (
                          <a
                            key={r.id}
                            href={buildWaLink(r.number, message)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[11px] font-bold text-green-700 hover:text-green-900 bg-white border border-green-200 rounded-lg px-3 py-2 transition-all hover:shadow-sm"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{r.name} ({r.number})</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ─── HISTORY TAB ─── */}
        {tab === "history" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <Input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search by name, number, or message..."
                  className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                />
              </div>
              <div className="text-[11px] font-bold text-slate-500 flex-shrink-0">
                {filteredHistory.length} message{filteredHistory.length !== 1 ? "s" : ""}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <Card className="p-12 rounded-2xl border-slate-100 text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">No messages sent yet</p>
                <p className="text-xs text-slate-400 mt-1">Start by composing a message in the Compose tab.</p>
                <Button onClick={() => setTab("compose")} className="mt-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs h-8 px-4">
                  Compose Message
                </Button>
              </Card>
            ) : (
              <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-100">
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Recipient</th>
                        <th className="text-left px-4 py-3">Number</th>
                        <th className="text-left px-4 py-3 w-64">Message Preview</th>
                        <th className="text-left px-4 py-3 whitespace-nowrap">Sent At</th>
                        <th className="text-center px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((msg, i) => (
                        <tr key={msg.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-[10px] flex-shrink-0">
                                {(msg.candidateName || "?").charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">{msg.candidateName || "Unknown"}</div>
                                {msg.company && <div className="text-[9px] text-slate-400 font-medium">{msg.company}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{msg.to}</td>
                          <td className="px-4 py-3 max-w-[256px]">
                            <p className="text-slate-600 truncate font-medium">{msg.message}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-medium">{formatTime(msg.sentAt)}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <a
                                href={buildWaLink(msg.to, msg.message)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in WhatsApp"
                                className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 flex items-center justify-center transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => { navigator.clipboard.writeText(msg.message); toast.success("Message copied!"); }}
                                title="Copy message"
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-slate-50">
                  {filteredHistory.map((msg, i) => (
                    <div key={msg.id || i} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-xs">
                            {(msg.candidateName || "?").charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{msg.candidateName || "Unknown"}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{msg.to}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={buildWaLink(msg.to, msg.message)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2 font-medium line-clamp-2">{msg.message}</p>
                      <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-green-500" />
                        {formatTime(msg.sentAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
