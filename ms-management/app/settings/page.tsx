"use client";

import { useState, useEffect } from "react";
import {
  Save, Building, Paintbrush, Globe, Mail, Phone, MapPin,
  CheckCircle2, ShieldAlert, Share2, ToggleLeft, ToggleRight, FileText
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { MODULES_LIST } from "@/lib/constants";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";
import { applyThemeCssVars } from "@/lib/applyTheme";

const COMPANY_SPECIFIC_MODULES = [
  "Applicants", "Staff", "Tasks", "Interviews", "Leave Requests", "Staff Requests",
  "Vehicles", "Documents", "Attendance", "Payroll", "Placement Agreements",
  "Suppliers", "Members", "Visa Expiry", "Staff Birthdays", "Reports"
];

export default function SettingsPage() {
  const { currentRole, companies, updateCompany, siteSettings, updateSiteSettings, addActivityLog, currentUser, hasPermission } = useAuthStore();

  const canView = hasPermission("settings", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  const [form, setForm] = useState({
    siteName:     siteSettings.siteName || "",
    email:        siteSettings.email || "",
    phone:        siteSettings.phone || "",
    whatsapp:     siteSettings.whatsapp || "",
    address:      siteSettings.address || "",
    footerText:   siteSettings.footerText || "",
    primaryColor: siteSettings.primaryColor || "#3B82F6",
    sidebarColor: siteSettings.sidebarColor || "#0A0F1C",
    backgroundColor: siteSettings.backgroundColor || "#f8fafc",
    cardColor:    siteSettings.cardColor || "#ffffff",
    textColor:    siteSettings.textColor || "#0f172a",
    borderColor:  siteSettings.borderColor || "#e2e8f0",
    buttonColor:  siteSettings.buttonColor || "#3b82f6",
    headerColor:  siteSettings.headerColor || "#ffffff",
    fontFamily:   siteSettings.fontFamily || "Inter",
    linkedin:     siteSettings.linkedin || "",
    twitter:      siteSettings.twitter || "",
    facebook:     siteSettings.facebook || "",
    instagram:    siteSettings.instagram || "",
    website:      siteSettings.website || "",
    placementTerms: siteSettings.placementTerms || "",
    refundPolicy: siteSettings.refundPolicy || "",
    replacementPolicy: siteSettings.replacementPolicy || "",
    candidateDeclaration: siteSettings.candidateDeclaration || "",
    consultancyDeclaration: siteSettings.consultancyDeclaration || "",
    companyLicense: siteSettings.companyLicense || "",
    companyWebsite: siteSettings.companyWebsite || "",
    printFooter: siteSettings.printFooter || "",
    terms: "",
    privacyPolicy: ""
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState(companies[0]?.id || "");
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // Build module enabled state for selected company
  const getEnabledModules = () => {
    const defaults: Record<string, boolean> = {};
    COMPANY_SPECIFIC_MODULES.forEach(m => { defaults[m] = true; });
    return { ...defaults, ...(selectedCompany?.enabledModules || {}) };
  };
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(getEnabledModules());

  const handleCompanyChange = (id: string) => {
    setSelectedCompanyId(id);
    const comp = companies.find(c => c.id === id);
    const defaults: Record<string, boolean> = {};
    COMPANY_SPECIFIC_MODULES.forEach(m => { defaults[m] = true; });
    setModuleToggles({ ...defaults, ...(comp?.enabledModules || {}) });
  };

  const handleToggleModule = (mod: string) => {
    setModuleToggles(prev => ({ ...prev, [mod]: !prev[mod] }));
  };

  const handleSaveModules = () => {
    if (!selectedCompany) return;
    updateCompany({ ...selectedCompany, enabledModules: moduleToggles });
    toast.success(`Module settings saved for "${selectedCompany.name}"`);
  };

  const isSuperAdmin = currentRole === "Super Admin";

  // Live theme preview — apply colors to CSS variables whenever the form
  // color fields change. This gives instant visual feedback on both desktop
  // and mobile without requiring a Save action first.
  useEffect(() => {
    applyThemeCssVars({
      primaryColor:     form.primaryColor,
      sidebarColor:     form.sidebarColor,
      backgroundColor:  form.backgroundColor,
      cardColor:        form.cardColor,
      textColor:        form.textColor,
      borderColor:      form.borderColor,
      buttonColor:      form.buttonColor,
      headerColor:      form.headerColor,
      fontFamily:       form.fontFamily,
    });
  }, [
    form.primaryColor, form.sidebarColor, form.backgroundColor,
    form.cardColor, form.textColor, form.borderColor,
    form.buttonColor, form.headerColor, form.fontFamily
  ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) { toast.error("Only Super Admin can save settings"); return; }
    updateSiteSettings({
      siteName:     form.siteName,
      email:        form.email,
      phone:        form.phone,
      whatsapp:     form.whatsapp,
      address:      form.address,
      footerText:   form.footerText,
      primaryColor: form.primaryColor,
      sidebarColor: form.sidebarColor,
      backgroundColor: form.backgroundColor,
      cardColor:    form.cardColor,
      textColor:    form.textColor,
      borderColor:  form.borderColor,
      buttonColor:  form.buttonColor,
      headerColor:  form.headerColor,
      fontFamily:   form.fontFamily,
      linkedin:     form.linkedin,
      twitter:      form.twitter,
      facebook:     form.facebook,
      instagram:    form.instagram,
      logo:         siteSettings.logo,
      website:      form.website,
      placementTerms: form.placementTerms,
      refundPolicy: form.refundPolicy,
      replacementPolicy: form.replacementPolicy,
      candidateDeclaration: form.candidateDeclaration,
      consultancyDeclaration: form.consultancyDeclaration,
      companyLicense: form.companyLicense,
      companyWebsite: form.companyWebsite,
      printFooter: form.printFooter
    });
    addActivityLog({
      id: `LOG-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      userName: currentUser.name,
      role: currentUser.role,
      company: currentUser.company,
      branch: currentUser.branch,
      action: "Edited",
      module: "Site Settings",
      oldValue: null,
      newValue: `Site settings updated by ${currentUser.name}`,
      ipAddress: "192.168.1.102",
    });
    toast.success("Settings saved and theme applied successfully!");
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PageHeader title="Site Settings" />
        <div className="p-12 w-[95vw] sm:w-full max-w-2xl mx-auto w-full">
          <Card className="rounded-2xl border-amber-200 bg-amber-50 p-8 text-center flex flex-col items-center shadow-sm">
            <ShieldAlert className="w-12 h-12 text-amber-500 mb-4"/>
            <h2 className="text-lg font-bold text-amber-800 mb-2">Access Restricted</h2>
            <p className="text-sm text-amber-700">You do not have permission to view or modify system settings. Please contact a Super Admin.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Global Settings" subtitle="Configure platform-wide settings, branding, and per-company modules"
        actions={<Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Save className="w-4 h-4"/>Save Configuration</Button>}
      />

      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 w-[95vw] sm:w-full max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 pb-32 md:pb-6">
        {/* Sticky nav sidebar */}
        <div className="hidden lg:block space-y-1.5 sticky top-24">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Settings Menu</div>
          {[
            { href: "#general", icon: <Building className="w-4 h-4 inline mr-2"/>, label: "General" },
            { href: "#appearance", icon: <Paintbrush className="w-4 h-4 inline mr-2"/>, label: "Appearance Studio" },
            { href: "#contact", icon: <Globe className="w-4 h-4 inline mr-2"/>, label: "Contact Info" },
            { href: "#social", icon: <Share2 className="w-4 h-4 inline mr-2"/>, label: "Social Media" },
            { href: "#placement-legal", icon: <FileText className="w-4 h-4 inline mr-2"/>, label: "Placement Agreement settings" },
            { href: "#legal", icon: <FileText className="w-4 h-4 inline mr-2"/>, label: "Legal Templates" },
            { href: "#modules", icon: <ToggleRight className="w-4 h-4 inline mr-2"/>, label: "Module Toggles" },
          ].map((item, i) => (
            <a key={i} href={item.href}
              className={`block px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${i === 1 ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}>
              {item.icon}{item.label}
            </a>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">

          {/* General */}
          <Card id="general" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600"/> General Settings
            </h3>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Site / System Name</Label>
                <Input value={form.siteName} onChange={e => setForm(f => ({...f, siteName: e.target.value}))} className="bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Footer Text</Label>
                <Input value={form.footerText} onChange={e => setForm(f => ({...f, footerText: e.target.value}))} className="bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
              </div>
            </div>
          </Card>

          {/* Appearance */}
          <Card id="appearance" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-blue-600"/> Appearance & Theme Studio
            </h3>
            
            <div className="space-y-6 pt-2">
              {/* Font Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Global System Font</Label>
                <select
                  value={form.fontFamily}
                  onChange={e => setForm(f => ({...f, fontFamily: e.target.value}))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-10 px-3 font-semibold text-slate-700 focus:border-blue-400 focus:bg-white transition-all"
                >
                  {["Inter", "Roboto", "Poppins", "Outfit", "DM Sans", "Montserrat", "Plus Jakarta Sans", "Nunito"].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Color Customization Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Primary Theme Color", key: "primaryColor" },
                  { label: "Secondary Theme Color", key: "buttonColor" },
                  { label: "Sidebar Color", key: "sidebarColor" },
                  { label: "Header Color", key: "headerColor" },
                  { label: "Background Color", key: "backgroundColor" },
                  { label: "Card Color", key: "cardColor" },
                  { label: "Text Color", key: "textColor" },
                  { label: "Border Color", key: "borderColor" },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
                    <div className="flex gap-2">
                      <input type="color" value={(form as any)[key]}
                        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                        className="w-11 h-11 rounded-xl cursor-pointer border border-slate-200 p-0 overflow-hidden" />
                      <Input value={(form as any)[key]}
                        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                        className="bg-slate-50 border-slate-200 rounded-xl font-mono text-xs h-11 uppercase flex-1" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Live Preview Component */}
              <div className="border border-slate-100 rounded-2xl p-4 space-y-3" style={{ background: form.backgroundColor }}>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Live Dynamic Theme Preview</div>
                <div className="p-4 rounded-xl border space-y-3" style={{ background: form.cardColor, borderColor: form.borderColor }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: form.textColor, fontFamily: form.fontFamily }}>Theme Preview Card</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: form.primaryColor }}>Active Accent</span>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed" style={{ color: form.textColor, opacity: 0.8, fontFamily: form.fontFamily }}>
                    This card previews the background, typography, borders, and cards dynamically as you pick settings.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="text-[10px] font-bold py-1.5 px-3 rounded-lg text-white transition-all shadow-sm hover:opacity-90" style={{ background: form.buttonColor, fontFamily: form.fontFamily }}>
                      Button Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Info */}
          <Card id="contact" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600"/> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Support Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Contact</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500"/>
                  <Input value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500"/>
                  <Input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Main Office Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-4 w-4 h-4 text-slate-400"/>
                  <textarea rows={2} value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
                    className="w-full pl-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold p-3 outline-none focus:bg-white focus:border-blue-400 resize-none" />
                </div>
              </div>
            </div>
          </Card>

          {/* Social Media Links */}
          <Card id="social" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-600"/> Social Media Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                { label: "LinkedIn", key: "linkedin", icon: <Globe className="w-4 h-4 text-[#0077b5]"/>, placeholder: "https://linkedin.com/company/..." },
                { label: "Twitter / X", key: "twitter", icon: <Mail className="w-4 h-4 text-[#1da1f2]"/>, placeholder: "https://twitter.com/..." },
                { label: "Facebook", key: "facebook", icon: <Share2 className="w-4 h-4 text-[#1877f2]"/>, placeholder: "https://facebook.com/..." },
                { label: "Instagram", key: "instagram", icon: <CheckCircle2 className="w-4 h-4 text-[#e1306c]"/>, placeholder: "https://instagram.com/..." },
              ].map(({ label, key, icon, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
                    <Input
                      value={(form as any)[key]}
                      onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
                      placeholder={placeholder}
                      className="pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm h-11 focus:bg-white focus:border-blue-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Placement Agreement Legal settings */}
          <Card id="placement-legal" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600"/> Placement Agreement Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company License / Trade License</Label>
                <Input value={form.companyLicense} onChange={e => setForm(f => ({...f, companyLicense: e.target.value}))} placeholder="2013854/FZE" className="bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company Print Website</Label>
                <Input value={form.companyWebsite} onChange={e => setForm(f => ({...f, companyWebsite: e.target.value}))} placeholder="www.mshorizon.ae" className="bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Print Footer Text</Label>
                <Input value={form.printFooter} onChange={e => setForm(f => ({...f, printFooter: e.target.value}))} placeholder="MS Horizon F.Z.E - Recruitment Consultancy Placement Agreement" className="bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Candidate Declaration</Label>
                <textarea rows={2} value={form.candidateDeclaration} onChange={e => setForm(f => ({...f, candidateDeclaration: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold p-3 outline-none focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Consultancy Declaration</Label>
                <textarea rows={2} value={form.consultancyDeclaration} onChange={e => setForm(f => ({...f, consultancyDeclaration: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold p-3 outline-none focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Refund Policy (Agreement Clauses)</Label>
                <textarea rows={3} value={form.refundPolicy} onChange={e => setForm(f => ({...f, refundPolicy: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold p-3 outline-none focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Replacement Policy (Agreement Clauses)</Label>
                <textarea rows={3} value={form.replacementPolicy} onChange={e => setForm(f => ({...f, replacementPolicy: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold p-3 outline-none focus:bg-white focus:border-blue-400" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Default Placement Terms & Conditions</Label>
                <textarea rows={6} value={form.placementTerms} onChange={e => setForm(f => ({...f, placementTerms: e.target.value}))} className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold p-3 outline-none focus:bg-white focus:border-blue-400" />
              </div>
            </div>
          </Card>

          <Card id="legal" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600"/> Legal & Compliance
            </h3>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Terms and Conditions</Label>
                <textarea
                  value={form.terms}
                  onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:bg-white focus:border-blue-400 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Privacy Policy</Label>
                <textarea
                  value={form.privacyPolicy}
                  onChange={e => setForm(f => ({ ...f, privacyPolicy: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
          </Card>

          {/* Legal Templates */}
          <Card id="legal" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600"/> Legal Templates & Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-4 h-4"/></div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Placement Agreement Terms</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Manage the dynamic terms and conditions for placement agreements.</p>
                  </div>
                </div>
                <Link href="/settings/placement-terms" className="mt-auto">
                  <Button variant="outline" className="w-full text-xs h-9 rounded-xl font-bold bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700">Manage Terms</Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Per-Company Module Toggles */}
          <Card id="modules" className="rounded-2xl border-slate-100 p-6 bg-white shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ToggleRight className="w-4 h-4 text-blue-600"/> Per-Company Module Access
              </h3>
              <Button onClick={handleSaveModules} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-8 px-4 gap-1.5">
                <Save className="w-3.5 h-3.5"/>Save
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold -mt-1">
              Enable or disable specific modules per company. Disabled modules are hidden from that company's users.
            </p>

            {/* Company picker */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Company</Label>
              <select
                value={selectedCompanyId}
                onChange={e => handleCompanyChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs h-10 px-3 focus:border-blue-400 font-semibold text-slate-700"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Module grid toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              {COMPANY_SPECIFIC_MODULES.map(mod => {
                const enabled = moduleToggles[mod] !== false;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleToggleModule(mod)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                      enabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <span>{mod}</span>
                    {enabled
                      ? <ToggleRight className="w-5 h-5 text-emerald-500 flex-shrink-0"/>
                      : <ToggleLeft className="w-5 h-5 text-slate-300 flex-shrink-0"/>
                    }
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm px-8 h-12 shadow-md gap-2">
              <CheckCircle2 className="w-5 h-5"/> Apply All Settings
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}




