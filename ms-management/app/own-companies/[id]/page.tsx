"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, Phone, Mail, ArrowLeft, Users, Layers, ShieldCheck, Calendar, Database, MapPin
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import AccessDenied from "@/components/shared/AccessDenied";

export default function OwnCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { ownCompanies, branches, currentRole } = useAuthStore();

  if (currentRole !== "Super Admin") {
    return <AccessDenied />;
  }

  const company = ownCompanies.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState("overview");

  if (!company) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="SaaS Tenant Details" showBack={true} />
        <div className="p-12">
          <EmptyState title="Tenant not found" description="The agency you are trying to view does not exist or has been deleted." />
        </div>
      </div>
    );
  }

  const companyBranches = branches.filter(b => b.company === company.name);
  const isExpired = new Date(company.licenseExpiry) < new Date();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Tenant Details" 
        showBack={true}
        subtitle={`Viewing details for ${company.name}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={company.status} />
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={`rounded-2xl border ${isExpired ? 'border-rose-100 bg-rose-50/50 text-rose-600' : 'border-slate-100 bg-white text-indigo-600'} p-4 shadow-sm flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpired ? 'bg-rose-100' : 'bg-indigo-50'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{company.subscriptionPlan} Tier</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isExpired ? 'Expired License' : 'Active Subscription'}</div>
            </div>
          </Card>

          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{companyBranches.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Branches</div>
            </div>
          </Card>
          
          <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{company.staff}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Internal Staff</div>
            </div>
          </Card>
        </div>

        {/* Tab System */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl w-full sm:w-auto flex flex-wrap gap-1 text-xs">
            <TabsTrigger value="overview" className="rounded-lg py-2">Overview</TabsTrigger>
            <TabsTrigger value="subscription" className="rounded-lg py-2">Subscription & Limits</TabsTrigger>
            <TabsTrigger value="branches" className="rounded-lg py-2">Branches ({companyBranches.length})</TabsTrigger>
          </TabsList>

          {/* OVERVIEW CONTENT */}
          <TabsContent value="overview" className="pt-4 space-y-4">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">Our Company Profile</h3>
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
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Address</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.address || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Date</span>
                    <p className="text-xs font-bold text-slate-700 mt-1">{company.createdAt}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* SUBSCRIPTION CONTENT */}
          <TabsContent value="subscription" className="pt-4">
            <Card className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">SaaS License & Quotas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                  <div className={`p-4 rounded-xl border ${isExpired ? 'bg-rose-50 border-rose-100' : 'bg-indigo-50 border-indigo-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'text-rose-400' : 'text-indigo-400'}`}>Plan Tier</span>
                    <p className={`text-lg font-black mt-1 ${isExpired ? 'text-rose-700' : 'text-indigo-700'}`}>{company.subscriptionPlan}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isExpired ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>License Expiry</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Calendar className={`w-4 h-4 ${isExpired ? 'text-rose-500' : 'text-slate-600'}`} />
                      <p className={`text-sm font-bold ${isExpired ? 'text-rose-700' : 'text-slate-700'}`}>{company.licenseExpiry}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Users Quota</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users className="w-4 h-4 text-slate-600" />
                      <p className="text-sm font-bold text-slate-700">{company.staff} / {company.maxUsers} Users</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Storage Quota</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Database className="w-4 h-4 text-slate-600" />
                      <p className="text-sm font-bold text-slate-700">0 / {company.maxStorage} GB</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* BRANCHES CONTENT */}
          <TabsContent value="branches" className="pt-4">
            <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Agency Branches</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Manage operating locations for this tenant.</p>
              </div>

              {companyBranches.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No branches" description="This agency has no branches registered." />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {companyBranches.map(branch => (
                    <div key={branch.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800">{branch.name}</span>
                        <StatusBadge status={branch.status} />
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5" /> {branch.address}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {branch.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
