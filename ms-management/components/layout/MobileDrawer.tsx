'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { getPermissionModuleName } from '@/lib/constants';
import { NAV_GROUPS, NavItem, NavGroup } from './Sidebar';

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, currentRole, hasPermission, logout, isStoreLoaded } = useAuthStore();
  const isSuperAdmin = (currentRole || "").trim().toLowerCase() === "super admin";

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const isGroupActive = (items: NavItem[]) =>
    items.some(item => pathname?.startsWith(item.href));

  const canSeeItem = (item: NavItem): boolean => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.permissionKey) return true;
    if (!isStoreLoaded) return false;
    return hasPermission(item.permissionKey, "view");
  };

  const canSeeGroup = (group: NavGroup): boolean => {
    if (group.allowedRoles && !group.allowedRoles.includes(currentRole) && !isSuperAdmin) return false;
    const visibleItems = group.items.filter(canSeeItem);
    if (visibleItems.length === 0) return false;
    return true;
  };

  // Prevent background scrolling on mount/dismount
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        style={{ backgroundColor: 'var(--sidebar)', backgroundImage: 'none' }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[320px] shadow-2xl transition-transform duration-300 ease-in-out md:hidden flex flex-col h-[100dvh]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header / Logo */}
        <div className="flex items-center h-16 px-4 shrink-0 border-b border-white/5">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0 overflow-hidden p-0.5">
              <Image
                src="/logo.png"
                alt="MS Management Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-bold text-sm tracking-tight block truncate">
                MS Management
              </span>
              <span className="text-blue-400 text-[10px] uppercase font-bold tracking-wider truncate block">
                {currentRole}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
          {NAV_GROUPS.map((group) => {
            if (!canSeeGroup(group)) return null;
            const visibleItems = group.items.filter(canSeeItem);
            if (visibleItems.length === 0) return null;

            const isOpenGrp = !collapsed[group.label];
            const groupActive = isGroupActive(visibleItems);

            return (
              <div key={group.label} className="mb-2">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors select-none",
                    groupActive ? "text-blue-400" : "text-white/40 hover:text-white/60"
                  )}
                >
                  <span>{group.label}</span>
                </button>
                {isOpenGrp && (
                  <div className="mt-1 space-y-1 pl-1">
                    {visibleItems.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                            isActive
                              ? "bg-blue-600/10 text-blue-400"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <Icon className={cn(
                            "w-5 h-5 transition-transform duration-200",
                            isActive ? "scale-110" : "group-hover:scale-110"
                          )} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer / Profile */}
        <div className="p-4 shrink-0 border-t border-white/5 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
              {currentUser?.name?.charAt(0) || <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {currentUser?.name}
              </p>
              <p className="text-white/50 text-xs truncate">v1.0.0</p>
            </div>
            <button
              onClick={() => {
                onClose();
                logout();
                router.replace('/login');
              }}
              className="p-2 text-white/50 hover:text-red-400 transition-colors shrink-0 rounded-lg hover:bg-white/5"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Ensure User is imported for fallback icon
import { User, LogOut } from 'lucide-react';
