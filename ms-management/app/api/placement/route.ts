import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog, getPermissionScopedFilter } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "placement", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "placement", null, "Unauthorized attempt to view placement agreements", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const placements = await prisma.placement.findMany({
      where: filter,
      orderBy: { placementDate: "desc" }
    });

    return NextResponse.json(placements);
  } catch (error: any) {
    console.error("GET placements error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(user, "placement", "create"))) {
      await createAuditLog(user, "Status Changed", "placement", null, "Unauthorized attempt to create placement agreement", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    // Required fields — companyId is NOT required for "Registered" status
    if (!data.applicantId || !data.applicantName || !data.company || !data.branch) {
      return NextResponse.json(
        { error: "applicantId, applicantName, company and branch are required" },
        { status: 400 }
      );
    }

    // For "Placed" status, companyName IS required
    if ((data.status === "Placed") && (!data.companyId || !data.companyName)) {
      return NextResponse.json(
        { error: "companyId and companyName are required when status is Placed" },
        { status: 400 }
      );
    }

    // Tenancy Check
    if (user.role !== "Super Admin" && data.company !== user.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const placement = await prisma.placement.create({
      data: {
        id: data.id || undefined,
        applicantId: data.applicantId,
        applicantName: data.applicantName,
        companyId: data.companyId || "",
        companyName: data.companyName || "Pending",
        position: data.position || "",
        salary: Number(data.salary) || 0,
        placementDate: data.placementDate || new Date().toISOString().slice(0, 10),
        status: data.status || "Registered",
        company: data.company,
        branch: data.branch,
        createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
        agreementStatus: data.agreementStatus || "Pending",
        applicantSign: data.applicantSign || "",
        companySign: data.companySign || "",
        termsAndConditions: data.termsAndConditions || "",
        agreementHistory: Array.isArray(data.agreementHistory) ? JSON.stringify(data.agreementHistory) : (typeof data.agreementHistory === "string" ? data.agreementHistory : "[]"),
        passportNumber: data.passportNumber || "",
        mobileNumber: data.mobileNumber || "",
        registrationDate: data.registrationDate || "",
        placementDeadline: data.placementDeadline || "",
        registrationFee: data.registrationFee !== undefined ? Number(data.registrationFee) : 0,
        placementFee: data.placementFee !== undefined ? Number(data.placementFee) : 0,
        refundStatus: data.refundStatus || "Not Applicable",
        agreementAccepted: data.agreementAccepted !== undefined ? Boolean(data.agreementAccepted) : false,
        applicantSignDate: data.applicantSignDate ? new Date(data.applicantSignDate) : undefined,
        applicantSignIp: data.applicantSignIp || undefined,
        applicantSignDevice: data.applicantSignDevice || undefined,
        notes: data.notes || "",
        createdBy: data.createdBy || user.name,
        nationality: data.nationality || "",
        whatsappNumber: data.whatsappNumber || "",
        emailAddress: data.emailAddress || "",
        dateOfBirth: data.dateOfBirth || "",
        gender: data.gender || "",
        currentAddress: data.currentAddress || "",
        currentCountry: data.currentCountry || "",
        emiratesId: data.emiratesId || "",
        maritalStatus: data.maritalStatus || "",
        education: data.education || "",
        experience: data.experience || "",
        passportExpiry: data.passportExpiry || "",
        travelStatus: data.travelStatus || "",
        photo: data.photo || "",
        clientTradeLicense: data.clientTradeLicense || "",
        clientAddress: data.clientAddress || "",
        clientCountry: data.clientCountry || "",
        clientContactPerson: data.clientContactPerson || "",
        clientContactNumber: data.clientContactNumber || "",
        clientEmail: data.clientEmail || "",
        clientLogo: data.clientLogo || "",
        department: data.department || "",
        workLocation: data.workLocation || "",
        city: data.city || "",
        joiningDate: data.joiningDate || "",
        contractDuration: data.contractDuration || "",
        probationPeriod: data.probationPeriod || "",
        workingHours: data.workingHours || "",
        weeklyOff: data.weeklyOff || "",
        shiftDetails: data.shiftDetails || "",
        currency: data.currency || "AED",
        paymentFrequency: data.paymentFrequency || "Monthly",
        foodAllowance: data.foodAllowance || "",
        accommodation: data.accommodation || "",
        transportation: data.transportation || "",
        overtime: data.overtime || "",
        medicalInsurance: data.medicalInsurance || "",
        airTicket: data.airTicket || "",
        annualLeave: data.annualLeave || "",
        otherBenefits: data.otherBenefits || "",
        visaStatus: data.visaStatus || "",
        placementVisaType: data.placementVisaType || "",
        visaNumber: data.visaNumber || "",
        visaExpiryDate: data.visaExpiryDate || "",
        visaProcessingStage: data.visaProcessingStage || "",
        medicalStatus: data.medicalStatus || "",
        emiratesIdStatus: data.emiratesIdStatus || "",
        labourContractStatus: data.labourContractStatus || "",
        joiningStatus: data.joiningStatus || "",
        paymentStatus: data.paymentStatus || "Unpaid",
        paymentMethod: data.paymentMethod || "",
        receiptNumber: data.receiptNumber || "",
        dueAmount: data.dueAmount !== undefined ? Number(data.dueAmount) : 0,
        paidAmount: data.paidAmount !== undefined ? Number(data.paidAmount) : 0
      }
    });

    // If status is Placed, update the applicant record
    if (placement.status === "Placed") {
      const applicant = await prisma.applicant.findUnique({
        where: { id: placement.applicantId }
      });
      if (applicant) {
        let currentHistory: any[] = [];
        try {
          if (applicant.statusHistory) {
            currentHistory = typeof applicant.statusHistory === 'string'
              ? JSON.parse(applicant.statusHistory)
              : (Array.isArray(applicant.statusHistory) ? applicant.statusHistory : []);
          }
        } catch (e) {
          console.error("Parse status history error:", e);
        }

        const newHistoryItem = {
          oldStatus: applicant.status,
          newStatus: "Placed",
          changedBy: user.name,
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          reason: `Placed with company: ${placement.companyName} on ${placement.placementDate}`
        };

        await prisma.applicant.update({
          where: { id: placement.applicantId },
          data: {
            status: "Placed",
            clientName: placement.companyName,
            statusHistory: JSON.stringify([newHistoryItem, ...currentHistory])
          }
        });
      }
    }

    // Create notification for the placement registration
    try {
      const notifMessage = placement.status === "Placed"
        ? `${placement.applicantName} has been successfully placed with ${placement.companyName}.`
        : `New placement registration created for ${placement.applicantName}. Agreement signed and registration fee recorded.`;

      await prisma.notification.create({
        data: {
          title: placement.status === "Placed" ? "New Placement Confirmed" : "New Placement Registration",
          message: notifMessage,
          type: "Success",
          read: false,
          createdAt: new Date().toISOString(),
          userId: user.id,
          company: placement.company,
          branch: placement.branch,
          sender: user.name,
          link: "/placement",
          status: "Delivered"
        }
      });
    } catch (notifErr) {
      console.error("Failed to create notification for placement:", notifErr);
      // Non-blocking — don't fail the request
    }

    // Send email notification
    try {
      if (data.emailAddress && data.emailAddress.trim() !== "") {
        await sendEmail({
          to: data.emailAddress,
          subject: `Placement Registration Confirmed — ${placement.applicantName}`,
          body: `Dear ${placement.applicantName},\n\nYour placement registration with MS Horizon F.Z.E has been confirmed.\n\nRegistration Date: ${placement.registrationDate}\nRegistration Fee: AED ${placement.registrationFee}\nPlacement Deadline: ${placement.placementDeadline}\n\nPlease contact us for any queries.\n\nBest regards,\n${placement.company}`,
          candidateName: placement.applicantName,
          company: placement.company,
          branch: placement.branch,
          templateType: "Placement_Confirmed",
          templateData: {
            recipientName: placement.applicantName,
            employerName: placement.companyName,
            position: placement.position,
            workLocation: placement.workLocation || "N/A",
            startDate: placement.joiningDate || "N/A",
            salary: placement.salary || 0,
            company: placement.company
          }
        });
      }
    } catch (emailErr) {
      console.error("Failed to send placement email:", emailErr);
      // Non-blocking — don't fail the request
    }

    // Activity log
    try {
      await prisma.activityLog.create({
        data: {
          dateTime: new Date().toISOString(),
          userName: user.name,
          role: user.role,
          company: user.company,
          branch: user.branch,
          action: `Created placement registration for ${placement.applicantName}. Status: ${placement.status}. Agreement: ${placement.agreementStatus}.`,
          module: "Placement",
          newValue: JSON.stringify({ id: placement.id, status: placement.status, applicantName: placement.applicantName })
        }
      });
    } catch (logErr) {
      console.error("Failed to create activity log for placement:", logErr);
    }

    return NextResponse.json(placement);
  } catch (error: any) {
    console.error("POST placement error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
