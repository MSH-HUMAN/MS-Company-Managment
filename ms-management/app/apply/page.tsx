"use client";

import { useState, useEffect, Suspense } from "react";
import { Search, Briefcase, Calendar, FileText, Phone, CheckCircle, Clock, MapPin, AlertCircle, Sparkles, Send, Download, Globe } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

const POSITIONS = ["Software Engineer", "HR Specialist", "Accountant", "PRO", "Sales Coordinator", "Vehicle Operator", "Administrative Assistant", "Recruiting Agent"];
const COUNTRIES = ["UAE", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain"];
const NATIONALITIES = ["India", "Pakistan", "Philippines", "Nepal", "Egypt", "Sri Lanka", "Bangladesh", "Jordan"];

function ApplyContent() {
  const { applicants, addApplicant, interviews, addActivityLog } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"apply" | "track">("apply");
  const searchParams = useSearchParams();
  const [ownCompanies, setOwnCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [clientCompanies, setClientCompanies] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/own-companies")
      .then(res => res.ok ? res.json() : [])
      .then(data => setOwnCompanies(data.filter((c: any) => c.status === "Active")))
      .catch(err => console.error("Error own-companies:", err));

    fetch("/api/branches")
      .then(res => res.ok ? res.json() : [])
      .then(data => setBranches(data.filter((b: any) => b.status === "Active")))
      .catch(err => console.error("Error branches:", err));

    fetch("/api/companies")
      .then(res => res.ok ? res.json() : [])
      .then(data => setClientCompanies(data.filter((c: any) => c.status === "Active")))
      .catch(err => console.error("Error fetching companies:", err));
  }, []);

  // Apply Form State
  const [form, setForm] = useState({
    fullName: "",
    dateOfBirth: "",
    email: "",
    mobile: "",
    whatsapp: "",
    nationality: "India",
    currentCountry: "UAE",
    applyingPositions: [] as string[],
    salaryExpectation: "",
    applyCountry: "UAE",
    visaType: "Visit",
    visaExpiry: "",
    passportExpiry: "",
    passportNumber: "",
    photo: null as string | null,
    company: "",
    branch: "",
    education: "",
    experience: "",
    collegeUniversity: "",
    graduatedYear: "",
    certification: "",
    referencePersonName: "",
    referencePersonMobile: ""
  });

  const [positionInput, setPositionInput] = useState("");
  const [uploads, setUploads] = useState<{ [key: string]: { name: string; date: string; url?: string } }>({});
  const [customDocs, setCustomDocs] = useState<{ id: string; name: string; uploadedBy: string; uploadedDate: string; type: string; url?: string }[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Tracking Search State
  const [trackQuery, setTrackQuery] = useState("");
  const [trackedApplicant, setTrackedApplicant] = useState<any | null>(null);
  const [trackedInterviews, setTrackedInterviews] = useState<any[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Query parameter tracking auto-lookup
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      setTrackQuery(code);
      setActiveTab("track");
      setTrackingLoading(true);
      fetch(`/api/applicants/track?q=${encodeURIComponent(code.trim())}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Application not found");
        })
        .then(data => {
          setTrackedApplicant(data.applicant);
          setTrackedInterviews(data.interviews || []);
        })
        .catch(err => {
          console.error("Auto tracking lookup failed:", err);
          setTrackedApplicant(null);
          setTrackedInterviews([]);
        })
        .finally(() => setTrackingLoading(false));
    }
  }, [searchParams]);

  const handleAddPosition = (pos: string) => {
    if (!pos || form.applyingPositions.includes(pos)) return;
    setForm(f => ({ ...f, applyingPositions: [...f.applyingPositions, pos] }));
    setPositionInput("");
  };

  const handleRemovePosition = (pos: string) => {
    setForm(f => ({ ...f, applyingPositions: f.applyingPositions.filter(p => p !== pos) }));
  };

  const handleFileUpload = (fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploads(prev => ({
          ...prev,
          [fieldName]: {
            name: file.name,
            date: new Date().toISOString().slice(0, 10),
            url: reader.result as string,
          }
        }));
        toast.success(`${fieldName.replace(/([A-Z])/g, " $1")} uploaded`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExtensions = ["pdf", "doc", "docx"];
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        toast.error("Invalid file type. Only PDF, DOC, and DOCX formats are allowed for CV.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploads(prev => ({
          ...prev,
          CV: {
            name: file.name,
            date: new Date().toISOString().slice(0, 10),
            url: reader.result as string,
          }
        }));
        toast.success("CV / Resume uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, photo: reader.result as string }));
        setUploads(prev => ({
          ...prev,
          ProfilePhoto: {
            name: file.name,
            date: new Date().toISOString().slice(0, 10),
            url: reader.result as string,
          }
        }));
        toast.success("Profile photo uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClientPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, clientPhoto: reader.result as string }));
        toast.success("Client contact representative photo uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMultipleDocsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs = await Promise.all(
        Array.from(files).map(async (file, i) => {
          return new Promise<any>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                id: `DOC-CUST-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
                name: file.name,
                uploadedBy: "Applicant",
                uploadedDate: new Date().toISOString().slice(0, 10),
                type: file.type || "Other",
                url: reader.result as string,
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      setCustomDocs(prev => [...prev, ...newDocs]);
      toast.success(`Attached ${files.length} other files`);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || form.applyingPositions.length === 0 || !form.company || !form.branch) {
      toast.error("Please fill in your name, email, applying positions, and select the Company and Branch you are applying to.");
      return;
    }

    const trackingCode = `APP-${Math.floor(100000 + Math.random() * 900000)}`;
    const newApplicant = {
      id: `APP${Math.floor(100 + Math.random() * 900)}`,
      photo: form.photo,
      clientName: "-",
      clientPhoto: null,
      clientMobile: "",
      clientWhatsapp: "",
      clientEmail: "",
      applicationDate: new Date().toISOString().slice(0, 10),
      fullName: form.fullName,
      dateOfBirth: form.dateOfBirth,
      email: form.email,
      mobile: form.mobile,
      whatsapp: form.whatsapp,
      nationality: form.nationality,
      nationalityFlag: "🌐",
      currentCountry: form.currentCountry,
      applyingPositions: form.applyingPositions,
      salaryExpectation: parseInt(form.salaryExpectation) || 0,
      applyCountry: form.applyCountry,
      visaType: form.visaType,
      visaExpiry: form.visaExpiry,
      passportExpiry: form.passportExpiry,
      passportNumber: form.passportNumber,
      education: form.education,
      experience: form.experience,
      collegeUniversity: form.collegeUniversity,
      graduatedYear: form.graduatedYear,
      certification: form.certification,
      referencePersonName: form.referencePersonName,
      referencePersonMobile: form.referencePersonMobile,
      status: "Pending" as const,
      trackingCode: trackingCode,
      company: form.company,
      branch: form.branch,
      createdBy: form.fullName,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      documents: [
        ...Object.keys(uploads).map((key, i) => ({
          id: `DOC-${Date.now()}-${i}`,
          name: uploads[key].name,
          uploadedBy: "Applicant",
          uploadedDate: uploads[key].date,
          type: key,
          url: uploads[key].url,
        })),
        ...customDocs
      ],
      statusHistory: [
        {
          oldStatus: null,
          newStatus: "Pending",
          changedBy: "Applicant",
          date: new Date().toISOString().replace("T", " ").slice(0, 19),
          reason: "Online Application Registration"
        }
      ]
    };

    try {
      await addApplicant(newApplicant);
      
      // Add activity log
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T"," ").slice(0,19),
        userName: form.fullName,
        role: "Applicant",
        company: form.company,
        branch: form.branch,
        action: "Created",
        module: "Applicant Portal",
        oldValue: null,
        newValue: `New application registered online. Code: ${trackingCode}`,
        ipAddress: "127.0.0.1"
      });

      setGeneratedCode(trackingCode);
      setForm({
        fullName: "",
        dateOfBirth: "",
        email: "",
        mobile: "",
        whatsapp: "",
        nationality: "India",
        currentCountry: "UAE",
        applyingPositions: [],
        salaryExpectation: "",
        applyCountry: "UAE",
        visaType: "Visit",
        visaExpiry: "",
        passportExpiry: "",
        passportNumber: "",
        photo: null,
        company: "",
        branch: ""
      });
      setUploads({});
      setCustomDocs([]);
      toast.success("Application Submitted Successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackQuery) {
      toast.error("Please enter a Tracking Code, Email, or Passport Number");
      return;
    }
    setTrackingLoading(true);
    try {
      const res = await fetch(`/api/applicants/track?q=${encodeURIComponent(trackQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTrackedApplicant(data.applicant);
        setTrackedInterviews(data.interviews || []);
        toast.success("Application Found!");
      } else {
        setTrackedApplicant(null);
        setTrackedInterviews([]);
        toast.error("No record found matching the criteria");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error searching tracker");
      setTrackedApplicant(null);
      setTrackedInterviews([]);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Days left helper
  const getVisaDaysLeft = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusTimelineIndex = (status: string) => {
    const sequence = ["Pending", "Processing", "Selected", "Visa Processing", "Placed"];
    if (status === "Rejected" || status === "Returned") return -1;
    return sequence.indexOf(status);
  };

  const currentTimeline = ["Pending", "Processing", "Selected", "Visa Processing", "Placed"];

  const trackedApplicantInterviews = trackedInterviews;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Premium Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            MS
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">MS Company Management</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Candidate Portal</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost" className="text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl h-9 px-4">
              Portal Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white py-12 px-6 text-center select-none">
        <div className="w-[95vw] sm:w-full max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
            <Sparkles className="w-3.5 h-3.5"/> Join Our Professional Ecosystem
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Submit Your Professional Application</h2>
          <p className="text-sm text-slate-300 w-[95vw] sm:w-full max-w-xl mx-auto font-medium">
            Register your profile or instantly track your visa approvals, interview schedules, and final placements.
          </p>

          {/* Navigation Controls */}
          {!(searchParams.get("code") || searchParams.get("mode") === "track") && (
            <div className="flex justify-center gap-3 pt-6">
              <button
                onClick={() => { setActiveTab("apply"); setGeneratedCode(null); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  activeTab === "apply"
                    ? "bg-blue-600 text-white shadow-blue-600/20"
                    : "bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                1. Register Application
              </button>
              <button
                onClick={() => { setActiveTab("track"); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                  activeTab === "track"
                    ? "bg-blue-600 text-white shadow-blue-600/20"
                    : "bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                2. Track Progress
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 w-[95vw] sm:w-full max-w-4xl mx-auto w-full p-4 md:p-6">
        {activeTab === "apply" ? (
          <Card className="rounded-3xl border-slate-200 shadow-xl bg-white p-6 md:p-8 space-y-6">
            {generatedCode ? (
              <div className="text-center py-10 space-y-6 w-[95vw] sm:w-full max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                  <CheckCircle className="w-8 h-8"/>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800">Application Submitted!</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Your candidate profile has been registered in our central database. Please copy the tracking code below to check your progress.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono font-bold text-lg text-blue-600 tracking-wider flex items-center justify-center gap-2">
                  {generatedCode}
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCode);
                      toast.success("Tracking code copied!");
                    }}
                    variant="outline"
                    className="rounded-xl text-xs font-bold h-10 border-slate-200"
                  >
                    Copy Code
                  </Button>
                  <Button
                    onClick={() => {
                      setTrackQuery(generatedCode);
                      setActiveTab("track");
                      const matched = applicants.find(a => a.trackingCode === generatedCode);
                      if (matched) setTrackedApplicant(matched);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-10"
                  >
                    Track Now
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Candidate Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></Label>
                      <Input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="John Doe" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Birth</Label>
                      <Input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address <span className="text-rose-500">*</span></Label>
                      <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="johndoe@email.com" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Phone <span className="text-rose-500">*</span></Label>
                      <Input required value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="+971 50 123 4567" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Phone</Label>
                      <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+971 50 123 4567" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nationality</Label>
                      <Select value={form.nationality} onValueChange={v => setForm(f => ({ ...f, nationality: v || "" }))}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Living Country</Label>
                      <Select value={form.currentCountry} onValueChange={v => setForm(f => ({ ...f, currentCountry: v || "" }))}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Position & Expectations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Applying Positions (Multiple) <span className="text-rose-500">*</span></Label>
                      <div className="flex gap-2">
                        <Select value={positionInput} onValueChange={v => v && handleAddPosition(v)}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 flex-1"><SelectValue placeholder="Add positions you wish to apply for..."/></SelectTrigger>
                          <SelectContent className="bg-white rounded-xl text-xs">{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1.5 flex-wrap pt-1.5">
                        {form.applyingPositions.map(pos => (
                          <span key={pos} className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                            {pos}
                            <button type="button" onClick={() => handleRemovePosition(pos)} className="text-blue-500 hover:text-blue-800 font-extrabold text-[9px]">✕</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected Salary (AED / Month)</Label>
                      <Input type="number" value={form.salaryExpectation} onChange={e => setForm(f => ({ ...f, salaryExpectation: e.target.value }))} placeholder="5000" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Apply Country Target</Label>
                      <Select value={form.applyCountry} onValueChange={v => setForm(f => ({ ...f, applyCountry: v || "" }))}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Visa & Passport Expiry Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passport Number</Label>
                      <Input value={form.passportNumber} onChange={e => setForm(f => ({ ...f, passportNumber: e.target.value }))} placeholder="L1234567" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visa Type</Label>
                      <Select value={form.visaType} onValueChange={v => setForm(f => ({ ...f, visaType: v || "" }))}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">
                          <SelectItem value="Visit">Visit Visa</SelectItem>
                          <SelectItem value="Cancel">Cancelled Visa</SelectItem>
                          <SelectItem value="Freelancer">Freelance Visa</SelectItem>
                          <SelectItem value="Own Visa">Own Visa</SelectItem>
                          <SelectItem value="Other">Other Type</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visa Expiry Date</Label>
                      <Input type="date" value={form.visaExpiry} onChange={e => setForm(f => ({ ...f, visaExpiry: e.target.value }))} className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Passport Expiry Date</Label>
                      <Input type="date" value={form.passportExpiry} onChange={e => setForm(f => ({ ...f, passportExpiry: e.target.value }))} className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Education & Qualifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Education Level</Label>
                      <Select value={form.education} onValueChange={v => setForm(f => ({ ...f, education: v || "" }))}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10"><SelectValue placeholder="Select Education Level"/></SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="Higher Secondary">Higher Secondary</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Bachelor's Degree">Bachelor's Degree</SelectItem>
                          <SelectItem value="Master's Degree">Master's Degree</SelectItem>
                          <SelectItem value="Doctorate / PhD">Doctorate / PhD</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">College / University</Label>
                      <Input value={form.collegeUniversity} onChange={e => setForm(f => ({ ...f, collegeUniversity: e.target.value }))} placeholder="University of Oxford / Oxford College" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Graduated Year</Label>
                      <Input type="number" min="1950" max="2035" value={form.graduatedYear} onChange={e => setForm(f => ({ ...f, graduatedYear: e.target.value }))} placeholder="e.g. 2022" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Certifications & Licenses</Label>
                      <Input value={form.certification} onChange={e => setForm(f => ({ ...f, certification: e.target.value }))} placeholder="e.g. PMP, AWS Certified, IELTS, First Aid" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Work Experience & References</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Work Experience Details</Label>
                      <Input value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 3 Years experience as Accountant at ABC Corp" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Person Name</Label>
                      <Input value={form.referencePersonName} onChange={e => setForm(f => ({ ...f, referencePersonName: e.target.value }))} placeholder="e.g. Robert Smith (Manager)" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Person Mobile Number</Label>
                      <Input value={form.referencePersonMobile} onChange={e => setForm(f => ({ ...f, referencePersonMobile: e.target.value }))} placeholder="+971 50 987 6543" className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Upload Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-400 transition-colors relative cursor-pointer min-h-24">
                      <Input type="file" accept=".pdf,image/*" onChange={e => handleFileUpload("PassportCopy", e)} className="absolute inset-0 opacity-0 cursor-pointer h-full" />
                      <FileText className="w-6 h-6 text-slate-400" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-700">Passport Copy</div>
                        <div className="text-[8px] font-semibold text-slate-400 mt-0.5">{uploads.PassportCopy ? uploads.PassportCopy.name : "Click to select"}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-400 transition-colors relative cursor-pointer min-h-24">
                      <Input type="file" accept=".pdf,image/*" onChange={e => handleFileUpload("VisaPage", e)} className="absolute inset-0 opacity-0 cursor-pointer h-full" />
                      <FileText className="w-6 h-6 text-slate-400" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-700">Visa Page Copy</div>
                        <div className="text-[8px] font-semibold text-slate-400 mt-0.5">{uploads.VisaPage ? uploads.VisaPage.name : "Click to select"}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-400 transition-colors relative cursor-pointer min-h-24">
                      <Input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer h-full" />
                      <FileText className="w-6 h-6 text-slate-400" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-700">Profile Photo</div>
                        <div className="text-[8px] font-semibold text-slate-400 mt-0.5">{uploads.ProfilePhoto ? uploads.ProfilePhoto.name : "Click to select"}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-400 transition-colors relative cursor-pointer min-h-24">
                      <Input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="absolute inset-0 opacity-0 cursor-pointer h-full" />
                      <FileText className="w-6 h-6 text-slate-400" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-700">CV / Resume (PDF/DOCX)</div>
                        <div className="text-[8px] font-semibold text-slate-400 mt-0.5">{uploads.CV ? uploads.CV.name : "Click to select file"}</div>
                      </div>
                    </div>
                  </div>
                  {/* Multiple custom uploads */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-400 transition-colors relative cursor-pointer min-h-24 mt-4">
                    <Input type="file" multiple accept=".pdf,image/*,.doc,.docx" onChange={handleMultipleDocsUpload} className="absolute inset-0 opacity-0 cursor-pointer h-full" />
                    <FileText className="w-6 h-6 text-slate-400" />
                    <div>
                      <div className="text-[10px] font-bold text-slate-700">Other Documents (Multiple Upload)</div>
                      <div className="text-[8px] font-semibold text-slate-400 mt-0.5">{customDocs.length > 0 ? `${customDocs.length} files attached` : "Click to select"}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">MS Company Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Our Company *</Label>
                      <Select
                        value={form.company}
                        onValueChange={(val) => {
                          setForm(f => ({
                            ...f,
                            company: val || "",
                            branch: "" // Reset branch when company changes
                          }));
                        }}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white text-left font-normal text-slate-700">
                          <SelectValue placeholder="Select Our Company *" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">
                          {ownCompanies.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Branch *</Label>
                      <Select
                        value={form.branch}
                        onValueChange={(val) => {
                          setForm(f => ({
                            ...f,
                            branch: val || ""
                          }));
                        }}
                        disabled={!form.company}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 focus:bg-white text-left font-normal text-slate-700 disabled:opacity-50">
                          <SelectValue placeholder={form.company ? "Select Branch *" : "Choose Company First"} />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl text-xs">
                          {branches
                            .filter(b => b.company === form.company)
                            .map(b => (
                              <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs px-8 h-12 shadow-lg shadow-blue-600/10 gap-2">
                    <Send className="w-4 h-4"/> Submit Application Profile
                  </Button>
                </div>
              </form>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 shadow-xl bg-white p-6">
              <form onSubmit={handleTrackSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Enter Tracking Code (e.g. APP-123456), Email or Passport..."
                    value={trackQuery}
                    onChange={e => setTrackQuery(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 rounded-2xl text-xs h-11 focus:bg-white"
                  />
                </div>
                <Button type="submit" disabled={trackingLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs h-11 px-6 shadow-md disabled:opacity-50">
                  {trackingLoading ? "Searching..." : "Search Tracker"}
                </Button>
              </form>
            </Card>

            {trackedApplicant ? (
              <div className="space-y-6">
                {/* Application Details Summary */}
                <Card className="rounded-3xl border-slate-200 shadow-xl bg-white p-6 md:p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800">{trackedApplicant.fullName}</h3>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Tracking ID: <span className="font-mono text-blue-600 font-bold">{trackedApplicant.trackingCode}</span> · Submitted: {trackedApplicant.applicationDate}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        trackedApplicant.status === "Placed"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                          : trackedApplicant.status === "Rejected"
                          ? "bg-rose-50 border-rose-100 text-rose-700"
                          : trackedApplicant.status === "Returned"
                          ? "bg-amber-50 border-amber-100 text-amber-700"
                          : "bg-blue-50 border-blue-100 text-blue-700"
                      }`}>
                        {trackedApplicant.status}
                      </span>
                    </div>
                  </div>

                  {/* Visa expiry countdown */}
                  {trackedApplicant.visaExpiry && (
                    (() => {
                      const daysLeft = getVisaDaysLeft(trackedApplicant.visaExpiry);
                      if (daysLeft !== null && daysLeft <= 20) {
                        return (
                          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                            <div className="text-xs font-semibold">
                              <div className="font-bold text-amber-900">Visa Expiry Alert</div>
                              Your current visa will expire in <span className="font-extrabold text-rose-600">{daysLeft} days</span> (Expiry: {trackedApplicant.visaExpiry}). Please connect with your supervisor.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}

                  {/* Timeline progress steps */}
                  {getStatusTimelineIndex(trackedApplicant.status) !== -1 && (
                    <div className="space-y-4">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Application Progression Timeline</div>
                      <div className="relative flex justify-between items-center w-full pt-4 px-2">
                        {/* Connecting track line */}
                        <div className="absolute top-[21px] left-8 right-8 h-1 bg-slate-100 -z-10" />
                        <div 
                          className="absolute top-[21px] left-8 h-1 bg-blue-500 -z-10 transition-all duration-500" 
                          style={{ width: `${(getStatusTimelineIndex(trackedApplicant.status) / (currentTimeline.length - 1)) * 90}%` }}
                        />

                        {currentTimeline.map((step, index) => {
                          const isCompleted = index <= getStatusTimelineIndex(trackedApplicant.status);
                          const isActive = index === getStatusTimelineIndex(trackedApplicant.status);
                          return (
                            <div key={step} className="flex flex-col items-center gap-2">
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                                isCompleted 
                                  ? "bg-blue-600 border-blue-600 text-white" 
                                  : "bg-white border-slate-200 text-slate-400"
                              } ${isActive ? "ring-4 ring-blue-500/20" : ""}`}>
                                {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                              </div>
                              <span className={`text-[10px] font-bold tracking-tight text-center ${
                                isCompleted ? "text-slate-800" : "text-slate-400"
                              }`}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interview scheduled updates */}
                  {trackedApplicantInterviews.length > 0 && (
                    <div className="space-y-3 border-t border-slate-100 pt-5">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Interview & Meeting Updates</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trackedApplicantInterviews.map((int: any) => (
                          <div key={int.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex gap-3 items-start">
                            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <div className="font-bold text-slate-800">{int.type}: {int.position || int.meetingType}</div>
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{int.dateTime}</div>
                              <div className="mt-2 flex gap-1.5">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{int.mode}</span>
                                {int.meetingLink && (
                                  <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[10px] font-bold">Join Link</a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Uploads & Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
                    <div className="space-y-3">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Profile Registry Details</div>
                      <div className="space-y-2 text-xs font-semibold text-slate-600">
                        <div className="flex justify-between py-1.5 border-b border-slate-50">
                          <span className="text-slate-400">Position Target:</span>
                          <span>{trackedApplicant.applyingPositions?.join(", ") || trackedApplicant.position}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-50">
                          <span className="text-slate-400">Expectation:</span>
                          <span>AED {trackedApplicant.salaryExpectation?.toLocaleString()} / Month</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-50">
                          <span className="text-slate-400">Visa Class:</span>
                          <span>{trackedApplicant.visaType}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-50">
                          <span className="text-slate-400">Visa Expiration:</span>
                          <span>{trackedApplicant.visaExpiry || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Submitted Attachments</div>
                      <div className="space-y-2">
                        {trackedApplicant.documents && trackedApplicant.documents.length > 0 ? (
                          trackedApplicant.documents.map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <div className="text-xs font-bold text-slate-700 truncate" title={doc.name}>{doc.name}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (doc.url) {
                                    const a = document.createElement("a");
                                    a.href = doc.url;
                                    a.download = doc.name;
                                    a.click();
                                  } else {
                                    toast.info(`No file data stored for "${doc.name}"`);
                                  }
                                }}
                                className="w-8 h-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-slate-400 italic">No attachments uploaded yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Support Card */}
                <Card className="rounded-3xl border-slate-200 shadow-xl bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400"><Phone className="w-5 h-5"/></div>
                    <div>
                      <h4 className="text-sm font-bold">Need assistance or profile updates?</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Connect with our support team regarding visa processing or scheduled interviews.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <a href="tel:+971501234567" className="flex-1 md:flex-none">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold w-full h-10 px-5 gap-1.5"><Phone className="w-4 h-4"/> Call Support</Button>
                    </a>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="rounded-3xl border-dashed border-2 border-slate-200 p-8 text-center bg-white shadow-sm flex flex-col items-center">
                <Clock className="w-10 h-10 text-slate-400 mb-3" />
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">Enter your details to track</h4>
                <p className="text-[10px] text-slate-400 font-semibold max-w-xs leading-normal">
                  Provide your unique Candidate tracking code, email address, or passport number in the search bar above to see live updates.
                </p>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Styled Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-center py-6 text-[10px] font-semibold mt-auto">
        <p>© 2026 MS Company Management SaaS Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-500">Loading Candidate Portal...</div>}>
      <ApplyContent />
    </Suspense>
  );
}
