import nodemailer from "nodemailer";
import prisma from "./prisma";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";


const cleanEnvVar = (val: string | undefined) => {
  if (!val) return val;
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

// ─── HTML Email Template ──────────────────────────────────────────────────────

// Helper: load template by name
async function loadTemplateAsync(templateName: string): Promise<string> {
  const dbTemplate = await prisma.emailTemplate.findUnique({
    where: { templateName }
  });

  if (dbTemplate) {
    if (!dbTemplate.isEnabled) {
      throw new Error(`Template ${templateName} is disabled.`);
    }
    return dbTemplate.body;
  }

  // Fallback to filesystem
  const templatesDir = path.join(process.cwd(), "templates");
  let templatePath = path.join(templatesDir, `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(templatesDir, "system-notification.html");
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  const htmlContent = fs.readFileSync(templatePath, "utf8");

  // Seed DB automatically for future edits
  try {
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
    const subject = titleMatch && titleMatch[1] ? titleMatch[1] : `${templateName.replace(/-/g, " ").toUpperCase()} Notification`;
    await prisma.emailTemplate.create({
      data: {
        templateName,
        subject,
        body: htmlContent,
        type: templateName,
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
  } catch (err) {
    // Ignore seeding error, it might be a race condition
  }

  return htmlContent;
}

// Register partials (header/footer/components)
function registerPartials() {
  try {
    const componentsDir = path.join(process.cwd(), "templates", "components");
    if (fs.existsSync(componentsDir)) {
      const files = fs.readdirSync(componentsDir);
      files.forEach(f => {
        if (f.endsWith(".html") || f.endsWith(".hbs")) {
          const content = fs.readFileSync(path.join(componentsDir, f), "utf8");
          const name = path.basename(f, path.extname(f));
          Handlebars.registerPartial(name, content);
        }
      });
    }
    // Helpers
    Handlebars.unregisterHelper('year');
    Handlebars.unregisterHelper('companyPrimaryColor');
  } catch (err) {
    // ignore
  }
  try {
    Handlebars.registerHelper('year', () => new Date().getFullYear());
    Handlebars.registerHelper('companyPrimaryColor', (fallback: string) => fallback || '#2563eb');
  } catch (err) {
    // ignore
  }
}

/**
 * Sends a real-time email with beautiful HTML formatting.
 * Falls back to simulated DB log if SMTP credentials are missing.
 */
export async function sendEmail({
  to,
  subject: subjectParam,
  body: bodyParam,
  candidateName,
  company,
  branch,
  deliveryStatus,
  sentBy,
  type,
  templateType,
  templateData,
}: {
  to: string;
  subject: string;
  body: string;
  candidateName?: string;
  company?: string;
  branch?: string;
  deliveryStatus?: string;
  sentBy?: string;
  type?: string;
  templateType?: string;
  templateData?: any;
}) {
  // Use let so DB template can override subject/body
  let subject = subjectParam;
  let body = bodyParam;
  const isPrecompiledHtml = body.trim().startsWith("<html") || body.trim().startsWith("<!DOCTYPE");
  const host = cleanEnvVar(process.env.SMTP_HOST);
  const port = Number(cleanEnvVar(process.env.SMTP_PORT)) || 587;
  const user = cleanEnvVar(process.env.SMTP_USER);
  const pass = cleanEnvVar(process.env.SMTP_PASS);
  const from = cleanEnvVar(process.env.SMTP_FROM) || `"MS Horizon Support" <support@mshorizon.ae>`;

  console.log(`[EMAIL-SERVICE] Triggering email to: ${to} | Subject: ${subject}`);

  let realEmailSent = false;
  let statusStr = deliveryStatus || "Pending";

  // Look up sender company details in DB by name or email to keep email & whatsapp branded
  let resolvedCompanyName = "MS Horizon F.Z.E";
  let companyEmail = "mshorizonfze@gmail.com";
  let companyPhone = "+971 58 520 3005";
  let companyAddress = "C1 Building, Ajman Free Zone, UAE";
  let companyLogo = "";
  let companyPrimaryColor = "#2563eb";

  const lookupTerm = (company || "").trim();

  try {
    // Try to find by name or email in Company table
    const dbComp = (lookupTerm && lookupTerm !== "System" && lookupTerm !== "Not Placed")
      ? await prisma.company.findFirst({
          where: {
            OR: [
              { name: { equals: lookupTerm, mode: "insensitive" } },
              { email: { equals: lookupTerm, mode: "insensitive" } },
            ]
          }
        })
      : null;

    // If not found in Company, try InternalCompany
    const dbIntComp = (!dbComp && lookupTerm && lookupTerm !== "System" && lookupTerm !== "Not Placed")
      ? await prisma.internalCompany.findFirst({
          where: {
            OR: [
              { name: { equals: lookupTerm, mode: "insensitive" } },
              { email: { equals: lookupTerm, mode: "insensitive" } },
            ]
          }
        })
      : null;

    // Fallback: find any MS Horizon company record
    const fallbackComp = (!dbComp && !dbIntComp)
      ? await prisma.company.findFirst({
          where: {
            OR: [
              { name: { contains: "MS Horizon", mode: "insensitive" } },
              { email: { equals: "mshorizonfze@gmail.com", mode: "insensitive" } }
            ]
          }
        })
      : null;

    const found = dbComp || fallbackComp;
    if (found) {
      if (found.name) resolvedCompanyName = found.name;
      if (found.email) companyEmail = found.email;
      if (found.telephone || found.whatsapp) {
        companyPhone = found.telephone || found.whatsapp || companyPhone;
      }
      if (found.address) companyAddress = found.address;
      if (found.logo) companyLogo = found.logo;
      if (found.brandColor) companyPrimaryColor = found.brandColor;
    } else if (dbIntComp) {
      if (dbIntComp.name) resolvedCompanyName = dbIntComp.name;
      if (dbIntComp.email) companyEmail = dbIntComp.email;
      if (dbIntComp.telephone) companyPhone = dbIntComp.telephone;
      if (dbIntComp.address) companyAddress = dbIntComp.address;
      if (dbIntComp.logo) companyLogo = dbIntComp.logo;
    } else if (lookupTerm && !lookupTerm.includes("@") && lookupTerm !== "System" && lookupTerm !== "Not Placed") {
      resolvedCompanyName = lookupTerm;
    }
  } catch (err) {
    console.error("Error looking up company info inside sendEmail:", err);
  }


  let companyLicense = "";
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (settings && settings.companyLicense) {
      companyLicense = settings.companyLicense;
    }
  } catch (settingsErr) {
    console.error("Error loading site settings companyLicense inside sendEmail:", settingsErr);
  }

  // Register partials/helpers once
  registerPartials();

  let htmlContent = "";
  let usedTemplateName = "system-notification";
  let sentMessageId: string | null = null;
  let sendError: string | null = null;

  // Map templateType to file names we created
  const map: Record<string, string> = {
    // Interview templates
    Interview: "interview-scheduled",
    Interview_Initial: "interview-scheduled",
    Interview_Online: "interview-online",
    Interview_Physical: "interview-physical",
    Interview_Scheduled: "interview-scheduled",
    Interview_Cancelled: "interview-cancelled",
    Interview_Completed: "interview-selected",
    Interview_Rescheduled: "interview-rescheduled",
    Interview_Reminder: "interview-reminder",
    Interview_Selected: "interview-selected",
    Interview_Rejected: "interview-rejected",

    // Application & Registration templates
    Registration: "applicant-registration-confirmation",
    Applicant_Registration: "applicant-registration-confirmation",
    Registration_Successful: "registration-successful",
    Application_Received: "applicant-registration-confirmation",
    Status_Changed: "status-changed",
    Pending: "status-changed",
    Under_Review: "status-changed",
    Applicant_Approved: "applicant-approved",
    Applicant_Rejected: "applicant-rejected",
    Applicant_Returned: "status-changed",
    Applicant_Processing: "status-changed",

    // Medical templates
    Medical_Test_Reminder: "medical-test-reminder",
    Medical_Reminder: "medical-test-reminder",
    Medical_Passed: "medical-passed",
    Medical_Failed: "medical-failed",
    Medical: "medical-test-reminder",

    // Emirates ID & Labour Contract
    Emirates_ID_Update: "emirates-id-update",
    Emirates_ID: "emirates-id-update",
    Labour_Contract_Update: "labour-contract-update",
    Labour_Contract: "labour-contract-update",

    // Placement & Visa templates
    Offer: "offer-letter",
    Offer_Letter: "offer-letter",
    Placement: "placement-confirmation",
    Placement_Confirmed: "placement-confirmation",
    Placement_Confirmation: "placement-confirmation",
    Placement_Agreement: "placement-agreement",
    Placement_Agreement_Generated: "placement-agreement-generated",
    Visa: "visa-expiry-reminder",
    Visa_Expiry_Reminder: "visa-expiry-reminder",
    Passport_Expiry: "passport-expiry-reminder",
    Passport_Expiry_Reminder: "passport-expiry-reminder",
    Visa_Processing_Started: "visa-processing-started",
    Visa_Processing: "visa-processing-started",
    Visa_Approved: "visa-approved",
    Visa_Rejected: "visa-rejected",
    Joining_Confirmation: "joining-confirmation",
    Joining: "joining-confirmation",
    Welcome_Employee: "welcome-employee",
    Welcome_Email: "welcome-employee",

    // Account templates
    Account_Activated: "account-activated",
    Account_Created: "account-activated",
    User_Account_Created: "account-activated",
    Account_Locked: "account-locked",
    Account_Disabled: "account-locked",
    Password_Reset: "account-locked",

    // Staff & Payroll templates
    Staff_Registration: "registration-successful",
    Staff_Updated: "status-changed",

    // HR & Shift & Tasks templates
    Leave: "general-announcement",
    Leave_Approved: "general-announcement",
    Leave_Rejected: "general-announcement",
    Staff_Request_Submitted: "general-announcement",
    Staff_Request_Approved: "general-announcement",
    Staff_Request_Rejected: "general-announcement",
    Task_Assigned: "general-announcement",
    Task_Completed: "general-announcement",
    Task_Deadline_Reminder: "general-announcement",
    Shift_Assigned: "general-announcement",
    Attendance_Reminder: "general-announcement",
    Payroll: "general-announcement",
    Payslip: "general-announcement",
    Payslip_Ready: "general-announcement",
    Birthday: "general-announcement",
    Vehicle_Assigned: "general-announcement",
    Vehicle_Returned: "general-announcement",
    Document_Uploaded: "general-announcement",
    General_Announcement: "general-announcement",
    System: "system-notification",
  };

  const selectedTemplate = templateType ? (map[templateType] || templateType) : "system-notification";
  usedTemplateName = isPrecompiledHtml ? (templateType || "Precompiled") : selectedTemplate;

  try {
    let applicantDetails: any = null;
    if (templateData?.applicantId) {
      applicantDetails = await prisma.applicant.findUnique({
        where: { id: templateData.applicantId }
      });
    }
    if (!applicantDetails && templateData?.trackingCode) {
      applicantDetails = await prisma.applicant.findFirst({
        where: { trackingCode: templateData.trackingCode }
      });
    }
    if (!applicantDetails && (candidateName || to)) {
      applicantDetails = await prisma.applicant.findFirst({
        where: {
          OR: [
            ...(to ? [{ email: to }] : []),
            ...(candidateName ? [{ fullName: candidateName }] : [])
          ]
        }
      });
    }

    let interviewerDesignation = templateData?.interviewerDesignation;
    if (templateData?.interviewerName && !interviewerDesignation) {
      const interviewerUser = await prisma.user.findFirst({
        where: { name: templateData.interviewerName }
      });
      if (interviewerUser) {
        const interviewerStaff = await prisma.staff.findFirst({
          where: { email: interviewerUser.email }
        });
        interviewerDesignation = interviewerStaff?.position || interviewerUser.role || "N/A";
      }
    }

    if (isPrecompiledHtml) {
      htmlContent = body;
    } else {
      const tpl = await loadTemplateAsync(selectedTemplate);
      const compiled = Handlebars.compile(tpl);

    const recipientName = templateData?.recipientName || candidateName || templateData?.applicantName || applicantDetails?.fullName || "Recipient";
    const logoText = (company || "").toUpperCase().split(" ").slice(0, 2).map((s: string) => s.charAt(0)).join("") || "MS";

    // Auto-populate all required dynamic fields with fallbacks
    const safeData = {
      applicantFullName: templateData?.applicantFullName || applicantDetails?.fullName || recipientName || "N/A",
      applicantName: recipientName,
      recipientName,
      applicantId: templateData?.applicantId || applicantDetails?.id || "N/A",
      trackingCode: templateData?.trackingCode || templateData?.trackingNumber || applicantDetails?.trackingCode || "N/A",
      trackingNumber: templateData?.trackingNumber || templateData?.trackingCode || applicantDetails?.trackingCode || "N/A",
      appliedPosition: templateData?.appliedPosition || templateData?.position || (applicantDetails?.applyingPositions ? (Array.isArray(applicantDetails.applyingPositions) ? applicantDetails.applyingPositions[0] : applicantDetails.applyingPositions) : "N/A"),
      passportNumber: templateData?.passportNumber || templateData?.passport || applicantDetails?.passportNumber || "N/A",
      visaStatus: templateData?.visaStatus || templateData?.visaType || applicantDetails?.visaStatus || applicantDetails?.visaType || "N/A",
      nationality: templateData?.nationality || applicantDetails?.nationality || "N/A",
      mobileNumber: templateData?.mobileNumber || templateData?.mobile || applicantDetails?.mobile || "N/A",
      emailAddress: templateData?.emailAddress || templateData?.email || applicantDetails?.email || "N/A",
      currentStatus: templateData?.currentStatus || templateData?.status || applicantDetails?.status || "N/A",
      applicantCompany: templateData?.applicantCompany || applicantDetails?.company || "N/A",
      applicantBranch: templateData?.applicantBranch || applicantDetails?.branch || "N/A",

      position: templateData?.position || (templateData?.applyingPositions ? (Array.isArray(templateData.applyingPositions) ? templateData.applyingPositions.join(", ") : templateData.applyingPositions) : (applicantDetails?.applyingPositions ? (Array.isArray(applicantDetails.applyingPositions) ? applicantDetails.applyingPositions.join(", ") : applicantDetails.applyingPositions) : "N/A")),
      company: company || templateData?.company || "MS Horizon F.Z.E",
      branch: branch || templateData?.branch || "Main Branch",
      clientCompany: templateData?.clientCompany || templateData?.clientName || "N/A",
      
      interviewDate: templateData?.interviewDate || templateData?.dateTime || "N/A",
      interviewTime: templateData?.interviewTime || "N/A",
      interviewType: templateData?.interviewType || "Interview",
      interviewMode: templateData?.interviewMode || "N/A",
      interviewLocation: templateData?.interviewLocation || templateData?.location || "N/A",
      meetingLink: templateData?.meetingLink || templateData?.link || "N/A",
      meetingId: templateData?.meetingId || "N/A",
      passcode: templateData?.passcode || "N/A",
      interviewerName: templateData?.interviewerName || templateData?.conductPersonName || "N/A",
      interviewerDesignation: interviewerDesignation || "N/A",
      companyName: (templateData?.companyName && !templateData.companyName.includes("@")) ? templateData.companyName : resolvedCompanyName,
      branchName: templateData?.branchName || branch || "N/A",

      hrName: templateData?.hrName || "HR Operations Team",
      hrEmail: templateData?.hrEmail || companyEmail || "mshorizonfze@gmail.com",
      consultantName: templateData?.consultantName || templateData?.createdBy || sentBy || "System Admin",
      salary: templateData?.salary || "N/A",
      joiningDate: templateData?.joiningDate || templateData?.placedDate || "N/A",
      status: templateData?.status || applicantDetails?.status || "N/A",
      currentDate: templateData?.currentDate || new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
      currentTime: templateData?.currentTime || new Date().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
      companyLogo: companyLogo || "",
      // Visa & passport expiry fields
      visaExpiry: templateData?.visaExpiry || templateData?.visaExpiryDate || "N/A",
      passportExpiry: templateData?.passportExpiry || templateData?.passportExpiryDate || "N/A",
      daysRemaining: templateData?.daysRemaining || templateData?.days || "N/A",
      // Placement / employment fields
      employerName: templateData?.employerName || templateData?.clientCompany || templateData?.clientName || "N/A",
      workLocation: templateData?.workLocation || templateData?.location || templateData?.branch || "N/A",
      startDate: templateData?.startDate || templateData?.joiningDate || templateData?.placedDate || "N/A",
      allowances: templateData?.allowances || templateData?.benefits || "",
      agreementDate: templateData?.agreementDate || new Date().toLocaleDateString("en-US"),
      agreementLink: templateData?.agreementLink || templateData?.documentLink || "",
      documentLink: templateData?.documentLink || templateData?.fileUrl || "",
      offerLetterLink: templateData?.offerLetterLink || templateData?.documentLink || "",
      generatedDate: templateData?.generatedDate || new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
      reportingTime: templateData?.reportingTime || templateData?.reportTime || "8:00 AM",
      reportingLocation: templateData?.reportingLocation || templateData?.workLocation || "N/A",
      portalUrl: (templateData?.portalUrl && !templateData.portalUrl.includes("portal.mshorizon.ae")) 
        ? templateData.portalUrl 
        : `${(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "")}/login`,
      tempPassword: templateData?.tempPassword || "",
      // Medical test fields
      testDate: templateData?.testDate || templateData?.medicalDate || "N/A",
      testTime: templateData?.testTime || templateData?.medicalTime || "N/A",
      testLocation: templateData?.testLocation || templateData?.clinicName || "N/A",
      clinicName: templateData?.clinicName || templateData?.testLocation || "N/A",
      clinicPhone: templateData?.clinicPhone || companyPhone || "N/A",
      medicalStatus: templateData?.medicalStatus || templateData?.status || "N/A",
      // Emirates ID & Labour contract
      emiratesIdStatus: templateData?.emiratesIdStatus || templateData?.status || "Processing",
      emiratesIdExpiry: templateData?.emiratesIdExpiry || templateData?.idExpiry || "N/A",
      labourContractStatus: templateData?.labourContractStatus || templateData?.status || "Processing",
      contractExpiryDate: templateData?.contractExpiryDate || templateData?.expiryDate || "N/A",
      // General fields
      role: templateData?.role || templateData?.position || "N/A",
      notes: templateData?.notes || templateData?.remarks || "",
      reason: templateData?.reason || templateData?.notes || "",
      newStatus: templateData?.newStatus || templateData?.status || "N/A",
      previousStatus: templateData?.previousStatus || templateData?.oldStatus || "N/A",
      announcementTitle: templateData?.announcementTitle || subject || "General Notice",
      announcementMessage: templateData?.announcementMessage || templateData?.message || body || "",
    };

    const hasApplicantDetails = !!(
      (templateData?.passportNumber && templateData.passportNumber !== "N/A") ||
      (templateData?.passport && templateData.passport !== "N/A") ||
      (templateData?.nationality && templateData.nationality !== "N/A") ||
      (templateType && (
        templateType.startsWith("Interview") ||
        templateType.startsWith("Applicant") ||
        templateType.startsWith("Placement") ||
        templateType === "Offer" ||
        templateType === "Registration" ||
        templateType === "Visa"
      ))
    );

    const showInterviewDetails = hasApplicantDetails && safeData.interviewDate !== "N/A";
    const showPlacementDetails = hasApplicantDetails && safeData.salary !== "N/A";
    const showClientCompany = hasApplicantDetails && safeData.clientCompany !== "N/A";

    const siteDomain = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "");
    const rawActionLink = templateData?.actionLink || (safeData as any)?.actionLink;
    const finalActionLink = (rawActionLink && !rawActionLink.includes("localhost") && !rawActionLink.includes("portal.mshorizon.ae") && !rawActionLink.includes("/apply?"))
      ? rawActionLink
      : (templateData?.trackingCode || (safeData as any)?.trackingCode) && (templateData?.trackingCode !== "N/A")
        ? `${siteDomain}/track?code=${templateData?.trackingCode || (safeData as any)?.trackingCode}`
        : `${siteDomain}/track`;

    let derivedDomain = (companyEmail.match(/@(.+)$/)||[ "","mshorizonuae.com"])[1];
    if (!derivedDomain || ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(derivedDomain.toLowerCase())) {
      derivedDomain = "mshorizonuae.com";
    }

    const context = {
      companyEmail,
      companyPhone,
      companyAddress,
      companyLicense,
      logoText,
      website: templateData?.website || `https://${derivedDomain}`,
      year: new Date().getFullYear(),
      companyPrimaryColor: templateData?.companyPrimaryColor || companyPrimaryColor || process.env.PRIMARY_COLOR || '#2563eb',
      body,
      subject,
      ...safeData,
      hasApplicantDetails,
      showInterviewDetails,
      showPlacementDetails,
      showClientCompany,
      actionLink: finalActionLink,
      ...templateData,
      companyName: (templateData?.companyName && !templateData.companyName.includes("@")) ? templateData.companyName : (company && !company.includes("@") && company !== "System" ? company : resolvedCompanyName),
    };

    htmlContent = compiled(context);
    }
  } catch (tplErr: unknown) {
    const tplErrMsg = tplErr instanceof Error ? tplErr.message : String(tplErr);
    console.error(`[EMAIL-SERVICE] Template render error for ${selectedTemplate}:`, tplErrMsg);
    sendError = `Template render error: ${tplErrMsg}`;
    statusStr = "Failed";
    htmlContent = `<p>${body}</p>`;
  }

  if (htmlContent && host && user && pass) {
    try {
      const transporter = host === "smtp.gmail.com" 
        ? nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass },
          })
        : nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
            tls: { rejectUnauthorized: false },
          });

      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: body,
        html: htmlContent,
      });

      console.log(`[EMAIL-SERVICE] Email sent successfully to ${to}`);
      realEmailSent = true;
      statusStr = "Sent";
      sentMessageId = info && (info as any).messageId ? String((info as any).messageId) : null;
    } catch (err: unknown) {
      const smtpErrMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL-SERVICE] SMTP error sending to ${to}:`, smtpErrMsg);
      statusStr = "Failed";
      sendError = smtpErrMsg;
    }
  } else if (!host || !user || !pass) {
    console.warn(`[EMAIL-SERVICE] SMTP credentials not configured. Logged to DB only.`);
    statusStr = "Simulated";
  }

  // Always log to DB for tracking regardless of real send
  try {
    await prisma.sentEmail.create({
      data: {
        to,
        subject,
        body: htmlContent || body,
        sentAt: new Date().toISOString(),
        candidateName: candidateName || "System",
        company: company || "System",
        branch: branch || "Main",
        deliveryStatus: statusStr,
        templateName: usedTemplateName,
        messageId: sentMessageId,
        errorLog: sendError,
        sentBy: sentBy || "System",
        type: type || "Email",
      },
    });
  } catch (dbErr) {
    console.error(`[EMAIL-SERVICE] Failed to save SentEmail log:`, dbErr);
  }

  return realEmailSent;
}

/**
 * Render a template preview without sending.
 */
export async function previewEmail({
  subject,
  body,
  company,
  templateType,
  templateData,
}: {
  subject?: string;
  body?: string;
  company?: string;
  templateType?: string;
  templateData?: any;
}) {
  registerPartials();

  const map: Record<string, string> = {
    // Interview templates
    Interview: "interview-scheduled",
    Interview_Initial: "interview-scheduled",
    Interview_Online: "interview-scheduled",
    Interview_Physical: "interview-scheduled",
    Interview_Scheduled: "interview-scheduled",
    Interview_Cancelled: "interview-cancelled",
    Interview_Completed: "interview-scheduled",
    Interview_Rescheduled: "interview-rescheduled",
    Interview_Reminder: "interview-reminder",
    Interview_Selected: "interview-selected",
    Interview_Rejected: "interview-rejected",
    
    // Application & Registration templates
    Registration: "applicant-registration",
    Applicant_Registration: "applicant-registration",
    Registration_Successful: "registration-successful",
    Application_Received: "application-received",
    Status_Changed: "status-changed",
    Pending: "applicant-pending",
    Under_Review: "under-review",
    Applicant_Approved: "applicant-approved",
    Applicant_Rejected: "applicant-rejected",
    Applicant_Returned: "applicant-returned",
    Applicant_Processing: "applicant-processing",
    
    // Placement & Visa templates
    Offer: "offer-letter",
    Placement: "placement-confirmed",
    Placement_Confirmed: "placement-confirmed",
    Placement_Agreement: "placement-agreement",
    Placement_Agreement_Generated: "placement-agreement-generated",
    Visa: "visa-expiry-reminder",
    Visa_Expiry_Reminder: "visa-expiry-reminder",
    Passport_Expiry: "passport-expiry-reminder",
    Passport_Expiry_Reminder: "passport-expiry-reminder",
    Visa_Processing_Started: "visa-processing-started",
    Visa_Approved: "visa-approved",
    Visa_Rejected: "visa-rejected",
    Joining_Confirmation: "joining-confirmation",
    
    // Staff & Payroll templates
    Staff_Registration: "staff-registration",
    Staff_Updated: "staff-updated",
    User_Account_Created: "user-account-created",
    Account_Created: "account-created",
    Account_Disabled: "account-disabled",
    Welcome_Email: "welcome-employee",
    Welcome_Employee: "welcome-employee",
    Password_Reset: "password-reset",
    
    // HR & Shift & Tasks templates
    Leave: "leave-application-submitted",
    Leave_Approved: "leave-approved",
    Leave_Rejected: "leave-rejected",
    Staff_Request_Submitted: "staff-request-submitted",
    Staff_Request_Approved: "staff-request-approved",
    Staff_Request_Rejected: "staff-request-rejected",
    Task_Assigned: "task-assigned",
    Task_Completed: "task-completed",
    Task_Deadline_Reminder: "task-deadline-reminder",
    Shift_Assigned: "shift-assigned",
    Attendance_Reminder: "attendance-reminder",
    Payroll: "payroll-generated",
    Payslip: "payslip-ready",
    Payslip_Ready: "payslip-ready",
    Birthday: "birthday-wishes",
    System: "system-notification",
  };

  const selectedTemplate = templateType ? (map[templateType] || templateType) : "system-notification";

  try {
    const tpl = await loadTemplateAsync(selectedTemplate);
    const compiled = Handlebars.compile(tpl);

    const recipientName = templateData?.recipientName || templateData?.applicantName || "Recipient";
    const logoText = (company || "MS").slice(0, 2).toUpperCase();

    let previewDomain = ((templateData?.companyEmail || "mshorizonfze@gmail.com").match(/@(.+)$/)?.[1] || "mshorizonuae.com");
    if (["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(previewDomain.toLowerCase())) {
      previewDomain = "mshorizonuae.com";
    }

    const context = {
      recipientName,
      companyName: company || templateData?.company || "MS Horizon",
      companyEmail: templateData?.companyEmail || "mshorizonfze@gmail.com",
      companyPhone: templateData?.companyPhone || "+971 58 520 3005",
      companyAddress: templateData?.companyAddress || "C1 Building, Ajman Free Zone, UAE",
      logoText,
      website: templateData?.website || `https://${previewDomain}`,
      year: new Date().getFullYear(),
      companyPrimaryColor: process.env.PRIMARY_COLOR || '#2563eb',
      body,
      subject,
      ...templateData,
    };

    return compiled(context);
  } catch (err: unknown) {
    const previewErrMsg = err instanceof Error ? err.message : String(err);
    return `<p>Error rendering preview for ${selectedTemplate}: ${previewErrMsg}</p><br/>${body}`;
  }
}

