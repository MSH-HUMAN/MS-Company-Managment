import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString || dateString === "-") return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return dateString;
  }
}

export function getStatusColor(status: string | null | undefined): string {
  if (!status) return "bg-gray-100 text-gray-800 border-gray-200";
  const s = status.toLowerCase();
  switch (s) {
    case "active":
    case "placed":
    case "approved":
    case "completed":
    case "present":
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
    case "processing":
    case "scheduled":
    case "draft":
    case "pending approval":
    case "interview schedule pending":
    case "late":
    case "late in":
    case "half day":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "inactive":
    case "disabled":
    case "rejected":
    case "incomplete":
    case "cancelled":
    case "absent":
    case "expired":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "suspended":
    case "returned":
    case "maintenance":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "assigned":
    case "reassigned":
    case "rescheduled":
    case "leave":
    case "expiring soon":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","), // header row
    ...data.map(row => 
      headers.map(fieldName => {
        const val = row[fieldName];
        const stringVal = val === null || val === undefined ? "" : String(val);
        // Escape quotes
        return `"${stringVal.replace(/"/g, '""')}"`;
      }).join(",")
    )
  ];
  
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

