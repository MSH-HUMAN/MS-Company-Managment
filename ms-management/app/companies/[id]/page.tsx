"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, MapPin, Phone, Mail, FileText, Download, Trash2, Plus, 
  ChevronRight, ArrowLeft, Globe, Eye, Users, Layers, ShieldCheck,
  Server, Lock, RefreshCw, Target
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { 
    companies, 
    branches, 
    applicants, 
    placements, 
    updateCompany, 
    addActivityLog, 
    currentUser,
    users,
    addUser,
    deleteUser
  } = useAuthStore();

  const company = companies.find(c => c.id === id);

  const [activeTab, setActiveTab] = useState("overview");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: "", email: "", mobile: "", role: "Company Admin" as "Company Admin" | "Branch Admin", branch: "All" });

  const [showDemandModal, setShowDemandModal] = useState(false);
  const [demandForm, setDemandForm] = useState({ title: "", headcount: 1, offeredSalary: "", status: "Open" as any });

  const handleDemandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!demandForm.title || !demandForm.offeredSalary) {
      toast.error("Title and salary are required");
      return;
    }
    const newDemand = {
      id: `DMD-${Date.now()}`,
      title: demandForm.title,
      headcount: Number(demandForm.headcount),
      offeredSalary: demandForm.offeredSalary,
      status: demandForm.status,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const updatedDemands = [...(company.jobDemands || []), newDemand];
    updateCompany({ ...company, jobDemands: updatedDemands });

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Created",
      module: "Companies",
      oldValue: null,
      newValue: `Added job demand: ${demandForm.headcount}x ${demandForm.title}`,
      ipAddress: "192.168.1.102"
    });

    toast.success("Job demand created successfully");
    setShowDemandModal(false);
    setDemandForm({ title: "", headcount: 1, offeredSalary: "", status: "Open" });
  };

  if (!company) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Client Company Details" showBack={true} />
        <div className="p-12">
          <EmptyState title="Company not found" description="The company you are trying to view does not exist or has been deleted." />
        </div>
      </div>
    );
  }

  const companyAdmins = users.filter(u => u.company === company.name && (u.role === "Company Admin" || u.role === "Branch Admin"));

  const handleQuickCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    if (!quickForm.name || !quickForm.email) {
      toast.error("Name and email are required");
      return;
    }
    const userId = `USR${String(Math.floor(100 + Math.random() * 900))}`;
    addUser({
      id: userId,
      name: quickForm.name,
      email: quickForm.email,
      mobile: quickForm.mobile,
      whatsapp: quickForm.mobile,
      role: quickForm.role,
      company: company.name,
      branch: quickForm.branch,
      status: "Active",
      lastLogin: "Never",
      photo: null,
      createdAt: new Date().toISOString().slice(0, 10),
    });

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Created",
      module: "Users",
      oldValue: null,
      newValue: `Created ${quickForm.role}: ${quickForm.name} for ${company.name}`,
      ipAddress: "192.168.1.102"
    });

    toast.success(`Admin user "${quickForm.name}" created successfully`);
    setShowQuickCreate(false);
    setQuickForm({ name: "", email: "", mobile: "", role: "Company Admin", branch: "All" });
  };

  // Filter linked data
  const companyBranches = branches.filter(b => b.companyId === id || b.company === company.name);
  const companyApplicants = applicants.filter(a => a.company === company.name);
  const companyPlacements = placements.filter(p => p.companyName === company.name);

  // Handle document upload
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newDocs = Array.from(files).map((file, i) => ({
        id: `DOC-COM-${Date.now()}-${i}`,
        name: file.name,
        uploadedBy: currentUser.name,
        uploadedDate: new Date().toISOString().slice(0, 10),
        type: file.name.split('.').pop() || "other"
      }));

      const updatedDocs = [...(company.documents || []), ...newDocs];
      updateCompany({ ...company, documents: updatedDocs });

      // Log activity
      addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Document Uploaded",
        module: "Companies",
        oldValue: company.name,
        newValue: `Uploaded ${files.length} doc(s) to company ${company.name}`,
        ipAddress: "192.168.1.102"
      });

      toast.success(`Uploaded ${files.length} document(s) successfully`);
    }
  };

  // Handle document delete
  const handleDocDelete = (docId: string, docName: string) => {
    const updatedDocs = (company.documents || []).filter(d => d.id !== docId);
    updateCompany({ ...company, documents: updatedDocs });

    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Deleted",
      module: "Companies",
      oldValue: docName,
      newValue: null,
      ipAddress: "192.168.1.102"
    });

    toast.success("Document removed");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title={company.name} 
        subtitle={`ID: ${company.id} · Created By: ${company.createdBy}`}
        showBack={true}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={company.status} />
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{companyBranches.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Branches Registered</div>
            </div>
          </Card>
          
          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{companyApplicants.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Linked Candidates</div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{companyPlacements.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Placements</div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{(company.jobDemands || []).filter(d => d.status === 'Open').length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Demands</div>
            </div>
          </Card>
        </div>

        {/* Tab System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto flex flex-wrap gap-1 text-xs">
            <TabsTrigger value="overview" className="rounded-lg py-2">Overview</TabsTrigger>
            <TabsTrigger value="demands" className="rounded-lg py-2">Job Demands ({(company.jobDemands || []).length})</TabsTrigger>
            <TabsTrigger value="branches" className="rounded-lg py-2">Branches ({companyBranches.length})</TabsTrigger>
            <TabsTrigger value="applicants" className="rounded-lg py-2">Candidates ({companyApplicants.length})</TabsTrigger>
            <TabsTrigger value="placements" className="rounded-lg py-2">Placements ({companyPlacements.length})</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg py-2">Documents ({(company.documents || []).length})</TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg py-2">Security & DB</TabsTrigger>
          </TabsList>

          {/* OVERVIEW CONTENT */}
          <TabsContent value="overview" className="pt-4 space-y-4">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Client Company Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Name</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Telephone</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.telephone || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HR Mobile</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.hrMobile || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Owner Mobile</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.ownerMobile || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">WhatsApp</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.whatsapp || "N/A"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Address</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.address || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Google Maps Location</span>
                    <div className="mt-1">
                      {company.googleMapLink ? (
                        <a 
                          href={company.googleMapLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-bold"
                        >
                          <MapPin className="w-3.5 h-3.5" /> View on Google Maps
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No Map Link Added</span>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3">Corporate & Trade License</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Company Type</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.companyType || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trade License Number</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.tradeLicenseNumber || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">License Issue Date</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.licenseIssueDate || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">License Expiry Date</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.licenseExpiryDate || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TRN Number</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.trnNumber || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Owner / Partner Name</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.ownerName || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Emirate Location</span>
                        <p className="text-xs font-bold text-slate-700 mt-1">{company.emirateLocation || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Additional Information</h3>
                <div className="pt-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Internal Notes / Memo</span>
                  <div className="mt-2 bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-medium text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {company.notes || "No internal notes have been registered for this company."}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* JOB DEMANDS CONTENT */}
          <TabsContent value="demands" className="pt-4">
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Job Demands & Vacancies</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Track roles requested by this client company.</p>
                </div>
                <Button 
                  onClick={() => setShowDemandModal(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Demand
                </Button>
              </div>

              {(!company.jobDemands || company.jobDemands.length === 0) ? (
                <div className="p-8">
                  <EmptyState title="No job demands" description="This client company has not requested any specific roles yet." />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Role / Title</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Headcount</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Offered Salary</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Created</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-semibold text-slate-700">
                    {company.jobDemands.map(d => (
                      <TableRow key={d.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-slate-400 font-bold">{d.id}</TableCell>
                        <TableCell className="font-bold text-slate-900">{d.title}</TableCell>
                        <TableCell>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {d.headcount} requested
                          </span>
                        </TableCell>
                        <TableCell>{d.offeredSalary}</TableCell>
                        <TableCell>{d.createdAt}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === "Open" ? "bg-amber-50 text-amber-600 border border-amber-100" : 
                            d.status === "Fulfilled" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                            "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}>
                            {d.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* BRANCHES CONTENT */}
          <TabsContent value="branches" className="pt-4">
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
              {companyBranches.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No branches found" description="There are no branches registered under this company." />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Branch Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Trade License</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Location</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Contact Person</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Phone</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Email</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Address</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-semibold text-slate-700">
                    {companyBranches.map(b => (
                      <TableRow key={b.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-slate-400 font-bold">{b.id}</TableCell>
                        <TableCell className="font-bold text-slate-900">{b.name}</TableCell>
                        <TableCell>{b.tradeLicenseNumber || "N/A"}</TableCell>
                        <TableCell>{b.location || "N/A"}</TableCell>
                        <TableCell>{b.contactPerson || "N/A"}</TableCell>
                        <TableCell>{b.phone}</TableCell>
                        <TableCell>{b.email}</TableCell>
                        <TableCell className="truncate max-w-[180px]">{b.address}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* APPLICANTS CONTENT */}
          <TabsContent value="applicants" className="pt-4">
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
              {companyApplicants.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No candidates found" description="No candidates are currently linked or pending placement with this company." />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Full Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Nationality</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Position Target</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-semibold text-slate-700">
                    {companyApplicants.map(a => (
                      <TableRow key={a.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-slate-400 font-bold">{a.id}</TableCell>
                        <TableCell className="font-bold text-slate-900">{a.fullName}</TableCell>
                        <TableCell className="gap-1.5 flex items-center mt-1">
                          <span>{a.nationalityFlag}</span>
                          <span>{a.nationality}</span>
                        </TableCell>
                        <TableCell>{a.applyingPositions.join(", ")}</TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                        <TableCell className="text-right">
                          <Link href={`/applicants/${a.id}`}>
                            <Button size="sm" variant="ghost" className="w-8 h-8 rounded-lg p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* PLACEMENTS CONTENT */}
          <TabsContent value="placements" className="pt-4">
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
              {companyPlacements.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No placement records" description="No successful placements have been finalized with this company." />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Candidate Name</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Position</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Placement Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Monthly Salary</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Agreement</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs font-semibold text-slate-700">
                    {companyPlacements.map(p => (
                      <TableRow key={p.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-slate-400 font-bold">{p.id}</TableCell>
                        <TableCell className="font-bold text-slate-900">{p.applicantName}</TableCell>
                        <TableCell>{p.position}</TableCell>
                        <TableCell>{p.placementDate}</TableCell>
                        <TableCell>AED {p.salary?.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.agreementStatus === "Signed" 
                              ? "bg-emerald-50 text-emerald-700"
                              : p.agreementStatus === "Sent"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {p.agreementStatus}
                          </span>
                        </TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-right">
                          <Link href="/placement">
                            <Button size="sm" variant="ghost" className="w-8 h-8 rounded-lg p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* DOCUMENTS CONTENT */}
          <TabsContent value="documents" className="pt-4 space-y-4">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Client Company Documents</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage licenses, contracts, and other corporate files.</p>
                </div>
                <div className="relative">
                  <Input 
                    type="file" 
                    multiple 
                    onChange={handleDocUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer h-9 w-full"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
                    <Plus className="w-4 h-4" /> Upload Document
                  </Button>
                </div>
              </div>

              {(!company.documents || company.documents.length === 0) ? (
                <EmptyState title="No documents" description="Upload legal licenses, VAT certs, or partnership contracts here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {company.documents.map(doc => (
                    <div 
                      key={doc.id} 
                      className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex items-center justify-between hover:bg-slate-50 hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate" title={doc.name}>{doc.name}</div>
                          <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            By {doc.uploadedBy} · {doc.uploadedDate}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast.success(`Downloading file: ${doc.name} (Simulated)`)}
                          className="w-8 h-8 rounded-lg p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDocDelete(doc.id, doc.name)}
                          className="w-8 h-8 rounded-lg p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* SECURITY & DB CONTENT */}
          <TabsContent value="security" className="pt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Database Isolation */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Server className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Database Isolation</h3>
                      <p className="text-[9px] text-slate-400 font-semibold">Separate company data & databases</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Instance Status</div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${company.separateDatabase !== false ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
                        {company.separateDatabase !== false ? "Dedicated Database Instance Isolated" : "Shared Schema (Filtered)"}
                      </div>
                      {company.separateDatabase !== false ? (
                        <div className="text-[10px] text-slate-400 mt-1">Schema name: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-600">db_company_{company.id.toLowerCase()}</code></div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-1">Data scope: <span className="font-bold text-blue-600">tenant_id = '{company.id}'</span></div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Database Type</Label>
                      <select 
                        value={company.separateDatabase !== false ? "postgres-isolated" : "shared"}
                        onChange={(e) => {
                          const isSep = e.target.value === "postgres-isolated";
                          updateCompany({ ...company, separateDatabase: isSep, databaseStatus: isSep ? "Ready" : "Not Provisioned" });
                          toast.success(`Database type changed to ${isSep ? "Isolated Schema" : "Shared Schema"}`);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 outline-none"
                      >
                        <option value="postgres-isolated">PostgreSQL (Dedicated Schema)</option>
                        <option value="shared">Shared Schema (Filtered)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Connection String</Label>
                      <Input disabled value={company.separateDatabase !== false ? `postgresql://db_user:pwd@aws-rds-cluster.internal:5432/db_company_${company.id.toLowerCase()}` : `postgresql://db_shared_user:pwd@aws-rds-cluster.internal:5432/shared_tenant_db`} className="bg-slate-100 font-mono text-[9px] text-slate-500 rounded-xl border-slate-200" />
                    </div>

                    <div className="pt-2">
                      <Button 
                        disabled={company.separateDatabase !== false}
                        onClick={() => {
                          toast.promise(
                            new Promise((resolve) => setTimeout(resolve, 2000)),
                            {
                              loading: 'Creating dedicated company database tables...',
                              success: 'Isolated database instance & tables provisioned successfully!',
                              error: 'Failed to provision separate database instance.',
                            }
                          );
                          setTimeout(() => {
                            updateCompany({ ...company, separateDatabase: true, databaseStatus: "Ready" });
                          }, 2000);
                          addActivityLog({
                            id: `LOG-${Date.now()}`,
                            dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                            userName: currentUser.name,
                            role: currentUser.role,
                            company: currentUser.company,
                            branch: currentUser.branch,
                            action: "Created",
                            module: "Companies",
                            oldValue: null,
                            newValue: `Provisioned isolated database for company ${company.name}`,
                            ipAddress: "192.168.1.102"
                          });
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 gap-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <RefreshCw className="w-4 h-4" /> {company.separateDatabase !== false ? "Database Provisioned" : "Provision Isolated Database"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column - Admins Management */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Admins & Key Staff</h3>
                        <p className="text-[9px] text-slate-400 font-semibold">Manage Company Admin and Branch Admin roles</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => {
                        setShowQuickCreate(true);
                      }} 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-8 px-3 gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Admin User
                    </Button>
                  </div>

                  {/* Admins Table */}
                  {companyAdmins.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-semibold">No Company Admins or Branch Admins assigned yet.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">User</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Role</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Branch</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs font-semibold text-slate-700">
                          {companyAdmins.map(u => (
                            <TableRow key={u.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-bold text-slate-900">
                                <div>{u.name}</div>
                                <div className="text-[9px] text-slate-400">{u.email}</div>
                              </TableCell>
                              <TableCell>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                  u.role === "Company Admin" ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-purple-50 border-purple-100 text-purple-700"
                                }`}>
                                  {u.role}
                                </span>
                              </TableCell>
                              <TableCell className="text-[10px]">{u.branch}</TableCell>
                              <TableCell>
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                                  u.status === "Active" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
                                }`}>
                                  {u.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete admin user "${u.name}"?`)) {
                                      deleteUser(u.id);
                                      addActivityLog({
                                        id: `LOG-${Date.now()}`,
                                        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
                                        userName: currentUser.name,
                                        role: currentUser.role,
                                        company: currentUser.company,
                                        branch: currentUser.branch,
                                        action: "Deleted",
                                        module: "Users",
                                        oldValue: u.name,
                                        newValue: null,
                                        ipAddress: "192.168.1.102"
                                      });
                                      toast.success("Admin user deleted");
                                    }
                                  }}
                                  className="w-8 h-8 rounded-lg p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Admin Create Dialog */}
      <Dialog open={showQuickCreate} onOpenChange={setShowQuickCreate}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={handleQuickCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Create Admin User</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Quickly add a Company Admin or Branch Admin dedicated to {company.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name *</Label>
                <Input required value={quickForm.name} onChange={e => setQuickForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Doe" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address *</Label>
                <Input type="email" required value={quickForm.email} onChange={e => setQuickForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number</Label>
                <Input value={quickForm.mobile} onChange={e => setQuickForm(f => ({ ...f, mobile: e.target.value }))} placeholder="+971 50 123 4567" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</Label>
                <select 
                  value={quickForm.role} 
                  onChange={e => setQuickForm(f => ({ ...f, role: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  <option value="Company Admin">Company Admin</option>
                  <option value="Branch Admin">Branch Admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scope (Branch)</Label>
                <select 
                  value={quickForm.branch} 
                  onChange={e => setQuickForm(f => ({ ...f, branch: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  {currentUser?.role === "Super Admin" && <option value="All">All Branches (Global)</option>}
                  {companyBranches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowQuickCreate(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Create Admin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Job Demand Dialog */}
      <Dialog open={showDemandModal} onOpenChange={setShowDemandModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md">
          <form onSubmit={handleDemandSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">Create Job Demand</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Log a new role vacancy requested by this client company.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role / Title *</Label>
                <Input required value={demandForm.title} onChange={e => setDemandForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Accountant" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Required Headcount *</Label>
                <Input type="number" min="1" required value={demandForm.headcount} onChange={e => setDemandForm(f => ({ ...f, headcount: parseInt(e.target.value) || 1 }))} className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Offered Salary Package *</Label>
                <Input required value={demandForm.offeredSalary} onChange={e => setDemandForm(f => ({ ...f, offeredSalary: e.target.value }))} placeholder="e.g. 5,000 AED + Transport" className="bg-white border-slate-200 rounded-xl text-xs h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                <select 
                  value={demandForm.status} 
                  onChange={e => setDemandForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold text-slate-700 outline-none"
                >
                  <option value="Open">Open (Looking for candidates)</option>
                  <option value="Fulfilled">Fulfilled (Closed)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowDemandModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Save Demand</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
