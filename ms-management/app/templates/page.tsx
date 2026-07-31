"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, LayoutTemplate, Edit, Trash2, Mail } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

export default function TemplatesPage() {
  const { currentRole } = useAuthStore();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/templates/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Template deleted successfully");
        setTemplates(prev => prev.filter(t => t.id !== deleteId));
      } else {
        toast.error("Failed to delete template");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while deleting");
    } finally {
      setDeleteId(null);
    }
  };

  const seedDefaults = async () => {
    toast.loading("Seeding default templates...");
    const defaults = [
      { templateName: "Applicant Registration Confirmation", subject: "Welcome to {{companyName}}", body: "Hello {{applicantName}},<br><br>Your registration is confirmed. We will reach out soon.", type: "Email" },
      { templateName: "Interview Invitation", subject: "Interview Invitation for {{position}}", body: "Dear {{applicantName}},<br><br>You are invited to an interview for {{position}} on {{date}}.", type: "Email" },
      { templateName: "Placement Confirmation", subject: "Placement Confirmed - {{companyName}}", body: "Congratulations {{applicantName}}, your placement at {{assignedCompany}} is confirmed.", type: "Email" }
    ];
    
    for (const t of defaults) {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t)
      });
    }
    toast.dismiss();
    toast.success("Default templates created!");
    fetchTemplates();
  };

  if (currentRole !== "Super Admin") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Template Management" />
        <div className="p-12"><EmptyState title="Access Restricted" description="You do not have permission to view the template management module. Contact your Super Admin." /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <PageHeader 
        title="Template Management" 
        subtitle="Manage email and system notification templates dynamically"
        actions={
          <div className="flex gap-2">
            <Button onClick={seedDefaults} variant="outline" className="h-9 text-xs rounded-xl border-slate-200">
              Seed Defaults
            </Button>
            <Link href="/templates/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
                <Plus className="w-4 h-4"/> Create Template
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <EmptyState 
            title="No Templates Found" 
            description="Start by creating a new template or seeding the defaults." 
            icon={<LayoutTemplate className="w-10 h-10 text-slate-300" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                      {t.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{t.templateName}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">Subject: {t.subject || "N/A"}</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  <Link href={`/templates/${t.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] h-8 gap-1"><Edit className="w-3 h-3"/> Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl px-2 h-8">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onOpenChange={open => !open && setDeleteId(null)} 
        onConfirm={handleDelete} 
        title="Delete Template" 
        description="Are you sure you want to delete this template? This may break system emails relying on this template name." 
        confirmText="Delete" 
        variant="danger" 
      />
    </div>
  );
}
