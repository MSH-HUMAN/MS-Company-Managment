"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, LayoutTemplate, Palette, Eye } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

export default function TemplateEditor() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { currentRole } = useAuthStore();
  const isNew = id === "new";

  const [form, setForm] = useState({
    templateName: "",
    subject: "",
    body: "",
    headerDesign: "",
    footerContent: "",
    type: "Email",
    isEnabled: true
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

  useEffect(() => {
    if (!isNew) fetchTemplate();
  }, [id, isNew]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          templateName: data.templateName || "",
          subject: data.subject || "",
          body: data.body || "",
          headerDesign: data.headerDesign || "",
          footerContent: data.footerContent || "",
          type: data.type || "Email",
          isEnabled: data.isEnabled
        });
      }
    } catch (err) {
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.templateName) {
      toast.error("Template Name is required");
      return;
    }
    setSaving(true);
    try {
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/templates" : `/api/templates/${id}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast.success("Template saved successfully");
        if (isNew) {
          router.push("/templates");
        }
      } else {
        toast.error("Failed to save template");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (currentRole !== "Super Admin") {
    return <div className="p-12 text-center">Access Restricted</div>;
  }

  if (loading) return <div className="p-12 text-center">Loading editor...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <PageHeader 
        title={isNew ? "Create Template" : "Edit Template"} 
        subtitle="Design and configure your email or system template"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/templates")} className="h-9 text-xs rounded-xl gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5">
              <Save className="w-4 h-4"/> {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="w-fit mb-4 bg-slate-200 p-1 rounded-xl">
            <TabsTrigger value="edit" className="rounded-lg text-xs flex items-center gap-1.5"><LayoutTemplate className="w-3.5 h-3.5"/> Editor</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-lg text-xs flex items-center gap-1.5"><Eye className="w-3.5 h-3.5"/> Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 space-y-4 outline-none">
            <Card className="p-5 rounded-2xl shadow-sm border-slate-200 space-y-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Template Name *</Label>
                  <Input value={form.templateName} onChange={e => setForm(f => ({ ...f, templateName: e.target.value }))} placeholder="e.g. Applicant Registration Confirmation" className="rounded-xl text-xs bg-slate-50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Email Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Welcome to {{companyName}}" className="rounded-xl text-xs bg-slate-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  <span>Body Content (HTML allowed)</span>
                  <span className="text-[9px] text-slate-400 normal-case font-normal">Variables: {'{{applicantName}}'}, {'{{companyName}}'}, {'{{brandColor}}'}, etc.</span>
                </Label>
                <textarea 
                  value={form.body} 
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))} 
                  className="w-full min-h-[300px] p-3 rounded-xl border border-slate-200 text-sm font-mono bg-slate-50 focus:border-blue-500 outline-none resize-y" 
                  placeholder="<p>Dear {{applicantName}},</p>"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Custom Header (Optional)</Label>
                  <textarea value={form.headerDesign} onChange={e => setForm(f => ({ ...f, headerDesign: e.target.value }))} className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Custom Footer (Optional)</Label>
                  <textarea value={form.footerContent} onChange={e => setForm(f => ({ ...f, footerContent: e.target.value }))} className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isEnabled" checked={form.isEnabled} onChange={e => setForm(f => ({ ...f, isEnabled: e.target.checked }))} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                <Label htmlFor="isEnabled" className="text-sm font-bold text-slate-700 cursor-pointer">Enable this template</Label>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 outline-none">
            <Card className="p-0 overflow-hidden rounded-2xl shadow-sm border-slate-200 bg-white">
              {/* Fake Email Client Wrapper */}
              <div className="bg-slate-100 border-b border-slate-200 p-3 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <div className="flex-1 text-center text-xs text-slate-500 font-semibold">{form.subject.replace('{{companyName}}', 'MS Horizon F.Z.E') || "No Subject"}</div>
              </div>
              <div className="p-8 md:p-12 bg-slate-50 min-h-[500px] flex justify-center">
                
                {/* Email Body Preview Container */}
                <div className="w-full max-w-[600px] bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100">
                  {/* Dynamic Header */}
                  <div className="h-2" style={{ backgroundColor: "#3b82f6" }}></div>
                  <div className="p-6 md:p-8">
                    {/* Header inject */}
                    {form.headerDesign ? (
                      <div dangerouslySetInnerHTML={{ __html: form.headerDesign }} />
                    ) : (
                      <div className="mb-8">
                        <div className="w-32 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 font-bold mb-4">[Company Logo]</div>
                      </div>
                    )}

                    {/* Body inject */}
                    <div 
                      className="prose prose-sm prose-slate max-w-none text-slate-700" 
                      dangerouslySetInnerHTML={{ 
                        __html: form.body
                          .replace(/\{\{applicantName\}\}/g, 'John Doe')
                          .replace(/\{\{companyName\}\}/g, 'MS Horizon F.Z.E')
                          .replace(/\{\{brandColor\}\}/g, '#3b82f6')
                          .replace(/\{\{position\}\}/g, 'Software Engineer')
                          .replace(/\{\{date\}\}/g, 'October 12, 2026')
                      }} 
                    />
                    
                    {/* Footer inject */}
                    {form.footerContent ? (
                      <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500" dangerouslySetInnerHTML={{ __html: form.footerContent }} />
                    ) : (
                      <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
                        <p>&copy; {new Date().getFullYear()} [Company Name]. All rights reserved.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
