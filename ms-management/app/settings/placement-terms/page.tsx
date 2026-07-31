"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2, Edit2, Save, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

type PlacementTerm = {
  id: string;
  title: string;
  content: string;
  order: number;
  isActive: boolean;
};

export default function PlacementTermsSettings() {
  const { currentRole } = useAuthStore();
  const [terms, setTerms] = useState<PlacementTerm[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "", isActive: true });

  const fetchTerms = async () => {
    try {
      const res = await fetch("/api/placement-terms");
      if (res.ok) {
        const data = await res.json();
        setTerms(data);
      }
    } catch (e) {
      toast.error("Failed to fetch terms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const handleSave = async () => {
    try {
      if (editingId === "NEW") {
        const res = await fetch("/api/placement-terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editForm, order: terms.length })
        });
        if (res.ok) {
          toast.success("Term added successfully");
          setEditingId(null);
          fetchTerms();
        }
      } else if (editingId) {
        const res = await fetch(`/api/placement-terms/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm)
        });
        if (res.ok) {
          toast.success("Term updated successfully");
          setEditingId(null);
          fetchTerms();
        }
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this term?")) return;
    try {
      const res = await fetch(`/api/placement-terms/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Term deleted");
        fetchTerms();
      }
    } catch (e) {
      toast.error("Failed to delete term");
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newTerms = [...terms];
    const temp = newTerms[index].order;
    newTerms[index].order = newTerms[index - 1].order;
    newTerms[index - 1].order = temp;
    
    // Sort visually
    newTerms.sort((a, b) => a.order - b.order);
    setTerms(newTerms);

    // Save to DB
    await fetch("/api/placement-terms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTerms)
    });
  };

  const moveDown = async (index: number) => {
    if (index === terms.length - 1) return;
    const newTerms = [...terms];
    const temp = newTerms[index].order;
    newTerms[index].order = newTerms[index + 1].order;
    newTerms[index + 1].order = temp;
    
    newTerms.sort((a, b) => a.order - b.order);
    setTerms(newTerms);

    await fetch("/api/placement-terms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTerms)
    });
  };

  if (currentRole !== "Super Admin") {
    return <div className="p-12 text-center">Access Restricted</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
      <PageHeader 
        title="Placement Agreement Terms" 
        subtitle="Manage dynamic terms & conditions for the legal agreement print layout"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" className="h-9 rounded-xl text-xs gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
              </Button>
            </Link>
            <Button onClick={() => { setEditingId("NEW"); setEditForm({ title: "", content: "", isActive: true }); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 rounded-xl text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add New Term
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        {editingId && (
          <Card className="p-5 border-blue-200 bg-blue-50/50 shadow-sm rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800">{editingId === "NEW" ? "Add New Term" : "Edit Term"}</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Clause Title</Label>
                <Input value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} className="bg-white rounded-xl" placeholder="e.g. Registration Fee Refund" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Clause Content</Label>
                <textarea 
                  rows={5}
                  value={editForm.content} 
                  onChange={e => setEditForm(f => ({...f, content: e.target.value}))} 
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="Enter the full legal text here..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditingId(null)} className="rounded-xl h-9 text-xs">Cancel</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-9 text-xs gap-1.5"><Save className="w-3.5 h-3.5" /> Save Term</Button>
              </div>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>
        ) : terms.length === 0 ? (
          <div className="text-center p-12 text-slate-400 font-medium">No terms added yet. Click "Add New Term" to begin.</div>
        ) : (
          <div className="space-y-2">
            {terms.map((term, index) => (
              <Card key={term.id} className="p-4 flex items-start gap-4 hover:shadow-md transition-shadow rounded-2xl">
                <div className="flex flex-col gap-1 items-center justify-center shrink-0 text-slate-300">
                  <button onClick={() => moveUp(index)} disabled={index === 0} className="hover:text-blue-600 disabled:opacity-30">▲</button>
                  <GripVertical className="w-4 h-4" />
                  <button onClick={() => moveDown(index)} disabled={index === terms.length - 1} className="hover:text-blue-600 disabled:opacity-30">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">{index + 1}. {term.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{term.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingId(term.id); setEditForm({ title: term.title, content: term.content, isActive: term.isActive }); }} className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(term.id)} className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
