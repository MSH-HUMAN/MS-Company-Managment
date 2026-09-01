import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, canModifyRecord } from "@/lib/auth-helpers";

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

    const existing = await prisma.placement.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "placement", "edit", existing))) {
      await createAuditLog(user, "Status Changed", "placement", null, `Unauthorized attempt to edit placement agreement ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Tenancy Check
    if (user.role !== "Super Admin" && existing.company !== user.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.placement.update({
      where: { id },
      data: {
        applicantId: data.applicantId ?? undefined,
        applicantName: data.applicantName ?? undefined,
        companyId: data.companyId ?? undefined,
        companyName: data.companyName ?? undefined,
        position: data.position ?? undefined,
        salary: data.salary !== undefined ? Number(data.salary) : undefined,
        placementDate: data.placementDate ?? undefined,
        status: data.status ?? undefined,
        company: data.company ?? undefined,
        branch: data.branch ?? undefined,
        agreementStatus: data.agreementStatus ?? undefined,
        applicantSign: data.applicantSign ?? undefined,
        companySign: data.companySign ?? undefined,
        applicantSignDate: data.applicantSignDate ? new Date(data.applicantSignDate) : undefined,
        applicantSignIp: data.applicantSignIp ?? undefined,
        applicantSignDevice: data.applicantSignDevice ?? undefined,
        termsAndConditions: data.termsAndConditions ?? undefined,
        agreementHistory: data.agreementHistory !== undefined ? (Array.isArray(data.agreementHistory) ? JSON.stringify(data.agreementHistory) : (typeof data.agreementHistory === "string" ? data.agreementHistory : "[]")) : undefined,
        passportNumber: data.passportNumber ?? undefined,
        mobileNumber: data.mobileNumber ?? undefined,
        registrationDate: data.registrationDate ?? undefined,
        placementDeadline: data.placementDeadline ?? undefined,
        registrationFee: data.registrationFee !== undefined ? Number(data.registrationFee) : undefined,
        placementFee: data.placementFee !== undefined ? Number(data.placementFee) : undefined,
        refundStatus: data.refundStatus ?? undefined,
        agreementAccepted: data.agreementAccepted !== undefined ? Boolean(data.agreementAccepted) : undefined,
        notes: data.notes ?? undefined,
        nationality: data.nationality ?? undefined,
        whatsappNumber: data.whatsappNumber ?? undefined,
        emailAddress: data.emailAddress ?? undefined,
        dateOfBirth: data.dateOfBirth ?? undefined,
        gender: data.gender ?? undefined,
        currentAddress: data.currentAddress ?? undefined,
        currentCountry: data.currentCountry ?? undefined,
        clientTradeLicense: data.clientTradeLicense ?? undefined,
        clientAddress: data.clientAddress ?? undefined,
        clientCountry: data.clientCountry ?? undefined,
        clientContactPerson: data.clientContactPerson ?? undefined,
        clientContactNumber: data.clientContactNumber ?? undefined,
        clientEmail: data.clientEmail ?? undefined,
        clientLogo: data.clientLogo ?? undefined,
        department: data.department ?? undefined,
        workLocation: data.workLocation ?? undefined,
        city: data.city ?? undefined,
        joiningDate: data.joiningDate ?? undefined,
        contractDuration: data.contractDuration ?? undefined,
        probationPeriod: data.probationPeriod ?? undefined,
        workingHours: data.workingHours ?? undefined,
        weeklyOff: data.weeklyOff ?? undefined,
        shiftDetails: data.shiftDetails ?? undefined,
        currency: data.currency ?? undefined,
        paymentFrequency: data.paymentFrequency ?? undefined,
        foodAllowance: data.foodAllowance ?? undefined,
        accommodation: data.accommodation ?? undefined,
        transportation: data.transportation ?? undefined,
        overtime: data.overtime ?? undefined,
        medicalInsurance: data.medicalInsurance ?? undefined,
        airTicket: data.airTicket ?? undefined,
        annualLeave: data.annualLeave ?? undefined,
        otherBenefits: data.otherBenefits ?? undefined,
        visaStatus: data.visaStatus ?? undefined,
        placementVisaType: data.placementVisaType ?? undefined,
        visaNumber: data.visaNumber ?? undefined,
        visaExpiryDate: data.visaExpiryDate ?? undefined,
        visaProcessingStage: data.visaProcessingStage ?? undefined,
        medicalStatus: data.medicalStatus ?? undefined,
        emiratesIdStatus: data.emiratesIdStatus ?? undefined,
        labourContractStatus: data.labourContractStatus ?? undefined,
        joiningStatus: data.joiningStatus ?? undefined,
        paymentStatus: data.paymentStatus ?? undefined,
        paymentMethod: data.paymentMethod ?? undefined,
        receiptNumber: data.receiptNumber ?? undefined,
        dueAmount: data.dueAmount !== undefined ? Number(data.dueAmount) : undefined,
        paidAmount: data.paidAmount !== undefined ? Number(data.paidAmount) : undefined,
        emiratesId: data.emiratesId ?? undefined,
        maritalStatus: data.maritalStatus ?? undefined,
        education: data.education ?? undefined,
        experience: data.experience ?? undefined,
        passportExpiry: data.passportExpiry ?? undefined,
        travelStatus: data.travelStatus ?? undefined,
        photo: data.photo ?? undefined
      }
    });

    if (updated.status === "Placed" && existing.status !== "Placed") {
      const applicant = await prisma.applicant.findUnique({
        where: { id: updated.applicantId }
      });
      if (applicant) {
        let currentHistory: any[] = [];
        try {
          if (applicant.statusHistory) {
            currentHistory = typeof applicant.statusHistory === 'string'
              ? JSON.parse(applicant.statusHistory)
              : (applicant.statusHistory as any[]);
          }
        } catch (e) {}

        const newHistoryItem = {
          oldStatus: applicant.status,
          newStatus: "Placed",
          changedBy: user.name,
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          reason: `Placed with company: ${updated.companyName} on ${updated.placementDate}`
        };

        await prisma.applicant.update({
          where: { id: updated.applicantId },
          data: {
            status: "Placed",
            clientName: updated.companyName,
            statusHistory: JSON.stringify([newHistoryItem, ...currentHistory])
          }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT placement error:", error);
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

    const existing = await prisma.placement.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Placement not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "placement", "delete", existing))) {
      await createAuditLog(user, "Status Changed", "placement", null, `Unauthorized attempt to delete placement agreement ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Tenancy Check
    if (user.role !== "Super Admin" && existing.company !== user.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.placement.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Placement deleted" });
  } catch (error: any) {
    console.error("DELETE placement error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
