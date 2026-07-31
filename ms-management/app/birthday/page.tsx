"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Gift, Calendar, ChevronLeft, ChevronRight, Cake, Mail, Sparkles, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import AccessDenied from "@/components/shared/AccessDenied";

export default function BirthdayPage() {
  const { currentRole, currentUser, staff, hasPermission } = useAuthStore();

  const canView = hasPermission("birthday", "view");
  if (!canView) {
    return <AccessDenied />;
  }
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

  const today = new Date();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Allowed staff based on role scope
  const allowedStaff = currentRole === "Super Admin" ? staff : staff.filter(s => s.company === currentUser.company);

  let list: any[] = [];
  allowedStaff.forEach(s => {
    if (s.birthday) {
      const bDate = new Date(s.birthday);
      const bMonth = bDate.getMonth();
      const bDay = bDate.getDate();
      
      let nextBirthday = new Date(today.getFullYear(), bMonth, bDay);
      if (nextBirthday < today && (bMonth !== today.getMonth() || bDay !== today.getDate())) {
        nextBirthday = new Date(today.getFullYear() + 1, bMonth, bDay);
      }
      
      const daysLeft = Math.ceil((nextBirthday.getTime() - today.getTime()) / 86400000);
      const age = today.getFullYear() - bDate.getFullYear() - (nextBirthday > today ? 1 : 0);
      
      list.push({ ...s, daysLeft, age: age + 1, nextBirthday });
    }
  });

  list.sort((a,b) => a.daysLeft - b.daysLeft);

  // Reminders for next 7 days
  const upcomingIn7Days = list.filter(item => item.daysLeft >= 0 && item.daysLeft <= 7);

  const getStatusColor = (days: number) => {
    if (days === 0) return "bg-rose-50 border-rose-200 text-rose-700 shadow-sm";
    if (days <= 7) return "bg-orange-50 border-orange-100 text-orange-700";
    if (days <= 30) return "bg-amber-50 border-amber-100 text-amber-700";
    return "bg-slate-50 border-slate-100 text-slate-500";
  };

  // Calendar rendering variables
  const firstDay = new Date(currentYear, currentMonthIndex, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const calendarDays: { day: number; isCurrentMonth: boolean; month: number; }[] = [];

  const prevMonthDays = new Date(currentYear, currentMonthIndex, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false, month: currentMonthIndex - 1 });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, isCurrentMonth: true, month: currentMonthIndex });
  }

  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, month: currentMonthIndex + 1 });
  }

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonthIndex(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonthIndex(m => m + 1);
    }
  };

  const getBirthdaysForDate = (dayNum: number, monthIndex: number) => {
    return allowedStaff.filter(s => {
      if (!s.birthday) return false;
      const bday = new Date(s.birthday);
      return bday.getDate() === dayNum && bday.getMonth() === monthIndex;
    });
  };

  const handleSendWish = (staffName: string) => {
    toast.success(`Automated email wish simulated and sent to ${staffName}!`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Staff Birthdays" 
        subtitle="Track upcoming birthdays and automated wishes"
        actions={
          <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 shadow-sm">
            <button 
              onClick={() => setViewMode("calendar")} 
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === "calendar" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}
            >
              Calendar
            </button>
            <button 
              onClick={() => setViewMode("list")} 
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-400"}`}
            >
              List View
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Sidebar for reminders */}
        <div className="space-y-5 lg:col-span-1">
          <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500"/> Reminders (7 Days)
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Birthdays in the next week</p>
            </div>

            {upcomingIn7Days.length === 0 ? (
              <div className="text-center py-6 text-[10px] text-slate-400 font-semibold italic">No birthdays next 7 days.</div>
            ) : (
              <div className="space-y-2.5">
                {upcomingIn7Days.map(item => (
                  <div key={item.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:border-slate-200 transition-colors flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                        {item.name}
                        {item.daysLeft === 0 && <Cake className="w-3 h-3 text-rose-500 animate-pulse"/>}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">{item.position}</div>
                      <div className="text-[9px] text-slate-500 font-bold mt-1">
                        {item.daysLeft === 0 ? "🎉 Today!" : item.daysLeft === 1 ? "Tomorrow" : `In ${item.daysLeft} days`}
                      </div>
                    </div>
                    {item.daysLeft === 0 && (
                      <Button onClick={() => handleSendWish(item.name)} size="sm" variant="ghost" className="w-7 h-7 hover:bg-rose-50 rounded-lg text-rose-500 flex-shrink-0">
                        <Mail className="w-4 h-4"/>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {viewMode === "list" ? (
            <>
              {/* Mobile Portrait View */}
              <div className="space-y-3 md:hidden">
                {list.length === 0 ? (
                  <EmptyState title="No staff birthdays found" />
                ) : (
                  list.map(item => (
                    <Card key={item.id} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center flex-shrink-0">
                            {item.photo ? (
                              <img src={item.photo} className="w-full h-full object-cover" />
                            ) : (
                              <AvatarFallback className="rounded-lg bg-pink-50 text-pink-700 font-bold text-[11px] w-full h-full flex items-center justify-center">
                                {item.name.charAt(0)}
                              </AvatarFallback>
                            )}
                          </div>
                          <div>
                            <Link href={`/staff/${item.id}`} className="font-bold text-slate-800 hover:text-blue-600 block text-xs">{item.name}</Link>
                            <div className="text-[10px] text-slate-400">{item.position}</div>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-bold ${getStatusColor(item.daysLeft)}`}>
                          <Calendar className="w-3 h-3"/>
                          {item.daysLeft === 0 ? "Today!" : item.daysLeft === 1 ? "Tomorrow" : `In ${item.daysLeft} d`}
                        </div>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div><strong>Company/Branch:</strong> {item.company} / {item.branch}</div>
                        <div><strong>Birthday:</strong> {new Date(item.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div><strong>Turning Age:</strong> <span className="font-extrabold text-slate-700 bg-slate-200/50 px-1.5 py-0.2 rounded">{item.age}</span></div>
                      </div>
                      <div className="flex justify-end pt-1 border-t border-slate-100">
                        <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          <Mail className="w-3 h-3 text-emerald-500" /> Sent (8:00AM)
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Card className="rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden overflow-x-auto">
                  {list.length === 0 ? <EmptyState title="No staff birthdays found" /> : (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Birthday</TableHead>
                          <TableHead>Turning Age</TableHead>
                          <TableHead>Countdown</TableHead>
                          <TableHead className="text-right">Auto Wish</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map(item => (
                          <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/30 text-xs font-semibold text-slate-600">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center flex-shrink-0">
                                  {item.photo ? (
                                    <img src={item.photo} className="w-full h-full object-cover" />
                                  ) : (
                                    <AvatarFallback className="rounded-lg bg-pink-50 text-pink-700 font-bold text-[11px] w-full h-full flex items-center justify-center">
                                      {item.name.charAt(0)}
                                    </AvatarFallback>
                                  )}
                                </div>
                                <div>
                                  <Link href={`/staff/${item.id}`} className="font-bold text-slate-800 hover:text-blue-600 block">{item.name}</Link>
                                  <div className="text-[10px] text-slate-400">{item.position}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-[10px]">{item.company}<br/><span className="text-slate-400">{item.branch}</span></TableCell>
                            <TableCell className="text-[10px] font-bold text-slate-700">
                              {new Date(item.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </TableCell>
                            <TableCell><span className="font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{item.age}</span></TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getStatusColor(item.daysLeft)}`}>
                                <Calendar className="w-3.5 h-3.5"/>
                                {item.daysLeft === 0 ? "Today!" : item.daysLeft === 1 ? "Tomorrow" : `In ${item.daysLeft} days`}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                                <Mail className="w-3 h-3 text-emerald-500" /> Sent (8:00AM)
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm space-y-4">
              {/* Calendar Month Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{months[currentMonthIndex]} {currentYear}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">Simulated scheduler calendar</span>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth} className="w-8 h-8 rounded-lg border-slate-200"><ChevronLeft className="w-4 h-4"/></Button>
                  <Button variant="outline" size="icon" onClick={handleNextMonth} className="w-8 h-8 rounded-lg border-slate-200"><ChevronRight className="w-4 h-4"/></Button>
                </div>
              </div>

              {/* Grid headers */}
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <span key={d}>{d}</span>)}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, idx) => {
                  const birthdays = getBirthdaysForDate(cell.day, cell.month);
                  const isCurrentDay = cell.isCurrentMonth && cell.day === today.getDate() && currentMonthIndex === today.getMonth() && currentYear === today.getFullYear();
                  
                  return (
                    <div 
                      key={idx} 
                      className={`min-h-[72px] border rounded-xl p-1.5 flex flex-col gap-1 transition-all select-none ${
                        isCurrentDay 
                          ? "border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20" 
                          : cell.isCurrentMonth 
                          ? "border-slate-100 bg-white hover:border-slate-300" 
                          : "border-slate-50 bg-slate-50/30 opacity-50"
                      }`}
                    >
                      <div className={`text-[10px] font-bold text-right ${isCurrentDay ? "text-amber-600" : "text-slate-400"}`}>
                        {cell.day}
                      </div>
                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[50px] scrollbar-none min-h-0">
                        {birthdays.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => toast.success(`${s.name} turning age this month! Auto wish email dispatched.`)}
                            className="bg-pink-50 border border-pink-100 text-pink-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:bg-pink-100 flex items-center gap-0.5"
                            title={`${s.name} - ${s.position}\nAuto wish email sent`}
                          >
                            <Cake className="w-2.5 h-2.5 text-pink-500 flex-shrink-0" />
                            <span className="truncate">{s.name.split(" ")[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