/**
 * Sends a WhatsApp message via Twilio.
 * Falls back to simulated DB log if credentials are missing or are placeholder values.
 */
export async function sendWhatsApp({
  to,
  message,
  candidateName,
  company,
  branch,
}: {
  to: string;
  message: string;
  candidateName?: string;
  company?: string;
  branch?: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

  let formattedNumber = to.replace(/[^0-9+]/g, "");
  if (!formattedNumber.startsWith("+")) {
    formattedNumber = `+${formattedNumber}`;
  }

  console.log(`[WHATSAPP-SERVICE] Triggering WhatsApp to: ${formattedNumber}`);

  let realWaSent = false;

  // Only attempt real send if credentials are not placeholders
  const hasRealCreds =
    accountSid &&
    authToken &&
    !accountSid.startsWith("ACXXX") &&
    authToken !== "your-twilio-auth-token";

  if (hasRealCreds) {
    try {
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: authHeader,
          },
          body: new URLSearchParams({
            From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
            To: `whatsapp:${formattedNumber}`,
            Body: message,
          }),
        }
      );

      if (response.ok) {
        console.log(`[WHATSAPP-SERVICE] Sent successfully via Twilio to ${formattedNumber}`);
        realWaSent = true;
      } else {
        const errorData = await response.json();
        console.error(`[WHATSAPP-SERVICE] Twilio API error:`, errorData);
      }
    } catch (err) {
      console.error(`[WHATSAPP-SERVICE] Error sending via Twilio:`, err);
    }
  } else {
    console.warn(
      `[WHATSAPP-SERVICE] Twilio credentials not configured. Set real TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN in .env`
    );
  }

  // Always log to DB
  try {
    await prisma.sentWhatsApp.create({
      data: {
        to: formattedNumber,
        message,
        sentAt: new Date().toISOString(),
        candidateName: candidateName || "System",
        company: company || "System",
        branch: branch || "Main",
      },
    });
  } catch (dbErr) {
    console.error(`[WHATSAPP-SERVICE] Failed to save SentWhatsApp log:`, dbErr);
  }

}

