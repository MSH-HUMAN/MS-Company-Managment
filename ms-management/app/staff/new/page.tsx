"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { 
  User, 
  Briefcase, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Save, 
  X, 
  Key, 
  Sparkles,
  Building,
  MapPin,
  Calendar,
  Lock,
  FileCheck
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { NATIONALITIES } from "@/lib/constants";
import { Staff, Document, Role } from "@/lib/types";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import AccessDenied from "@/components/shared/AccessDenied";

interface StaffFormData {
  // Personal Info
  name: string;
  gender: string;
  birthday: string;
  nationality: string;
  mobile: string;
  whatsapp: string;
  email: string;
  address: string;

  // Employment Details
  employeeId: string;
  company: string;
  branch: string;
  department: string;
  position: string;
  employmentType: string;
  workMode: string;
  joiningDate: string;
  reportingManager: string;
  shiftId: string;

  // Identification
  emiratesId: string;
  passportNumber: string;
  passportExpiry: string;
  visaNumber: string;
  visaExpiry: string;
  tradeLicense: string;

  // Payroll
  salaryType: string;
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  overtimeEligible: string;
  overtimeRate: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  ibanSwift: string;

  // Role & Permissions
  role: string;
}

const STEPS = [
  { id: 1, name: "Personal", desc: "Basic details & contact", icon: User },
  { id: 2, name: "Employment", desc: "Role, dept & company", icon: Briefcase },
  { id: 3, name: "Identification", desc: "Passport, ID & visa", icon: ShieldCheck },
  { id: 4, name: "Payroll", desc: "Salary & bank details", icon: CreditCard },
  { id: 5, name: "Role & Access", desc: "Permissions matrix", icon: Lock },
  { id: 6, name: "Documents", desc: "Verification files", icon: FileText },
];

