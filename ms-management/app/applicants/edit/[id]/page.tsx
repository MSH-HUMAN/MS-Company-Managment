"use strict";
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Plus, X, UploadCloud, Save, Trash2, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { NATIONALITIES } from "@/lib/constants";
import { Applicant, Document } from "@/lib/types";
import PageHeader from "@/components/shared/PageHeader";
import AccessDenied from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";

interface FormData {
  fullName: string;
  email: string;
  mobile: string;
  whatsapp: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  currentCountry: string;
  applyCountry: string;
  salaryExpectation: number;
  visaType: string;
  visaExpiry: string;
  passportExpiry: string;
  passportNumber: string;
}

export default function EditApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { applicants, updateApplicant, addActivityLog, currentUser, ownCompanies, branches, hasPermission, isStoreLoaded } = useAuthStore();

  const applicant = applicants.find((a: Applicant) => a.id === id);

  const [positions, setPositions] = useState<string[]>([]);
  const [positionInput, setPositionInput] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  // Named document slots (field-by-field)
  const [passportCopy, setPassportCopy] = useState<{ name: string; url: string } | null>(null);
  const [visaPage, setVisaPage] = useState<{ name: string; url: string } | null>(null);
  const [applicantPhoto, setApplicantPhoto] = useState<{ name: string; url: string } | null>(null);
  const [otherDocs, setOtherDocs] = useState<{ name: string; url: string; type: string }[]>([]);

  const [selectedOwnCompany, setSelectedOwnCompany] = useState<string>("");
  const [selectedOwnBranch, setSelectedOwnBranch] = useState<string>("");

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();

  useEffect(() => {
    if (applicant) {
      reset({
        fullName: applicant.fullName || "",
        email: applicant.email || "",
        mobile: applicant.mobile || "",
        whatsapp: applicant.whatsapp || "",
        dateOfBirth: applicant.dateOfBirth || "",
        gender: applicant.gender || "Male",
        nationality: applicant.nationality || "India",
        currentCountry: applicant.currentCountry || "UAE",
        applyCountry: applicant.applyCountry || "UAE",
        salaryExpectation: applicant.salaryExpectation || 3000,
        visaType: applicant.visaType || "Visit",
        visaExpiry: applicant.visaExpiry || "",
        passportExpiry: applicant.passportExpiry || "",
        passportNumber: applicant.passportNumber || ""
      });
      setPositions(applicant.applyingPositions || []);
      setPhoto(applicant.photo || null);
      setSelectedOwnCompany(applicant.company || "");
      setSelectedOwnBranch(applicant.branch || "");

      // Map documents
      const docs = applicant.documents || [];
      const pass = docs.find((d: any) => d.name.toLowerCase().startsWith("passport copy.") || d.name.toLowerCase().includes("passport"));
      if (pass) setPassportCopy({ name: pass.name, url: pass.url });

      const visa = docs.find((d: any) => d.name.toLowerCase().startsWith("visa page.") || d.name.toLowerCase().includes("visa"));
      if (visa) setVisaPage({ name: visa.name, url: visa.url });

      const photoDoc = docs.find((d: any) => d.name.toLowerCase().startsWith("applicant photo.") || d.name.toLowerCase().includes("profile photo"));
      if (photoDoc) setApplicantPhoto({ name: photoDoc.name, url: photoDoc.url });

      const other = docs.filter((d: any) => 
        !d.name.toLowerCase().startsWith("passport copy.") && !d.name.toLowerCase().includes("passport") &&
        !d.name.toLowerCase().startsWith("visa page.") && !d.name.toLowerCase().includes("visa") &&
        !d.name.toLowerCase().startsWith("applicant photo.") && !d.name.toLowerCase().includes("profile photo") &&
        !(d.name.toLowerCase().includes("archived") && (d.name.toLowerCase().startsWith("cv_") || d.name.toLowerCase().includes("cv_v")))
      );
      setOtherDocs(other.map((d: any) => ({ name: d.name, url: d.url, type: d.type })));
    }
  }, [applicant, reset]);

  const canEditApplicants = hasPermission("applicants", "edit");

  if (!isStoreLoaded) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-12 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading applicant details...</p>
        </div>
      </div>
    );
  }

  if (!canEditApplicants) {
    return <AccessDenied />;
  }

  if (!applicant) {
    return (
      <div className="flex flex-col h-full overflow-hidden select-none">
        <PageHeader title="Edit Applicant" showBack={true} />
        <div className="p-12">
          <div className="border border-slate-100 rounded-2xl p-8 bg-white text-center shadow-sm">
            <h4 className="text-sm font-bold text-slate-800">Applicant not found</h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">The applicant you are trying to edit does not exist.</p>
            <Button onClick={() => router.push("/applicants")} className="bg-blue-600 text-white rounded-xl text-xs h-9">
              Back to Applicants
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddPosition = () => {
    if (positionInput.trim() && !positions.includes(positionInput.trim())) {
      setPositions([...positions, positionInput.trim()]);
      setPositionInput("");
    }
  };

  const handleRemovePosition = (idx: number) => {
    setPositions(positions.filter((_, i) => i !== idx));
  };

  const readAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const validatePhoto = (file: File): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["jpg", "jpeg", "png", "pdf"];
    if (!ext || !allowed.includes(ext)) {
      toast.error("Invalid file format. Only JPG, JPEG, PNG, and PDF formats are allowed for Profile Photo.");
      return false;
    }
    if (ext === "pdf") {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("PDF Profile Photo is too large. Size must be less than 5MB.");
        return false;
      }
    } else {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Profile photo image is too large. Size must be less than 2MB.");
        return false;
      }
    }
    return true;
  };

  const validatePDF = (file: File, fieldName: string): boolean => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      toast.error(`Invalid format for ${fieldName}. Only PDF format is allowed.`);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`File is too large. ${fieldName} size must be less than 5MB.`);
      return false;
    }
    return true;
  };

  const onSubmit = async (data: FormData) => {
    if (positions.length === 0) {
      toast.error("Please add at least one applying position.");
      return;
    }
    if (!selectedOwnCompany) {
      toast.error("Our Company assignment is required.");
      return;
    }

    // Build documents array
    const documents: Document[] = [];
    if (passportCopy) documents.push({ id: `DOC-passport-${Date.now()}`, name: passportCopy.name, uploadedBy: currentUser.name, uploadedDate: new Date().toISOString().slice(0, 10), type: "application/pdf", url: passportCopy.url });
    if (visaPage) documents.push({ id: `DOC-visa-${Date.now()}`, name: visaPage.name, uploadedBy: currentUser.name, uploadedDate: new Date().toISOString().slice(0, 10), type: "application/pdf", url: visaPage.url });
    if (applicantPhoto) documents.push({ id: `DOC-photo-${Date.now()}`, name: applicantPhoto.name, uploadedBy: currentUser.name, uploadedDate: new Date().toISOString().slice(0, 10), type: "image/jpeg", url: applicantPhoto.url });
    
    // Maintain old CV/archived CVs if any
    const cvDocs = (applicant.documents || []).filter(d => 
      d.name.toLowerCase().startsWith("cv.") || 
      d.name.toLowerCase().includes("cv_v") || 
      d.name.toLowerCase().includes("cv - ")
    );
    cvDocs.forEach(cv => documents.push(cv));

    otherDocs.forEach((d, i) => documents.push({ id: `DOC-other-${Date.now()}-${i}`, name: d.name, uploadedBy: currentUser.name, uploadedDate: new Date().toISOString().slice(0, 10), type: d.type, url: d.url }));

    const updatedApplicant: Applicant = {
      ...applicant,
      ...data,
      photo: applicantPhoto?.url ?? photo,
      applyingPositions: positions,
      company: selectedOwnCompany,
      branch: selectedOwnBranch || "Main Branch",
      documents
    };

    const loadingToast = toast.loading("Saving changes to database...");
    try {
      await updateApplicant(updatedApplicant);

      // Log Activity
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Edited",
        module: "Applicants",
        oldValue: `Applicant: ${applicant.fullName} (${applicant.id})`,
        newValue: `Edited profile details`,
        ipAddress: "192.168.1.102"
      });

      toast.dismiss(loadingToast);
      toast.success(`Applicant profile updated successfully`);
      router.push(`/applicants/${applicant.id}`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Failed to update applicant. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none pb-24 md:">
      <PageHeader
        title="Edit Applicant Profile"
        subtitle={`Editing details for tracking code: ${applicant.trackingCode}`}
        showBack={true}
      />

      <div className="p-4 md:p-6 w-[95vw] sm:w-full max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
              1. Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <Label htmlFor="fullName" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Mohammed Al Rashid"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("fullName", { required: true })}
                />
                {errors.fullName && <span className="text-[9px] text-rose-500 font-bold">Name is required</span>}
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <Label htmlFor="gender" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Gender <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="gender"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  {...register("gender", { required: true })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="text-[9px] text-rose-500 font-bold block">Gender is required</span>}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1">
                <Label htmlFor="dateOfBirth" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Date of Birth <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("dateOfBirth", { required: true })}
                />
                {errors.dateOfBirth && <span className="text-[9px] text-rose-500 font-bold block">Date of birth is required</span>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mohammed@email.com"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("email", { required: true })}
                />
                {errors.email && <span className="text-[9px] text-rose-500 font-bold block">Email is required</span>}
              </div>

              {/* Nationality */}
              <div className="space-y-1">
                <Label htmlFor="nationality" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Nationality <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="nationality"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("nationality", { required: true })}
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n.name} value={n.name}>
                      {n.flag} {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Living Country */}
              <div className="space-y-1">
                <Label htmlFor="currentCountry" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Current Living Country <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="currentCountry"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("currentCountry", { required: true })}
                >
                  {NATIONALITIES.map((n) => (
                    <option key={`curr-${n.name}`} value={n.name}>
                      {n.flag} {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply Country */}
              <div className="space-y-1">
                <Label htmlFor="applyCountry" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Apply Country <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="applyCountry"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("applyCountry", { required: true })}
                >
                  {NATIONALITIES.map((n) => (
                    <option key={`app-${n.name}`} value={n.name}>
                      {n.flag} {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mobile */}
              <div className="space-y-1">
                <Label htmlFor="mobile" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Mobile Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  placeholder="+971501234567"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("mobile", { required: true })}
                />
                {errors.mobile && <span className="text-[9px] text-rose-500 font-bold block">Mobile number is required</span>}
              </div>

              {/* Whatsapp */}
              <div className="space-y-1">
                <Label htmlFor="whatsapp" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  WhatsApp Number
                </Label>
                <Input
                  id="whatsapp"
                  placeholder="+971501234567"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("whatsapp")}
                />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
              2. Job Preferences & Visa Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Applying Positions array builder */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Applying Positions <span className="text-rose-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter position (e.g. Sales, Driver)"
                    value={positionInput}
                    onChange={(e) => setPositionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPosition();
                      }
                    }}
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 flex-1 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <Button type="button" onClick={handleAddPosition} className="bg-slate-800 text-white rounded-xl text-xs h-10 px-4">
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {positions.map((pos, idx) => (
                    <span
                      key={pos}
                      className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
                    >
                      {pos}
                      <button type="button" onClick={() => handleRemovePosition(idx)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {positions.length === 0 && (
                    <span className="text-[10px] text-slate-400 font-semibold italic">No positions added yet.</span>
                  )}
                </div>
              </div>

              {/* Salary Expectation */}
              <div className="space-y-1">
                <Label htmlFor="salaryExpectation" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Salary Expectation (AED)
                </Label>
                <Input
                  id="salaryExpectation"
                  type="number"
                  placeholder="3000"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("salaryExpectation")}
                />
              </div>

              {/* Passport Number */}
              <div className="space-y-1">
                <Label htmlFor="passportNumber" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Passport Number <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="passportNumber"
                  placeholder="P1234567"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  {...register("passportNumber", { required: true })}
                />
                {errors.passportNumber && <span className="text-[9px] text-rose-500 font-bold block">Passport number is required</span>}
              </div>

              {/* Visa Type */}
              <div className="space-y-1">
                <Label htmlFor="visaType" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Visa Type <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="visaType"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400"
                  {...register("visaType", { required: true })}
                >
                  <option value="Visit">Visit</option>
                  <option value="Cancel">Cancel</option>
                  <option value="Freelancer">Freelancer</option>
                  <option value="Own Visa">Own Visa</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Visa Expiry Date */}
              <div className="space-y-1">
                <Label htmlFor="visaExpiry" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Visa Expiry Date
                </Label>
                <Input
                  id="visaExpiry"
                  type="date"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                  {...register("visaExpiry")}
                />
              </div>

              {/* Passport Expiry Date */}
              <div className="space-y-1">
                <Label htmlFor="passportExpiry" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Passport Expiry Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="passportExpiry"
                  type="date"
                  className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400"
                  {...register("passportExpiry", { required: true })}
                />
                {errors.passportExpiry && <span className="text-[9px] text-rose-500 font-bold block">Passport expiry date is required</span>}
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
              3. Document Verification Uploads
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Passport copy */}
              <div className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 hover:bg-slate-50 transition-colors relative cursor-pointer min-h-24 ${passportCopy ? "border-emerald-400 bg-emerald-50/30" : "border-dashed border-slate-200"}`}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!validatePDF(file, "Passport Copy")) {
                        e.target.value = "";
                        return;
                      }
                      const url = await readAsDataURL(file);
                      setPassportCopy({ name: file.name, url });
                      toast.success(`Passport Copy attached`);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                />
                <UploadCloud className={`w-7 h-7 ${passportCopy ? "text-emerald-500" : "text-slate-400"}`} />
                <div>
                  <div className="text-[11px] font-bold text-slate-600">Passport Copy</div>
                  {passportCopy ? (
                    <span className="text-[8px] text-emerald-600 font-bold truncate block max-w-[120px]">{passportCopy.name}</span>
                  ) : (
                    <span className="text-[8px] text-slate-400">Click to upload</span>
                  )}
                </div>
                {passportCopy && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setPassportCopy(null); }} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Visa Page */}
              <div className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 hover:bg-slate-50 transition-colors relative cursor-pointer min-h-24 ${visaPage ? "border-emerald-400 bg-emerald-50/30" : "border-dashed border-slate-200"}`}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!validatePDF(file, "Visa Page Copy")) {
                        e.target.value = "";
                        return;
                      }
                      const url = await readAsDataURL(file);
                      setVisaPage({ name: file.name, url });
                      toast.success(`Visa Page attached`);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                />
                <UploadCloud className={`w-7 h-7 ${visaPage ? "text-emerald-500" : "text-slate-400"}`} />
                <div>
                  <div className="text-[11px] font-bold text-slate-600">Visa Page Copy</div>
                  {visaPage ? (
                    <span className="text-[8px] text-emerald-600 font-bold truncate block max-w-[120px]">{visaPage.name}</span>
                  ) : (
                    <span className="text-[8px] text-slate-400">Click to upload</span>
                  )}
                </div>
                {visaPage && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setVisaPage(null); }} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Applicant Photo */}
              <div className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 hover:bg-slate-50 transition-colors relative cursor-pointer min-h-24 overflow-hidden ${applicantPhoto ? "border-emerald-400 bg-emerald-50/30" : "border-dashed border-slate-200"}`}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (!validatePhoto(file)) {
                        e.target.value = "";
                        return;
                      }
                      const url = await readAsDataURL(file);
                      setApplicantPhoto({ name: file.name, url });
                      setPhoto(url);
                      toast.success("Photo uploaded");
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                />
                {applicantPhoto ? (
                  applicantPhoto.name.toLowerCase().endsWith(".pdf") || applicantPhoto.url.startsWith("data:application/pdf") ? (
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-8 h-8 text-rose-500 animate-pulse" />
                      <span className="text-[7px] text-slate-500 font-bold truncate max-w-[80px] block">{applicantPhoto.name}</span>
                    </div>
                  ) : (
                    <img src={applicantPhoto.url} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-emerald-200 shadow-sm" />
                  )
                ) : (
                  <UploadCloud className="w-7 h-7 text-slate-400" />
                )}
                <div>
                  <div className="text-[11px] font-bold text-slate-600">Applicant Photo</div>
                  {applicantPhoto ? (
                    <span className="text-[8px] text-emerald-600 font-bold">Attached</span>
                  ) : (
                    <span className="text-[8px] text-slate-400">Click to upload</span>
                  )}
                </div>
                {applicantPhoto && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setApplicantPhoto(null); setPhoto(null); }} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Other Documents Multiple Upload */}
            <div>
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Other Documents <span className="text-slate-400 normal-case font-semibold">(multiple files)</span>
              </Label>
              <label className="border-dashed border-2 border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 hover:bg-slate-50 transition-colors cursor-pointer min-h-20">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const validFiles = Array.from(files).filter(f => validatePDF(f, "Other Document"));
                      if (validFiles.length === 0) {
                        e.target.value = "";
                        return;
                      }
                      const items = await Promise.all(validFiles.map(async (f) => ({
                        name: f.name,
                        url: await readAsDataURL(f),
                        type: f.type || "application/pdf",
                      })));
                      setOtherDocs(prev => [...prev, ...items]);
                      toast.success(`${validFiles.length} file${validFiles.length > 1 ? "s" : ""} attached`);
                    }
                  }}
                />
                <UploadCloud className="w-6 h-6 text-slate-400" />
                <div className="text-[11px] font-bold text-slate-600">Click to add other documents</div>
                <span className="text-[8px] text-slate-400">PDF only (Max 5MB)</span>
              </label>
            </div>

            {/* List of attached other docs */}
            {otherDocs.length > 0 && (
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Other Documents ({otherDocs.length})
                </div>
                {otherDocs.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-slate-600 font-semibold bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setOtherDocs(otherDocs.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase border-b border-slate-100 pb-2">
              4. Corporate Company & Branch Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Own Company Assignment */}
              <div className="space-y-1">
                <Label htmlFor="ownCompany" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Our Company Assignment *
                </Label>
                <Select
                  value={selectedOwnCompany}
                  onValueChange={(val) => {
                    setSelectedOwnCompany(val || "");
                    const matchedBranches = branches.filter((b: any) => b.company === val);
                    setSelectedOwnBranch(matchedBranches.length > 0 ? matchedBranches[0].name : "");
                  }}
                  disabled={currentUser.role !== "Super Admin"}
                >
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10 text-left font-normal text-slate-700">
                    <SelectValue placeholder="Select Company *" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    {currentUser.role === "Super Admin" ? (
                      ownCompanies.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value={currentUser.company}>{currentUser.company}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch Assignment */}
              <div className="space-y-1">
                <Label htmlFor="ownBranch" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Branch Assignment *
                </Label>
                <Select
                  value={selectedOwnBranch}
                  onValueChange={(val) => setSelectedOwnBranch(val || "")}
                  disabled={currentUser.role === "Branch Admin"}
                >
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-10 text-left font-normal text-slate-700">
                    <SelectValue placeholder="Select Branch *" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">
                    {branches
                      .filter((b: any) => b.company === selectedOwnCompany)
                      .map(b => (
                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                      ))
                    }
                    {branches.filter((b: any) => b.company === selectedOwnCompany).length === 0 && (
                      <SelectItem value="Main Branch">Main Branch</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 select-none w-full pb-20 sm:pb-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full sm:w-auto text-xs font-semibold text-slate-500 rounded-xl px-4 py-2 border-slate-200 h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 gap-1.5 shadow-md shadow-blue-500/10"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