/**
 * Generates the email subject and body strictly based on the template type.
 * Prevents multiple templates from being concatenated or triggered at the same time.
 */
export function generateEmailContent(
  templateType: "Interview" | "Interview_Initial" | "Interview_Online" | "Interview_Physical" | "Interview_Cancelled" | "Interview_Completed" | "Offer" | "Visa",
  data: {
    applicantName?: string;
    company?: string;
    branch?: string;
    date?: string;
    role?: string;
    link?: string;
    notes?: string;
    extraDetails?: string;
  }
): { subject: string; body: string } {
  const name = data.applicantName || "Candidate";
  const company = data.company || "Company";
  const branch = data.branch || "Branch";

  switch (templateType) {
    case "Interview":
    case "Interview_Initial":
      return {
        subject: `Initial Interview Invitation: ${data.role || "Discussion"} - ${name}`,
        body: `Dear ${name},

We are pleased to invite you for an Initial screening interview for the position of ${data.role || "the open role"} at ${company}.

Details:
- Position: ${data.role || "discussion"}
- Company: ${company}
- Branch: ${branch}
- Date & Time: ${data.date || "TBD"}

Notes: ${data.notes || "Please prepare to discuss your experience, qualifications, and expectations."}

We look forward to speaking with you.

Best regards,
${company} HR Team`,
      };
    case "Interview_Online":
      return {
        subject: `Online Interview Invitation: ${data.role || "Discussion"} - ${name}`,
        body: `Dear ${name},

We are pleased to invite you for an Online Virtual Interview for the position of ${data.role || "the open role"} at ${company}.

Online Interview Details:
- Meeting Platform & Link: ${data.link || "Will be shared shortly"}
- Date & Time: ${data.date || "TBD"}

Notes: ${data.notes || ""}

Virtual Meeting Tips:
- Ensure a stable internet connection and quiet space.
- Keep your camera enabled.
- Join the link 5 minutes prior to the schedule.

Best regards,
${company} HR Team`,
      };
    case "Interview_Physical":
      return {
        subject: `Office Interview Invitation: ${data.role || "Discussion"} - ${name}`,
        body: `Dear ${name},

We are pleased to invite you for an In-person/Physical Interview for the position of ${data.role || "the open role"} at ${company}.

Physical Office Details:
- Location / Address: ${data.link || "Our Main Office Address"}
- Branch Office: ${branch}
- Date & Time: ${data.date || "TBD"}

Notes: ${data.notes || ""}

Candidate Guidelines:
- Please carry a copy of your CV and valid ID.
- Register at the front desk upon arrival.
- Dress code is professional business attire.

Best regards,
${company} HR Team`,
      };
    case "Interview_Cancelled":
      return {
        subject: `Interview Cancelled: ${data.role || "Scheduled Interview"} - ${name}`,
        body: `Dear ${name},

We regret to inform you that your ${data.role || "scheduled interview"} at ${company} on ${data.date || "the scheduled date"} has been cancelled.

${data.notes ? `Reason: ${data.notes}` : "Please contact our HR department for further information."}

We apologize for any inconvenience caused. We may reach out to you to reschedule.

Best regards,
${company} HR Team`,
      };
    case "Interview_Completed":
      return {
        subject: `Interview Completed - Thank You: ${name}`,
        body: `Dear ${name},

Thank you for attending your interview${data.role ? ` for the position of ${data.role}` : ""} at ${company} on ${data.date || "the scheduled date"}.

We appreciate the time you invested and your interest in joining our team. Our HR team will review your profile and get back to you regarding the next steps.

${data.notes ? `Feedback Notes: ${data.notes}` : ""}

Best regards,
${company} HR Team`,
      };
    case "Offer":
      return {
        subject: `Job Offer: ${data.role || "Position"} at ${company}`,
        body: `Dear ${name},

We are thrilled to offer you the position of ${data.role || "the open role"} at ${company}.

Expected Joining Date: ${data.date || "To be discussed"}
Branch: ${branch}

Please review the attached terms and reply to this email to accept the offer.

Congratulations and welcome to the team!

Best regards,
${company} HR Team`,
      };
    case "Visa":
      return {
        subject: `URGENT: Visa Expiration Alert - ${name}`,
        body: `Dear ${name},

This is an automated alert regarding your visa status. Your visa is expiring soon on ${data.date || "the upcoming date"}.

Please coordinate with the HR department at ${branch} branch immediately to initiate the renewal process and avoid any penalties.

${data.extraDetails || ""}

Best regards,
${company} Notification System`,
      };
    case "Registration" as any:
      return {
        subject: `Registration Completed: Thank You for Joining Us! - ${name}`,
        body: `Dear ${name},
 
Thank you for registering your application with ${company}.
Your application has been successfully received. Our recruitment team will review your profile and contact you if your qualifications match any suitable vacancies.
 
Here are your registration details:
- Candidate Name: ${name}
- Position(s) Applied: ${data.role || "N/A"}
- Application Tracking Code: ${data.extraDetails || "N/A"}
 
Please keep your mobile number and email active for further updates. You can track your status anytime at https://mshorizonuae.com/apply.
 
We look forward to helping you find the right opportunity.
 
Best regards,
${company} Team`,
      };
    default:
      throw new Error("Invalid templateType");
  }
}

