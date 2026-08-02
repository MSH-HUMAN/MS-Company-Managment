"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Save, UploadCloud, Plus, X } from "lucide-react";
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

interface FormData {
  name: string; email: string; mobile: string; whatsapp: string;
  birthday: string; gender: string; nationality: string; position: string;
  joiningDate: string; passportNumber: string; passportExpiry: string;
  visaExpiry: string; emiratesId: string;
  company?: string; branch?: string; role?: string;
  basicSalary: string;
  overtimeRate: string;
  housingAllowance: string;
  transportAllowance: string;
  shiftId: string;
  salaryType: string;
}

export default function NewStaffPage() {
  const router = useRouter();
  const { addStaff, addActivityLog, currentUser, currentRole, ownCompanies, companies, branches, roles, shifts, hasPermission } = useAuthStore();

  const canCreate = hasPermission("staff", "create");
  if (!canCreate) {
    return <AccessDenied />;
  }
  
  // Real documents array
  const [realDocs, setRealDocs] = useState<Document[]>([]);
  // Base64 photo string
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // Custom document form states
  const [customDocName, setCustomDocName] = useState("");
  const [customDocDetails, setCustomDocDetails] = useState("");

  const [customPermissions, setCustomPermissions] = useState<Record<string, any>>({});

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { 
      nationality: "India", position: "", joiningDate: "2026-06-04", birthday: "1995-01-01",
      gender: "Male",
      company: currentUser.company, branch: currentUser.branch === "All" ? "" : currentUser.branch, role: ""
    }
  });

  const selectedCompany = watch("company");
  const allAvailableCompanies = [...ownCompanies];
  const selectedRoleName = watch("role");
  const selectedRole = roles.find((r: Role) => r.name === selectedRoleName);

  useState(() => {
    if (selectedRole) {
      setCustomPermissions(JSON.parse(JSON.stringify(selectedRole.permissions)));
    } else {
      setCustomPermissions({});
    }
  });

  // Re-sync default permissions when selected role name changes
  const lastRoleRef = useState(selectedRoleName);
  if (lastRoleRef[0] !== selectedRoleName) {
    lastRoleRef[1](selectedRoleName);
    if (selectedRole) {
      setCustomPermissions(JSON.parse(JSON.stringify(selectedRole.permissions)));
    } else {
      setCustomPermissions({});
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
        toast.success("Profile photo uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newDoc: Document = {
        id: `D-${Date.now()}-${Math.floor(Math.random()*100)}`,
        name: file.name,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        type: label
      };
      setRealDocs(prev => [...prev, newDoc]);
      toast.success(`${label} file uploaded`);
    }
  };

  const handleCustomDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nameToUse = customDocName.trim() || file.name;
    const newDoc: Document = {
      id: `D-CUST-${Date.now()}`,
      name: nameToUse,
      uploadedBy: currentUser.name,
      uploadedDate: new Date().toISOString().slice(0, 10),
      type: "Other",
      url: customDocDetails.trim() || undefined
    };
    setRealDocs(prev => [...prev, newDoc]);
    toast.success(`Custom document "${nameToUse}" attached`);
    setCustomDocName("");
    setCustomDocDetails("");
  };

  const onSubmit = async (data: FormData) => {
    const id = `STF${String(Math.floor(100 + Math.random() * 900))}`;
    const newStaff: Staff = {
      ...data, 
      id, 
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
      shiftId: data.shiftId || "",
      salaryType: data.salaryType || "Monthly",
      permissions: Object.keys(customPermissions).length > 0 ? customPermissions : null
    };
    try {
      await addStaff(newStaff);
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Staff", oldValue: null, newValue: `Created staff: ${newStaff.name}`, ipAddress: "192.168.1.102" });
      toast.success(`Staff member ${newStaff.name} added successfully`);
      router.push("/staff");
    } catch (error: any) {
      toast.error(error.message || "Failed to add staff member");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Add New Staff Member" subtitle="Register employee details and upload verification documents" showBack />
      <div className="p-4 md:p-6 w-[95vw] sm:w-full max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Personal Information</h3>
            
            {/* Photo upload */}
            <div className="flex flex-col sm:flex-row gap-4 items-center border-b border-slate-50 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 font-bold overflow-hidden shadow-inner flex-shrink-0">
                {photoBase64 ? <img src={photoBase64} className="w-full h-full object-cover" /> : "Photo"}
              </div>
              <div className="space-y-1.5 flex-1 w-full">
                <Label htmlFor="staffPhoto" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Staff Profile Photo</Label>
                <Input id="staffPhoto" type="file" accept="image/*" onChange={handlePhotoUpload} className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "name", label: "Full Name", req: true, placeholder: "Rahul Kumar" },
                { id: "birthday", label: "Date of Birth", req: true, type: "date" },
                { id: "email", label: "Email Address", req: true, type: "email", placeholder: "staff@company.com" },
                { id: "mobile", label: "Mobile Number", req: true, placeholder: "+971501234567" },
                { id: "whatsapp", label: "WhatsApp Number", placeholder: "+971501234567" },
                { id: "position", label: "Job Position", req: true, placeholder: "HR Manager" },
                { id: "joiningDate", label: "Joining Date", req: true, type: "date" },
              ].map(f => (
                <div key={f.id} className="space-y-1">
                  <Label htmlFor={f.id} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{f.label} {f.req && <span className="text-rose-500">*</span>}</Label>
                  <Input id={f.id} type={(f as any).type || "text"} placeholder={(f as any).placeholder} className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" {...register(f.id as any, f.req ? { required: `${f.label} is required` } : {})} />
                  {errors[f.id as keyof FormData] && (
                    <span className="text-[9px] text-rose-500 font-bold block">
                      {errors[f.id as keyof FormData]?.message}
                    </span>
                  )}
                </div>
              ))}
              
              {/* Gender selection */}
              <div className="space-y-1">
                <Label htmlFor="gender" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gender <span className="text-rose-500">*</span></Label>
                <select
                  id="gender"
                  className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 font-semibold text-slate-700"
                  {...register("gender", { required: "Gender is required" })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="text-[9px] text-rose-500 font-bold block">{errors.gender.message}</span>}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nationality <span className="text-rose-500">*</span></Label>
                <select className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400" {...register("nationality", { required: true })}>
                  {NATIONALITIES.map(n => <option key={n.name} value={n.name}>{n.flag} {n.name}</option>)}
                </select>
              </div>
            </div>

            {(currentRole === "Super Admin" || currentRole === "Company Admin") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                {currentRole === "Super Admin" ? (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Assignment *</Label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400" {...register("company", { required: "Company is required" })}>
                      <option value="">-- Select Company --</option>
                      {allAvailableCompanies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    {errors.company && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.company.message}</p>}
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch Assignment *</Label>
                  <select className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400" {...register("branch", { required: "Branch is required" })}>
                    <option value="">-- Select Branch --</option>
                    {branches.filter(b => {
                      if (selectedCompany) {
                        return b.company === selectedCompany;
                      }
                      if (currentRole === "Super Admin") {
                        return true; // Show all branches for Super Admin if no company is selected
                      }
                      return b.company === currentUser.company;
                    }).map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  {errors.branch && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.branch.message}</p>}
                </div>
              </div>
            )}
          </Card>

          {/* Salary & Shift Setup Card */}
          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Salary & Shift Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Salary Type <span className="text-rose-500">*</span></Label>
                <select className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 focus:outline-none" {...register("salaryType", { required: "Salary type is required" })}>
                  <option value="Monthly">Monthly</option>
                  <option value="Daily">Daily</option>
                  <option value="Hourly">Hourly</option>
                </select>
                {errors.salaryType && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.salaryType.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="basicSalary" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Basic Salary / Rate (AED) <span className="text-rose-500">*</span></Label>
                <Input id="basicSalary" type="number" defaultValue={3000} className={cn("bg-white border-slate-200 rounded-xl text-xs h-10", errors.basicSalary && "border-rose-500 focus:ring-rose-100")} {...register("basicSalary", { required: "Salary cannot be empty" })} />
                {errors.basicSalary && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.basicSalary.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="overtimeRate" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overtime Hourly Rate (AED/hr) <span className="text-rose-500">*</span></Label>
                <Input id="overtimeRate" type="number" defaultValue={15} className={cn("bg-white border-slate-200 rounded-xl text-xs h-10", errors.overtimeRate && "border-rose-500 focus:ring-rose-100")} {...register("overtimeRate", { required: "Overtime rate required" })} />
                {errors.overtimeRate && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.overtimeRate.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="housingAllowance" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Housing Allowance (AED)</Label>
                <Input id="housingAllowance" type="number" defaultValue={1000} className="bg-white border-slate-200 rounded-xl text-xs h-10" {...register("housingAllowance")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="transportAllowance" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transport Allowance (AED)</Label>
                <Input id="transportAllowance" type="number" defaultValue={500} className="bg-white border-slate-200 rounded-xl text-xs h-10" {...register("transportAllowance")} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift Assignment</Label>
                <select className={cn("w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 focus:outline-none", errors.shiftId && "border-rose-500")} {...register("shiftId")}>
                  <option value="">-- Assign a Shift --</option>
                  {(currentRole === "Super Admin" ? shifts : shifts.filter((s: any) => s.company === (selectedCompany || currentUser.company))).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                  ))}
                </select>
                {errors.shiftId && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.shiftId.message}</p>}
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">System Access & Permissions</h3>
            <div className="space-y-4">
              <div className="space-y-1 w-[95vw] sm:w-full max-w-sm">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Role</Label>
                <select className="w-full bg-white border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400" {...register("role")}>
                  <option value="">No System Access</option>
                  {roles.map((r: Role) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Select a role if this staff member needs to login to the system.</p>
              </div>

              {selectedRole && Object.keys(customPermissions).length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-700 uppercase">Custom Permission Overrides Matrix</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Customize specific access rights for this employee profile.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                          <th className="py-2 pr-4">Module</th>
                          <th className="py-2 text-center w-16">View</th>
                          <th className="py-2 text-center w-16">Create</th>
                          <th className="py-2 text-center w-16">Edit</th>
                          <th className="py-2 text-center w-16">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold">
                        {Object.entries(customPermissions).map(([module, perms]: [string, any]) => (
                          <tr key={module} className="text-slate-700">
                            <td className="py-2 pr-4 font-bold capitalize">{module.replace(/([A-Z])/g, ' $1').trim()}</td>
                            {["view", "create", "edit", "delete"].map(action => (
                              <td key={action} className="py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={Boolean(perms[action])}
                                  onChange={e => {
                                    setCustomPermissions(prev => ({
                                      ...prev,
                                      [module]: {
                                        ...prev[module],
                                        [action]: e.target.checked
                                      }
                                    }));
                                  }}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
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

          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Identity & Visa Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: "passportNumber", label: "Passport Number", req: true, placeholder: "P1234567" },
                { id: "emiratesId", label: "Emirates ID", placeholder: "784-XXXX-XXXXXXX-X" },
                { id: "passportExpiry", label: "Passport Expiry", req: true, type: "date" },
                { id: "visaExpiry", label: "Visa Expiry Date", type: "date" },
              ].map(f => (
                <div key={f.id} className="space-y-1">
                  <Label htmlFor={f.id} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{f.label} {f.req && <span className="text-rose-500">*</span>}</Label>
                  <Input id={f.id} type={(f as any).type || "text"} placeholder={(f as any).placeholder} className="bg-white border-slate-200 rounded-xl text-xs h-10 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" {...register(f.id as any, f.req ? { required: `${f.label} is required` } : {})} />
                  {errors[f.id as keyof FormData] && (
                    <span className="text-[9px] text-rose-500 font-bold block">
                      {errors[f.id as keyof FormData]?.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Document Uploads</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {["Passport Copy", "Emirates ID", "Visa Copy", "Labour Contract"].map(docType => (
                <div key={docType} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between gap-3 text-center min-h-[140px]">
                  <div>
                    <div className="text-[10px] font-bold text-slate-700">{docType}</div>
                    <div className="text-[8px] font-semibold text-slate-400 mt-1">
                      {realDocs.find(d => d.type === docType)?.name || "Not uploaded yet"}
                    </div>
                  </div>
                  <div className="relative">
                    <Input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(docType, e)} className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full" />
                    <Button type="button" variant="outline" className="w-full text-[10px] font-bold rounded-xl h-9 border-slate-200 gap-1 bg-white">
                      <UploadCloud className="w-3.5 h-3.5 text-slate-400"/> Upload
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom general other document upload */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upload Other Custom Document</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Document Name</Label>
                  <Input value={customDocName} onChange={e => setCustomDocName(e.target.value)} placeholder="e.g. Health Certificate" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Other Details / Notes</Label>
                  <Input value={customDocDetails} onChange={e => setCustomDocDetails(e.target.value)} placeholder="e.g. Verified copy" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <div className="relative w-full">
                    <Input type="file" onChange={handleCustomDocUpload} className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full" />
                    <Button type="button" variant="outline" className="w-full text-[10px] font-bold rounded-xl h-9 border-slate-200 gap-1 bg-slate-900 text-white hover:bg-slate-800">
                      Select & Upload
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Attached documents list */}
            {realDocs.length > 0 && (
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-4">
                <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Attached Files ({realDocs.length})</div>
                {realDocs.map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                    <div className="truncate pr-3">
                      <span className="font-bold text-slate-800">{d.name}</span>
                      <span className="text-[8px] text-slate-400 font-bold ml-1.5 uppercase bg-slate-100 border border-slate-200 px-1 py-0.25 rounded">{d.type}</span>
                      {d.url && <span className="text-[8px] text-slate-400 italic block mt-0.5">{d.url}</span>}
                    </div>
                    <button type="button" onClick={() => setRealDocs(realDocs.filter((_, j) => j !== i))} className="text-rose-500 hover:text-rose-700"><X className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 select-none w-full pb-20 sm:pb-0">
            <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto text-xs font-semibold rounded-xl px-4 h-10 border-slate-200">Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10 gap-1.5 shadow-md"><Save className="w-4 h-4" /> Save Staff Member</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
