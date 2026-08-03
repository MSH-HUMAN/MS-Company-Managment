"use client";

import React, { useCallback } from "react";
import { Placement } from "@/lib/types";
import { useAuthStore } from "@/store/authStore";

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Build a self-contained HTML string for the Placement Agreement.
// This is rendered into a new browser window for printing so that:
//   • No CSS from the main app hides or clips the content.
//   • window.print() is called only after all images and content have loaded.
//   • Works consistently in Chrome, Edge, Firefox, Android Chrome, and Safari.
// ─────────────────────────────────────────────────────────────────────────────
function buildAgreementHtml(placement: Placement, terms: any[], settings: any): string {
  const companyName = settings?.siteName || "MS Horizon F.Z.E";
  const companyLicense = settings?.companyLicense || "2013854/FZE";
  const companyAddress = settings?.address || "Office 101, Business Bay, Dubai, UAE";
  const companyPhone = settings?.phone || "+971 4 123 4567";
  const companyEmail = settings?.email || "info@mshorizon.ae";
  const companyWebsite = settings?.companyWebsite || "www.mshorizon.ae";
  const logoUrl = settings?.logo || "/logo.png";
  const footerText = settings?.printFooter || "MS Horizon F.Z.E - Recruitment Consultancy Placement Agreement";
  const candidateDecl = settings?.candidateDeclaration ||
    "I hereby declare that I accept the offer of employment and the terms set out in this Agreement. I verify that the passport information, address, and credentials provided are correct. I agree to abide by the labour regulations of the United Arab Emirates.";
  const consultancyDecl = settings?.consultancyDeclaration ||
    "We declare that we will act as the authorized placement agent, coordinating the scheduling, interview processing, and document management in compliance with MoHRE policies and UAE Federal Labour Laws.";

  // Build final terms list
  let finalTerms: { title: string; content: string }[] = [];
  try {
    if (placement.termsAndConditions) {
      const parsed = JSON.parse(placement.termsAndConditions);
      if (Array.isArray(parsed)) finalTerms = parsed;
    }
  } catch (_) {}

  if (finalTerms.length === 0 && terms && terms.length > 0) {
    finalTerms = terms.filter((t: any) => t.isActive !== false);
  }
  if (finalTerms.length === 0 && settings?.placementTerms) {
    const lines = settings.placementTerms.split("\n").filter(Boolean);
    finalTerms = lines.map((line: string, i: number) => {
      const dot = line.indexOf(".");
      if (dot > 0 && dot < 30) return { title: line.substring(0, dot).trim(), content: line.substring(dot + 1).trim() };
      return { title: `Clause ${i + 1}`, content: line };
    });
  }
  if (finalTerms.length === 0) {
    finalTerms = [
      { title: "Candidate Responsibilities", content: "The Candidate agrees to submit all necessary documentation, including passports, visa copies, and education credentials, within 3 business days. The Candidate agrees to perform their duties in accordance with the policies of the Placed Company and successfully complete the probation period." },
      { title: "Consultancy Responsibilities", content: "The Consultancy agrees to provide professional placement, screening, and guidance services. The Consultancy will coordinate recruitment timelines, coordinate interviews, and assist with document translation and onboarding with the Placed Company." },
      { title: "Placement/Service Fee Terms", content: "All service fees are subject to VAT at the prevailing rate in the UAE. The placement service fees are payable in full as set out in this Agreement and are non-refundable once visa processes or work permits have been initiated by the Placed Company." },
    ];
  }
  if (settings?.refundPolicy && !finalTerms.some(t => t.title.toLowerCase().includes("refund"))) {
    finalTerms.push({ title: "Refund Policy", content: settings.refundPolicy });
  }
  if (settings?.replacementPolicy && !finalTerms.some(t => t.title.toLowerCase().includes("replacement"))) {
    finalTerms.push({ title: "Replacement Policy", content: settings.replacementPolicy });
  }

  const siteDomain = process.env.NEXT_PUBLIC_SITE_URL || "https://mshorizonuae.com";
  const refId = (placement.id || placement.applicantId || "000").substring(0, 8).toUpperCase();
  const trackingTarget = placement.applicantId ? `${siteDomain}/tracking?id=${placement.applicantId}` : `${siteDomain}/tracking?id=${placement.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(trackingTarget)}`;

  // Helper to produce a safe value for HTML display
  const v = (val: any, fallback = "—") => {
    const s = String(val ?? "").trim();
    return s && s !== "null" && s !== "undefined" ? s : fallback;
  };

  const infoRow = (label: string, value: any) => `
    <div class="info-cell">
      <div class="info-label">${label}</div>
      <div class="info-value">${v(value)}</div>
    </div>`;

  const termsHtml = finalTerms.map((t, i) =>
    `<li><strong>${t.title}:</strong> ${t.content}</li>`
  ).join("");

  const applicantSignHtml = placement.applicantSign
    ? `<img src="${placement.applicantSign}" alt="Applicant Signature" class="sig-img" />`
    : `<span class="sig-pending">Digital signature pending</span>`;
  const companySignHtml = placement.companySign
    ? `<img src="${placement.companySign}" alt="Company Signature" class="sig-img" />`
    : `<span class="sig-pending">Authorized Signature &amp; Company Stamp</span>`;
  const photoHtml = placement.photo
    ? `<img src="${placement.photo}" alt="Candidate Photo" class="candidate-photo" />`
    : "";

  const placedCompanySection = placement.status === "Placed" ? `
    <h3 class="section-title">3. Placed Company Details</h3>
    <div class="info-box">
      <div class="info-grid">
        ${infoRow("Client Company Name", placement.companyName)}
        ${infoRow("Trade License Number", placement.clientTradeLicense || "N/A (Optional)")}
        ${infoRow("Company Address", placement.clientAddress)}
        ${infoRow("Contact Person", placement.clientContactPerson)}
        ${infoRow("Mobile Number", placement.clientContactNumber)}
        ${infoRow("Email Address", placement.clientEmail)}
        ${infoRow("Country", placement.clientCountry)}
        ${infoRow("Location / City", (placement as any).workLocation || (placement as any).city)}
      </div>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Placement Agreement – ${v(placement.applicantName)} – ${refId}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #0d1117;
      background: white;
      padding: 0;
    }

    /* ── Page wrapper ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 16mm 18mm 16mm;
      background: white;
    }

    /* ── Header / Letterhead ── */
    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #1e293b;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .letterhead-left h2 { font-size: 13pt; font-weight: 900; color: #0f172a; margin: 4px 0 2px; }
    .letterhead-left p { font-size: 7.5pt; color: #64748b; }
    .letterhead-right { text-align: right; font-size: 8pt; color: #64748b; line-height: 1.6; }
    .company-logo { max-width: 170px; max-height: 60px; object-fit: contain; display: block; }

    /* ── Agreement Title Block ── */
    .title-block { text-align: center; margin: 16px 0; }
    .title-block h1 { font-size: 12pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; border-bottom: 2px double #0f172a; display: inline-block; padding-bottom: 4px; }
    .title-meta { display: flex; justify-content: center; gap: 40px; margin-top: 8px; font-size: 8pt; font-weight: 600; color: #475569; }
    .title-meta strong { color: #0f172a; }

    /* ── Intro Paragraph ── */
    .intro { margin-bottom: 14px; font-size: 9.5pt; text-align: justify; }

    /* ── Section Titles ── */
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #7c3aed;
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 3px;
      margin-bottom: 10px;
      margin-top: 18px;
    }

    /* ── Info Box & Grid ── */
    .info-box {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #fafafa;
      margin-bottom: 12px;
    }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 14px; }
    .info-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 14px; }
    .info-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 14px; }
    .info-cell {}
    .info-label { font-size: 7.5pt; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
    .info-value { font-size: 9.5pt; font-weight: 700; color: #0f172a; }

    /* ── Candidate Photo ── */
    .candidate-photo { width: 80px; height: 105px; object-fit: cover; border: 1px solid #cbd5e1; border-radius: 4px; }

    /* ── Terms List ── */
    .terms-list { padding-left: 18px; font-size: 9pt; text-align: justify; }
    .terms-list li { margin-bottom: 7px; }

    /* ── Declarations ── */
    .declarations { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .decl-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
    .decl-box h4 { font-size: 9pt; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    .decl-box p { font-size: 8.5pt; color: #475569; font-style: italic; line-height: 1.55; text-align: justify; }

    /* ── Signatures ── */
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 14px; }
    .sig-block {}
    .sig-label { font-size: 9pt; font-weight: 700; color: #1e293b; margin-bottom: 5px; }
    .sig-box {
      border: 1.5px dashed #94a3b8;
      border-radius: 8px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #ffffff;
    }
    .sig-img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .sig-pending { font-size: 9pt; color: #94a3b8; font-style: italic; }
    .sig-meta { font-size: 8.5pt; color: #475569; margin-top: 5px; line-height: 1.5; }

    /* ── QR code ── */
    .qr-img { width: 60px; height: 60px; object-fit: contain; }

    /* ── Footer ── */
    .print-footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
    }

    /* ── Page break ── */
    .page-break { page-break-before: always; break-before: always; }
    .no-break { page-break-inside: avoid; break-inside: avoid; }

    /* ── Print media ── */
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { width: 100%; padding: 0; margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- LETTERHEAD -->
    <div class="letterhead">
      <div class="letterhead-left">
        <img src="${logoUrl}" alt="${companyName} Logo" class="company-logo"
          onerror="this.style.display='none'" />
        <h2>${companyName}</h2>
        <p>Professional Recruitment &amp; Placement Consultancy</p>
        <p>License No: ${companyLicense} &bull; ${companyAddress}</p>
      </div>
      <div class="letterhead-right">
        <div>Tel: ${companyPhone}</div>
        <div>Email: ${companyEmail}</div>
        <div>Web: ${companyWebsite}</div>
        <img src="${qrUrl}" alt="QR Code" class="qr-img" style="margin-top:6px;margin-left:auto;"
          onerror="this.style.display='none'" />
      </div>
    </div>

    <!-- AGREEMENT TITLE -->
    <div class="title-block">
      <h1>Payment &amp; Placement Service Agreement</h1>
      <div class="title-meta">
        <span>Agreement No: <strong>MSH-PLM-${refId}</strong></span>
        <span>Agreement Date: <strong>${v(placement.placementDate, new Date().toLocaleDateString("en-GB"))}</strong></span>
        <span>Applicant ID: <strong>${(placement.applicantId || "").substring(0, 8).toUpperCase()}</strong></span>
      </div>
    </div>

    <!-- INTRO -->
    <p class="intro">
      This Professional Placement Agreement (the &ldquo;Agreement&rdquo;) is entered into on
      <strong>${v(placement.placementDate, new Date().toLocaleDateString("en-GB"))}</strong>
      by and between the recruitment consultancy, candidate, and placed client company under the terms set out below.
    </p>

    <!-- 1. EMPLOYEE INFORMATION -->
    <h3 class="section-title">1. Employee Information</h3>
    <div class="info-box no-break">
      <div style="display:flex;gap:16px;align-items:flex-start;">
        <div class="info-grid" style="flex:1;">
          ${infoRow("Full Name", placement.applicantName)}
          ${infoRow("Passport Number", placement.passportNumber)}
          ${infoRow("Nationality", placement.nationality)}
          ${infoRow("Gender", (placement as any).gender)}
          ${infoRow("Date of Birth", (placement as any).dateOfBirth)}
          ${infoRow("Mobile Number", placement.mobileNumber)}
          ${infoRow("WhatsApp Number", (placement as any).whatsappNumber)}
          ${infoRow("Email Address", (placement as any).emailAddress)}
          ${infoRow("Emirates ID", (placement as any).emiratesId)}
          ${infoRow("Marital Status", (placement as any).maritalStatus)}
          ${infoRow("Education", (placement as any).education)}
          ${infoRow("Experience", (placement as any).experience)}
          ${infoRow("Passport Expiry", placement.passportExpiry)}
          ${infoRow("Visa Status", placement.visaStatus)}
          ${infoRow("Registration Date", placement.registrationDate)}
          <div class="info-cell" style="grid-column: 1 / -1;">
            <div class="info-label">Current Address</div>
            <div class="info-value">${v((placement as any).currentAddress)}</div>
          </div>
        </div>
        ${photoHtml ? `<div style="flex-shrink:0;">${photoHtml}</div>` : ""}
      </div>
    </div>

    <!-- 2. RECRUITMENT CONSULTANCY DETAILS -->
    <h3 class="section-title">2. Recruitment Consultancy Details</h3>
    <div class="info-box no-break">
      <div class="info-grid">
        ${infoRow("Company Name", companyName)}
        ${infoRow("Trade License Number", companyLicense)}
        ${infoRow("Office Address", companyAddress)}
        ${infoRow("Telephone", companyPhone)}
        ${infoRow("Email Address", companyEmail)}
        ${infoRow("Website", companyWebsite)}
        ${infoRow("Authorized Representative", (placement as any).createdBy || "Authorized Signatory")}
      </div>
    </div>

    <!-- 3. PLACED COMPANY DETAILS (conditional) -->
    ${placedCompanySection}

    <!-- 4. EMPLOYMENT DETAILS -->
    <h3 class="section-title">4. Employment Details</h3>
    <div class="info-box no-break">
      <div class="info-grid">
        ${infoRow("Job Title", placement.position)}
        ${infoRow("Department", (placement as any).department)}
        ${infoRow("Working Location", (placement as any).workLocation)}
        ${infoRow("Country", placement.clientCountry || "United Arab Emirates")}
        ${infoRow("Joining Date", placement.joiningDate ? new Date(placement.joiningDate).toLocaleDateString("en-GB") : "—")}
        ${infoRow("Contract Duration", (placement as any).contractDuration)}
        ${infoRow("Probation Period", (placement as any).probationPeriod)}
        ${infoRow("Working Hours", (placement as any).workingHours)}
        ${infoRow("Weekly Off", (placement as any).weeklyOff)}
      </div>
    </div>

    <!-- 5. SALARY & COMPENSATION -->
    <h3 class="section-title">5. Salary &amp; Compensation Details</h3>
    <div class="info-box no-break">
      <div class="info-grid-4">
        ${infoRow("Basic Salary", `${placement.salary?.toLocaleString() || "0.00"} ${(placement as any).currency || "AED"}`)}
        ${infoRow("Currency", (placement as any).currency || "AED")}
        ${infoRow("Payment Frequency", (placement as any).paymentFrequency || "Monthly")}
        ${infoRow("Accommodation", (placement as any).accommodation || "Not Provided")}
        ${infoRow("Transportation", (placement as any).transportation || "Not Provided")}
        ${infoRow("Food Allowance", (placement as any).foodAllowance || "Not Provided")}
        ${infoRow("Medical Insurance", (placement as any).medicalInsurance || "Provided as per UAE Law")}
        ${infoRow("Annual Leave", (placement as any).annualLeave || "As per UAE Law")}
        ${infoRow("Air Ticket", (placement as any).airTicket || "Not Provided")}
        <div class="info-cell" style="grid-column: 1 / -1;">
          <div class="info-label">Other Benefits</div>
          <div class="info-value">${v((placement as any).otherBenefits, "None")}</div>
        </div>
      </div>
    </div>

    <!-- 6. VISA & EMPLOYMENT PROCESS -->
    <h3 class="section-title">6. Visa &amp; Employment Process</h3>
    <div class="info-box no-break">
      <div class="info-grid-4">
        ${infoRow("Visa Type", (placement as any).placementVisaType)}
        ${infoRow("Visa Status", placement.visaStatus)}
        ${infoRow("Medical Status", (placement as any).medicalStatus)}
        ${infoRow("Labour Contract Status", (placement as any).labourContractStatus)}
        ${infoRow("Emirates ID Status", (placement as any).emiratesIdStatus)}
        ${infoRow("Joining Status", (placement as any).joiningStatus)}
        ${infoRow("Travel Status", (placement as any).travelStatus)}
      </div>
    </div>

    <!-- PAGE BREAK before Terms -->
    <div class="page-break"></div>

    <!-- 7. TERMS & CONDITIONS -->
    <h3 class="section-title" style="margin-top:0;">7. Terms &amp; Conditions</h3>
    <ol class="terms-list">
      ${termsHtml}
    </ol>

    <!-- 8. DECLARATIONS -->
    <h3 class="section-title">8. Declarations</h3>
    <div class="declarations no-break">
      <div class="decl-box">
        <h4>Candidate Declaration</h4>
        <p>${candidateDecl}</p>
      </div>
      <div class="decl-box">
        <h4>Consultancy Declaration</h4>
        <p>${consultancyDecl}</p>
      </div>
    </div>

    <!-- 9. SIGNATURES -->
    <h3 class="section-title">9. Signatures &amp; Stamp</h3>
    <div class="signatures no-break">
      <div class="sig-block">
        <div class="sig-label">Employee Signature:</div>
        <div class="sig-box">${applicantSignHtml}</div>
        <div class="sig-meta">
          <div>Name: <strong>${v(placement.applicantName)}</strong></div>
          <div>Date: ${v((placement as any).applicantSignDate ? new Date((placement as any).applicantSignDate).toLocaleDateString("en-GB") : null, "Pending")}</div>
          ${(placement as any).applicantSignIp ? `<div>IP: ${(placement as any).applicantSignIp}</div>` : ""}
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-label">Consultancy Stamp &amp; Signature:</div>
        <div class="sig-box">${companySignHtml}</div>
        <div class="sig-meta">
          <div>Name: <strong>${v((placement as any).createdBy, "Authorized Signatory")}</strong></div>
          <div>Place: Dubai, UAE</div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="print-footer">
      <span>${footerText}</span>
      <span>Ref: ${placement.id}</span>
    </div>

  </div>

  <script>
    // Wait for all images to finish loading before printing
    var images = document.images;
    var loadedCount = 0;
    var total = images.length;

    function tryPrint() {
      // Small delay to allow fonts and layout to stabilise
      setTimeout(function () {
        window.print();
      }, 400);
    }

    if (total === 0) {
      tryPrint();
    } else {
      for (var i = 0; i < total; i++) {
        if (images[i].complete) {
          loadedCount++;
          if (loadedCount >= total) tryPrint();
        } else {
          images[i].addEventListener('load', function () {
            loadedCount++;
            if (loadedCount >= total) tryPrint();
          });
          images[i].addEventListener('error', function () {
            loadedCount++;
            if (loadedCount >= total) tryPrint();
          });
        }
      }
    }
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: returns a printAgreement callback that opens a new window and prints.
// ─────────────────────────────────────────────────────────────────────────────
export function usePrintAgreement() {
  const { siteSettings } = useAuthStore();

  const printAgreement = useCallback((placement: Placement, terms: any[] = []) => {
    const html = buildAgreementHtml(placement, terms, siteSettings);
    const printWindow = window.open("", "_blank", "width=900,height=700,toolbar=0,menubar=0,scrollbars=1");
    if (!printWindow) {
      alert("Please allow pop-ups for this site to print the agreement.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
  }, [siteSettings]);

  return printAgreement;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export: kept for backwards-compat – renders nothing on screen.
// The actual print is triggered via usePrintAgreement().
// ─────────────────────────────────────────────────────────────────────────────
export default function PrintableAgreement({ placement, terms }: { placement: Placement; terms?: any[] }) {
  // This component intentionally renders nothing on-screen.
  // Print is initiated by calling usePrintAgreement() from the parent page.
  return null;
}
