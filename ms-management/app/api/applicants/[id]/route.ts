import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, canModifyRecord } from "@/lib/auth-helpers";
import { sendEmail, sendWhatsApp, generateEmailContent, generateWhatsAppContent } from "@/lib/notifications";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const existing = await prisma.applicant.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "applicants", "edit", existing))) {
      await createAuditLog(user, "Status Changed", "applicants", null, `Unauthorized attempt to edit applicant ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Tenancy Check
    if (user.role !== "Super Admin") {
      if (existing.company !== user.company) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (user.role === "Branch Admin" && existing.branch !== user.branch) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Prevent changing the company/branch via payload
      if (data.company && data.company !== user.company) {
        return NextResponse.json({ error: "Cannot change applicant's company" }, { status: 403 });
      }
      if (user.role === "Branch Admin" && data.branch && data.branch !== user.branch) {
        return NextResponse.json({ error: "Cannot change applicant's branch" }, { status: 403 });
      }
    }
    // Validate email uniqueness in Staff, Applicant, and User tables (excluding current ID/email)
    if (data.email && data.email.trim() !== "") {
      const emailLower = data.email.trim().toLowerCase();
      const oldEmailLower = existing.email ? existing.email.trim().toLowerCase() : "";
      
      if (emailLower !== oldEmailLower) {
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
      }

      const existingApplicant = await prisma.applicant.findFirst({
        where: { email: emailLower, id: { not: id } }
      });
      if (existingApplicant) {
        return NextResponse.json(
          { error: "An applicant with this email address already exists." },
          { status: 400 }
        );
      }
    }

    // Check phone/whatsapp uniqueness in Staff and Applicant tables (excluding current ID)
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
              id: { not: id },
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

    // Validate passport uniqueness in Staff and Applicant tables (excluding current ID)
    if (data.passportNumber && data.passportNumber.trim() !== "") {
      const passportTrimmed = data.passportNumber.trim();
      
      const existingStaffPassport = await prisma.staff.findFirst({
        where: { passportNumber: { equals: passportTrimmed } }
      });
      if (existingStaffPassport) {
        return NextResponse.json(
          { error: `Passport number (${passportTrimmed}) is already registered for staff member ${existingStaffPassport.name}.` },
          { status: 400 }
        );
      }

      const existingAppPassport = await prisma.applicant.findFirst({
        where: { passportNumber: { equals: passportTrimmed }, id: { not: id } }
      });
      if (existingAppPassport) {
        return NextResponse.json(
          { error: `Passport number (${passportTrimmed}) is already registered for applicant ${existingAppPassport.fullName}.` },
          { status: 400 }
        );
      }
    }

    const stringifyArrayOrUndefined = (val: any) => {
      if (val === undefined) return undefined;
      if (typeof val === "string") return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return JSON.stringify([]);
    };

    const updated = await prisma.applicant.update({
      where: { id },
      data: {
        photo: data.photo !== undefined ? data.photo : undefined,
        applicationDate: data.applicationDate ?? undefined,
        fullName: data.fullName ?? undefined,
        gender: data.gender ?? undefined,
        dateOfBirth: data.dateOfBirth ?? undefined,
        email: data.email ?? undefined,
        mobile: data.mobile ?? undefined,
        whatsapp: data.whatsapp ?? undefined,
        nationality: data.nationality ?? undefined,
        nationalityFlag: data.nationalityFlag ?? undefined,
        currentCountry: data.currentCountry ?? undefined,
        applyingPositions: stringifyArrayOrUndefined(data.applyingPositions),
        salaryExpectation: data.salaryExpectation !== undefined ? Number(data.salaryExpectation) : undefined,
        applyCountry: data.applyCountry ?? undefined,
        visaType: data.visaType ?? undefined,
        visaExpiry: data.visaExpiry ?? undefined,
        passportExpiry: data.passportExpiry ?? undefined,
        passportNumber: data.passportNumber ?? undefined,
        status: data.status ?? undefined,
        trackingCode: data.trackingCode ?? undefined,
        company: data.company ?? undefined,
        branch: data.branch ?? undefined,
        documents: stringifyArrayOrUndefined(data.documents),
        statusHistory: stringifyArrayOrUndefined(data.statusHistory),
        clientName: data.clientName !== undefined ? data.clientName : undefined,
        clientPhoto: data.clientPhoto !== undefined ? data.clientPhoto : undefined,
        clientMobile: data.clientMobile !== undefined ? data.clientMobile : undefined,
        clientWhatsapp: data.clientWhatsapp !== undefined ? data.clientWhatsapp : undefined,
        clientEmail: data.clientEmail !== undefined ? data.clientEmail : undefined,
        memberActive: data.memberActive !== undefined ? data.memberActive : undefined,
        education: data.education !== undefined ? data.education : undefined,
        experience: data.experience !== undefined ? data.experience : undefined,
        collegeUniversity: data.collegeUniversity !== undefined ? data.collegeUniversity : undefined,
        graduatedYear: data.graduatedYear !== undefined ? data.graduatedYear : undefined,
        certification: data.certification !== undefined ? data.certification : undefined,
        referencePersonName: data.referencePersonName !== undefined ? data.referencePersonName : undefined,
        referencePersonMobile: data.referencePersonMobile !== undefined ? data.referencePersonMobile : undefined
      }
    });


    // If status has changed, trigger real-time notifications and send status update email for EVERY status
    if (data.status && data.status !== existing.status && updated.email) {
      const companyName = updated.company && updated.company !== "Not Placed" ? updated.company : "MS HORIZON";
      const positionsStr = Array.isArray(updated.applyingPositions) ? updated.applyingPositions.join(", ") : (updated.applyingPositions || "N/A");

      let templateType = "Status_Changed";
      let subject = `Application Status Updated: ${updated.status} - Tracking Code: ${updated.trackingCode}`;

      if (updated.status === "Selected") {
        templateType = "Offer";
        subject = `Job Offer Invitation: ${positionsStr}`;
      } else if (updated.status === "Placed") {
        templateType = "Placement_Confirmed";
        subject = `Congratulations! Placement Confirmed - ${positionsStr}`;
      } else if (updated.status === "Interview Scheduled") {
        templateType = "Interview_Scheduled";
        subject = `Interview Scheduled for ${positionsStr}`;
      } else if (updated.status === "Rescheduled") {
        templateType = "Interview_Rescheduled";
        subject = `Interview Rescheduled for ${positionsStr}`;
      } else if (updated.status === "Cancelled") {
        templateType = "Interview_Cancelled";
        subject = `Interview Cancelled - ${positionsStr}`;
      } else if (updated.status === "Visa Processing") {
        templateType = "Visa_Processing";
        subject = `Visa Processing Started for ${updated.fullName}`;
      } else if (updated.status === "Approved") {
        templateType = "Applicant_Approved";
        subject = `Application Approved - Welcome to the Next Step!`;
      } else if (updated.status === "Rejected") {
        templateType = "Applicant_Rejected";
        subject = `Application Update regarding your submission`;
      } else if (updated.status === "Returned") {
        templateType = "Applicant_Returned";
        subject = `Action Required: Application Returned for Modification`;
      } else if (updated.status === "Processing") {
        templateType = "Applicant_Processing";
        subject = `Application under Active Review`;
      } else if (updated.status === "Shortlisted") {
        templateType = "Status_Changed";
        subject = `You Have Been Shortlisted for ${positionsStr}!`;
      } else if (updated.status === "Pending") {
        templateType = "Status_Changed";
        subject = `Application Status: Pending Review`;
      }

      const emailBody = `
        <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
          Please be informed that your application status has been updated to: <strong style="color: #2563eb;">${updated.status}</strong>.
        </p>
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h4 style="margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Registration Summary</h4>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #059669; margin-right: 10px;"></span>
              <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Candidate Name:</span> 
              <span style="color: #059669; font-weight: 600;">${updated.fullName}</span>
            </li>
            <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #ea580c; margin-right: 10px;"></span>
              <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Tracking Code:</span> 
              <span style="color: #ea580c; font-weight: 600; font-family: monospace; font-size: 15px;">${updated.trackingCode}</span>
            </li>
            <li style="font-size: 14px; display: flex; align-items: center;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #4f46e5; margin-right: 10px;"></span>
              <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Position:</span> 
              <span style="color: #4f46e5; font-weight: 600;">${positionsStr}</span>
            </li>
          </ul>
        </div>
      `;

      sendEmail({
        to: updated.email,
        subject,
        body: emailBody,
        candidateName: updated.fullName,
        company: companyName,
        branch: updated.branch,
        type: "Status Update",
        templateType,
        templateData: {
          applicantId: updated.id,
          recipientName: updated.fullName,
          applicantFullName: updated.fullName,
          nationality: updated.nationality || "N/A",
          passportNumber: updated.passportNumber || "N/A",
          passport: updated.passportNumber || "N/A",
          visaStatus: updated.visaType || "N/A",
          body: emailBody,
          actionLink: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mshorizonuae.com"}/track?code=${updated.trackingCode}`,
          trackingCode: updated.trackingCode,
          status: updated.status,
          currentStatus: updated.status,
          newStatus: updated.status,
          previousStatus: existing.status,
          positions: positionsStr,
          position: positionsStr,
          appliedPosition: positionsStr,
          salary: updated.salaryExpectation ? String(updated.salaryExpectation) : "As agreed",
          joiningDate: "Immediate or as per visa processing",
          allowances: "Standard accommodation and transport as per UAE Labor Law",
          offerLetterLink: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mshorizonuae.com"}/track?code=${updated.trackingCode}`
        }
      }).catch(err => console.error("Background status update email error:", err));
    } else if (updated.email && Object.keys(data).some(key => data[key] !== undefined && data[key] !== (existing as any)[key])) {
      // General profile update
      const companyName = updated.company && updated.company !== "Not Placed" ? updated.company : "MS HORIZON";
      const emailBody = `
          <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
            This is to notify you that your application profile details have been updated in our recruitment system.
          </p>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h4 style="margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Profile Summary</h4>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #059669; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Candidate Name:</span> 
                <span style="color: #059669; font-weight: 600;">${updated.fullName}</span>
              </li>
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #ea580c; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Tracking Code:</span> 
                <span style="color: #ea580c; font-weight: 600; font-family: monospace; font-size: 15px;">${updated.trackingCode}</span>
              </li>
              <li style="font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #4f46e5; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Position:</span> 
                <span style="color: #4f46e5; font-weight: 600;">${Array.isArray(updated.applyingPositions) ? (updated.applyingPositions as string[]).join(", ") : updated.applyingPositions}</span>
              </li>
            </ul>
          </div>
        `;
      sendEmail({
        to: updated.email,
        subject: `Application Profile Updated - Tracking Code: ${updated.trackingCode}`,
        body: emailBody,
        candidateName: updated.fullName,
        company: companyName,
        branch: updated.branch,
        templateType: "Status_Changed",
        templateData: {
          recipientName: updated.fullName,
          newStatus: "Profile Updated",
          notes: "Your general application profile details have been successfully updated in our recruitment system.",
          actionLink: `${process.env.NEXT_PUBLIC_SITE_URL || "https://mshorizonuae.com"}/track?code=${updated.trackingCode}`,
          trackingCode: updated.trackingCode
        }
      }).catch(err => console.error("Background profile update email error:", err));
    }

    if (data.status && data.status !== existing.status && (updated.whatsapp || updated.mobile)) {
      const waNumber = updated.whatsapp || updated.mobile;
      const companyName = updated.company && updated.company !== "Not Placed" ? updated.company : "MS HORIZON";

      const waMessage = generateWhatsAppContent("Status_Changed", {
        applicantName: updated.fullName,
        company: companyName,
        branch: updated.branch,
        position: Array.isArray(updated.applyingPositions) ? (updated.applyingPositions as string[]).join(", ") : String(updated.applyingPositions || ""),
        trackingCode: updated.trackingCode,
        status: updated.status,
        previousStatus: existing.status,
        placedCompany: updated.status === "Placed" ? (updated.clientName || undefined) : undefined,
        reason: data.reason || (updated.statusHistory && Array.isArray(updated.statusHistory) && (updated.statusHistory[0] as any)?.reason) || undefined
      });

      try {
        await sendWhatsApp({
          to: waNumber,
          message: waMessage,
          candidateName: updated.fullName,
          company: updated.company,
          branch: updated.branch
        });
      } catch (err) {
        console.error("Async status update WhatsApp error:", err);
      }
    }

    if (data.status && data.status !== existing.status) {
      try {
        const notificationUsers = await prisma.user.findMany({
          where: {
            company: updated.company,
            role: { in: ["Super Admin", "Company Admin", "Branch Admin", "HR Manager", "HR", "Recruiter"] }
          }
        });
        
        for (const targetUser of notificationUsers) {
          await prisma.notification.create({
            data: {
              title: "Applicant Status Updated",
              message: `Applicant ${updated.fullName}'s status updated to: ${updated.status}. Track code: ${updated.trackingCode}`,
              type: "Applicant",
              userId: targetUser.id,
              company: updated.company,
              branch: updated.branch,
              link: "/applicants",
              createdAt: new Date().toISOString()
            }
          });
        }
      } catch (err) {
        console.error("Failed to trigger update notifications:", err);
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT applicant error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.applicant.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "applicants", "delete", existing))) {
      await createAuditLog(user, "Status Changed", "applicants", null, `Unauthorized attempt to delete applicant ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Tenancy Check
    if (user.role !== "Super Admin") {
      if (existing.company !== user.company) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (user.role === "Branch Admin" && existing.branch !== user.branch) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.applicant.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Applicant deleted" });
  } catch (error: any) {
    console.error("DELETE applicant error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id }
    });

    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "applicants", "view", applicant))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(applicant);
  } catch (error: any) {
    console.error("GET applicant detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
