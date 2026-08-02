'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Briefcase, Calendar, Car, FileText, Settings,
  ShieldCheck, Building2, GitBranch, CheckSquare, UserPlus, ClipboardList,
  Bell, BarChart3, Activity, UserCheck, Cake,
  DollarSign, Clock, FileSpreadsheet, ChevronDown, ChevronRight, LogOut,
  Shield, Package, Target, MessageCircle, Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { getPermissionModuleName } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock } from 'lucide-react';

export type NavItem = {
  name: string;
  href: string;
  icon: any;
  permissionKey?: string;
  /** roles that can see this regardless of permission (overrides) */
  superAdminOnly?: boolean;
  /** hide entirely for these roles */
  hiddenFor?: string[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  /** if set, only these roles see the whole group */
  allowedRoles?: string[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Core",
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: "Recruitment",
    items: [
      { name: 'Applicants',            href: '/applicants',  icon: Users,         permissionKey: 'applicants' },
      { name: 'Interviews & Meetings', href: '/interviews',  icon: Calendar,      permissionKey: 'interviews' },
      { name: 'Placement Agreements',  href: '/placement',   icon: ClipboardList, permissionKey: 'placement' },
      { name: 'Applicant Tracking',    href: '/tracking',    icon: Target,        permissionKey: 'tracking' },
      { name: 'Members',               href: '/members',     icon: UserCheck,     permissionKey: 'members' },
    ]
  },
  {
    label: "HR & Staff",
    items: [
      { name: 'Staff Management', href: '/staff',      icon: Briefcase,       permissionKey: 'staff' },
      { name: 'Staff Birthdays',  href: '/birthday',   icon: Cake,            permissionKey: 'birthday' },
      { name: 'Leave Requests',   href: '/leave',      icon: Clock,           permissionKey: 'leave' },
      { name: 'Staff Requests',   href: '/requests',   icon: FileSpreadsheet, permissionKey: 'requests' },
      { name: 'Attendance',       href: '/attendance', icon: Activity,        permissionKey: 'attendance' },
      { name: 'Shift Management', href: '/attendance?tab=Shifts', icon: Clock, permissionKey: 'attendance' },
      { name: 'Payroll',          href: '/payroll',    icon: DollarSign,      permissionKey: 'payroll' },
    ]
  },
  {
    label: "Operations",
    items: [
      { name: 'Client Companies', href: '/companies', icon: Building2,   permissionKey: 'companies' },
      { name: 'Branches',         href: '/branches',  icon: GitBranch,   permissionKey: 'branches' },
      { name: 'Suppliers',        href: '/suppliers', icon: Package,     permissionKey: 'suppliers' },
      { name: 'Vehicles',         href: '/vehicles',  icon: Car,         permissionKey: 'vehicles' },
      { name: 'Tasks',            href: '/tasks',     icon: CheckSquare, permissionKey: 'tasks' },
      { name: 'Documents',        href: '/documents', icon: FileText,    permissionKey: 'documents' },
    ]
  },
  {
    label: "Alerts",
    items: [
      { name: 'Visa Expiry',   href: '/visa-expiry',   icon: Shield,          permissionKey: 'visaExpiry' },
      { name: 'Notifications', href: '/notifications', icon: Bell,            permissionKey: 'notifications' },
      { name: 'WhatsApp',      href: '/whatsapp',      icon: MessageCircle,   permissionKey: 'emails' },
    ]
  },
  {
    label: "System",
    items: [
      { name: 'Users',         href: '/users',         icon: UserPlus,    permissionKey: 'users',       hiddenFor: ['Staff', 'Recruiter', 'Accountant'] },
      { name: 'Roles & Perms', href: '/roles',         icon: ShieldCheck, permissionKey: 'roles',       hiddenFor: ['Staff', 'HR Manager', 'Recruiter', 'Accountant', 'Branch Admin'] },
      { name: 'Own Companies', href: '/own-companies', icon: Building2,   superAdminOnly: true },
      { name: 'Reports',       href: '/reports',       icon: BarChart3,   permissionKey: 'reports',     hiddenFor: ['Staff'] },
      { name: 'Activity Log',  href: '/activity-log',  icon: Activity,    permissionKey: 'activityLog', hiddenFor: ['Staff', 'Recruiter'] },
      { name: 'Site Settings', href: '/settings',      icon: Settings,    permissionKey: 'settings',    hiddenFor: ['Staff', 'HR Manager', 'Recruiter', 'Accountant', 'Branch Admin'] },
      { name: 'Email Templates', href: '/templates', icon: Mail, superAdminOnly: true },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, currentRole, notifications, hasPermission, logout } = useAuthStore();
  const router = useRouter();
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const isSuperAdmin = currentRole === "Super Admin";

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [profileModal, setProfileModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [updating, setUpdating] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.newPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordForm.newPassword })
      });

      if (res.ok) {
        toast.success("Password changed successfully!");
        setProfileModal(false);
        setPasswordForm({ newPassword: "", confirmPassword: "" });
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while changing password.");
    } finally {
      setUpdating(false);
    }
  };

  const toggleGroup = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const isGroupActive = (items: NavItem[]) =>
    items.some(item => pathname?.startsWith(item.href));

  const canSeeItem = (item: NavItem): boolean => {
    // Super Admin Only items
    if (item.superAdminOnly) return isSuperAdmin;

    // Check custom permissions overrides first before role-based hiding
    if (item.permissionKey && (currentUser as any)?.permissions) {
      const userPermissions = typeof currentUser.permissions === 'string'
        ? (() => { try { return JSON.parse(currentUser.permissions); } catch { return null; } })()
        : currentUser.permissions;
      if (userPermissions) {
        const permissionModule = getPermissionModuleName(item.permissionKey);
        if (permissionModule) {
          const matrix = userPermissions.matrix || userPermissions;
          if (matrix[permissionModule] !== undefined && matrix[permissionModule] !== null) {
            const modulePerms = matrix[permissionModule];
            if (modulePerms && modulePerms["view"] !== undefined) {
              return Boolean(modulePerms["view"]);
            }
          }
        }
      }
    }

    // Role-based hiding
    if (item.hiddenFor && item.hiddenFor.includes(currentRole)) return false;
    // Super Admin bypasses all permission checks
    if (isSuperAdmin) return true;
    // No permission key = always visible
    if (!item.permissionKey) return true;
    // Check permission store
    return hasPermission(item.permissionKey, "view");
  };

  const canSeeGroup = (group: NavGroup): boolean => {
    if (group.allowedRoles && !group.allowedRoles.includes(currentRole) && !isSuperAdmin) return false;
    const visibleItems = group.items.filter(canSeeItem);
    if (visibleItems.length === 0) return false;
    return true;
  };

  return (
    <div style={{ backgroundColor: 'var(--sidebar)', backgroundImage: 'none' }} className="hidden md:flex flex-col md:w-[70px] lg:w-[260px] md:fixed md:inset-y-0 border-r border-white/5 shadow-2xl z-30 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 lg:px-6 shrink-0 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform flex-shrink-0 overflow-hidden p-0.5">
            <Image
              src={(currentUser as any)?.companyLogo || "/logo.png"}
              alt={((currentUser as any)?.companyName || "MS Management") + " Logo"}
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="text-white font-bold text-sm tracking-tight hidden lg:block truncate">
            MS Management
          </span>
        </Link>
      </div>

      {/* Role badge (desktop only) */}
      <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 mx-3 mt-3 rounded-xl bg-white/5 border border-white/8">
        <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Logged in as</p>
          <p className="text-[11px] text-white font-bold truncate">{currentRole}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 lg:px-3 space-y-1 scrollbar-none">
        {NAV_GROUPS.map((group) => {
          if (!canSeeGroup(group)) return null;
          const visibleItems = group.items.filter(canSeeItem);
          if (visibleItems.length === 0) return null;

          const isOpen = !collapsed[group.label];
          const groupActive = isGroupActive(visibleItems);

          return (
            <div key={group.label} className="mb-1">
              {/* Group header — desktop only */}
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full hidden lg:flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors select-none",
                  groupActive ? "text-blue-400" : "text-white/30 hover:text-white/50"
                )}
              >
                <span>{group.label}</span>
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>

              {/* Desktop item list */}
              <div className={cn("space-y-0.5", !isOpen && "hidden")}>
                {(isOpen ? visibleItems : []).map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className={cn(
                        "group flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 relative",
                        isActive
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                          : "text-white/50 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-white" : "text-white/40 group-hover:text-white"
                      )} />
                      <span className="hidden lg:block truncate">{item.name}</span>
                      {item.name === 'Notifications' && unreadCount > 0 && (
                        <>
                          <span className="hidden lg:flex ml-auto items-center justify-center min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-extrabold rounded-full px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                          <span className="lg:hidden absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile icon-only list */}
              <div className="lg:hidden space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className={cn(
                        "group flex items-center justify-center p-2 rounded-xl transition-all duration-150 relative",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-white/40 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.name === 'Notifications' && unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <div 
          onClick={() => router.push('/profile')}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-white/20 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">
            {(currentUser as any)?.name?.charAt(0) ?? 'A'}
          </div>
          <div className="hidden lg:block overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{(currentUser as any)?.name ?? 'Admin'}</p>
            <p className="text-[9px] text-white/40 truncate font-medium">{(currentUser as any)?.company}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); logout(); router.push('/login'); }}
            title="Sign Out"
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Profile & Password Reset Dialog */}
      <Dialog open={profileModal} onOpenChange={setProfileModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 max-w-sm">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Lock className="w-4 h-4" />
                </div>
                Change Your Password
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Logged in as <strong>{(currentUser as any)?.name}</strong> ({(currentUser as any)?.role})
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</Label>
                <Input disabled value={(currentUser as any)?.email || ""} className="bg-slate-50 border-slate-200 rounded-xl text-xs h-9 cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Password</Label>
                <Input 
                  required 
                  type="password" 
                  value={passwordForm.newPassword} 
                  onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="At least 6 characters" 
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</Label>
                <Input 
                  required 
                  type="password" 
                  value={passwordForm.confirmPassword} 
                  onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password" 
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" 
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setProfileModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" disabled={updating} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-10">
                {updating ? "Saving..." : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