/**
 * Generates neat, comprehensive, professional WhatsApp messages
 * matching the detailed format of email notifications.
 */
export function generateWhatsAppContent(
  templateType: 
    | "Interview_Scheduled" 
    | "Interview_Online" 
    | "Interview_Physical" 
    | "Interview_Rescheduled" 
    | "Interview_Cancelled" 
    | "Registration" 
    | "Status_Changed",
  data: {
    applicantName?: string;
    company?: string;
    branch?: string;
    position?: string;
    type?: string;
    dateTime?: string;
    isOnline?: boolean;
    meetingMode?: string;
    conductPerson?: string;
    meetingLink?: string;
    googleMapLink?: string;
    notes?: string;
    trackingCode?: string;
    status?: string;
    previousStatus?: string;
    placedCompany?: string;
    reason?: string;
    meetingId?: string;
    passcode?: string;
    venue?: string;
    building?: string;
    floor?: string;
    location?: string;
  }
): string {
  const name = data.applicantName || "Candidate";
  let company = (data.company && !data.company.includes("@") && data.company !== "System" && data.company !== "Not Placed") ? data.company : "MS Horizon";
  const position = data.position || "General Position";
  const dateStr = data.dateTime ? data.dateTime.replace("T", " ") : "To Be Confirmed";
  const trackUrl = data.trackingCode && data.trackingCode !== "N/A"
    ? `https://mshorizonuae.com/track?code=${data.trackingCode}`
    : `https://mshorizonuae.com/track`;

  switch (templateType) {
    case "Interview_Scheduled":
    case "Interview_Online":
    case "Interview_Physical": {
      const modeText = data.isOnline
        ? `Online Virtual (${data.meetingMode || "Video Call"})`
        : `Physical In-Person (${data.meetingMode || "Office Location"})`;
      
      let locationDetail = "";
      if (data.isOnline) {
        locationDetail = `• *Format:* ${modeText}
• *Meeting Link:* ${data.meetingLink || "Link will be shared prior to meeting"}
${data.meetingId ? `• *Meeting ID:* ${data.meetingId}\n` : ""}${data.passcode ? `• *Passcode:* ${data.passcode}\n` : ""}`;
      } else {
        locationDetail = `• *Format:* ${modeText}
• *Venue / Office:* ${data.location || data.venue || "Main Office"}
${data.building ? `• *Building:* ${data.building}\n` : ""}${data.floor ? `• *Floor:* ${data.floor}\n` : ""}${data.googleMapLink ? `• *Location Map:* ${data.googleMapLink}\n` : ""}`;
      }

      return `Hello *${name}*,

Greetings from *MS Human Resource Consultancies Co. L.L.C.*

We have reviewed your application and would like to invite you for an interview.

*Interview Details:*
• *Position:* ${position}
• *Interview Type:* ${data.type || "Interview"}
• *Date:* ${dateStr ? dateStr.split(" ")[0] || dateStr.split("T")[0] : "To Be Confirmed"}
• *Time:* ${dateStr ? (dateStr.split(" ")[1] || dateStr.split("T")[1] || "To Be Confirmed") : "To Be Confirmed"}
• *Format:* ${data.isOnline ? `Online Virtual (${data.meetingMode || "Video Call"})` : `Physical In-Person (${data.meetingMode || "Office"})`}
• *Interviewer:* ${data.conductPerson || "HR Coordinator"}
${data.isOnline
  ? `• *Meeting Link:* ${data.meetingLink || "Link will be shared prior to meeting"}\n${data.meetingId ? `• *Meeting ID:* ${data.meetingId}\n` : ""}${data.passcode ? `• *Passcode:* ${data.passcode}\n` : ""}`
  : `• *Location:* ${data.location || data.venue || "Main Office, UAE"}\n${data.building ? `• *Building:* ${data.building}\n` : ""}${data.floor ? `• *Floor:* ${data.floor}\n` : ""}${data.googleMapLink ? `• *Map:* ${data.googleMapLink}\n` : ""}`
}
${data.trackingCode && data.trackingCode !== "N/A" ? `• *Tracking Code:* ${data.trackingCode}` : ""}

Please confirm your attendance by replying *"Yes, I will attend."*

${data.notes ? `📝 *Additional Notes:*\n${data.notes}\n\n` : ""}If you have any questions or need to reschedule, please contact us.

Thank you, and we look forward to meeting you.

*MS Human Resource Consultancies Co. L.L.C.*
📞 +971 58 520 3005
📧 mshorizonfze@gmail.com`;
    }

    case "Interview_Rescheduled": {
      const modeText = data.isOnline
        ? `Online Virtual (${data.meetingMode || "Video Call"})`
        : `Physical In-Person (${data.meetingMode || "Office Location"})`;
      
      let locationDetail = "";
      if (data.isOnline) {
        locationDetail = `• *Format:* ${modeText}
• *Meeting Link:* ${data.meetingLink || "Link will be shared prior to meeting"}
${data.meetingId ? `• *Meeting ID:* ${data.meetingId}\n` : ""}${data.passcode ? `• *Passcode:* ${data.passcode}\n` : ""}`;
      } else {
        locationDetail = `• *Format:* ${modeText}
• *Venue / Office:* ${data.location || data.venue || "Main Office"}
${data.building ? `• *Building:* ${data.building}\n` : ""}${data.floor ? `• *Floor:* ${data.floor}\n` : ""}${data.googleMapLink ? `• *Location Map:* ${data.googleMapLink}\n` : ""}`;
      }

      return `Hello *${name}*,

Greetings from *MS Human Resource Consultancies Co. L.L.C.*

Please note that your interview appointment has been rescheduled to a new date and time.

*Updated Interview Details:*
• *Position:* ${position}
• *Interview Type:* ${data.type || "Interview"}
• *New Date:* ${dateStr ? dateStr.split(" ")[0] || dateStr.split("T")[0] : "To Be Confirmed"}
• *New Time:* ${dateStr ? (dateStr.split(" ")[1] || dateStr.split("T")[1] || "To Be Confirmed") : "To Be Confirmed"}
• *Format:* ${data.isOnline ? `Online Virtual (${data.meetingMode || "Video Call"})` : `Physical In-Person (${data.meetingMode || "Office"})`}
• *Interviewer:* ${data.conductPerson || "HR Coordinator"}
${data.isOnline
  ? `• *Meeting Link:* ${data.meetingLink || "Link will be shared prior to meeting"}\n${data.meetingId ? `• *Meeting ID:* ${data.meetingId}\n` : ""}${data.passcode ? `• *Passcode:* ${data.passcode}\n` : ""}`
  : `• *Location:* ${data.location || data.venue || "Main Office, UAE"}\n${data.building ? `• *Building:* ${data.building}\n` : ""}${data.floor ? `• *Floor:* ${data.floor}\n` : ""}${data.googleMapLink ? `• *Map:* ${data.googleMapLink}\n` : ""}`
}
${data.trackingCode && data.trackingCode !== "N/A" ? `• *Tracking Code:* ${data.trackingCode}` : ""}
${data.reason ? `\n*Reason for Rescheduling:* ${data.reason}` : ""}

Please confirm your attendance by replying *"Yes, I will attend."*

If you have any questions or need to reschedule, please contact us.

Thank you, and we look forward to meeting you.

*MS Human Resource Consultancies Co. L.L.C.*
📞 +971 58 520 3005
📧 mshorizonfze@gmail.com`;
    }

    case "Interview_Cancelled": {
      return `Hello *${name}*,

Greetings from *MS Human Resource Consultancies Co. L.L.C.*

We regret to inform you that your scheduled *${data.type || "Interview"}* for the position of *${position}* has been cancelled.
${data.reason ? `\n*Reason:* ${data.reason}\n` : ""}
If you have any questions or wish to explore other opportunities, please feel free to reach out to us.

*MS Human Resource Consultancies Co. L.L.C.*
📞 +971 58 520 3005
📧 mshorizonfze@gmail.com`;
    }

    case "Registration": {
      return `Hello *${name}*,

Greetings from *MS Human Resource Consultancies Co. L.L.C.*

Thank you for applying with us. We have successfully registered your job application in our system.

*Application Summary:*
• *Candidate Name:* ${name}
• *Applied Position:* ${position}
• *Tracking Code:* ${data.trackingCode || "TRK-PENDING"}
• *Registration Date:* ${new Date().toISOString().slice(0, 10)}

You can track your real-time selection status anytime at:
${trackUrl}

If you have any questions, please contact us.

*MS Human Resource Consultancies Co. L.L.C.*
📞 +971 58 520 3005
📧 mshorizonfze@gmail.com`;
    }

    case "Status_Changed":
    default: {
      return `Hello *${name}*,

Greetings from *MS Human Resource Consultancies Co. L.L.C.*

Your job application status has been updated.

*Status Update:*
• *Candidate Name:* ${name}
• *Applied Position:* ${position}
• *New Status:* *${data.status || "Updated"}*
• *Tracking Code:* ${data.trackingCode || "N/A"}
${data.placedCompany ? `• *Placed Company:* ${data.placedCompany}\n` : ""}${data.reason ? `• *Details:* ${data.reason}\n` : ""}
Track your live application status anytime at:
${trackUrl}

If you have any questions, please contact us.

*MS Human Resource Consultancies Co. L.L.C.*
📞 +971 58 520 3005
📧 mshorizonfze@gmail.com`;
    }
  }
}

