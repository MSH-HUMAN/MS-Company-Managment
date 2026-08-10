"use strict";

import Link from "next/link";
import { useState } from "react";
import { 
  Phone, Mail, MapPin, Calendar, FileText, ChevronRight, User, 
  Building2, ShieldAlert, Award, AlertTriangle, Car, MessageCircle,
  History, Download, Eye, Globe, Edit, Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStatusColor, formatDate } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import TimelineItem from "./TimelineItem";
import { toast } from "sonner";

interface ProfileCardProps {
  type: "applicant" | "staff" | "company" | "supplier" | "vehicle";
  id: string;
  name: string;
  subtitle: string;
  status: string;
  image?: string | null;
  flag?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  extraInfo?: string;
  visaExpiry?: string;
  passportExpiry?: string;
  statusHistory?: any[];
  documents?: any[];
  alert?: {
    message: string;
    type: "critical" | "warning";
  } | null;
  detailUrl: string;
  onStatusChange?: (newStatus: string) => void;
  statusOptions?: string[];
  editUrl?: string;
  onDelete?: () => void;
}

export default function ProfileCard({
  type,
  id,
  name,
  subtitle,
  status,
  image,
  flag,
  nationality,
  email,
  phone,
  whatsapp,
  extraInfo,
  visaExpiry,
  passportExpiry,
  statusHistory = [],
  documents = [],
  alert,
  detailUrl,
  onStatusChange,
  statusOptions = [],
  editUrl,
  onDelete
}: ProfileCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const getInitials = (n: string) => {
    return n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const getPlaceholderIcon = () => {
    switch (type) {
      case "company":
        return <Building2 className="w-5 h-5 text-slate-400" />;
      case "vehicle":
        return <Car className="w-5 h-5 text-slate-400" />;
      default:
        return <User className="w-5 h-5 text-slate-400" />;
    }
  };

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const profileImage = image || (documents || []).find((d: any) => {
    const n = (d.name || "").toLowerCase();
    const t = (d.type || "").toLowerCase();
    const u = (d.url || "");
    return n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png") || n.endsWith(".webp") || t.startsWith("image/") || u.startsWith("data:image/");
  })?.url;

  return (
    <>
      <Card className="rounded-2xl shadow-sm border border-slate-100 bg-white p-4 sm:p-5 hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between h-full relative select-none overflow-hidden">
        {/* Expiry alerts inside card */}
        {alert && (
          <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${
            alert.type === "critical" ? "bg-rose-500 animate-pulse" : "bg-amber-400"
          }`} />
        )}

        <div>
          {/* Header: Photo / Avatar + status */}
          <div className="flex items-start justify-between gap-2.5 mb-3.5 border-b border-slate-100 pb-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar 
                onClick={() => profileImage && !profileImage.endsWith(".pdf") && setShowPhotoModal(true)}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-slate-200 flex-shrink-0 bg-slate-50 overflow-hidden shadow-sm ${profileImage ? "cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all" : ""}`}
                title={profileImage ? "Click to view full photo" : name}
              >
                {profileImage ? (
                  profileImage.startsWith("data:application/pdf") || profileImage.endsWith(".pdf") ? (
                    <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-500 rounded-2xl">
                      <FileText className="w-6 h-6 animate-pulse" />
                    </div>
                  ) : (
                    <img src={profileImage} alt={name} className="w-full h-full object-cover object-top rounded-2xl" />
                  )
                ) : (
                  <AvatarFallback className="rounded-2xl bg-slate-100 font-bold text-slate-700 text-sm">
                    {getInitials(name) || getPlaceholderIcon()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-start gap-1 flex-wrap">
                  <h4 className="text-xs font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-2 uppercase break-words" title={name}>
                    {name}
                  </h4>
                  {flag && <span className="text-xs flex-shrink-0" title={nationality}>{flag}</span>}
                </div>
                <span className="text-[10px] font-semibold text-slate-500 line-clamp-2 block mt-1 break-words" title={subtitle}>
                  {subtitle}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={status} />
            </div>
          </div>

          {/* Dynamic Alerts */}
          {alert && (
            <div className={`flex items-start gap-1.5 p-2 rounded-xl text-[10px] font-bold leading-normal mb-4 ${
              alert.type === "critical" 
                ? "bg-rose-50 border border-rose-100 text-rose-700" 
                : "bg-amber-50 border border-amber-100 text-amber-700"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{alert.message}</span>
            </div>
          )}

          {/* Content detail fields */}
          <div className="space-y-2 text-[11px] text-slate-600 font-medium">
            {email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <a href={`https://wa.me/${whatsapp}`} target="_blank" className="text-emerald-600 font-bold hover:underline">
                  WhatsApp Contact
                </a>
              </div>
            )}
            {nationality && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Nationality: <span className="font-bold text-slate-800">{nationality} {flag}</span></span>
              </div>
            )}
            {visaExpiry && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Visa Exp: <span className="font-bold text-slate-800">{formatDate(visaExpiry)}</span></span>
              </div>
            )}
            {passportExpiry && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>Passport Exp: <span className="font-bold text-slate-800">{formatDate(passportExpiry)}</span></span>
              </div>
            )}
            {extraInfo && !visaExpiry && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{extraInfo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Footer: Detail Link / Actions */}
        <div className="border-t border-slate-100 pt-4 mt-5 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(type === "applicant" || type === "staff" || type === "supplier") && (
              <>
                {(statusHistory || []).length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowHistory(true)}
                    className="w-7 h-7 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg"
                    title="Status Change History"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                )}
                {(documents || []).length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowDocs(true)}
                    className="w-7 h-7 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg"
                    title="View Uploaded Documents"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider self-center ml-1">
              ID: {id}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {editUrl && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="w-7 h-7 hover:bg-slate-100 text-amber-500 hover:text-amber-600 rounded-lg"
                title="Edit Profile"
              >
                <Link href={editUrl}>
                  <Edit className="w-3.5 h-3.5" />
                </Link>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="w-7 h-7 hover:bg-rose-50 text-rose-500 hover:text-rose-600 rounded-lg"
                title="Delete Profile"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 h-8 gap-1 rounded-xl font-bold"
            >
              <Link href={detailUrl}>
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* DIALOG: STATUS HISTORY */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-blue-600" /> Status Progression: {name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Audit log of status updates and reasons.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {(statusHistory || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No status logs recorded for this applicant.</p>
            ) : (
              <div className="space-y-4 max-w-sm mx-auto">
                {(statusHistory || []).map((item, idx) => (
                  <TimelineItem
                    key={idx}
                    date={item.date}
                    changedBy={item.changedBy}
                    oldStatus={item.oldStatus}
                    newStatus={item.newStatus}
                    reason={item.reason}
                    companyName={item.companyName}
                    isLast={idx === (statusHistory || []).length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: UPLOADED DOCUMENTS */}
      <Dialog open={showDocs} onOpenChange={setShowDocs}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-6 max-w-md">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4.5 h-4.5 text-blue-600" /> Verification Documents: {name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Access and download files uploaded for this applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {(documents || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No files have been attached to this profile.</p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {(documents || []).map((doc) => (
                  <div key={doc.id} className="p-3 border border-slate-100 rounded-xl flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="w-7 h-7 text-blue-500 flex-shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-700 truncate">{doc.name}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          By {doc.uploadedBy} on {formatDate(doc.uploadedDate)}
                        </div>
                      </div>
                    </div>
                      <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (doc.url) {
                            const win = window.open();
                            if (win) { win.document.write(`<img src="${doc.url}" style="max-width:100%" />`); }
                          } else {
                            toast.info(`No preview available for "${doc.name}"`);
                          }
                        }}
                        className="w-7 h-7 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (doc.url) {
                            const a = document.createElement("a");
                            a.href = doc.url;
                            a.download = doc.name;
                            a.click();
                          } else {
                            toast.info(`No file data for "${doc.name}"`);
                          }
                        }}
                        className="w-7 h-7 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: PHOTO LIGHTBOX PREVIEW */}
      <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
        <DialogContent className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-4 max-w-lg text-white">
          <DialogHeader className="pb-2 border-b border-slate-800">
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> {name} — Profile Photo
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 flex items-center justify-center bg-black/40 rounded-2xl overflow-hidden max-h-[75vh]">
            {profileImage && (
              <img src={profileImage} alt={name} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
