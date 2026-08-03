"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileDrawer } from "./MobileDrawer";
import Breadcrumb from "./Breadcrumb";
import BottomNav from "./BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import ReminderEngine from "@/components/shared/ReminderEngine";
import ThemeApplier from "@/components/layout/ThemeApplier";
import { useAuthStore } from "@/store/authStore";
import AccessDenied from "@/components/shared/AccessDenied";
import { getPermissionModuleName } from "@/lib/constants";
import { toast as originalToast } from "sonner";

// Global toast deduplication and duration control interceptor
if (typeof window !== "undefined") {
  const activeToasts = new Set<string>();

  const wrapToastFn = (origFn: any) => {
    if (!origFn || (origFn as any).__wrapped) return origFn;

    const newFn = (message: any, options: any = {}) => {
      const msgStr = typeof message === "string" ? message : JSON.stringify(message);
      if (activeToasts.has(msgStr)) return "";

      activeToasts.add(msgStr);

      const toastId = origFn(message, {
        ...options,
        duration: 4000, // 4 seconds duration
        onDismiss: (t: any) => {
          activeToasts.delete(msgStr);
          if (options.onDismiss) options.onDismiss(t);
        },
        onAutoClose: (t: any) => {
          activeToasts.delete(msgStr);
          if (options.onAutoClose) options.onAutoClose(t);
        }
      });

      // Safety timeout to remove message from Set
      setTimeout(() => {
        activeToasts.delete(msgStr);
      }, 4500);

      return toastId;
    };
    newFn.__wrapped = true;
    return newFn;
  };

  // Override standard methods on the global toast instance
  if ((originalToast as any).success && !(originalToast as any).success.__wrapped) {
    (originalToast as any).success = wrapToastFn((originalToast as any).success);
  }
  if ((originalToast as any).error && !(originalToast as any).error.__wrapped) {
    (originalToast as any).error = wrapToastFn((originalToast as any).error);
  }
  if ((originalToast as any).warning && !(originalToast as any).warning.__wrapped) {
    (originalToast as any).warning = wrapToastFn((originalToast as any).warning);
  }
  if ((originalToast as any).info && !(originalToast as any).info.__wrapped) {
    (originalToast as any).info = wrapToastFn((originalToast as any).info);
  }
}

/** Pages that do NOT require authentication */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/tracking", "/apply", "/track"];

/** Navigation item permission rules corresponding to Sidebar options */
const NAV_ITEM_PERMISSIONS = [
  { href: '/applicants',   permissionKey: 'applicants' },
  { href: '/interviews',   permissionKey: 'interviews' },
  { href: '/placement',    permissionKey: 'placement' },
  { href: '/tracking',     permissionKey: 'tracking' },
  { href: '/members',      permissionKey: 'members' },
  { href: '/staff',        permissionKey: 'staff' },
  { href: '/birthday',     permissionKey: 'birthday' },
  { href: '/leave',        permissionKey: 'leave' },
  { href: '/requests',     permissionKey: 'requests' },
  { href: '/attendance',   permissionKey: 'attendance' },
  { href: '/payroll',      permissionKey: 'payroll' },
  { href: '/companies',    permissionKey: 'companies' },
  { href: '/branches',     permissionKey: 'branches' },
  { href: '/suppliers',    permissionKey: 'suppliers' },
  { href: '/vehicles',     permissionKey: 'vehicles' },
  { href: '/tasks',        permissionKey: 'tasks' },
  { href: '/documents',    permissionKey: 'documents' },
  { href: '/visa-expiry',  permissionKey: 'visaExpiry' },
  { href: '/users',        permissionKey: 'users' },
  { href: '/roles',        permissionKey: 'roles' },
  { href: '/own-companies', superAdminOnly: true },
  { href: '/reports',      permissionKey: 'reports' },
  { href: '/activity-log', permissionKey: 'activityLog' },
  { href: '/settings',     permissionKey: 'settings' },
  { href: '/emails',       permissionKey: 'emails' },
  { href: '/whatsapp',     permissionKey: 'emails' },
  { href: '/templates',    superAdminOnly: true },
  { href: '/notifications', permissionKey: 'notifications' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, checkSession, currentRole, currentUser, hasPermission } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const isPublicPage = PUBLIC_PATHS.some(p => pathname === p || pathname?.startsWith(p + "/"));

  // Check backend session on mount
  useEffect(() => {
    async function verifySession() {
      try {
        await checkSession();
      } catch (err) {
        console.error("AppShell session check failed:", err);
      } finally {
        setIsChecking(false);
      }
    }
    verifySession();
  }, [checkSession]);

  // Login guard: if not authenticated and not on a public page, redirect to /login
  useEffect(() => {
    if (!isChecking && !isPublicPage && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isChecking, isPublicPage, isAuthenticated, router]);

  const isLoginPage = pathname === "/login";
  const isTrackingPage = pathname?.startsWith("/tracking") || pathname?.startsWith("/track");
  const isForgotPasswordPage = pathname === "/forgot-password";
  const isApplyPage = pathname === "/apply";
  const isFullWidthPage = isLoginPage || isTrackingPage || isForgotPasswordPage || isApplyPage;

  if (isChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#0A0F1C] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  if (isFullWidthPage) {
    return (
      <div className={cn("font-sans", "min-h-[100dvh] bg-slate-50 flex flex-col w-full")}>
        <main className="flex-1 flex flex-col">{children}</main>
        <Toaster position="top-right" offset="70px" closeButton richColors />
        <ReminderEngine />
      </div>
    );
  }

  // Don't render the full shell until authenticated (prevents flash)
  if (!isAuthenticated) {
    return null;
  }

  // Check dynamic route level permission gate
  const isSuperAdmin = (currentRole || "").trim().toLowerCase() === "super admin";
  let pageContent = children;

  const matchingItem = NAV_ITEM_PERMISSIONS.find(item => 
    pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"))
  );

  if (matchingItem) {
    let allowed = true;
    if (matchingItem.superAdminOnly && !isSuperAdmin) {
      allowed = false;
    } else if (matchingItem.permissionKey && !isSuperAdmin) {
      allowed = hasPermission(matchingItem.permissionKey, "view");
    }

    if (!allowed) {
      pageContent = <AccessDenied />;
    }
  }

  return (
    <div className={cn("font-sans", "min-h-[100dvh] bg-background flex text-foreground antialiased overflow-hidden print:overflow-visible w-full")}>
      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} />

      {/* Sidebar - Desktop / Tablet */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* Main Panel Wrapper */}
      <div className="flex-1 flex flex-col md:pl-[70px] lg:pl-[260px] print:pl-0 h-[100dvh] print:h-auto overflow-hidden print:overflow-visible relative transition-all duration-300">
        {/* Top Header */}
        <div className="print:hidden">
          <Header onMenuClick={() => setIsMobileDrawerOpen(true)} />
        </div>

        {/* Dynamic Breadcrumbs */}
        <div className="print:hidden">
          <Breadcrumb />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-h-0 print:overflow-visible bg-transparent flex flex-col">
          {pageContent}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="print:hidden">
          <BottomNav />
        </div>
      </div>
      <Toaster position="top-right" offset="70px" closeButton richColors />
      <ReminderEngine />
      {/* ThemeApplier: zero-render component that watches siteSettings
          and keeps CSS variables in sync on every page and after refresh */}
      <ThemeApplier />
    </div>
  );
}
