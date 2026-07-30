import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog, getPermissionScopedFilter } from "@/lib/auth-helpers";
import { sendEmail, sendWhatsApp, generateEmailContent, generateWhatsAppContent } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "applicants", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "applicants", null, "Unauthorized attempt to view applicants", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const applicants = await prisma.applicant.findMany({
      where: filter,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(applicants);
  } catch (error: any) {
    console.error("GET applicants error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (user && !(await hasPermissionBackend(user, "applicants", "create"))) {
      await createAuditLog(user, "Status Changed", "applicants", null, "Unauthorized attempt to create applicant", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.fullName || !data.company || !data.branch) {
      return NextResponse.json(
        { error: "Full name, company, and branch are required" },
        { status: 400 }
      );
    }

    // Tenancy Check: only if session exists
    if (!user) {
      // Guest registering via public portal - validate selected company and branch
      if (!data.company || !data.branch) {
        return NextResponse.json({ error: "Company and branch selection is required for registration." }, { status: 400 });
      }
      const activeComp = await prisma.internalCompany.findFirst({
        where: { name: data.company, status: "Active" }
      });
      if (!activeComp) {
        return NextResponse.json({ error: "The selected company is invalid or inactive." }, { status: 400 });
      }
      const activeBranch = await prisma.branch.findFirst({
        where: { name: data.branch, company: data.company, status: "Active" }
      });
      if (!activeBranch) {
        return NextResponse.json({ error: "The selected branch is invalid or inactive." }, { status: 400 });
      }
    } else {
      if (user.role !== "Super Admin") {
        if (data.company !== user.company) {
          return NextResponse.json({ error: "Cannot create applicant for another company" }, { status: 403 });
        }
        if (user.role !== "Company Admin" && data.branch !== user.branch) {
          return NextResponse.json({ error: "Cannot create applicant for another branch" }, { status: 403 });
        }
      }
    }

    // Validate passport uniqueness in Staff and Applicant tables
    if (data.passportNumber && data.passportNumber.trim() !== "") {
      const passportTrimmed = data.passportNumber.trim();
      
      const existingStaffPassport = await prisma.staff.findFirst({
        where: { passportNumber: { equals: passportTrimmed, mode: 'insensitive' } }
      });
      if (existingStaffPassport) {
        return NextResponse.json(
          { error: `Passport number (${passportTrimmed}) is already registered for staff member ${existingStaffPassport.name}.` },
          { status: 400 }
        );
      }

      const existingAppPassport = await prisma.applicant.findFirst({
        where: { passportNumber: { equals: passportTrimmed, mode: 'insensitive' } }
      });
      if (existingAppPassport) {
        return NextResponse.json(
          { error: `Passport number (${passportTrimmed}) is already registered for applicant ${existingAppPassport.fullName}.` },
          { status: 400 }
        );
      }
    }

    // Validate email uniqueness in Staff, Applicant, and User tables
    if (data.email && data.email.trim() !== "") {
      const emailLower = data.email.trim().toLowerCase();
      
      const existingUser = await prisma.user.findFirst({
        where: { email: emailLower }
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user account with this email address already exists." },
          { status: 400 }
        );
      }

      const existingStaff = await prisma.staff.findFirst({
        where: { email: emailLower }
      });
      if (existingStaff) {
        return NextResponse.json(
          { error: "A staff member with this email address already exists." },
          { status: 400 }
        );
      }

      const existingApplicant = await prisma.applicant.findFirst({
        where: { email: emailLower }
      });
      if (existingApplicant) {
        return NextResponse.json(
          { error: "An applicant with this email address already exists." },
          { status: 400 }
        );
      }
    }

    // Check phone/whatsapp uniqueness in Staff and Applicant tables
    if (data.mobile || data.whatsapp) {
      const cleanMobile = data.mobile ? data.mobile.trim().replace(/[^0-9+]/g, "") : "";
      const cleanWhatsapp = data.whatsapp ? data.whatsapp.trim().replace(/[^0-9+]/g, "") : "";
      
      if (cleanMobile || cleanWhatsapp) {
        const numbersToCheck = [cleanMobile, cleanWhatsapp].filter(n => n.length > 5);
        for (const num of numbersToCheck) {
          // Check in Staff
          const dupStaff = await prisma.staff.findFirst({
            where: {
              OR: [
                { mobile: { contains: num } },
                { whatsapp: { contains: num } }
              ]
            }
          });
          if (dupStaff) {
            return NextResponse.json({ error: `Mobile or WhatsApp number (${num}) is already registered for staff member ${dupStaff.name}.` }, { status: 400 });
          }

          // Check in Applicant
          const dupApp = await prisma.applicant.findFirst({
            where: {
              OR: [
                { mobile: { contains: num } },
                { whatsapp: { contains: num } }
              ]
            }
          });
          if (dupApp) {
            return NextResponse.json({ error: `Mobile or WhatsApp number (${num}) is already registered for applicant ${dupApp.fullName}.` }, { status: 400 });
          }
        }
      }
    }

    // Generate tracking code if not provided
    let trackingCode = data.trackingCode;
    if (!trackingCode) {
      const year = new Date().getFullYear();
      const count = await prisma.applicant.count();
      trackingCode = `TRK-${year}-${String(count + 1).padStart(3, "0")}`;
    }

    const applicant = await prisma.applicant.create({
      data: {
        id: data.id || undefined,
        photo: data.photo || null,
        applicationDate: data.applicationDate || new Date().toISOString().slice(0, 10),
        fullName: data.fullName,
        gender: data.gender || "",
        dateOfBirth: data.dateOfBirth || "",
        email: data.email ? data.email.trim().toLowerCase() : "",
        mobile: data.mobile || "",
        whatsapp: data.whatsapp || "",
        nationality: data.nationality || "",
        nationalityFlag: data.nationalityFlag || "",
        currentCountry: data.currentCountry || "",
        applyingPositions: data.applyingPositions || [],
        salaryExpectation: Number(data.salaryExpectation) || 0,
        applyCountry: data.applyCountry || "",
        visaType: data.visaType || "",
        visaExpiry: data.visaExpiry || "",
        passportExpiry: data.passportExpiry || "",
        passportNumber: data.passportNumber || "",
        status: data.status || "Pending",
        trackingCode: trackingCode,
        company: data.company,
        branch: data.branch,
        createdBy: user ? user.name : (data.fullName || "Online Application"),
        createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
        documents: data.documents || [],
        statusHistory: data.statusHistory || [],
        clientName: data.clientName || null,
        clientPhoto: data.clientPhoto || null,
        clientMobile: data.clientMobile || null,
        clientWhatsapp: data.clientWhatsapp || null,
        clientEmail: data.clientEmail || null,
        memberActive: data.memberActive || false
      }
    });
    // 1. Notify Agency (Own Company) admins
    try {
      await prisma.notification.create({
        data: {
          title: "New Online Application Received",
          message: `Applicant ${applicant.fullName} has registered online. Next step: Click here to review details, documents, and schedule an interview.`,
          type: "Info",
          userId: "admin",
          company: applicant.company || "MS Company Management Solutions",
          branch: applicant.branch,
          link: `/applicants/${applicant.id}`,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("Failed to create agency notification:", err);
    }

    // Trigger real-time notifications asynchronously
    if (applicant.email && applicant.email.trim() !== "") {
      const companyName = applicant.company && applicant.company !== "Not Placed" ? applicant.company : "MS Human Resource Consultancies";
      const generated = generateEmailContent("Registration" as any, {
        applicantName: applicant.fullName,
        company: companyName,
        branch: applicant.branch || undefined,
        role: Array.isArray(applicant.applyingPositions) 
          ? (applicant.applyingPositions as string[]).join(", ") 
          : (applicant.applyingPositions ? String(applicant.applyingPositions) : undefined),
        extraDetails: applicant.trackingCode ? String(applicant.trackingCode) : undefined
      });

      try {
        await sendEmail({
          to: applicant.email,
          subject: generated.subject,
          body: generated.body,
          candidateName: applicant.fullName,
          company: companyName,
          branch: applicant.branch || undefined,
          templateType: "Registration",
          templateData: {
            applicantId: applicant.id,
            recipientName: applicant.fullName,
            applicantFullName: applicant.fullName,
            trackingCode: applicant.trackingCode || "",
            trackingNumber: applicant.trackingCode || "",
            nationality: applicant.nationality || "N/A",
            passportNumber: applicant.passportNumber || "N/A",
            passport: applicant.passportNumber || "N/A",
            visaStatus: applicant.visaType || "N/A",
            status: applicant.status || "Pending",
            currentStatus: applicant.status || "Pending",
            applicationDate: applicant.applicationDate || new Date().toISOString().split("T")[0],
            applyingPositions: Array.isArray(applicant.applyingPositions)
              ? (applicant.applyingPositions as string[]).join(", ")
              : (applicant.applyingPositions ? String(applicant.applyingPositions) : ""),
            position: Array.isArray(applicant.applyingPositions)
              ? (applicant.applyingPositions as string[]).join(", ")
              : (applicant.applyingPositions ? String(applicant.applyingPositions) : ""),
            appliedPosition: Array.isArray(applicant.applyingPositions)
              ? (applicant.applyingPositions as string[]).join(", ")
              : (applicant.applyingPositions ? String(applicant.applyingPositions) : "")
          }
        });
      } catch (err) {
        console.error("Async email sending error:", err);
      }
    }

    if (applicant.whatsapp || applicant.mobile) {
      const waNumber = applicant.whatsapp || applicant.mobile;
      const companyName = applicant.company && applicant.company !== "Not Placed" ? applicant.company : "MS Horizon F.Z.E";
      
      const waMessage = generateWhatsAppContent("Registration", {
        applicantName: applicant.fullName,
        company: companyName,
        branch: applicant.branch,
        position: Array.isArray(applicant.applyingPositions) ? (applicant.applyingPositions as string[]).join(", ") : String(applicant.applyingPositions || ""),
        trackingCode: applicant.trackingCode
      });

      try {
        await sendWhatsApp({
          to: waNumber,
          message: waMessage,
          candidateName: applicant.fullName,
          company: applicant.company,
          branch: applicant.branch
        });
      } catch (err) {
        console.error("Async WhatsApp sending error:", err);
      }
    }

    return NextResponse.json(applicant);
  } catch (error: any) {
    console.error("POST applicant error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
