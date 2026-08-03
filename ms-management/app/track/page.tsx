"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Search, ShieldCheck, Clock, Calendar, Building2, UserCheck, 
  AlertTriangle, ArrowLeft, CheckCircle2, FileText, Send, User, 
  MapPin, Phone, Mail, Award, CheckCircle, ChevronRight, RefreshCw, XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function PublicTrackComponent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || searchParams.get("q") || "";
  const initialEmail = searchParams.get("email") || "";

  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const fetchStatus = async (codeToQuery: string, emailToQuery?: string) => {
    if (!codeToQuery.trim()) {
      toast.error("Please enter a valid Tracking Code");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      let queryUrl = `/api/applicants/track?q=${encodeURIComponent(codeToQuery.trim())}`;
      if (emailToQuery && emailToQuery.trim()) {
        queryUrl += `&email=${encodeURIComponent(emailToQuery.trim())}`;
      }

      const res = await fetch(queryUrl);
      if (!res.ok) {
        if (res.status === 404) {
          setResult(null);
          toast.error("No record found matching the provided details.");
        } else {
          throw new Error("Failed to fetch application status");
        }
        return;
      }

      const data = await res.json();
      setResult(data);
      toast.success("Application details retrieved successfully");
    } catch (err: any) {
      console.error("Public track error:", err);
      toast.error(err?.message || "An unexpected error occurred while searching");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      fetchStatus(initialCode, initialEmail);
    }
  }, [initialCode, initialEmail]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(trackingCode, email);
  };

  const applicant = result?.applicant;
  const interviews = result?.interviews || [];

  // Stage pipeline items
  const STAGES = [
    { label: "Applied", desc: "Application Submitted" },
    { label: "Screening", desc: "Documents Review" },
    { label: "Processing", desc: "Evaluation & Shortlist" },
    { label: "Interview Scheduled", desc: "Meeting Set" },
    { label: "Selected", desc: "Offer Letter Issued" },
    { label: "Visa Processing", desc: "Government Clearance" },
    { label: "Placed", desc: "Successfully Onboarded" },
  ];

  const currentStatus = applicant?.status || "Pending";
  const currentStageIndex = (() => {
    const s = currentStatus.toLowerCase();
    if (s.includes("pending")) return 0;
    if (s.includes("screen")) return 1;
    if (s.includes("process")) return 2;
    if (s.includes("interview")) return 3;
    if (s.includes("select") || s.includes("offer")) return 4;
    if (s.includes("visa")) return 5;
    if (s.includes("place")) return 6;
    return 0;
  })();

  const isRejected = currentStatus.toLowerCase().includes("reject");
  const isReturned = currentStatus.toLowerCase().includes("return");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-slate-100 flex flex-col font-sans select-none overflow-y-auto">
      {/* Top Header Navigation */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">
            MS
          </div>
          <div>
            <div className="text-sm font-extrabold text-white tracking-wide">MS Horizon F.Z.E</div>
            <div className="text-[10px] text-blue-300 font-medium">Official Public Application Tracking Portal</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl">
            <Link href="/login">Portal Login</Link>
          </Button>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs px-4">
            <Link href="/apply">Apply Online</Link>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Search Hero Card */}
        <Card className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 text-white shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Live Candidate Verification
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Track Your Application Status
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto">
              Enter your assigned **Tracking Code** (e.g. MSH-2026-000001 or TRK-2026-001) or Email address to view live updates, interview schedules, and placement status.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="trackingCode" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  Tracking Code / ID <span className="text-rose-400">*</span>
                </Label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="trackingCode"
                    placeholder="e.g. MSH-2026-000001 or TRK-2026-001"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    className="pl-10 bg-slate-950/60 border-white/15 text-white placeholder:text-slate-500 rounded-2xl text-xs h-11 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  Email Address <span className="text-slate-400 font-normal">(Optional Validation)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="candidate@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-950/60 border-white/15 text-white placeholder:text-slate-500 rounded-2xl text-xs h-11 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl h-11 text-xs gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Searching Database...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Application Record
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Search Results Display */}
        {searched && !loading && (
          result && applicant ? (
            <div className="space-y-6 animate-fade-in">
              {/* Profile Summary Header Card */}
              <Card className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-2xl text-blue-300 shrink-0">
                      {applicant.fullName ? applicant.fullName.slice(0, 2).toUpperCase() : "APP"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">{applicant.fullName}</h2>
                        <span className="text-base">{applicant.nationalityFlag || "🏳️"}</span>
                      </div>
                      <div className="text-xs text-blue-300 font-mono mt-0.5">
                        Tracking Code: <span className="font-extrabold text-white">{applicant.trackingCode}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Positions: <span className="text-slate-200 font-semibold">{Array.isArray(applicant.applyingPositions) ? applicant.applyingPositions.join(", ") : applicant.applyingPositions || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Live Status</span>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                      isRejected ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
                      isReturned ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
                      currentStatus === "Placed" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                      "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    }`}>
                      {isRejected ? <XCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {applicant.status || "Pending"}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Last Updated: {applicant.createdAt ? applicant.createdAt.slice(0, 10) : "Recently"}
                    </div>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Company</span>
                    <div className="font-bold text-white flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      {applicant.company || "MS Horizon F.Z.E"}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Branch Location</span>
                    <div className="font-bold text-white flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      {applicant.branch || "Main Branch"}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Applied Country</span>
                    <div className="font-bold text-white flex items-center gap-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {applicant.applyCountry || "UAE"}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Application Date</span>
                    <div className="font-bold text-white flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {applicant.applicationDate || applicant.createdAt?.slice(0, 10) || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Progress Stepper Pipeline */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Selection & Recruitment Pipeline Progress</span>
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                      Stage {currentStageIndex + 1} of {STAGES.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2 pt-2">
                    {STAGES.map((stg, idx) => {
                      const isComplete = idx <= currentStageIndex && !isRejected;
                      const isCurrent = idx === currentStageIndex && !isRejected;
                      return (
                        <div key={stg.label} className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                          isCurrent ? "bg-blue-600/30 border-blue-400 text-white shadow-lg shadow-blue-500/10" :
                          isComplete ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
                          "bg-white/5 border-white/5 text-slate-500"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider">{idx + 1}. {stg.label}</span>
                            {isComplete ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium leading-tight">{stg.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Interviews Section */}
              {interviews.length > 0 && (
                <Card className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Scheduled Interviews & Meetings ({interviews.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {interviews.map((int: any) => (
                      <div key={int.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{int.type || "Interview"}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                            {int.status || "Scheduled"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          <div>📅 Date & Time: <span className="font-semibold text-white">{int.dateTime}</span></div>
                          <div>📍 Mode: <span className="font-semibold text-white">{int.mode}</span></div>
                          {int.meetingLink && (
                            <div className="pt-1">
                              <a href={int.meetingLink} target="_blank" rel="noreferrer" className="text-blue-400 underline font-bold hover:text-blue-300 text-[11px]">
                                Join Online Meeting
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Status History Timeline */}
              {Array.isArray(applicant.statusHistory) && applicant.statusHistory.length > 0 && (
                <Card className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl space-y-4">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Verified Timeline History
                  </h3>

                  <div className="space-y-3 relative pl-4 border-l-2 border-white/10">
                    {applicant.statusHistory.map((hist: any, i: number) => (
                      <div key={i} className="relative space-y-0.5">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-white">Status updated to: {hist.newStatus}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{hist.date}</span>
                        </div>
                        <p className="text-xs text-slate-400">{hist.reason || `Changed from ${hist.oldStatus || "None"} to ${hist.newStatus}`}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-center text-rose-200 space-y-3 shadow-xl">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold">No Matching Record Found</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                We could not locate any candidate application matching tracking code <span className="font-mono font-bold text-white">"{trackingCode}"</span>. Please verify your tracking ID or contact support.
              </p>
            </Card>
          )
        )}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-6 text-center text-xs text-slate-500 space-y-1 mt-auto">
        <div>© 2026 MS Horizon F.Z.E · Official SaaS Management System</div>
        <div>All tracking records are verified and secured via official database integration.</div>
      </footer>
    </div>
  );
}

export default function PublicTrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading tracking portal...
      </div>
    }>
      <PublicTrackComponent />
    </Suspense>
  );
}
