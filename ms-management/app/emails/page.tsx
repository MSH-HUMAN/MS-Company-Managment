"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import {
  Mail, Send, Search, Users, Clock, CheckCircle, AlertTriangle,
  X, Plus, RefreshCw, Eye, AlertCircle, Edit, ShieldAlert, Ban, Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AccessDenied from "@/components/shared/AccessDenied";

// Templates metadata matching our HTML files and templateTypes
const EMAIL_TEMPLATES = [
  {
    id: "applicant-registration-confirmation",
    type: "Registration",
    label: "Applicant Registration Confirmation",
    icon: "✔",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Recipient Name", placeholder: "e.g. John Doe", required: true },
      { name: "trackingCode", label: "Tracking Code", placeholder: "e.g. APP-78391", required: true },
      { name: "applicationDate", label: "Application Date", placeholder: "e.g. 2026-07-06", required: true },
      { name: "applyingPositions", label: "Positions Applied", placeholder: "e.g. Accountant, Secretary", required: true },
    ]
  },
  {
    id: "interview-invitation",
    type: "Interview",
    label: "Interview Invitation",
    icon: "📅",
    color: "bg-blue-50 text-blue-700 border-blue-200/50",
    fields: [
      { name: "recipientName", label: "Recipient Name", placeholder: "e.g. John Doe", required: true },
      { name: "role", label: "Interview Position / Role", placeholder: "e.g. Sales Executive", required: true },
      { name: "dateTime", label: "Date & Time", placeholder: "e.g. Monday, July 12 at 10:00 AM GST", required: true },
      { name: "onlinePhysical", label: "Format", placeholder: "e.g. Online or Physical", required: true },
      { name: "meetingMode", label: "Platform / Location Mode", placeholder: "e.g. Zoom, Google Meet, Ajman Office", required: true },
{ name: "conductPersonName", label: "Interviewer Name", placeholder: "e.g. Mohamed Sahib" },
{ name: "conductPersonPosition", label: "Interviewer Position", placeholder: "e.g. HR Manager" },
{ name: "conductPersonMobile", label: "Interviewer Mobile", placeholder: "e.g. +971585538199" },
      { name: "meetingLink", label: "Online Meeting Link (Optional)", placeholder: "e.g. https://zoom.us/j/...", required: false },
      { name: "googleMapLink", label: "Office Map Link (Optional)", placeholder: "e.g. https://maps.google.com/...", required: false },
      { name: "notes", label: "Special Instructions (Optional)", placeholder: "e.g. Please join 5 mins early...", required: false },
    ]
  },
  {
    id: "interview-rescheduled",
    type: "Interview_Rescheduled",
    label: "Interview Rescheduled",
    icon: "⏰",
    color: "bg-amber-50 text-amber-700 border-amber-200/50",
    fields: [
      { name: "recipientName", label: "Recipient Name", placeholder: "e.g. John Doe", required: true },
      { name: "role", label: "Role", placeholder: "e.g. Sales Executive", required: true },
      { name: "dateTime", label: "New Date & Time", placeholder: "e.g. Wednesday, July 14 at 2:00 PM GST", required: true },
      { name: "onlinePhysical", label: "Format", placeholder: "e.g. Online or Physical", required: true },
      { name: "meetingMode", label: "Platform / Location Mode", placeholder: "e.g. Zoom, Google Meet", required: true },
      { name: "conductPersonName", label: "Interviewer Name", placeholder: "e.g. HR Manager", required: true },
      { name: "meetingLink", label: "Online Meeting Link (Optional)", placeholder: "", required: false },
      { name: "googleMapLink", label: "Office Map Link (Optional)", placeholder: "", required: false },
      { name: "notes", label: "Notes (Optional)", placeholder: "", required: false },
    ]
  },
  {
    id: "interview-cancelled",
    type: "Interview_Cancelled",
    label: "Interview Cancelled",
    icon: "❌",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Recipient Name", placeholder: "e.g. John Doe", required: true },
      { name: "role", label: "Position", placeholder: "e.g. Software Developer", required: true },
      { name: "dateTime", label: "Original Date & Time", placeholder: "e.g. 2026-07-08 10:00 AM", required: true },
      { name: "notes", label: "Reason for Cancellation", placeholder: "e.g. Interviewer unavailable", required: false },
    ]
  },
  {
    id: "placement-confirmation",
    type: "Placement",
    label: "Placement Confirmation",
    icon: "🏢",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Applicant Name", placeholder: "e.g. Robert Smith", required: true },
      { name: "clientName", label: "Assigned Client Company", placeholder: "e.g. Al Futtaim Group", required: true },
      { name: "position", label: "Position", placeholder: "e.g. Sales Executive", required: true },
      { name: "salary", label: "Salary (AED)", placeholder: "e.g. 6000", required: true },
      { name: "placementDate", label: "Start Date", placeholder: "e.g. 2026-08-01", required: true },
    ]
  },
  {
    id: "placement-agreement",
    type: "Placement_Agreement",
    label: "Placement Agreement Details",
    icon: "📄",
    color: "bg-blue-50 text-blue-700 border-blue-200/50",
    fields: [
      { name: "recipientName", label: "Applicant Name", placeholder: "e.g. Robert Smith", required: true },
      { name: "position", label: "Position", placeholder: "e.g. Sales Executive", required: true },
      { name: "salary", label: "Salary (AED)", placeholder: "e.g. 6000", required: true },
      { name: "clientName", label: "Company", placeholder: "e.g. Al Futtaim Group", required: true },
      { name: "placementDate", label: "Start Date", placeholder: "e.g. 2026-08-01", required: true },
      { name: "placementId", label: "Placement Record ID (for Link)", placeholder: "e.g. pl_cuid12345", required: true },
      { name: "termsAndConditions", label: "Terms & Conditions", placeholder: "e.g. 3 months probation period...", required: false },
    ]
  },
  {
    id: "offer-letter",
    type: "Offer",
    label: "Offer Letter Invitation",
    icon: "🎉",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Recipient Name", placeholder: "e.g. Sarah Connor", required: true },
      { name: "position", label: "Position", placeholder: "e.g. HR Manager", required: true },
      { name: "salary", label: "Basic Salary (AED)", placeholder: "e.g. 10000", required: true },
      { name: "joiningDate", label: "Joining Date", placeholder: "e.g. 2026-07-20", required: true },
      { name: "allowances", label: "Allowances (Optional)", placeholder: "e.g. Housing: 2000, Transport: 1000", required: false },
      { name: "offerLetterLink", label: "Sign Link (Optional)", placeholder: "e.g. https://mshorizonuae.com/sign/offer/1", required: false },
    ]
  },
  {
    id: "visa-expiry-reminder",
    type: "Visa",
    label: "Visa Expiry Reminder",
    icon: "🛂",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Ahmed Ali", required: true },
      { name: "visaExpiry", label: "Visa Expiry Date", placeholder: "e.g. 2026-08-15", required: true },
      { name: "daysRemaining", label: "Days Remaining", placeholder: "e.g. 30", required: true },
    ]
  },
  {
    id: "passport-expiry-reminder",
    type: "Passport_Expiry",
    label: "Passport Expiry Reminder",
    icon: "🆔",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Ahmed Ali", required: true },
      { name: "passportNumber", label: "Passport Number", placeholder: "e.g. N1234567A", required: true },
      { name: "passportExpiry", label: "Passport Expiry Date", placeholder: "e.g. 2026-12-01", required: true },
      { name: "daysRemaining", label: "Days Remaining", placeholder: "e.g. 150", required: true },
    ]
  },
  {
    id: "staff-registration",
    type: "Staff_Registration",
    label: "Staff Registration Profile",
    icon: "💼",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
    fields: [
      { name: "recipientName", label: "Staff Name", placeholder: "e.g. Emily Watson", required: true },
      { name: "position", label: "Position", placeholder: "e.g. Receptionist", required: true },
      { name: "company", label: "Our Company", placeholder: "e.g. MS HORIZON", required: true },
      { name: "branch", label: "Branch", placeholder: "e.g. Ajman Office", required: true },
      { name: "joiningDate", label: "Joining Date", placeholder: "e.g. 2026-07-01", required: true },
    ]
  },
  {
    id: "user-account-created",
    type: "User_Account_Created",
    label: "User Account Created Details",
    icon: "🔑",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
    fields: [
      { name: "recipientName", label: "User Name", placeholder: "e.g. David Beckham", required: true },
      { name: "to", label: "Login Email Address", placeholder: "e.g. david@mshorizon.ae", required: true },
      { name: "temporaryPassword", label: "Temporary Password", placeholder: "e.g. Welcome@2026", required: true },
      { name: "role", label: "Assigned Role", placeholder: "e.g. Recruiter", required: true },
    ]
  },
  {
    id: "password-reset",
    type: "Password_Reset",
    label: "Password Reset Request Link",
    icon: "🔄",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200/50",
    fields: [
      { name: "recipientName", label: "User Name", placeholder: "e.g. David Beckham", required: true },
      { name: "resetLink", label: "Reset Password Link", placeholder: "e.g. https://mshorizonuae.com/reset-password?token=...", required: true },
    ]
  },
  {
    id: "leave-application-submitted",
    type: "Leave",
    label: "Leave Application Notice",
    icon: "📁",
    color: "bg-violet-50 text-violet-700 border-violet-200/50",
    fields: [
      { name: "staffName", label: "Staff Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "leaveType", label: "Leave Type", placeholder: "e.g. Annual, Sick, Emergency", required: true },
      { name: "startDate", label: "Start Date", placeholder: "e.g. 2026-07-10", required: true },
      { name: "endDate", label: "End Date", placeholder: "e.g. 2026-07-20", required: true },
      { name: "days", label: "Leave Days", placeholder: "e.g. 10", required: true },
      { name: "reason", label: "Reason", placeholder: "e.g. Family vacation", required: true },
    ]
  },
  {
    id: "leave-approved",
    type: "Leave_Approved",
    label: "Leave Request Approved Notice",
    icon: "✅",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Staff Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "leaveType", label: "Leave Type", placeholder: "e.g. Annual", required: true },
      { name: "startDate", label: "Start Date", placeholder: "e.g. 2026-07-10", required: true },
      { name: "endDate", label: "End Date", placeholder: "e.g. 2026-07-20", required: true },
      { name: "days", label: "Leave Days", placeholder: "e.g. 10", required: true },
      { name: "approvedBy", label: "Approved By Name", placeholder: "e.g. HR Manager", required: false },
    ]
  },
  {
    id: "leave-rejected",
    type: "Leave_Rejected",
    label: "Leave Request Rejected Notice",
    icon: "❌",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Staff Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "leaveType", label: "Leave Type", placeholder: "e.g. Annual", required: true },
      { name: "startDate", label: "Start Date", placeholder: "e.g. 2026-07-10", required: true },
      { name: "endDate", label: "End Date", placeholder: "e.g. 2026-07-20", required: true },
      { name: "days", label: "Leave Days", placeholder: "e.g. 10", required: true },
      { name: "rejectionReason", label: "Rejection Reason", placeholder: "e.g. Team shortages during period", required: false },
    ]
  },
  {
    id: "staff-request-submitted",
    type: "Staff_Request_Submitted",
    label: "Staff General Request Submitted",
    icon: "📝",
    color: "bg-sky-50 text-sky-700 border-sky-200/50",
    fields: [
      { name: "recipientName", label: "Requester Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "requestType", label: "Request Type", placeholder: "e.g. Salary Certificate", required: true },
      { name: "date", label: "Request Date", placeholder: "e.g. 2026-07-06", required: true },
      { name: "description", label: "Request Description", placeholder: "e.g. Require salary certificate for bank loan", required: true },
    ]
  },
  {
    id: "staff-request-approved",
    type: "Staff_Request_Approved",
    label: "Staff Request Approved Notice",
    icon: "👍",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Staff Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "requestType", label: "Request Type", placeholder: "e.g. Salary Certificate", required: true },
      { name: "reply", label: "Remarks / Approval Response", placeholder: "e.g. Document generated and available at front desk.", required: false },
    ]
  },
  {
    id: "staff-request-rejected",
    type: "Staff_Request_Rejected",
    label: "Staff Request Rejected Notice",
    icon: "👎",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Staff Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "requestType", label: "Request Type", placeholder: "e.g. Salary Certificate", required: true },
      { name: "reason", label: "Rejection Reason", placeholder: "e.g. Incomplete service period", required: false },
    ]
  },
  {
    id: "task-assigned",
    type: "Task_Assigned",
    label: "Task Assigned Notification",
    icon: "📌",
    color: "bg-teal-50 text-teal-700 border-teal-200/50",
    fields: [
      { name: "recipientName", label: "Assigned To Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "title", label: "Task Title", placeholder: "e.g. Update Applicant Database", required: true },
      { name: "description", label: "Task Description", placeholder: "e.g. Please verify and input all pending applications", required: true },
      { name: "priority", label: "Priority", placeholder: "e.g. High, Medium, Low", required: true },
      { name: "dueDate", label: "Due Date", placeholder: "e.g. 2026-07-09", required: true },
    ]
  },
  {
    id: "task-deadline-reminder",
    type: "Task_Deadline_Reminder",
    label: "Task Deadline Approaching Reminder",
    icon: "⏰",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "title", label: "Task Title", placeholder: "e.g. Update Applicant Database", required: true },
      { name: "dueDate", label: "Deadline Date/Time", placeholder: "e.g. 2026-07-09", required: true },
      { name: "priority", label: "Priority", placeholder: "e.g. High", required: true },
    ]
  },
  {
    id: "payroll-generated",
    type: "Payroll",
    label: "Payroll Generated Notice",
    icon: "💵",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "month", label: "Payroll Month (e.g. June 2026)", placeholder: "e.g. June 2026", required: true },
      { name: "date", label: "Generation Date", placeholder: "e.g. 2026-07-01", required: true },
    ]
  },
  {
    id: "payslip-available",
    type: "Payslip",
    label: "Payslip Available Notice",
    icon: "📊",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Jessica Alba", required: true },
      { name: "month", label: "Payslip Month", placeholder: "e.g. June 2026", required: true },
      { name: "basicSalary", label: "Basic Salary (AED)", placeholder: "e.g. 5000", required: true },
      { name: "allowances", label: "Total Allowances (AED)", placeholder: "e.g. 1500", required: true },
      { name: "deductions", label: "Total Deductions (AED)", placeholder: "e.g. 200", required: true },
      { name: "netSalary", label: "Net Salary (AED)", placeholder: "e.g. 6300", required: true },
    ]
  },
  {
    id: "birthday-wishes",
    type: "Birthday",
    label: "Birthday Wishes card",
    icon: "🎂",
    color: "bg-amber-50 text-amber-700 border-amber-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Jessica Alba", required: true },
    ]
  },
  {
    id: "system-notification",
    type: "System",
    label: "General System Alert / Notice",
    icon: "🔔",
    color: "bg-slate-50 text-slate-700 border-slate-200/50",
    fields: [
      { name: "body", label: "Email Body Message", placeholder: "Write your email message here...", required: true },
      { name: "actionLink", label: "Action Link (Optional)", placeholder: "e.g. https://mshorizonuae.com/dashboard", required: false },
    ]
  },
  // ─── New Templates ────────────────────────────────────────────────────────
  {
    id: "interview-selected",
    type: "Interview_Selected",
    label: "Interview Selected (Passed)",
    icon: "🎉",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "role", label: "Position / Role", placeholder: "e.g. Sales Executive", required: true },
      { name: "notes", label: "HR Feedback (Optional)", placeholder: "e.g. Excellent performance", required: false },
    ]
  },
  {
    id: "interview-rejected",
    type: "Interview_Rejected",
    label: "Interview Rejected (Not Selected)",
    icon: "❌",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "role", label: "Position / Role", placeholder: "e.g. Sales Executive", required: true },
    ]
  },
  {
    id: "medical-test-reminder",
    type: "Medical_Test_Reminder",
    label: "Medical Test Reminder",
    icon: "🏥",
    color: "bg-orange-50 text-orange-700 border-orange-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "testDate", label: "Medical Test Date", placeholder: "e.g. 2026-07-20", required: true },
      { name: "testTime", label: "Appointment Time", placeholder: "e.g. 9:00 AM", required: true },
      { name: "clinicName", label: "Clinic / Medical Center", placeholder: "e.g. Al Zahra Medical Center", required: true },
      { name: "testLocation", label: "Clinic Address", placeholder: "e.g. Industrial Area 2, Ajman", required: true },
      { name: "clinicPhone", label: "Clinic Phone", placeholder: "e.g. +971 6 123 4567", required: false },
    ]
  },
  {
    id: "medical-passed",
    type: "Medical_Passed",
    label: "Medical Test Passed",
    icon: "✅",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "testDate", label: "Test Date", placeholder: "e.g. 2026-07-15", required: true },
      { name: "clinicName", label: "Medical Center", placeholder: "e.g. Al Zahra Medical Center", required: true },
      { name: "notes", label: "Additional Notes (Optional)", placeholder: "e.g. Report collected", required: false },
    ]
  },
  {
    id: "medical-failed",
    type: "Medical_Failed",
    label: "Medical Test Failed",
    icon: "⚠️",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "testDate", label: "Test Date", placeholder: "e.g. 2026-07-15", required: true },
      { name: "clinicName", label: "Medical Center", placeholder: "e.g. Al Zahra Medical Center", required: true },
      { name: "notes", label: "Reason / Findings (Optional)", placeholder: "e.g. Positive TB test", required: false },
    ]
  },
  {
    id: "emirates-id-update",
    type: "Emirates_ID_Update",
    label: "Emirates ID Status Update",
    icon: "🪪",
    color: "bg-teal-50 text-teal-700 border-teal-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Ahmed Ali", required: true },
      { name: "emiratesIdStatus", label: "Emirates ID Status", placeholder: "e.g. Processing, Approved, Collected", required: true },
      { name: "emiratesIdExpiry", label: "Emirates ID Expiry Date (Optional)", placeholder: "e.g. 2029-07-15", required: false },
      { name: "notes", label: "Additional Information (Optional)", placeholder: "e.g. Ready for collection", required: false },
    ]
  },
  {
    id: "labour-contract-update",
    type: "Labour_Contract_Update",
    label: "Labour Contract Status Update",
    icon: "📜",
    color: "bg-teal-50 text-teal-700 border-teal-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. Ahmed Ali", required: true },
      { name: "labourContractStatus", label: "Contract Status", placeholder: "e.g. Processing, Approved, Stamped", required: true },
      { name: "contractExpiryDate", label: "Contract Expiry Date (Optional)", placeholder: "e.g. 2028-07-15", required: false },
      { name: "notes", label: "Additional Information (Optional)", placeholder: "e.g. MOL stamped", required: false },
    ]
  },
  {
    id: "visa-processing-started",
    type: "Visa_Processing_Started",
    label: "Visa Processing Started",
    icon: "🛂",
    color: "bg-blue-50 text-blue-700 border-blue-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "passportNumber", label: "Passport Number", placeholder: "e.g. N1234567A", required: true },
      { name: "position", label: "Position / Job Title", placeholder: "e.g. Sales Executive", required: true },
      { name: "visaStatus", label: "Visa Type", placeholder: "e.g. Employment Visa, Tourist Visa", required: false },
    ]
  },
  {
    id: "visa-approved",
    type: "Visa_Approved",
    label: "Visa Approved",
    icon: "✅",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "passportNumber", label: "Passport Number", placeholder: "e.g. N1234567A", required: true },
      { name: "visaExpiry", label: "Visa Expiry Date", placeholder: "e.g. 2028-07-15", required: true },
    ]
  },
  {
    id: "visa-rejected",
    type: "Visa_Rejected",
    label: "Visa Rejected",
    icon: "❌",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "Candidate Name", placeholder: "e.g. John Doe", required: true },
      { name: "passportNumber", label: "Passport Number", placeholder: "e.g. N1234567A", required: true },
      { name: "notes", label: "Rejection Reason (Optional)", placeholder: "e.g. Invalid documents", required: false },
    ]
  },
  {
    id: "joining-confirmation",
    type: "Joining_Confirmation",
    label: "Joining Confirmation",
    icon: "🚀",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. John Doe", required: true },
      { name: "position", label: "Position / Job Title", placeholder: "e.g. Sales Executive", required: true },
      { name: "employerName", label: "Employer / Company", placeholder: "e.g. Al Futtaim Group", required: true },
      { name: "joiningDate", label: "Joining Date", placeholder: "e.g. 2026-08-01", required: true },
      { name: "reportingTime", label: "Reporting Time", placeholder: "e.g. 8:00 AM", required: true },
      { name: "reportingLocation", label: "Reporting Location / Address", placeholder: "e.g. Al Futtaim HQ, Dubai", required: true },
    ]
  },
  {
    id: "welcome-employee",
    type: "Welcome_Employee",
    label: "Welcome New Employee",
    icon: "🌟",
    color: "bg-purple-50 text-purple-700 border-purple-200/50",
    fields: [
      { name: "recipientName", label: "Employee Name", placeholder: "e.g. John Doe", required: true },
      { name: "position", label: "Job Title", placeholder: "e.g. Sales Executive", required: true },
      { name: "employerName", label: "Employer / Company", placeholder: "e.g. Al Futtaim Group", required: true },
      { name: "startDate", label: "Start Date", placeholder: "e.g. 2026-08-01", required: true },
      { name: "workLocation", label: "Work Location", placeholder: "e.g. Dubai Office", required: true },
      { name: "portalUrl", label: "HR Portal URL (Optional)", placeholder: "e.g. https://mshorizonuae.com/login", required: false },
      { name: "tempPassword", label: "Temporary Password (Optional)", placeholder: "e.g. Welcome@2026", required: false },
    ]
  },
  {
    id: "account-activated",
    type: "Account_Activated",
    label: "Account Activated",
    icon: "🔓",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fields: [
      { name: "recipientName", label: "User Name", placeholder: "e.g. John Doe", required: true },
      { name: "role", label: "System Role", placeholder: "e.g. Recruiter, HR Manager", required: true },
      { name: "portalUrl", label: "Portal / Login URL", placeholder: "e.g. https://mshorizonuae.com/login", required: true },
      { name: "tempPassword", label: "Temporary Password (Optional)", placeholder: "e.g. Welcome@2026", required: false },
    ]
  },
  {
    id: "account-locked",
    type: "Account_Locked",
    label: "Account Locked / Suspended",
    icon: "🔒",
    color: "bg-rose-50 text-rose-700 border-rose-200/50",
    fields: [
      { name: "recipientName", label: "User Name", placeholder: "e.g. John Doe", required: true },
      { name: "reason", label: "Reason for Lock / Suspension", placeholder: "e.g. Multiple failed login attempts", required: true },
      { name: "notes", label: "Next Steps (Optional)", placeholder: "e.g. Contact HR to unlock", required: false },
    ]
  },
  {
    id: "general-announcement",
    type: "General_Announcement",
    label: "General Announcement / Notice",
    icon: "📢",
    color: "bg-violet-50 text-violet-700 border-violet-200/50",
    fields: [
      { name: "recipientName", label: "Recipient Name", placeholder: "e.g. All Staff / John Doe", required: true },
      { name: "announcementTitle", label: "Announcement Title", placeholder: "e.g. Office Closure Notice", required: true },
      { name: "announcementMessage", label: "Announcement Message", placeholder: "e.g. Dear Team, the office will be closed on...", required: true },
      { name: "notes", label: "Additional Notes (Optional)", placeholder: "e.g. Contact HR for queries", required: false },
    ]
  },
];


