"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Lock, Phone, Mail, Building, MapPin, Shield, Camera, 
  Eye, EyeOff, Save, Key, UserCheck, CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { currentUser, currentRole, updateUser, addActivityLog } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"details" | "security">("details");

  // Profile details form state
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name || "",
    mobile: currentUser.mobile || "",
    whatsapp: currentUser.whatsapp || "",
    photo: currentUser.photo || null as string | null
  });

  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, photo: reader.result as string }));
        toast.success("Photo uploaded! Click Save to apply changes.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      await updateUser({
        ...currentUser,
        name: profileForm.name.trim(),
        mobile: profileForm.mobile,
        whatsapp: profileForm.whatsapp,
        photo: profileForm.photo
      });

      await addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Edited",
        module: "Profile Settings",
        oldValue: `Name: ${currentUser.name}`,
        newValue: `Updated profile details for self`,
        ipAddress: "127.0.0.1"
      });

      toast.success("Profile details updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSaving(true);
    try {
      // Send PUT request to update the user with the new password
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentUser,
          password: passwordForm.newPassword
        })
      });

      if (!response.ok) {
        throw new Error("Password change failed");
      }

      await addActivityLog({
        id: `LOG-${Date.now()}`,
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: currentUser.name,
        role: currentUser.role,
        company: currentUser.company,
        branch: currentUser.branch,
        action: "Password Reset",
        module: "Profile Settings",
        oldValue: null,
        newValue: `${currentUser.name} reset their own password`,
        ipAddress: "127.0.0.1"
      });

      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <PageHeader 
        title="My Profile" 
        subtitle="Manage your personal details and account security settings"
      />

      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 w-[95vw] sm:w-full max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 pb-32 md:pb-6">
        
        {/* Left Card: Summary & Badges */}
        <div className="md:col-span-1 space-y-6">
          <Card className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            {/* Soft Ambient Glow */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            
            <div className="relative mt-4">
              <Avatar className="w-24 h-24 rounded-2xl border-4 border-slate-50 shadow-md">
                {profileForm.photo ? (
                  <AvatarImage src={profileForm.photo} className="object-cover rounded-2xl" />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-blue-100 text-blue-700 font-black text-3xl">
                  {currentUser.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="photo-upload" className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-2 cursor-pointer shadow-lg transition-transform hover:scale-105">
                <Camera className="w-4 h-4" />
                <input 
                  id="photo-upload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            <h3 className="text-base font-bold text-slate-800 mt-5 leading-tight">{currentUser.name}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">{currentUser.email}</p>

            <div className="w-full border-t border-slate-100 my-5" />

            <div className="w-full space-y-3.5 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" /> Role
                </span>
                <span className="font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-0.5 text-[10px] uppercase">
                  {currentRole}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> Company
                </span>
                <span className="font-semibold text-slate-700 max-w-[140px] truncate" title={currentUser.company}>
                  {currentUser.company}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Branch
                </span>
                <span className="font-semibold text-slate-700">
                  {currentUser.branch}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" /> Status
                </span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-0.5 text-[10px] uppercase">
                  {currentUser.status}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Card: Tabs & Actions */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-100 p-1 rounded-2xl flex max-w-xs select-none">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
                activeTab === "details"
                  ? "bg-white shadow-sm text-blue-600 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <User className="w-3.5 h-3.5" />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={cn(
                "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5",
                activeTab === "security"
                  ? "bg-white shadow-sm text-blue-600 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Lock className="w-3.5 h-3.5" />
              Security
            </button>
          </div>

          {/* Tab 1: Profile Details */}
          {activeTab === "details" && (
            <Card className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-blue-600" /> Edit Profile Details
              </h3>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</Label>
                    <Input 
                      value={profileForm.name} 
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address (Read-only)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        value={currentUser.email} 
                        readOnly 
                        className="pl-10 bg-slate-100 border-slate-200 text-slate-500 rounded-xl text-sm font-semibold h-11 cursor-not-allowed select-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        value={profileForm.mobile} 
                        onChange={e => setProfileForm(f => ({ ...f, mobile: e.target.value }))}
                        className="pl-10 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <Input 
                        value={profileForm.whatsapp} 
                        onChange={e => setProfileForm(f => ({ ...f, whatsapp: e.target.value }))}
                        className="pl-10 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 px-6 gap-1.5 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    Save Details
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tab 2: Security & Password */}
          {activeTab === "security" && (
            <Card className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
                <Key className="w-4 h-4 text-blue-600" /> Change Password
              </h3>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Min 6 characters"
                        className="pl-10 pr-10 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                        className="pl-10 pr-10 bg-slate-50 border-slate-200 rounded-xl text-sm font-semibold h-11 focus:bg-white focus:border-blue-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] text-slate-500 font-semibold leading-relaxed">
                  ⚠️ Password requirement: Make sure your password has a minimum length of 6 characters and is unique to prevent unauthorized portal access.
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-10 px-6 gap-1.5 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Reset Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

        </div>

      </div>
    </div>
  );
}