/**
 * Sends branded HTML task lifecycle emails to assigned staff
 */
export async function sendTaskEmailNotification({
  to,
  assigneeName,
  taskTitle,
  taskDescription,
  priority,
  assignedBy,
  company,
  branch,
  assignedDate,
  dueDate,
  status,
  eventType = "Task Assigned",
  taskId
}: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskDescription?: string;
  priority: string;
  assignedBy: string;
  company: string;
  branch: string;
  assignedDate: string;
  dueDate: string;
  status: string;
  eventType?: "Task Assigned" | "Task Updated" | "Task Reassigned" | "Due Date Changed" | "Task Completed" | "Task Cancelled" | "Task Overdue";
  taskId?: string;
}) {
  if (!to || !to.includes("@")) return;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "");
  const actionLink = `${siteUrl}/tasks`;
  const compName = company || "MS Management";

  const priorityColorMap: Record<string, string> = {
    Urgent: "#e11d48",
    High: "#ea580c",
    Medium: "#d97706",
    Low: "#475569"
  };
  const priorityColor = priorityColorMap[priority] || "#2563eb";

  const eventBadgeMap: Record<string, { label: string; bg: string; color: string }> = {
    "Task Assigned": { label: "📌 NEW TASK ASSIGNED", bg: "#eff6ff", color: "#1d4ed8" },
    "Task Updated": { label: "📝 TASK UPDATED", bg: "#f0f9ff", color: "#0369a1" },
    "Task Reassigned": { label: "↔️ TASK REASSIGNED", bg: "#f5f3ff", color: "#6d28d9" },
    "Due Date Changed": { label: "⏰ DUE DATE UPDATED", bg: "#fff7ed", color: "#c2410c" },
    "Task Completed": { label: "✅ TASK COMPLETED", bg: "#f0fdf4", color: "#15803d" },
    "Task Cancelled": { label: "🚫 TASK CANCELLED", bg: "#fef2f2", color: "#b91c1c" },
    "Task Overdue": { label: "⚠️ TASK OVERDUE NOTICE", bg: "#fff1f2", color: "#be123c" }
  };
  const badge = eventBadgeMap[eventType] || { label: `📌 ${eventType.toUpperCase()}`, bg: "#eff6ff", color: "#1d4ed8" };

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${eventType}: ${taskTitle}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header Banner -->
        <tr>
          <td align="center" style="background-color: #0f172a; padding: 24px; text-align: center;">
            <div style="display: inline-block; background-color: #2563eb; color: #ffffff; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; font-weight: 900; font-size: 20px; margin-bottom: 8px;">MS</div>
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">${compName}</h2>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 500;">Task Management & Operations Portal</p>
          </td>
        </tr>
        <!-- Alert Badge -->
        <tr>
          <td style="padding: 24px 32px 12px 32px;">
            <div style="background-color: ${badge.bg}; border: 1px solid ${badge.color}30; border-radius: 12px; padding: 10px 16px; display: inline-block; color: ${badge.color}; font-weight: 800; font-size: 12px; letter-spacing: 0.5px;">
              ${badge.label}
            </div>
            <h1 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 16px 0 6px 0;">${taskTitle}</h1>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Dear <strong>${assigneeName}</strong>, please find the updated task details below.</p>
          </td>
        </tr>
        <!-- Details Card -->
        <tr>
          <td style="padding: 12px 32px 24px 32px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
              ${taskDescription ? `
              <tr>
                <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px border #e2e8f0; font-size: 13px; color: #334155; line-height: 1.5;">
                  <strong>Description / Instructions:</strong><br>${taskDescription}
                </td>
              </tr>
              ` : ""}
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;" width="40%">Priority:</td>
                <td style="padding: 6px 0; font-size: 13px; color: ${priorityColor}; font-weight: 800;">${priority}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Status:</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 700;">${status}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Assigned By:</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${assignedBy}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Target Company:</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${company || "System"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Branch:</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${branch || "Main Branch"}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Assigned Date:</td>
                <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">${assignedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Due Date:</td>
                <td style="padding: 6px 0; font-size: 13px; color: #e11d48; font-weight: 800;">${dueDate}</td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Action Button -->
        <tr>
          <td align="center" style="padding: 0 32px 32px 32px;">
            <a href="${actionLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
              🚀 View & Update Task in Portal
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="background-color: #f1f5f9; padding: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
            This is an automated operational notification from ${compName}.<br>
            Please do not reply directly to this email.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `[${eventType}] ${taskTitle} - ${compName}`,
    body: emailHtml,
    candidateName: assigneeName,
    company,
    branch,
    templateType: "Task_Assigned",
    templateData: {
      recipientName: assigneeName,
      title: taskTitle,
      description: taskDescription || "",
      priority,
      status,
      assignedBy,
      company,
      branch,
      assignedDate,
      dueDate,
      actionLink
    }
  }).catch(err => console.error("Error sending task lifecycle email:", err));
}