type Contact = {
  name: string;
  email: string;
  type: "staff" | "applicant";
  company?: string;
  extra?: any;
};

export default function EmailsPage() {
  const { staff, applicants, hasPermission, currentRole, currentUser } = useAuthStore();

  const canView = currentRole === "Super Admin" || hasPermission("emails", "view");
  if (!canView) {
    return <AccessDenied />;
  }

  const [tab, setTab] = useState<"compose" | "history">("compose");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateType, setTemplateType] = useState<string>("");
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  
  // Contacts pool
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchContact, setSearchContact] = useState("");

  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // Modal / Preview states
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isEditingPreview, setIsEditingPreview] = useState(false);
  const [editedHtml, setEditedHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // View historical email content modal
  const [viewingEmailRecord, setViewingEmailRecord] = useState<any | null>(null);

  // Auto-build contact pool
  const contactPool = useMemo<Contact[]>(() => {
    const s: Contact[] = staff
      .filter(x => x.email)
      .map(x => ({ name: x.name, email: x.email, type: "staff", company: x.company, extra: x }));
    const a: Contact[] = applicants
      .filter(x => x.email)
      .map(x => ({ name: x.fullName, email: x.email, type: "applicant", company: x.company, extra: x }));

    // Remove duplicates
    const seen = new Set<string>();
    return [...s, ...a].filter(c => {
      if (seen.has(c.email.toLowerCase())) return false;
      seen.add(c.email.toLowerCase());
      return true;
    });
  }, [staff, applicants]);

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    if (!searchContact) return [];
    return contactPool.filter(c => 
      c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
      c.email.toLowerCase().includes(searchContact.toLowerCase())
    ).slice(0, 5);
  }, [searchContact, contactPool]);

  // Fetch email history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/emails");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        toast.error("Failed to load email history log");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (tab === "history") {
      fetchHistory();
    }
  }, [tab]);

  // Active template configuration
  const activeTemplate = useMemo(() => {
    return EMAIL_TEMPLATES.find(t => t.id === templateType);
  }, [templateType]);

  // Initialize fields on template change
  useEffect(() => {
    if (activeTemplate) {
      const initial: Record<string, string> = {};
      activeTemplate.fields.forEach(f => {
        initial[f.name] = "";
      });
      
      // Auto-prepopulate recipientName if selected contact name matches
      const matchedContact = contactPool.find(c => c.email.toLowerCase() === to.toLowerCase());
      if (matchedContact) {
        initial["recipientName"] = matchedContact.name;
      }
      
      setTemplateData(initial);
      setSubject(activeTemplate.label);
    } else {
      setTemplateData({});
      setSubject("");
    }
  }, [templateType]);

  // Permissions validation
  const canSend = hasPermission("emails", "create") || currentRole === "Super Admin";
  const canViewHistory = hasPermission("emails", "view") || currentRole === "Super Admin";
  const canEditTemplate = hasPermission("emails", "edit") || currentRole === "Super Admin";

  const handleSelectContact = (c: Contact) => {
    setTo(c.email);
    setSearchContact("");
    setShowSuggestions(false);

    // Prepopulate fields if template already selected
    if (templateData) {
      setTemplateData(prev => ({
        ...prev,
        recipientName: c.name,
        // Match specific fields like basicSalary or visaExpiry
        basicSalary: c.extra?.basicSalary ? String(c.extra.basicSalary) : (prev.basicSalary || ""),
        visaExpiry: c.extra?.visaExpiry || (prev.visaExpiry || ""),
        passportExpiry: c.extra?.passportExpiry || (prev.passportExpiry || ""),
        passportNumber: c.extra?.passportNumber || (prev.passportNumber || ""),
        position: c.extra?.position || (prev.position || ""),
        joiningDate: c.extra?.joiningDate || (prev.joiningDate || ""),
        company: c.company || (prev.company || ""),
        branch: c.extra?.branch || (prev.branch || ""),
        trackingCode: c.extra?.trackingCode || (prev.trackingCode || ""),
      }));
    }
    toast.success(`Selected recipient: ${c.name}`);
  };

  const handlePreview = async () => {
    if (!to) return toast.error("Recipient email is required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) return toast.error("Please enter a valid email address");

    // Validate fields
    if (activeTemplate) {
      for (const field of activeTemplate.fields) {
        if (field.required && !templateData[field.name]) {
          return toast.error(`Missing required field: ${field.label}`);
        }
      }
    } else {
      if (!subject) return toast.error("Subject is required");
      if (!body) return toast.error("Message body is required");
    }

    try {
      const payload = {to:to,
        subject: subject,
        body: activeTemplate ? "" : body,
        templateType: activeTemplate?.type || "System",
        templateData: activeTemplate ? {
          ...templateData,
          to: to,
          companyEmail: "info@safayar-msjobs.com",
companyPhone: "058 553 8199",
companyAddress: "Ajman, UAE",
        } : {
          body: body,
          recipientName: "Recipient",
          to: to
        }
      };

      const res = await fetch("/api/emails/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        setPreviewHtml(result.html);
        setEditedHtml(result.html);
        setIsEditingPreview(false);
        setShowPreviewModal(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Preview compilation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error compiling preview");
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const payload = {
        to: to,
        subject: subject,
        body: isEditingPreview ? editedHtml : (activeTemplate ? "" : body),
        // If they edited the HTML directly, we send it precompiled
        templateType: isEditingPreview ? undefined : (activeTemplate?.type || "System"),
        templateData: isEditingPreview ? undefined : {
          ...templateData,
          to: to
        },
        candidateName: activeTemplate ? (templateData.recipientName || "Candidate") : "Custom Recipient",
      };

      // Basic duplicate detection locally
      const isDuplicate = history.some(h => 
        h.to.toLowerCase() === to.toLowerCase() && 
        h.subject === subject &&
        (new Date().getTime() - new Date(h.sentAt).getTime() < 10000) // within 10 seconds
      );

      if (isDuplicate) {
        const confirmSend = confirm("An identical email was sent to this address within the last 10 seconds. Do you want to send again?");
        if (!confirmSend) {
          setSending(false);
          return;
        }
      }

      const res = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Email sent and recorded successfully!");
        setShowPreviewModal(false);
        // Reset form
        setTo("");
        setSubject("");
        setBody("");
        setTemplateType("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send email");
      }
    } catch (err) {
      console.error(err);
      toast.error("SMTP error or network connection failed");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      const res = await fetch("/api/emails/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        toast.success("Email resent successfully!");
        fetchHistory();
      } else {
        const data = await res.json();
        toast.error(data.error || "Resend failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error resending email");
    } finally {
      setResendingId(null);
    }
  };

  // Filter history list
  const filteredHistory = useMemo(() => {
    if (!historySearch) return history;
    const q = historySearch.toLowerCase();
    return history.filter(h => 
      h.to.toLowerCase().includes(q) || 
      h.subject.toLowerCase().includes(q) || 
      (h.templateName && h.templateName.toLowerCase().includes(q))
    );
  }, [historySearch, history]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Email Notification Center"
        subtitle="Manage professional responsive branding templates, log dispatch history, preview and retry failed SMTP notifications."
      />

      {/* Access Permission Block */}
      {!canSend && !canViewHistory && (
        <Card className="rounded-2xl border-rose-200 bg-rose-50/50 p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Access Denied</h3>
          <p className="text-sm text-slate-500 w-[95vw] sm:w-full max-w-md mx-auto">
            You do not have the required permissions to view or dispatch email templates. Please contact your system administrator.
          </p>
        </Card>
      )}

      {(canSend || canViewHistory) && (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-6">
            {canSend && (
              <button
                onClick={() => setTab("compose")}
                className={cn(
                  "pb-3 text-sm font-bold transition-all relative",
                  tab === "compose"
                    ? "text-primary border-b-2 border-primary"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Compose Email
              </button>
            )}
            {canViewHistory && (
              <button
                onClick={() => setTab("history")}
                className={cn(
                  "pb-3 text-sm font-bold transition-all relative",
                  tab === "history"
                    ? "text-primary border-b-2 border-primary"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Email History & Logs
              </button>
            )}
          </div>

          {tab === "compose" && canSend && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Form controls */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 rounded-2xl border-slate-100 bg-white shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    1. Target Recipient & Template selection
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select Contact Search */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Contacts</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <Input
                          placeholder="Search applicant / staff..."
                          value={searchContact}
                          onChange={(e) => {
                            setSearchContact(e.target.value);
                            setShowSuggestions(true);
                          }}
                          className="pl-9 h-10 border-slate-200 rounded-xl text-xs bg-slate-50/50"
                        />
                      </div>
                      
                      {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute z-20 w-full top-[62px] bg-white border border-slate-100 rounded-xl shadow-lg p-2 space-y-1">
                          {filteredSuggestions.map((c) => (
                            <button
                              key={c.email}
                              onClick={() => handleSelectContact(c)}
                              className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-xs flex justify-between items-center"
                            >
                              <div>
                                <span className="font-bold text-slate-700">{c.name}</span>
                                <span className="text-slate-400 block text-[10px]">{c.email}</span>
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600">
                                {c.type}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recipient Email */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recipient Email *</label>
                      <Input
                        placeholder="recipient@example.com"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="h-10 border-slate-200 rounded-xl text-xs bg-white"
                        required
                      />
                    </div>
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Template Type</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Custom Generic Email (No Template)</option>
                      {EMAIL_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>

                {/* Card 2: Template inputs OR custom input */}
                <Card className="p-6 rounded-2xl border-slate-100 bg-white shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                    2. Email Parameters & Content
                  </h3>

                  {activeTemplate ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeTemplate.fields.map((field) => (
                        <div key={field.name} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {field.label} {field.required && "*"}
                          </label>
                          <Input
                            placeholder={field.placeholder || ""}
                            value={templateData[field.name] || ""}
                            onChange={(e) => setTemplateData(prev => ({
                              ...prev,
                              [field.name]: e.target.value
                            }))}
                            className="h-10 border-slate-200 rounded-xl text-xs"
                            required={field.required}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Subject</label>
                        <Input
                          placeholder="Enter email subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="h-10 border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message Body</label>
                        <textarea
                          rows={6}
                          placeholder="Write your email body here. Markdown is supported."
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <Button
                      onClick={handlePreview}
                      className="rounded-xl px-6 bg-primary hover:bg-primary/95 text-white font-bold h-10 shadow-lg shadow-primary/20 flex gap-2 items-center"
                    >
                      <Eye className="w-4 h-4" /> Preview Email before Send
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Right Sidebar Info card */}
              <div className="space-y-6">
                <Card className="p-6 rounded-2xl border-slate-100 bg-slate-50/50 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-primary" /> Template Engine Guide
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Selecting a template generates a mobile-responsive template styled with company themes and components.
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 bg-white rounded-xl border border-slate-100 flex gap-3 items-center">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        1
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">Company primary styling applied</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-100 flex gap-3 items-center">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                        2
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">Precompiled Live HTML preview</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-100 flex gap-3 items-center">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                        3
                      </div>
                      <span className="text-[11px] font-bold text-slate-600">Secure SMTP Logging in logs</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {tab === "history" && canViewHistory && (
            <Card className="p-6 rounded-2xl border-slate-100 bg-white shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Dispatched Email Audit Log
                </h3>
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    placeholder="Search logs by recipient, subject..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 h-10 border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary/50" />
                  <p className="text-xs font-medium">Fetching history from db...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-100 rounded-xl">
                  <Ban className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">No dispatched records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="p-4">Recipient</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Template</th>
                        <th className="p-4">Date / Time</th>
                        <th className="p-4">Sent By</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                      {filteredHistory.map((record) => {
                        const isFailed = record.deliveryStatus === "Failed";
                        const isSent = record.deliveryStatus === "Sent";
                        const isSim = record.deliveryStatus === "Simulated" || record.deliveryStatus === "Pending";

                        return (
                          <tr key={record.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-slate-800">{record.to}</td>
                            <td className="p-4 truncate max-w-xs">{record.subject}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wider">
                                {record.templateName || "Generic"}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400">
                              {new Date(record.sentAt).toLocaleDateString()} at {new Date(record.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-4">{record.sentBy || "System"}</td>
                            <td className="p-4 text-center">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                isSent && "bg-emerald-50 text-emerald-700",
                                isFailed && "bg-rose-50 text-rose-700",
                                isSim && "bg-blue-50 text-blue-700"
                              )}>
                                {isSent && <CheckCircle className="w-3. h-3 text-emerald-600" />}
                                {isFailed && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                {record.deliveryStatus}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewingEmailRecord(record)}
                                className="h-8 rounded-lg text-slate-500 hover:text-slate-800"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {isFailed && canSend && (
                                <Button
                                  size="sm"
                                  onClick={() => handleResend(record.id)}
                                  disabled={resendingId === record.id}
                                  className="h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px]"
                                >
                                  {resendingId === record.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    "Retry"
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Preview Modal before Sending */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <Card className="w-full w-[95vw] sm:w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  Email Dispatch Live Preview
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Review the compiled layout. Edit raw code if permitted or proceed to SMTP dispatch.
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50 flex flex-col lg:flex-row gap-6 min-h-0">
              {/* Sandbox rendered Frame */}
              <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[50vh] lg:h-auto min-h-0">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">PREVIEW PORT</span>
                  {canEditTemplate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPreview(!isEditingPreview)}
                      className={cn(
                        "h-7 text-[10px] font-bold rounded-lg gap-1",
                        isEditingPreview ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      <Edit className="w-3 h-3" /> {isEditingPreview ? "Render Live Preview" : "Edit HTML"}
                    </Button>
                  )}
                </div>

                {isEditingPreview ? (
                  <textarea
                    value={editedHtml}
                    onChange={(e) => setEditedHtml(e.target.value)}
                    className="flex-1 w-full p-4 font-mono text-xs focus:outline-none focus:ring-0 bg-slate-900 text-slate-100"
                  />
                ) : (
                  <iframe
                    srcDoc={isEditingPreview ? editedHtml : previewHtml || ""}
                    className="flex-1 w-full border-0 bg-white"
                    title="Live Email Render Sandbox"
                  />
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-xl px-5 border-slate-200 text-slate-600 h-10 font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="rounded-xl px-6 bg-primary hover:bg-primary/95 text-white font-bold h-10 shadow-lg shadow-primary/20 flex gap-2 items-center"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Email Now
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Historical Record details Modal */}
      {viewingEmailRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <Card className="w-full w-[95vw] sm:w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                  Sent Email Log Details
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Record ID: {viewingEmailRecord.id}
                </p>
              </div>
              <button
                onClick={() => setViewingEmailRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50 space-y-6 flex flex-col lg:flex-row gap-6 min-h-0">
              {/* Meta Panel */}
              <div className="lg:w-80 bg-white rounded-xl border border-slate-100 p-4 space-y-4 shadow-sm flex-shrink-0">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-50 pb-2">
                  Dispatch Metrics
                </h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Recipient</span>
                    <span className="font-bold text-slate-800">{viewingEmailRecord.to}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Subject</span>
                    <span className="font-bold text-slate-800">{viewingEmailRecord.subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sent At</span>
                    <span className="font-bold text-slate-800">
                      {new Date(viewingEmailRecord.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sent By</span>
                    <span className="font-bold text-slate-800">{viewingEmailRecord.sentBy || "System"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Template Name</span>
                    <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-slate-100">
                      {viewingEmailRecord.templateName || "Generic"}
                    </span>
                  </div>
                  {viewingEmailRecord.messageId && (
                    <div>
                      <span className="text-slate-400 block">Message ID</span>
                      <span className="font-mono text-[10px] text-slate-600 break-all">{viewingEmailRecord.messageId}</span>
                    </div>
                  )}
                  {viewingEmailRecord.errorLog && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">
                      <span className="font-bold block uppercase text-[9px] tracking-wider mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> SMTP error log
                      </span>
                      <p className="font-mono text-[10px] whitespace-pre-wrap leading-relaxed">{viewingEmailRecord.errorLog}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* View Render Frame */}
              <div className="flex-1 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[40vh] lg:h-auto min-h-0">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400">DISPATCHED CONTENT PORTAL</span>
                </div>
                <iframe
                  srcDoc={viewingEmailRecord.body || ""}
                  className="flex-1 w-full border-0 bg-white"
                  title="Dispatched Email View"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button
                onClick={() => setViewingEmailRecord(null)}
                className="rounded-xl px-6 bg-slate-800 hover:bg-slate-900 text-white font-bold h-10"
              >
                Close Logs
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
