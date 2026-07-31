"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, RefreshCw, Save } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useAuthStore } from "@/store/authStore";

interface EmailTemplate {
  id: string;
  templateName: string;
  subject: string;
  body: string;
  isEnabled: boolean;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const { currentUser: user } = useAuthStore();
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (user && user.role !== "Super Admin") {
      router.push("/dashboard");
    } else {
      fetchTemplates();
    }
  }, [user, router]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/email-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/email-templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          isEnabled: editingTemplate.isEnabled,
        })
      });
      if (!res.ok) throw new Error("Failed to save template");
      
      toast.success("Template saved successfully");
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (templateName: string) => {
    if (!confirm(`Are you sure you want to restore ${templateName} to default? This will overwrite your changes.`)) return;
    try {
      setIsRestoring(true);
      const res = await fetch("/api/email-templates/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName })
      });
      if (!res.ok) throw new Error("Failed to restore template");
      
      toast.success("Template restored to default");
      if (editingTemplate) setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      <div className="flex-none p-4 md:p-6 border-b bg-white">
        <PageHeader title="Email Templates" />
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.templateName}</CardTitle>
                    <CardDescription className="line-clamp-1 mt-1">{template.subject}</CardDescription>
                  </div>
                  <Badge variant={template.isEnabled ? "default" : "secondary"}>
                    {template.isEnabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button variant="outline" className="w-full" onClick={() => setEditingTemplate(template)}>
                    Edit Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border rounded-lg bg-white">
              No templates loaded into database yet. They will automatically sync on first send, or you can trigger a sync manually.
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="w-[95vw] sm:w-full max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Template: {editingTemplate?.templateName}</DialogTitle>
            <DialogDescription>
              Use Handlebars variables like {"{{recipientName}}"} or {"{{companyName}}"}.
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2 min-h-0">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enabled" 
                  checked={editingTemplate.isEnabled} 
                  onCheckedChange={(c) => setEditingTemplate({ ...editingTemplate, isEnabled: c })}
                />
                <Label htmlFor="enabled">Enable this email notification</Label>
              </div>

              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input 
                  value={editingTemplate.subject} 
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2 flex-1">
                <Label>HTML Body</Label>
                <Textarea 
                  className="min-h-[400px] font-mono text-sm"
                  value={editingTemplate.body} 
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => editingTemplate && handleRestore(editingTemplate.templateName)}
              disabled={isRestoring}
            >
              {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Restore Default
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