export default function NewStaffPage() {
  const router = useRouter();
  const { 
    addStaff, 
    addActivityLog, 
    currentUser, 
    currentRole, 
    ownCompanies, 
    branches, 
    roles, 
    shifts, 
    staff: existingStaffList,
    hasPermission 
  } = useAuthStore();

  const canCreate = hasPermission("staff", "create");
  if (!canCreate) {
    return <AccessDenied />;
  }

  // Active step in wizard (1-6)
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate Employee ID
  const generateNewEmpId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `EMP-${year}-${randomNum}`;
  };

  const [employeeId, setEmployeeId] = useState(generateNewEmpId());

  // Photos & Documents state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [realDocs, setRealDocs] = useState<Document[]>([]);

  // Custom document state
  const [customDocName, setCustomDocName] = useState("");
  const [customDocDetails, setCustomDocDetails] = useState("");

  // Custom permissions matrix override state
  const [customPermissions, setCustomPermissions] = useState<Record<string, any>>({});

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<StaffFormData>({
    defaultValues: {
      nationality: "India",
      gender: "Male",
      birthday: "1995-01-01",
      joiningDate: new Date().toISOString().slice(0, 10),
      employmentType: "Full Time",
      workMode: "Office",
      salaryType: "Monthly",
      basicSalary: "3000",
      housingAllowance: "1000",
      transportAllowance: "500",
      overtimeEligible: "Yes",
      overtimeRate: "15",
      company: currentUser.company,
      branch: currentUser.branch === "All" ? "" : currentUser.branch,
      role: "",
      department: "Human Resources",
      employeeId: employeeId
    }
  });

  const selectedCompany = watch("company");
  const selectedRoleName = watch("role");
  const selectedRole = roles.find((r: Role) => r.name === selectedRoleName);

  // Re-sync permissions matrix when selected role changes
  useEffect(() => {
    if (selectedRole && selectedRole.permissions) {
      setCustomPermissions(JSON.parse(JSON.stringify(selectedRole.permissions)));
    } else {
      setCustomPermissions({});
    }
  }, [selectedRoleName]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
        toast.success("Profile photo uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (docLabel: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newDoc: Document = {
        id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: file.name,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        type: docLabel
      };
      setRealDocs(prev => [...prev.filter(d => d.type !== docLabel), newDoc]);
      toast.success(`${docLabel} uploaded`);
    }
  };

  const handleCustomDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const docTitle = customDocName.trim() || file.name;
    const newDoc: Document = {
      id: `DOC-CUST-${Date.now()}`,
      name: docTitle,
      uploadedBy: currentUser.name,
      uploadedDate: new Date().toISOString().slice(0, 10),
      type: "Other Document",
      url: customDocDetails.trim() || undefined
    };
    setRealDocs(prev => [...prev, newDoc]);
    toast.success(`Custom document "${docTitle}" attached`);
    setCustomDocName("");
    setCustomDocDetails("");
  };

  // Validate current step fields before progressing
  const validateAndNextStep = async () => {
    let fieldsToValidate: (keyof StaffFormData)[] = [];
    if (activeStep === 1) {
      fieldsToValidate = ["name", "email", "mobile", "gender", "birthday", "nationality"];
    } else if (activeStep === 2) {
      fieldsToValidate = ["position", "joiningDate", "company", "branch"];
    } else if (activeStep === 3) {
      fieldsToValidate = []; // Passport & Visa optional (e.g. for remote staff)
    } else if (activeStep === 4) {
      fieldsToValidate = ["basicSalary", "salaryType"];
    }

    if (fieldsToValidate.length > 0) {
      const isStepValid = await trigger(fieldsToValidate);
      if (!isStepValid) {
        toast.error("Please fill in all required fields before proceeding.");
        return;
      }
    }

    if (activeStep < STEPS.length) {
      setActiveStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prevStep = () => {
    if (activeStep > 1) {
      setActiveStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onSubmit = async (data: StaffFormData) => {
    setIsSubmitting(true);
    const finalId = data.employeeId || employeeId || generateNewEmpId();
    
    const newStaff: Staff = {
      ...data,
      id: finalId,
      photo: photoBase64,
      status: "Active",
      nationalityFlag: NATIONALITIES.find(n => n.name === data.nationality)?.flag || "🏳️",
      company: currentRole === "Super Admin" ? (data.company || currentUser.company) : currentUser.company,
      branch: (currentRole === "Super Admin" || currentRole === "Company Admin") ? (data.branch || currentUser.branch) : currentUser.branch,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      documents: realDocs,
      basicSalary: data.basicSalary ? parseFloat(data.basicSalary) : 3000,
      housingAllowance: data.housingAllowance ? parseFloat(data.housingAllowance) : 1000,
      transportAllowance: data.transportAllowance ? parseFloat(data.transportAllowance) : 500,
      overtimeRate: data.overtimeRate ? parseFloat(data.overtimeRate) : 15,
      overtimeEligible: data.overtimeEligible === "Yes",
      shiftId: data.shiftId || "",
      salaryType: data.salaryType || "Monthly",
      permissions: Object.keys(customPermissions).length > 0 ? customPermissions : null
    };

    try {
      await addStaff(newStaff);
      addActivityLog({ 
        id: `LOG-${Date.now()}`, 
        dateTime: new Date().toISOString().replace("T"," ").slice(0,19), 
        userName: currentUser.name, 
        role: currentUser.role, 
        company: currentUser.company, 
        branch: currentUser.branch, 
        action: "Created", 
        module: "Staff", 
        oldValue: null, 
        newValue: `Created staff member: ${newStaff.name} (${newStaff.id})`, 
        ipAddress: "192.168.1.102" 
      });
      toast.success(`Staff member ${newStaff.name} (${newStaff.id}) created successfully!`);
      router.push("/staff");
    } catch (error: any) {
      toast.error(error.message || "Failed to create staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSystemAccess = Boolean(watch("role"));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full antialiased pb-36 sm:pb-12">
      {/* Header */}
      <PageHeader 
        title="Add New Staff Member" 
        subtitle="Complete employee registration, assign role permissions, and attach verification documents" 
        showBack 
      />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        
        {/* Stepper Progress Header */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[620px] sm:min-w-0">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = activeStep > step.id;
              const isCurrent = activeStep === step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (step.id < activeStep || isCompleted) {
                        setActiveStep(step.id);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2.5 text-left p-1.5 rounded-xl transition-all w-full",
                      isCurrent && "bg-blue-50/80 border border-blue-200/60",
                      isCompleted && "cursor-pointer hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-all shadow-xs",
                      isCompleted && "bg-emerald-500 text-white shadow-emerald-200",
                      isCurrent && "bg-blue-600 text-white shadow-blue-200 ring-2 ring-blue-100",
                      !isCompleted && !isCurrent && "bg-slate-100 text-slate-400 border border-slate-200"
                    )}>
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="hidden md:block overflow-hidden">
                      <div className={cn(
                        "text-xs font-bold truncate",
                        isCurrent && "text-blue-700",
                        isCompleted && "text-slate-800",
                        !isCurrent && !isCompleted && "text-slate-400"
                      )}>
                        Step {step.id}: {step.name}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">{step.desc}</div>
                    </div>
                  </button>

                  {idx < STEPS.length - 1 && (
                    <div className="h-0.5 w-6 sm:w-10 bg-slate-200 mx-1 shrink-0 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Main Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

          {/* STEP 1: PERSONAL INFORMATION */}
          {activeStep === 1 && (
            <Card className="rounded-2xl border border-slate-200 p-5 sm:p-7 bg-white shadow-xs space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Personal Information</h3>
                    <p className="text-[10px] text-slate-400">Enter staff personal contact and identification details</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Step 1 of 6</span>
              </div>

              {/* Profile Photo Uploader */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold overflow-hidden shrink-0 shadow-xs relative group">
                  {photoBase64 ? (
                    <img src={photoBase64} alt="Staff Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                  {photoBase64 && (
                    <button
                      type="button"
                      onClick={() => setPhotoBase64(null)}
                      className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <Label htmlFor="staffPhoto" className="text-xs font-bold text-slate-700">Staff Profile Photo</Label>
                  <p className="text-[10px] text-slate-400">Upload high-resolution JPG or PNG</p>
                  <div className="relative inline-block mt-1">
                    <Input id="staffPhoto" type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    <Button type="button" variant="outline" size="sm" className="text-xs font-bold rounded-xl h-9 border-slate-200 gap-1.5 bg-white">
                      <UploadCloud className="w-4 h-4 text-blue-600" /> Choose Photo
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {/* Full Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-700">Full Name <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Rahul Sharma" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                    {...register("name", { required: "Full name is required" })} 
                  />
                  {errors.name && <span className="text-[10px] text-rose-500 font-bold block">{errors.name.message}</span>}
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-bold text-slate-700">Gender <span className="text-rose-500">*</span></Label>
                  <select 
                    id="gender" 
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none" 
                    {...register("gender", { required: "Gender is required" })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="birthday" className="text-xs font-bold text-slate-700">Date of Birth <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="birthday" 
                    type="date" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("birthday", { required: "Date of birth is required" })} 
                  />
                  {errors.birthday && <span className="text-[10px] text-rose-500 font-bold block">{errors.birthday.message}</span>}
                </div>

                {/* Nationality */}
                <div className="space-y-1.5">
                  <Label htmlFor="nationality" className="text-xs font-bold text-slate-700">Nationality <span className="text-rose-500">*</span></Label>
                  <select 
                    id="nationality"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none" 
                    {...register("nationality", { required: "Nationality is required" })}
                  >
                    {NATIONALITIES.map(n => <option key={n.name} value={n.name}>{n.flag} {n.name}</option>)}
                  </select>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="mobile" className="text-xs font-bold text-slate-700">Mobile Number <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="mobile" 
                    placeholder="+971 50 123 4567" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("mobile", { required: "Mobile number is required" })} 
                  />
                  {errors.mobile && <span className="text-[10px] text-rose-500 font-bold block">{errors.mobile.message}</span>}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="staff@company.com" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("email", { required: "Email address is required" })} 
                  />
                  {errors.email && <span className="text-[10px] text-rose-500 font-bold block">{errors.email.message}</span>}
                </div>

                {/* WhatsApp Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp" className="text-xs font-bold text-slate-700">WhatsApp Number</Label>
                  <Input 
                    id="whatsapp" 
                    placeholder="+971 50 123 4567" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("whatsapp")} 
                  />
                </div>

                {/* Residential Address */}
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700">Residential Address</Label>
                  <Input 
                    id="address" 
                    placeholder="Street Address, Building, City, Country" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("address")} 
                  />
                </div>
              </div>
            </Card>
          )}

          {/* STEP 2: EMPLOYMENT DETAILS */}
          {activeStep === 2 && (
            <Card className="rounded-2xl border border-slate-200 p-5 sm:p-7 bg-white shadow-xs space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Employment Details</h3>
                    <p className="text-[10px] text-slate-400">Employee ID, designation, department and company assignment</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Step 2 of 6</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                
                {/* Employee ID (Auto Generate) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="employeeId" className="text-xs font-bold text-slate-700">Employee ID (Auto)</Label>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = generateNewEmpId();
                        setEmployeeId(newId);
                        setValue("employeeId", newId);
                        toast.info(`Regenerated Employee ID: ${newId}`);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </div>
                  <Input 
                    id="employeeId" 
                    value={watch("employeeId") || employeeId}
                    onChange={(e) => {
                      setEmployeeId(e.target.value);
                      setValue("employeeId", e.target.value);
                    }}
                    className="bg-slate-50 border-slate-200 rounded-xl text-xs h-10 font-bold font-mono text-blue-700" 
                  />
                </div>

                {/* Company Assignment */}
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs font-bold text-slate-700">Company <span className="text-rose-500">*</span></Label>
                  <select 
                    id="company"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    disabled={currentRole !== "Super Admin"}
                    {...register("company", { required: "Company is required" })}
                  >
                    <option value="">-- Select Company --</option>
                    {ownCompanies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  {errors.company && <span className="text-[10px] text-rose-500 font-bold block">{errors.company.message}</span>}
                </div>

                {/* Branch Assignment */}
                <div className="space-y-1.5">
                  <Label htmlFor="branch" className="text-xs font-bold text-slate-700">Branch <span className="text-rose-500">*</span></Label>
                  <select 
                    id="branch"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("branch", { required: "Branch is required" })}
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.filter(b => !selectedCompany || b.company === selectedCompany).map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  {errors.branch && <span className="text-[10px] text-rose-500 font-bold block">{errors.branch.message}</span>}
                </div>

                {/* Designation / Position */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="position" className="text-xs font-bold text-slate-700">Designation / Position <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="position" 
                    placeholder="e.g. Senior HR Manager" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("position", { required: "Designation is required" })} 
                  />
                  {errors.position && <span className="text-[10px] text-rose-500 font-bold block">{errors.position.message}</span>}
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs font-bold text-slate-700">Department</Label>
                  <select 
                    id="department"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("department")}
                  >
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance & Accounting">Finance & Accounting</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Administration">Administration</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="employmentType" className="text-xs font-bold text-slate-700">Employment Type</Label>
                  <select 
                    id="employmentType"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("employmentType")}
                  >
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                {/* Work Mode */}
                <div className="space-y-1.5">
                  <Label htmlFor="workMode" className="text-xs font-bold text-slate-700">Work Mode</Label>
                  <select 
                    id="workMode"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("workMode")}
                  >
                    <option value="Office">Office</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Joining Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="joiningDate" className="text-xs font-bold text-slate-700">Joining Date <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="joiningDate" 
                    type="date" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("joiningDate", { required: "Joining date is required" })} 
                  />
                  {errors.joiningDate && <span className="text-[10px] text-rose-500 font-bold block">{errors.joiningDate.message}</span>}
                </div>

                {/* Reporting Manager */}
                <div className="space-y-1.5">
                  <Label htmlFor="reportingManager" className="text-xs font-bold text-slate-700">Reporting Manager</Label>
                  <select 
                    id="reportingManager"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("reportingManager")}
                  >
                    <option value="">-- None / Direct --</option>
                    {existingStaffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.position})</option>
                    ))}
                  </select>
                </div>

                {/* Shift Assignment */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="shiftId" className="text-xs font-bold text-slate-700">Shift Assignment</Label>
                  <select 
                    id="shiftId"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("shiftId")}
                  >
                    <option value="">-- Standard Work Shift (09:00 AM - 06:00 PM) --</option>
                    {shifts.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime || s.clockIn || "09:00 AM"} - {s.endTime || s.clockOut || "06:00 PM"})
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            </Card>
          )}

          {/* STEP 3: IDENTIFICATION */}
          {activeStep === 3 && (
            <Card className="rounded-2xl border border-slate-200 p-5 sm:p-7 bg-white shadow-xs space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Identification & Visas</h3>
                    <p className="text-[10px] text-slate-400">Passport, Emirates ID, Visa and License verification details (Optional for remote staff)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Step 3 of 6</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                
                {/* NIC / Emirates ID */}
                <div className="space-y-1.5">
                  <Label htmlFor="emiratesId" className="text-xs font-bold text-slate-700">NIC / ID Number</Label>
                  <Input 
                    id="emiratesId" 
                    placeholder="784-XXXX-XXXXXXX-X" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("emiratesId")} 
                  />
                </div>

                {/* Passport Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="passportNumber" className="text-xs font-bold text-slate-700">Passport Number (Optional)</Label>
                  <Input 
                    id="passportNumber" 
                    placeholder="e.g. Z1234567 (Optional for Remote)" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500 font-mono" 
                    {...register("passportNumber")} 
                  />
                </div>

                {/* Passport Expiry Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="passportExpiry" className="text-xs font-bold text-slate-700">Passport Expiry Date (Optional)</Label>
                  <Input 
                    id="passportExpiry" 
                    type="date" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("passportExpiry")} 
                  />
                </div>

                {/* Visa Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="visaNumber" className="text-xs font-bold text-slate-700">Visa Number</Label>
                  <Input 
                    id="visaNumber" 
                    placeholder="e.g. 201/2026/XXXXXXX" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("visaNumber")} 
                  />
                </div>

                {/* Visa Expiry Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="visaExpiry" className="text-xs font-bold text-slate-700">Visa Expiry Date</Label>
                  <Input 
                    id="visaExpiry" 
                    type="date" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("visaExpiry")} 
                  />
                </div>

                {/* Trade License (Optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="tradeLicense" className="text-xs font-bold text-slate-700">Trade License (Optional)</Label>
                  <Input 
                    id="tradeLicense" 
                    placeholder="e.g. TL-99201" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("tradeLicense")} 
                  />
                </div>

              </div>
            </Card>
          )}

          {/* STEP 4: PAYROLL DETAILS */}
          {activeStep === 4 && (
            <Card className="rounded-2xl border border-slate-200 p-5 sm:p-7 bg-white shadow-xs space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Payroll & Banking Setup</h3>
                    <p className="text-[10px] text-slate-400">Basic salary, allowances, overtime and bank account details</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Step 4 of 6</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

                {/* Salary Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="salaryType" className="text-xs font-bold text-slate-700">Salary Type <span className="text-rose-500">*</span></Label>
                  <select 
                    id="salaryType"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("salaryType", { required: "Salary type is required" })}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Daily">Daily</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>

                {/* Basic Salary */}
                <div className="space-y-1.5">
                  <Label htmlFor="basicSalary" className="text-xs font-bold text-slate-700">Basic Salary (AED) <span className="text-rose-500">*</span></Label>
                  <Input 
                    id="basicSalary" 
                    type="number" 
                    placeholder="3000" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500 font-bold text-blue-700" 
                    {...register("basicSalary", { required: "Basic salary is required" })} 
                  />
                  {errors.basicSalary && <span className="text-[10px] text-rose-500 font-bold block">{errors.basicSalary.message}</span>}
                </div>

                {/* Housing Allowance */}
                <div className="space-y-1.5">
                  <Label htmlFor="housingAllowance" className="text-xs font-bold text-slate-700">Housing Allowance (AED)</Label>
                  <Input 
                    id="housingAllowance" 
                    type="number" 
                    placeholder="1000" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("housingAllowance")} 
                  />
                </div>

                {/* Transport Allowance */}
                <div className="space-y-1.5">
                  <Label htmlFor="transportAllowance" className="text-xs font-bold text-slate-700">Transport Allowance (AED)</Label>
                  <Input 
                    id="transportAllowance" 
                    type="number" 
                    placeholder="500" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("transportAllowance")} 
                  />
                </div>

                {/* Overtime Eligibility */}
                <div className="space-y-1.5">
                  <Label htmlFor="overtimeEligible" className="text-xs font-bold text-slate-700">Overtime Eligibility</Label>
                  <select 
                    id="overtimeEligible"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("overtimeEligible")}
                  >
                    <option value="Yes">Yes (Eligible for Overtime)</option>
                    <option value="No">No (Exempt)</option>
                  </select>
                </div>

                {/* Overtime Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="overtimeRate" className="text-xs font-bold text-slate-700">Overtime Hourly Rate (AED/hr)</Label>
                  <Input 
                    id="overtimeRate" 
                    type="number" 
                    placeholder="15" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("overtimeRate")} 
                  />
                </div>

                {/* Bank Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-xs font-bold text-slate-700">Bank Name</Label>
                  <Input 
                    id="bankName" 
                    placeholder="e.g. Emirates NBD, FAB, ADCB" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("bankName")} 
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber" className="text-xs font-bold text-slate-700">Account Number</Label>
                  <Input 
                    id="accountNumber" 
                    placeholder="12345678901" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500 font-mono" 
                    {...register("accountNumber")} 
                  />
                </div>

                {/* Account Holder Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="accountHolderName" className="text-xs font-bold text-slate-700">Account Holder Name</Label>
                  <Input 
                    id="accountHolderName" 
                    placeholder="Name as registered in bank" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500" 
                    {...register("accountHolderName")} 
                  />
                </div>

                {/* IBAN/SWIFT (Optional) */}
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="ibanSwift" className="text-xs font-bold text-slate-700">IBAN / SWIFT Code (Optional)</Label>
                  <Input 
                    id="ibanSwift" 
                    placeholder="AE030330000000000000000" 
                    className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-500 font-mono uppercase" 
                    {...register("ibanSwift")} 
                  />
                </div>

              </div>
            </Card>
          )}

          {/* STEP 5: ROLE & PERMISSIONS */}
          {activeStep === 5 && (
            <Card className="rounded-2xl border border-slate-200 p-5 sm:p-7 bg-white shadow-xs space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Role & System Access Permissions</h3>
                    <p className="text-[10px] text-slate-400">Assign role access and customize specific module permissions</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Step 5 of 6</span>
              </div>

              <div className="space-y-6">
                
                {/* Role Selector */}
                <div className="max-w-md space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-bold text-slate-700">System Role Assignment</Label>
                  <select 
                    id="role"
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-500 focus:outline-none"
                    {...register("role")}
                  >
                    <option value="">No System Access (Staff Only)</option>
                    {roles.map((r: Role) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Selecting a role automatically creates a user login account and dispatches credentials via email.
                  </p>
                </div>

                {hasSystemAccess && (
                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">Welcome Email & Temporary Password Auto-Dispatched</h4>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Upon saving, an automated Welcome Email with Employee ID ({watch("employeeId") || employeeId}), temporary password, and portal login link will be sent to <strong>{watch("email") || "the specified email"}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Company & Branch Scope info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Company Access</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" /> {watch("company") || currentUser.company}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Branch Access</span>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {watch("branch") || currentUser.branch || "Main Branch"}
                    </span>
                  </div>
                </div>

                {/* Permission Overrides Matrix */}
                {selectedRole && Object.keys(customPermissions).length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Custom Permission Overrides Matrix</h4>
                        <p className="text-[10px] text-slate-400">Override role default permissions for this individual staff profile</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomPermissions(JSON.parse(JSON.stringify(selectedRole.permissions)))}
                        className="text-[10px] font-bold rounded-lg h-7 border-slate-200 text-slate-600"
                      >
                        Reset to Role Defaults
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-extrabold">
                            <th className="py-2.5 pr-4">Module Name</th>
                            <th className="py-2.5 text-center w-16">View</th>
                            <th className="py-2.5 text-center w-16">Create</th>
                            <th className="py-2.5 text-center w-16">Edit</th>
                            <th className="py-2.5 text-center w-16">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {Object.entries(customPermissions).map(([moduleKey, perms]: [string, any]) => (
                            <tr key={moduleKey} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 pr-4 font-bold text-slate-700 capitalize">
                                {moduleKey.replace(/([A-Z])/g, ' $1').trim()}
                              </td>
                              {["view", "create", "edit", "delete"].map(action => (
                                <td key={action} className="py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(perms[action])}
                                    onChange={e => {
                                      setCustomPermissions(prev => ({
                                        ...prev,
                                        [moduleKey]: {
                                          ...prev[moduleKey],
                                          [action]: e.target.checked
                                        }
                                      }));
                                    }}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </Card>
          )}

          {/* STEP 6: DOCUMENTS UPLOAD & REVIEW */}
          {activeStep === 6 && (
            <Card className="rounded-2xl border border-slate-200 p-5 sm:p-7 bg-white shadow-xs space-y-6 animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Document Uploads & Final Verification</h3>
                    <p className="text-[10px] text-slate-400">Attach verification documents and review summary before creating staff member</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Step 6 of 6</span>
              </div>

              {/* Standard Document Upload Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  "CV / Resume", 
                  "Passport Copy", 
                  "NIC / Emirates ID", 
                  "Visa Copy", 
                  "Educational Certificates", 
                  "Experience Certificates"
                ].map(docLabel => {
                  const uploaded = realDocs.find(d => d.type === docLabel);
                  return (
                    <div key={docLabel} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 flex flex-col justify-between gap-3 text-center min-h-[140px] hover:border-blue-200 transition-colors">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{docLabel}</div>
                        <div className="text-[9px] font-semibold text-slate-400 mt-1 truncate">
                          {uploaded ? `✓ ${uploaded.name}` : "Not uploaded"}
                        </div>
                      </div>
                      <div className="relative">
                        <Input 
                          type="file" 
                          accept=".pdf,image/*" 
                          onChange={e => handleFileUpload(docLabel, e)} 
                          className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full" 
                        />
                        <Button 
                          type="button" 
                          variant={uploaded ? "default" : "outline"} 
                          className={cn(
                            "w-full text-xs font-bold rounded-xl h-9 border-slate-200 gap-1.5",
                            uploaded ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-white"
                          )}
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> {uploaded ? "Replace File" : "Upload File"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Other Document Uploader */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Attach Other Document</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500">Document Title</Label>
                    <Input 
                      value={customDocName} 
                      onChange={e => setCustomDocName(e.target.value)} 
                      placeholder="e.g. Police Clearance Certificate" 
                      className="bg-white border-slate-200 rounded-xl text-xs h-9" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500">Notes / Details</Label>
                    <Input 
                      value={customDocDetails} 
                      onChange={e => setCustomDocDetails(e.target.value)} 
                      placeholder="e.g. Verified original" 
                      className="bg-white border-slate-200 rounded-xl text-xs h-9" 
                    />
                  </div>
                  <div className="space-y-1 flex flex-col justify-end">
                    <div className="relative w-full">
                      <Input type="file" onChange={handleCustomDocUpload} className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full" />
                      <Button type="button" variant="outline" className="w-full text-xs font-bold rounded-xl h-9 border-slate-200 gap-1 bg-slate-900 text-white hover:bg-slate-800">
                        Upload Attachment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attached List */}
              {realDocs.length > 0 && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Attached Verification Documents ({realDocs.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {realDocs.map((doc, idx) => (
                      <div key={doc.id} className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                        <div className="truncate pr-2">
                          <span className="font-bold text-slate-800 block truncate">{doc.name}</span>
                          <span className="text-[9px] text-blue-600 font-bold uppercase">{doc.type}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setRealDocs(realDocs.filter((_, j) => j !== idx))} 
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 mt-4">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-600" /> Summary Review Before Submission
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Employee ID</span>
                    <span className="font-bold text-blue-700 font-mono">{watch("employeeId") || employeeId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Staff Name</span>
                    <span className="font-bold text-slate-800">{watch("name") || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Position</span>
                    <span className="font-bold text-slate-800">{watch("position") || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Basic Salary</span>
                    <span className="font-bold text-emerald-700">AED {watch("basicSalary") || 3000}</span>
                  </div>
                </div>
              </div>

            </Card>
          )}

          {/* Stepper Navigation Buttons Footer — Sticky on Mobile above BottomNav */}
          <div className="sticky bottom-16 sm:static z-40 bg-white/95 backdrop-blur-md p-3.5 sm:p-0 rounded-2xl sm:rounded-none border border-slate-200/80 sm:border-0 shadow-lg sm:shadow-none flex items-center justify-between gap-2.5 mt-4 transition-all">
            <div>
              {activeStep > 1 ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  className="text-xs font-bold rounded-xl px-3.5 sm:px-5 h-11 border-slate-200 gap-1.5 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> <span className="hidden xs:inline">Previous</span><span className="xs:hidden">Back</span>
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="text-xs font-bold rounded-xl px-4 h-11 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-xs"
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Mobile Step Indicator Pill */}
            <div className="sm:hidden text-center">
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                Step {activeStep} of {STEPS.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeStep < STEPS.length ? (
                <Button 
                  type="button" 
                  onClick={validateAndNextStep}
                  className="text-xs font-bold rounded-xl px-4 sm:px-6 h-11 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-md shadow-blue-200 active:scale-95 transition-all"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="text-xs font-bold rounded-xl px-5 sm:px-7 h-11 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Create Staff
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
