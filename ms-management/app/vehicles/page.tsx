"use client";

import { useState } from "react";
import { Plus, Car, Key, AlertTriangle, Trash2, UserCheck, Edit3, FileText, Calendar, History } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { formatDate, exportToCSV } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import FilterBar from "@/components/shared/FilterBar";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Pagination from "@/components/shared/Pagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Vehicle } from "@/lib/types";
import { toast } from "sonner";

const VEHICLE_TYPES = ["Sedan","SUV","Van","Truck","Bus","Motorcycle","Pickup"];
const UAE_CODES = ["Dubai","Abu Dhabi","Sharjah","Ajman","RAK","UAQ","Fujairah"];

export default function VehiclesPage() {
  const { currentRole, currentUser, vehicles, staff, ownCompanies, branches, addVehicle, updateVehicle, deleteVehicle, addActivityLog, hasPermission } = useAuthStore();
  const { filters } = useFilterStore();
  const [modal, setModal] = useState(false);
  const [assignModal, setAssignModal] = useState<Vehicle | null>(null);
  const [returnModal, setReturnModal] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [fullViewVehicle, setFullViewVehicle] = useState<Vehicle | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [returnKm, setReturnKm] = useState(0);
  const [returnStartKm, setReturnStartKm] = useState(0);
  const [returnDate, setReturnDate] = useState("");
  const [assignKm, setAssignKm] = useState(0);
  const [drivenKm, setDrivenKm] = useState<number | "">("");
  const [totalPayment, setTotalPayment] = useState<number | "">("");
  const [returnReason, setReturnReason] = useState("");
  const [form, setForm] = useState({ vehicleType: "Sedan", brand: "Toyota", plateNumber: "00000", plateCode: "Dubai", registrationCountry: "UAE", emirate: "Dubai", colour: "White", km: "" as number | "", insuranceExpiry: "", registrationExpiry: "", licenseExpiry: "", notes: "", picture: null as string | null });
  const [assignCompany, setAssignCompany] = useState("");
  const [assignBranch, setAssignBranch] = useState("");
  const [assignCondition, setAssignCondition] = useState("");
  const [assignPicture, setAssignPicture] = useState<string | null>(null);
  const [returnPicture, setReturnPicture] = useState<string | null>(null);
  const [ratePerKm, setRatePerKm] = useState<number | "">("");
  const [includePayment, setIncludePayment] = useState(false);

  const f = filters.vehicles;
  let list = vehicles;
  if (currentRole !== "Super Admin" && currentUser.company !== "System") list = list.filter(v => v.company === currentUser.company);
  if (f.search) { const q = f.search.toLowerCase(); list = list.filter(v => v.brand.toLowerCase().includes(q) || v.plateNumber.toLowerCase().includes(q) || (v.assignedTo||"").toLowerCase().includes(q)); }
  if (f.status && f.status !== "all") list = list.filter(v => v.status === f.status);

  list = [...list].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalItems = list.length;
  const page = f.page || 1;
  const pageSize = f.pageSize || 10;
  const paginated = list.slice((page-1)*pageSize, page*pageSize);

  const today = new Date("2026-06-04");
  const getDaysLeft = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);

  const handleSubmit = (e: React.FormEvent) => {
    if (!form.brand || !form.plateNumber) { toast.error("Brand and plate number required"); return; }
    e.preventDefault();
    if (editVehicle) {
      updateVehicle({ ...editVehicle, ...form, km: typeof form.km === "number" ? form.km : parseInt(String(form.km)) || 0 });
      toast.success("Vehicle updated");
    } else {
      const id = `VEH-${Math.floor(100+Math.random()*900)}`;
      addVehicle({ ...form, km: typeof form.km === "number" ? form.km : parseInt(String(form.km)) || 0, id, picture: null, assignedTo: null, assignedToId: null, status: "Available", company: currentUser.company === "System" ? "Alpha Solutions LLC" : currentUser.company, branch: currentUser.branch === "All" ? "Main Branch" : currentUser.branch, createdBy: currentUser.name, createdAt: new Date().toISOString().replace("T"," ").slice(0,19) });
      addActivityLog({ id: `LOG-${Date.now()}`, dateTime: new Date().toISOString().replace("T"," ").slice(0,19), userName: currentUser.name, role: currentUser.role, company: currentUser.company, branch: currentUser.branch, action: "Created", module: "Vehicles", oldValue: null, newValue: `Added vehicle: ${form.brand} ${form.plateNumber}`, ipAddress: "192.168.1.102" });
      toast.success(`Vehicle ${form.brand} added`);
    }
    setModal(false); setEditVehicle(null);
    setForm({ vehicleType:"Sedan",brand:"",plateNumber:"",plateCode:"Dubai",registrationCountry:"UAE",emirate:"Dubai",colour:"",km:"",insuranceExpiry:"",registrationExpiry:"",licenseExpiry:"",notes:"",picture:null });
  };

  const handleAssign = () => {
    if (!assignModal || !assignTo || !assignCompany || !assignBranch) { toast.error("Select company, branch, and staff member"); return; }
    const selectedStaff = staff.find(s => s.name === assignTo && s.company === assignCompany && s.branch === assignBranch);
    
    const newAssignment = {
      id: `VA-${Date.now()}`,
      assignedTo: assignTo,
      assignedToId: selectedStaff?.id || "",
      company: assignCompany,
      branch: assignBranch,
      assignedDate: new Date().toISOString().slice(0, 10),
      assignedBy: currentUser.name,
      conditionBefore: assignCondition,
      pictureBefore: assignPicture,
      startKm: assignKm
    };

    updateVehicle({ 
      ...assignModal, 
      status: "Assigned", 
      assignedTo: assignTo, 
      assignedToId: selectedStaff?.id || "",
      assignmentHistory: [...(assignModal.assignmentHistory || []), newAssignment]
    });
    toast.success(`Vehicle assigned to ${assignTo}`);
    setAssignModal(null); setAssignTo(""); setAssignCompany(""); setAssignBranch(""); setAssignCondition(""); setAssignPicture(null);
  };

  const handleReturn = () => {
    if (!returnModal) return;
    if (!returnReason.trim()) { toast.error("Return reason / condition is required"); return; }
    
    if (returnKm < returnStartKm) {
      toast.error(`Return KM (${returnKm}) cannot be less than Start KM (${returnStartKm})`);
      return;
    }

    const finalDriven = typeof drivenKm === "number" ? drivenKm : (returnKm - returnStartKm);
    const finalPayment = typeof totalPayment === "number" ? totalPayment : (finalDriven * (typeof ratePerKm === "number" ? ratePerKm : 0));
    
    let paymentNote = "";
    if (includePayment) {
      paymentNote = `\nPayment: ${finalDriven} KM @ ${ratePerKm || 0} = ${finalPayment.toLocaleString()} AED`;
    }
    
    const history = [...(returnModal.assignmentHistory || [])];
    if (history.length > 0) {
      const last = history[history.length - 1];
      if (!last.returnDate) {
        last.returnDate = returnDate || new Date().toISOString().slice(0, 10);
        last.conditionReturn = returnReason;
        last.pictureReturn = returnPicture;
        last.startKm = returnStartKm;
        last.returnKm = returnKm;
        last.drivenKm = finalDriven;
        last.ratePerKm = typeof ratePerKm === "number" ? ratePerKm : 0;
        last.totalPayment = finalPayment;
        last.notes = (last.notes || "") + paymentNote;
      }
    }

    updateVehicle({ ...returnModal, status: "Returned", assignedTo: null, assignedToId: null, km: returnKm, assignmentHistory: history });
    toast.success("Vehicle returned and marked as Returned");
    setReturnModal(null); setReturnKm(0); setReturnStartKm(0); setReturnDate(""); setReturnReason(""); setReturnPicture(null); setIncludePayment(false); setRatePerKm(""); setDrivenKm(""); setTotalPayment("");
  };

  const filteredStaff = currentRole === "Super Admin" ? staff : staff.filter(s => s.company === currentUser.company);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PageHeader title="Vehicle Management" subtitle="Manage company fleet, assignments, and document expiries"
        actions={<Button onClick={() => { setEditVehicle(null); setForm({ vehicleType:"Sedan",brand:"",plateNumber:"",plateCode:"Dubai",registrationCountry:"UAE",emirate:"Dubai",colour:"",km:0,insuranceExpiry:"",registrationExpiry:"",licenseExpiry:"",notes:"",picture:null }); setModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 px-4 gap-1.5"><Plus className="w-4 h-4"/>Add Vehicle</Button>}
      />
      <FilterBar moduleKey="vehicles" statusOptions={["Available","Assigned","Maintenance","Returned"]} onExport={() => { exportToCSV(list.map(v=>({ID:v.id,Brand:v.brand,Plate:v.plateNumber,Status:v.status,AssignedTo:v.assignedTo||"",InsuranceExpiry:v.insuranceExpiry})),"vehicles"); toast.success("Exported"); }} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 pb-28 md:pb-6">
        {paginated.length === 0 ? (
          <EmptyState title="No vehicles found" action={<Button onClick={() => setModal(true)} className="bg-blue-600 text-white rounded-xl text-xs px-4 h-9">Add Vehicle</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map(v => {
              const insDays = v.insuranceExpiry ? getDaysLeft(v.insuranceExpiry) : null;
              const regDays = v.registrationExpiry ? getDaysLeft(v.registrationExpiry) : null;
              const licDays = v.licenseExpiry ? getDaysLeft(v.licenseExpiry) : null;
              const hasAlert = (insDays !== null && insDays <= 30) || (regDays !== null && regDays <= 30) || (licDays !== null && licDays <= 30);
              return (
                <Card key={v.id} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                  {hasAlert && <div className="h-1 rounded-t-2xl bg-amber-400 -mx-5 -mt-5 mb-0" />}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 overflow-hidden">
                      {v.picture ? (
                        <img src={v.picture} alt={v.brand} className="w-full h-full object-cover" />
                      ) : (
                        <Car className="w-5 h-5"/>
                      )}
                    </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">{v.brand}</div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{v.plateCode} · {v.plateNumber}</div>
                      </div>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600 mt-2">
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"><span className="text-slate-400">Type: </span>{v.vehicleType}</div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"><span className="text-slate-400">KM: </span>{v.km.toLocaleString()}</div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"><span className="text-slate-400">Colour: </span>{v.colour}</div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"><span className="text-slate-400">Country: </span>{v.registrationCountry}</div>
                    <div className={`rounded-lg px-2.5 py-1.5 border ${insDays !== null && insDays <= 30 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-slate-50 border-slate-100"}`}><span className="text-slate-400">Ins: </span>{formatDate(v.insuranceExpiry)}</div>
                    <div className={`rounded-lg px-2.5 py-1.5 border ${regDays !== null && regDays <= 30 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-slate-50 border-slate-100"}`}><span className="text-slate-400">Reg: </span>{formatDate(v.registrationExpiry)}</div>
                    <div className={`rounded-lg px-2.5 py-1.5 border ${licDays !== null && licDays <= 30 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-slate-50 border-slate-100"}`}><span className="text-slate-400">Lic: </span>{formatDate(v.licenseExpiry)}</div>
                    <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100"><span className="text-slate-400">Branch: </span>{v.branch}</div>
                  </div>

                  {v.assignedTo && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 font-semibold">
                      <UserCheck className="w-3.5 h-3.5"/>{v.assignedTo}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 flex gap-1.5 flex-wrap">
                    {v.status === "Available" && hasPermission("Vehicles", "assign") && <Button size="sm" onClick={() => { setAssignModal(v); setAssignTo(""); setAssignKm(v.km); }} className="flex-1 bg-blue-600 text-white rounded-xl text-[10px] font-bold h-8 gap-1"><Key className="w-3.5 h-3.5"/>Assign</Button>}
                    {v.status === "Assigned" && hasPermission("Vehicles", "assign") && <Button size="sm" variant="outline" onClick={() => { setReturnModal(v); setReturnKm(v.km); const active = v.assignmentHistory?.find(h => !h.returnDate); const start = active?.startKm ?? v.km; setReturnStartKm(start); setReturnDate(new Date().toISOString().slice(0, 10)); setDrivenKm(v.km - start); setTotalPayment(0); }} className="flex-1 border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold h-8 gap-1">Return</Button>}
                    <Button size="sm" variant="outline" onClick={() => setFullViewVehicle(v)} className="flex-1 border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold h-8 px-3">Full View</Button>
                    {hasPermission("Vehicles", "edit") && <Button size="sm" variant="ghost" onClick={() => { setEditVehicle(v); setForm({ vehicleType:v.vehicleType,brand:v.brand,plateNumber:v.plateNumber,plateCode:v.plateCode,registrationCountry:v.registrationCountry,emirate:v.emirate,colour:v.colour,km:v.km,insuranceExpiry:v.insuranceExpiry,registrationExpiry:v.registrationExpiry,licenseExpiry:v.licenseExpiry||"",notes:v.notes||"",picture:v.picture }); setModal(true); }} className="text-slate-500 hover:text-blue-600 rounded-xl h-8 px-2"><Edit3 className="w-3.5 h-3.5"/></Button>}
                    {hasPermission("Vehicles", "delete") && <Button variant="ghost" size="sm" onClick={() => setDeleteId(v.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl h-8 px-2"><Trash2 className="w-3.5 h-3.5"/></Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Pagination moduleKey="vehicles" totalItems={totalItems} />

      {/* Add/Edit Vehicle Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800">{editVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Enter vehicle details and document expiry dates.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Type</Label>
                <Select value={form.vehicleType} onValueChange={v => setForm(f => ({...f, vehicleType: v || "Sedan"}))}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Brand/Model <span className="text-rose-500">*</span></Label>
                <Input required value={form.brand} onChange={e => setForm(f => ({...f, brand: e.target.value}))} placeholder="Toyota Camry" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plate Code</Label>
                <Select value={form.plateCode} onValueChange={v => setForm(f => ({...f, plateCode: v || "Dubai", emirate: v || "Dubai"}))}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs">{UAE_CODES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plate Number <span className="text-rose-500">*</span></Label>
                <Input required value={form.plateNumber} onChange={e => setForm(f => ({...f, plateNumber: e.target.value}))} placeholder="A 12345" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Colour</Label>
                <Input value={form.colour} onChange={e => setForm(f => ({...f, colour: e.target.value}))} placeholder="White" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current KM</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.km}
                  onChange={e => setForm(f => ({ ...f, km: e.target.value === "" ? "" : Number(e.target.value) }))}
                  onBlur={e => { if (e.target.value === "") setForm(f => ({ ...f, km: 0 })); }}
                  placeholder="e.g. 45000"
                  className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Insurance Expiry</Label>
                <Input type="date" value={form.insuranceExpiry} onChange={e => setForm(f => ({...f, insuranceExpiry: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Registration Expiry</Label>
                <Input type="date" value={form.registrationExpiry} onChange={e => setForm(f => ({...f, registrationExpiry: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">License Expiry</Label>
                <Input type="date" value={form.licenseExpiry} onChange={e => setForm(f => ({...f, licenseExpiry: e.target.value}))} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Picture</Label>
                <div className="flex gap-2 items-center">
                  <Input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) { const reader = new FileReader(); reader.onloadend = () => setForm(f => ({...f, picture: reader.result as string})); reader.readAsDataURL(file); }
                  }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                  {form.picture && <img src={form.picture} alt="preview" className="w-9 h-9 rounded-lg object-cover border border-slate-200" />}
                </div>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes</Label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" placeholder="Additional notes about this vehicle..." />
              </div>
            </div>
            <DialogFooter className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setModal(false)} className="text-xs rounded-xl px-4">Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">{editVehicle ? "Update" : "Add Vehicle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={!!assignModal} onOpenChange={open => { if(!open){ setAssignModal(null); setAssignTo(""); setAssignCompany(""); setAssignBranch(""); setAssignCondition(""); setAssignPicture(null); } }}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Assign Vehicle</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Assign {assignModal?.brand} ({assignModal?.plateNumber}) to a staff member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company</Label>
              <Select value={assignCompany} onValueChange={(val) => { setAssignCompany(val || ""); setAssignBranch(""); setAssignTo(""); }}>
                <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Select company"/></SelectTrigger>
                <SelectContent className="bg-white rounded-xl text-xs max-h-48">{ownCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {assignCompany && (
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch</Label>
                <Select value={assignBranch} onValueChange={(val) => { setAssignBranch(val || ""); setAssignTo(""); }}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Select branch"/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs max-h-48">{branches.filter(b => b.company === assignCompany).map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {assignCompany && assignBranch && (
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign To (Staff)</Label>
                <Select value={assignTo} onValueChange={(val) => setAssignTo(val || "")}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Select staff member"/></SelectTrigger>
                  <SelectContent className="bg-white rounded-xl text-xs max-h-48">
                    {(() => {
                      const branchStaff = staff.filter(s => s.company === assignCompany && s.branch === assignBranch);
                      if (branchStaff.length === 0) {
                        return <SelectItem value="no_staff" disabled>No staff available in this branch</SelectItem>;
                      }
                      return branchStaff.map(s => <SelectItem key={s.id} value={s.name}>{s.name} · {s.position}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start KM Reading <span className="text-rose-500">*</span></Label>
              <Input
                type="number"
                required
                min={0}
                value={assignKm}
                onChange={e => setAssignKm(e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder="e.g. 45000"
                className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Condition (Before)</Label>
              <Select value={assignCondition} onValueChange={(val) => setAssignCondition(val || "")}>
                <SelectTrigger className="bg-white border-slate-200 rounded-xl text-xs h-9"><SelectValue placeholder="Condition"/></SelectTrigger>
                <SelectContent className="bg-white rounded-xl text-xs">
                  {["Excellent","Good","Fair","Needs Maintenance"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Picture (Before)</Label>
              <Input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setAssignPicture(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} className="bg-white border-slate-200 rounded-xl text-xs h-9" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-3">
            <Button variant="ghost" onClick={() => { setAssignModal(null); setAssignTo(""); setAssignCompany(""); setAssignBranch(""); setAssignCondition(""); setAssignPicture(null); }} className="text-xs rounded-xl px-4">Cancel</Button>
            <Button onClick={handleAssign} className="bg-blue-600 text-white font-bold rounded-xl text-xs px-5 h-10">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={!!returnModal} onOpenChange={open => !open && setReturnModal(null)}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 w-[95vw] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800">Return Vehicle</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Record the return of {returnModal?.brand} ({returnModal?.plateNumber}) from {returnModal?.assignedTo}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex gap-4 text-[10px] font-semibold text-slate-600">
              {returnModal?.picture ? (
                <img src={returnModal.picture} alt="vehicle" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400">
                  <Car className="w-6 h-6" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <div><span className="text-slate-400">Type: </span>{returnModal?.vehicleType}</div>
                <div><span className="text-slate-400">Brand: </span>{returnModal?.brand}</div>
                <div><span className="text-slate-400">Plate: </span>{returnModal?.plateCode} {returnModal?.plateNumber}</div>
                <div><span className="text-slate-400">Colour: </span>{returnModal?.colour}</div>
                <div><span className="text-slate-400">Country: </span>{returnModal?.registrationCountry}</div>
                <div><span className="text-slate-400">Returned By: </span>{returnModal?.assignedTo}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start KM Reading</Label>
                <Input type="number" value={returnStartKm} onChange={e => {
                  const val = parseInt(e.target.value)||0;
                  setReturnStartKm(val);
                  const newDriven = returnKm - val;
                  setDrivenKm(newDriven);
                  if (typeof ratePerKm === "number" && ratePerKm > 0) {
                    setTotalPayment(newDriven * ratePerKm);
                  }
                }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Return KM Reading</Label>
                <Input type="number" value={returnKm} onChange={e => {
                  const val = parseInt(e.target.value)||0;
                  setReturnKm(val);
                  const newDriven = val - returnStartKm;
                  setDrivenKm(newDriven);
                  if (typeof ratePerKm === "number" && ratePerKm > 0) {
                    setTotalPayment(newDriven * ratePerKm);
                  }
                }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driven KM</Label>
                <Input type="number" value={drivenKm} onChange={e => {
                  const val = e.target.value === "" ? "" : parseInt(e.target.value)||0;
                  setDrivenKm(val);
                  if (typeof val === "number" && typeof ratePerKm === "number" && ratePerKm > 0) {
                    setTotalPayment(val * ratePerKm);
                  }
                }} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Return Date</Label>
                <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includePayment} onChange={e => setIncludePayment(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-xs font-bold text-slate-600">Calculate Payment (Mileage Allowance)</span>
              </label>
              {includePayment && (
                <div className="space-y-2 pt-1 border-t border-slate-100 mt-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate Per KM (AED)</Label>
                    <Input type="number" step="0.01" value={ratePerKm} onChange={e => {
                      const val = e.target.value === "" ? "" : parseFloat(e.target.value)||0;
                      setRatePerKm(val);
                      const finalDriven = typeof drivenKm === "number" ? drivenKm : 0;
                      if (typeof val === "number" && finalDriven > 0) {
                        setTotalPayment(finalDriven * val);
                      }
                    }} placeholder="e.g. 0.5" className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Payment (AED)</Label>
                    <Input type="number" step="0.01" value={totalPayment} onChange={e => setTotalPayment(e.target.value === "" ? "" : parseFloat(e.target.value)||0)} className="bg-white border-slate-200 rounded-xl text-xs h-9 focus:border-blue-400" />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Condition <span className="text-rose-500">*</span></Label>
              <select value={returnReason.includes("Good") || returnReason.includes("Damaged") || returnReason.includes("Excellent") || returnReason.includes("Fair") ? returnReason.split(" - ")[0] : ""}
                onChange={e => setReturnReason(e.target.value ? e.target.value + (returnReason.includes(" - ") ? " - " + returnReason.split(" - ")[1] : "") : returnReason)}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs h-9 px-3 focus:border-blue-400 font-semibold text-slate-700">
                <option value="">Select condition</option>
                <option>Excellent</option>
                <option>Good</option>
                <option>Fair</option>
                <option>Damaged</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Return Reason / Notes <span className="text-rose-500">*</span></Label>
              <textarea rows={2} value={returnReason.includes(" - ") ? returnReason.split(" - ")[1] : (returnReason.includes("Good") || returnReason.includes("Damaged") || returnReason.includes("Excellent") || returnReason.includes("Fair") ? "" : returnReason)} 
                onChange={e => {
                  const prefix = returnReason.includes(" - ") ? returnReason.split(" - ")[0] : (returnReason.includes("Good") || returnReason.includes("Damaged") || returnReason.includes("Excellent") || returnReason.includes("Fair") ? returnReason : "");
                  setReturnReason(prefix ? `${prefix} - ${e.target.value}` : e.target.value);
                }} 
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 outline-none focus:border-blue-400 resize-none" placeholder="Reason for return, issues noted..." />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Return Picture</Label>
              <Input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setReturnPicture(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} className="bg-white border-slate-200 rounded-xl text-xs h-9" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-3">
            <Button variant="ghost" onClick={() => { setReturnModal(null); setReturnKm(0); setReturnReason(""); setReturnPicture(null); }} className="text-xs rounded-xl px-4">Cancel</Button>
            <Button onClick={handleReturn} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 h-10">Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog isOpen={!!deleteId} onOpenChange={open => !open && setDeleteId(null)} onConfirm={() => { deleteVehicle(deleteId!); toast.success("Vehicle removed"); setDeleteId(null); }} title="Remove Vehicle" description="Remove this vehicle from the fleet registry." confirmText="Remove" variant="danger" />

      {/* Full Details Sheet */}
      <Sheet open={!!fullViewVehicle} onOpenChange={open => !open && setFullViewVehicle(null)}>
        <SheetContent side="right" className="w-full sm:w-[95vw] sm:w-full max-w-md p-0 border-l-0 bg-slate-50 flex flex-col h-full overflow-hidden">
          {fullViewVehicle && (
            <>
              <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 overflow-hidden shrink-0">
                    {fullViewVehicle.picture ? <img src={fullViewVehicle.picture} alt="" className="w-full h-full object-cover"/> : <Car className="w-6 h-6"/>}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-tight">{fullViewVehicle.brand}</h2>
                    <p className="text-xs text-slate-500 font-semibold">{fullViewVehicle.plateCode} {fullViewVehicle.plateNumber}</p>
                  </div>
                </div>
                <StatusBadge status={fullViewVehicle.status} />
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FileText className="w-4 h-4"/> Vehicle Info</h3>
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-semibold text-slate-800">{fullViewVehicle.vehicleType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Colour</span><span className="font-semibold text-slate-800">{fullViewVehicle.colour}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Registration</span><span className="font-semibold text-slate-800">{fullViewVehicle.registrationCountry} ({fullViewVehicle.emirate})</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Current KM</span><span className="font-semibold text-slate-800">{fullViewVehicle.km.toLocaleString()} KM</span></div>
                    {fullViewVehicle.notes && <div className="pt-2 border-t border-slate-100 mt-2"><span className="text-slate-500 block mb-1">Notes:</span><span className="text-slate-700">{fullViewVehicle.notes}</span></div>}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Calendar className="w-4 h-4"/> Expiries</h3>
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center"><span className="text-slate-500">Insurance</span><span className={`font-bold px-2.5 py-1 rounded-lg ${getDaysLeft(fullViewVehicle.insuranceExpiry) <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{formatDate(fullViewVehicle.insuranceExpiry)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">Registration</span><span className={`font-bold px-2.5 py-1 rounded-lg ${getDaysLeft(fullViewVehicle.registrationExpiry) <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{formatDate(fullViewVehicle.registrationExpiry)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-slate-500">License Expiry</span><span className={`font-bold px-2.5 py-1 rounded-lg ${getDaysLeft(fullViewVehicle.licenseExpiry) <= 30 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{formatDate(fullViewVehicle.licenseExpiry)}</span></div>
                  </div>
                </div>

                {fullViewVehicle.assignmentHistory && fullViewVehicle.assignmentHistory.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><History className="w-4 h-4"/> Assignment History</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                      {fullViewVehicle.assignmentHistory.map((h, i) => (
                        <div key={h.id} className={`text-xs ${i !== fullViewVehicle.assignmentHistory!.length - 1 ? "border-b border-slate-100 pb-4" : ""}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-800">{h.assignedTo} <span className="text-slate-400 font-normal">({h.company} · {h.branch})</span></span>
                            <span className="text-slate-400 whitespace-nowrap">{formatDate(h.assignedDate)}{h.returnDate ? ` to ${formatDate(h.returnDate)}` : " (Present)"}</span>
                          </div>
                          
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Assigned Condition</div>
                              <div className="text-slate-700 font-semibold mb-2">{h.conditionBefore || "Not specified"}</div>
                              {h.pictureBefore && <img src={h.pictureBefore} className="w-full h-20 rounded-lg object-cover border border-slate-200" alt="Before" />}
                            </div>
                            
                            {h.returnDate && (
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="text-[9px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Return Condition</div>
                                <div className="text-slate-700 font-semibold mb-2">{h.conditionReturn || "Not specified"}</div>
                                {h.pictureReturn && <img src={h.pictureReturn} className="w-full h-20 rounded-lg object-cover border border-slate-200" alt="Return" />}
                              </div>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-[10px] font-semibold text-slate-600">
                            <div>
                              <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Start KM</span>
                              <span className="font-bold text-slate-800">{(h.startKm || 0).toLocaleString()} KM</span>
                            </div>
                            {h.returnDate && (
                              <>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Return KM</span>
                                  <span className="font-bold text-slate-800">{(h.returnKm || 0).toLocaleString()} KM</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Driven</span>
                                  <span className="font-bold text-indigo-600">
                                    {h.drivenKm !== undefined ? h.drivenKm.toLocaleString() : ((h.returnKm && h.startKm && h.returnKm >= h.startKm) ? (h.returnKm - h.startKm).toLocaleString() : 0)} KM
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          {h.totalPayment !== undefined && h.totalPayment > 0 && (
                            <div className="mt-1.5 flex justify-between items-center bg-blue-50/50 px-2.5 py-1.5 rounded-xl border border-blue-100 text-[10px] font-semibold text-blue-700">
                              <span>Mileage Allowance:</span>
                              <span className="font-bold">{h.ratePerKm ? `${h.ratePerKm} AED/KM` : ""} · {h.totalPayment.toLocaleString()} AED</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
