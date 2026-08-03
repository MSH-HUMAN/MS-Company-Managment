'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ChevronLeft, Home, Bell, User, LogOut, Settings, Sun, Moon, Laptop, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import GlobalSearch from './GlobalSearch';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { currentUser, currentRole, notifications, markNotificationRead, markAllNotificationsRead, logout } = useAuthStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set the theme locally if database has a preference on login
  useEffect(() => {
    if (mounted && currentUser?.theme) {
      setTheme(currentUser.theme);
    }
  }, [mounted, currentUser?.theme, setTheme]);

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    if (currentUser?.id && currentUser.id !== "") {
      try {
        await fetch(`/api/users/${currentUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: newTheme })
        });
        
        // Sync local store state
        useAuthStore.setState((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, theme: newTheme } : state.currentUser
        }));
      } catch (err) {
        console.error("Failed to sync theme to DB:", err);
      }
    }
  };

  return (
    <header style={{ backgroundColor: 'var(--header-color)' }} className="sticky top-0 z-40 flex items-center h-14 px-3 md:px-5 backdrop-blur-md border-b border-border/60 shrink-0 gap-2 shadow-sm">

      {/* Hamburger Menu (Mobile) */}
      <div className="md:hidden">
        <button 
          onClick={onMenuClick}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 flex-shrink-0 hidden md:flex"
        title="Go back"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Home button */}
      <Link
        href="/dashboard"
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 flex-shrink-0"
        title="Dashboard"
      >
        <Home className="w-4 h-4" />
      </Link>

      {/* Global Search */}
      <div className="flex-1 min-w-0 mx-2">
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 flex-shrink-0">

        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 outline-none focus:ring-0 cursor-pointer">
            <Bell className={cn("w-4 h-4", unreadCount > 0 && "text-purple-600")} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 border border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl p-0 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800">Notifications ({unreadCount})</span>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    await markAllNotificationsRead();
                    toast.success("All marked as read");
                  }}
                  className="text-[10px] text-purple-600 hover:text-purple-700 font-bold hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/50">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20 text-slate-450" />
                  No new notifications
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    onClick={async () => {
                      await markNotificationRead(n.id);
                      if (n.link) {
                        router.push(n.link);
                      }
                    }}
                    className={cn(
                      "p-3 text-[11px] leading-relaxed cursor-pointer hover:bg-slate-50 transition-colors flex flex-col gap-0.5",
                      !n.read ? "bg-purple-50/10 font-semibold" : "text-slate-500"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn("text-xs font-bold", !n.read ? "text-purple-900" : "text-slate-700")}>{n.title}</span>
                      <span className="text-[9px] text-slate-400">{(n.time || n.createdAt || "").split(" ")[1] || (n.time || n.createdAt || "")}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{n.message}</div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2 border-t border-slate-100/50 bg-slate-50/50 text-center">
              <Link href="/notifications" className="text-[10px] text-purple-600 hover:text-purple-700 font-bold block">
                View All Notifications
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 outline-none focus:ring-0 cursor-pointer">
            {mounted ? (
              theme === "dark" ? <Moon className="w-4 h-4 text-blue-400" /> :
              theme === "light" ? <Sun className="w-4 h-4 text-amber-500" /> :
              <Laptop className="w-4 h-4 text-slate-400" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 bg-white border border-slate-100 rounded-xl shadow-xl">
            <DropdownMenuItem onClick={() => handleThemeChange("light")} className="cursor-pointer hover:bg-slate-50">
              <Sun className="w-3.5 h-3.5 mr-2 text-amber-500" />
              <span className="text-xs font-semibold text-slate-700">Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="cursor-pointer hover:bg-slate-50">
              <Moon className="w-3.5 h-3.5 mr-2 text-blue-500" />
              <span className="text-xs font-semibold text-slate-700">Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("system")} className="cursor-pointer hover:bg-slate-50">
              <Laptop className="w-3.5 h-3.5 mr-2 text-slate-500" />
              <span className="text-xs font-semibold text-slate-700">System</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu — BaseUI DropdownMenu does not support asChild, so we pass the trigger content directly */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors ml-1 outline-none focus:ring-0">
            <Avatar className="w-7 h-7 rounded-lg border border-slate-200">
              {currentUser?.photo
                ? <AvatarImage src={currentUser.photo} className="object-cover rounded-lg" />
                : null}
              <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                {currentUser?.name?.charAt(0) ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight max-w-[100px] truncate">
                {currentUser?.name ?? 'Admin'}
              </div>
              <div className="text-[9px] text-slate-400 font-medium leading-tight truncate">
                {currentRole}
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="text-xs font-bold text-slate-800">{currentUser?.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{currentUser?.email}</div>
                <div className="text-[9px] text-blue-600 font-bold mt-0.5">{currentRole}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="w-3.5 h-3.5 mr-2 text-slate-400" />
              <span className="text-xs font-semibold">My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/notifications')}>
              <Bell className="w-3.5 h-3.5 mr-2 text-slate-400" />
              <span className="text-xs font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" />
              <span className="text-xs font-semibold">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { logout(); router.push('/login'); }} variant="destructive">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              <span className="text-xs font-semibold">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
