"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid, Users, CheckSquare, Bell, Menu,
  Briefcase, Building2, Car, FileText, Shield,
  X, BarChart3, Settings, Clock, Package, ChevronLeft, User,
  ClipboardList, Target, UserCheck, Cake, FileSpreadsheet,
  Activity, DollarSign, GitBranch, MessageCircle, UserPlus, ShieldCheck
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { getPermissionModuleName } from "@/lib/constants";

const MORE_ITEMS = [
  { label: "Applicants", path: "/applicants",    icon: Users,         permissionKey: "applicants" },
  { label: "Interviews", path: "/interviews",    icon: Shield,        permissionKey: "interviews" },
  { label: "Placement",  path: "/placement",     icon: ClipboardList, permissionKey: "placement" },
  { label: "Tracking",   path: "/tracking",      icon: Target,        permissionKey: "tracking" },
  { label: "Members",    path: "/members",       icon: UserCheck,     permissionKey: "members" },
  { label: "Staff",      path: "/staff",         icon: Briefcase,     permissionKey: "staff" },
  { label: "Birthdays",  path: "/birthday",      icon: Cake,          permissionKey: "birthday" },
  { label: "Leave",      path: "/leave",         icon: Clock,         permissionKey: "leave" },
  { label: "Requests",   path: "/requests",      icon: FileSpreadsheet, permissionKey: "requests" },
  { label: "Attendance", path: "/attendance",    icon: Activity,      permissionKey: "attendance" },
  { label: "Payroll",    path: "/payroll",       icon: DollarSign,    permissionKey: "payroll" },
  { label: "Clients",    path: "/companies",     icon: Building2,     permissionKey: "companies" },
  { label: "Branches",   path: "/branches",      icon: GitBranch,     permissionKey: "branches" },
  { label: "Suppliers",  path: "/suppliers",     icon: Package,       permissionKey: "suppliers" },
  { label: "Vehicles",   path: "/vehicles",      icon: Car,           permissionKey: "vehicles" },
  { label: "Tasks",      path: "/tasks",         icon: CheckSquare,   permissionKey: "tasks" },
  { label: "Documents",  path: "/documents",     icon: FileText,      permissionKey: "documents" },
  { label: "Visa Expiry",path: "/visa-expiry",   icon: Shield,        permissionKey: "visaExpiry" },
  { label: "WhatsApp",   path: "/whatsapp",      icon: MessageCircle },
  { label: "Users",      path: "/users",         icon: UserPlus,      permissionKey: "users" },
  { label: "Roles",      path: "/roles",         icon: ShieldCheck,   permissionKey: "roles" },
  { label: "Own Cos",    path: "/own-companies", icon: Building2,     superAdminOnly: true },
  { label: "Reports",    path: "/reports",       icon: BarChart3,     permissionKey: "reports" },
  { label: "Activity",   path: "/activity-log",  icon: Activity,      permissionKey: "activityLog" },
  { label: "Settings",   path: "/settings",      icon: Settings,      permissionKey: "settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, currentUser, currentRole, hasPermission } = useAuthStore();
  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const [showMore, setShowMore] = useState(false);

  const isSuperAdmin = (currentRole || "").trim().toLowerCase() === "super admin";

  const canSeeItem = (item: any): boolean => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.permissionKey) return true;
    return hasPermission(item.permissionKey, "view");
  };

  const visibleItems = MORE_ITEMS.filter(canSeeItem);

  if (pathname === "/login" || pathname?.startsWith("/tracking") || pathname === "/forgot-password") return null;

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="relative bg-card rounded-t-3xl shadow-2xl z-10 p-4 pb-24 safe-area-bottom border-t border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-card-foreground">Quick Navigation</h3>
              <button
                onClick={() => setShowMore(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pb-4">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all gap-1.5",
                      isActive ? "bg-purple-600 text-white" : "bg-slate-50 dark:bg-slate-855 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-1 shadow-lg safe-area-bottom select-none touch-manipulation">
        {/* Back Button */}
        <button
          onClick={() => { setShowMore(false); router.back(); }}
          className="flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-purple-600 active:scale-95 duration-100"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-[9px] font-semibold mt-1 tracking-wide">Back</span>
        </button>

        {/* Dashboard/Home Button */}
        <Link
          href="/dashboard"
          onClick={() => setShowMore(false)}
          className={cn(
            "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-purple-600 active:scale-95 duration-100",
            pathname === "/dashboard" && "text-purple-600"
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[9px] font-semibold mt-1 tracking-wide">Home</span>
        </Link>

        {/* Notification Button */}
        <Link
          href="/notifications"
          onClick={() => setShowMore(false)}
          className={cn(
            "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all relative text-slate-500 dark:text-slate-400 hover:text-purple-600 active:scale-95 duration-100",
            pathname?.startsWith("/notifications") && "text-purple-600"
          )}
        >
          <div className="relative flex items-center justify-center">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold border border-white px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[9px] font-semibold mt-1 tracking-wide">Alerts</span>
        </Link>

        {/* Profile Button */}
        <Link
          href="/profile"
          onClick={() => setShowMore(false)}
          className={cn(
            "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-purple-600 active:scale-95 duration-100",
            pathname?.startsWith("/profile") && "text-purple-600"
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-semibold mt-1 tracking-wide">Profile</span>
        </Link>

        {/* More Button */}
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-purple-600 active:scale-95 duration-100",
            showMore && "text-purple-600"
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-semibold mt-1 tracking-wide">More</span>
        </button>
      </nav>
    </>
  );
}
