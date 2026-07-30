import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, createAuditLog, canModifyRecord } from "@/lib/auth-helpers";
import { sendEmail, sendWhatsApp, generateWhatsAppContent } from "@/lib/notifications";

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

    const existing = await prisma.interview.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Interview/Meeting not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "interviews", "edit", existing))) {
      await createAuditLog(user, "Status Changed", "interviews", null, `Unauthorized attempt to edit interview ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Tenancy Check scoping
    if (user.role !== "Super Admin" && existing.company !== user.company) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const statusChanged = data.status !== undefined && data.status !== existing.status;
    const dateTimeChanged = data.dateTime !== undefined && data.dateTime !== existing.dateTime;

    // Map input fields from frontend keys to DB fields
    const updatePayload: any = {};
    if (data.applicantId !== undefined) updatePayload.applicantId = data.applicantId;
    if (data.applicantName !== undefined) updatePayload.applicantName = data.applicantName;
    if (data.type !== undefined) updatePayload.type = data.type;
    
    if (data.conductPerson !== undefined) updatePayload.conductPersonName = data.conductPerson;
    else if (data.conductPersonName !== undefined) updatePayload.conductPersonName = data.conductPersonName;

    if (data.personName !== undefined) updatePayload.personName = data.personName;
    
    if (data.mobile !== undefined) updatePayload.mobileNumber = data.mobile;
    else if (data.mobileNumber !== undefined) updatePayload.mobileNumber = data.mobileNumber;

    if (data.whatsapp !== undefined) updatePayload.whatsAppNumber = data.whatsapp;
    else if (data.whatsAppNumber !== undefined) updatePayload.whatsAppNumber = data.whatsAppNumber;

    if (data.email !== undefined) updatePayload.emailId = data.email;
    else if (data.emailId !== undefined) updatePayload.emailId = data.emailId;

    if (data.nationality !== undefined) updatePayload.nationality = data.nationality;
    if (data.meetingType !== undefined) updatePayload.meetingType = data.meetingType;

    if (data.position !== undefined) updatePayload.interviewPosition = data.position;
    else if (data.interviewPosition !== undefined) updatePayload.interviewPosition = data.interviewPosition;

    if (data.dateTime !== undefined) updatePayload.dateTime = data.dateTime;

    if (data.isOnline !== undefined) updatePayload.onlinePhysical = data.isOnline ? "Online" : "Physical";
    else if (data.onlinePhysical !== undefined) updatePayload.onlinePhysical = data.onlinePhysical;

    if (data.mode !== undefined) updatePayload.meetingMode = data.mode;
    else if (data.meetingMode !== undefined) updatePayload.meetingMode = data.meetingMode;

    if (data.meetingLink !== undefined) updatePayload.meetingLink = data.meetingLink;

    if (data.locationLink !== undefined) updatePayload.googleMapLink = data.locationLink;
    else if (data.googleMapLink !== undefined) updatePayload.googleMapLink = data.googleMapLink;

    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.scheduledBy !== undefined) updatePayload.scheduledBy = data.scheduledBy;
    if (data.interviewResult !== undefined) updatePayload.interviewResult = data.interviewResult;
    if (data.feedback !== undefined) updatePayload.feedback = data.feedback;
    if (data.remarks !== undefined) updatePayload.remarks = data.remarks;
    if (data.candidateResponse !== undefined) updatePayload.candidateResponse = data.candidateResponse;

    // New columns
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.timeZone !== undefined) updatePayload.timeZone = data.timeZone;
    if (data.meetingId !== undefined) updatePayload.meetingId = data.meetingId;
    if (data.passcode !== undefined) updatePayload.passcode = data.passcode;
    if (data.venue !== undefined) updatePayload.venue = data.venue;
    if (data.building !== undefined) updatePayload.building = data.building;
    if (data.floor !== undefined) updatePayload.floor = data.floor;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.attachments !== undefined) updatePayload.attachments = data.attachments;

    const updateReason = data.reason || "";
    if (updateReason && (data.status === "Cancelled" || data.status === "Rescheduled")) {
      updatePayload.notes = data.notes 
        ? `${data.notes}\n[Reason for ${data.status}: ${updateReason}]`
        : `Reason for ${data.status}: ${updateReason}`;
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: updatePayload
    });

    if (updated.applicantId && (statusChanged || dateTimeChanged)) {
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

        let targetStatus = applicant.status;
        let reason = "";

        if (updated.status === "Cancelled") {
          targetStatus = "Pending";
          reason = `Interview cancelled. Reason: ${updateReason || "No reason provided"}`;
        } else if (updated.status === "Completed") {
          targetStatus = "Selected";
          reason = `Interview marked as completed successfully.`;
        } else if (updated.status === "Rescheduled" || dateTimeChanged) {
          targetStatus = "Interview Scheduled";
          reason = `Interview rescheduled to ${updated.dateTime.replace("T", " ")}`;
        }

        if (targetStatus !== applicant.status) {
          const newHistoryItem = {
            oldStatus: applicant.status,
            newStatus: targetStatus,
            changedBy: user.name,
            date: new Date().toISOString().replace('T', ' ').slice(0, 19),
            reason
          };

          await prisma.applicant.update({
            where: { id: updated.applicantId },
            data: {
              status: targetStatus,
              statusHistory: [newHistoryItem, ...currentHistory] as any
            }
          });
        }
      }
    }

    const mappedResponse = {
      id: updated.id,
      applicantId: updated.applicantId || undefined,
      applicantName: updated.applicantName,
      type: updated.type,
      conductPerson: updated.conductPersonName,
      personName: updated.personName,
      mobile: updated.mobileNumber,
      whatsapp: updated.whatsAppNumber,
      email: updated.emailId,
      nationality: updated.nationality,
      meetingType: updated.meetingType || undefined,
      position: updated.interviewPosition || undefined,
      dateTime: updated.dateTime,
      isOnline: updated.onlinePhysical === "Online",
      mode: updated.meetingMode,
      meetingLink: updated.meetingLink,
      locationLink: updated.googleMapLink,
      notes: updated.notes || undefined,
      status: updated.status,
      company: updated.company,
      branch: updated.branch,
      scheduledBy: updated.scheduledBy || "",
      interviewResult: updated.interviewResult || "",
      feedback: updated.feedback || "",
      remarks: updated.remarks || "",
      candidateResponse: updated.candidateResponse || "",
      // New columns
      title: updated.title || "",
      timeZone: updated.timeZone || "Asia/Dubai",
      meetingId: updated.meetingId || "",
      passcode: updated.passcode || "",
      venue: updated.venue || "",
      building: updated.building || "",
      floor: updated.floor || "",
      location: updated.location || "",
      attachments: updated.attachments || []
    };

    const targetEmail = mappedResponse.email;
    const targetPhone = mappedResponse.whatsapp || mappedResponse.mobile;
    const shouldNotify = statusChanged || dateTimeChanged;

    if (shouldNotify && targetEmail) {
      let subject = "";
      let bodyText = `Dear ${mappedResponse.personName},

Your ${mappedResponse.type} has been updated.

New Details:
- Title: ${mappedResponse.title || "Interview Session"}
- Status: ${mappedResponse.status}
- Date & Time: ${mappedResponse.dateTime.replace("T", " ")} (${mappedResponse.timeZone})
- Conductor: ${mappedResponse.conductPerson}
- Format: ${mappedResponse.isOnline ? `Online (${mappedResponse.mode})` : "Physical"}
`;

      if (mappedResponse.isOnline) {
        bodyText += `- Meeting Link: ${mappedResponse.meetingLink || "N/A"}\n`;
        if (mappedResponse.meetingId) bodyText += `- Meeting ID: ${mappedResponse.meetingId}\n`;
        if (mappedResponse.passcode) bodyText += `- Passcode: ${mappedResponse.passcode}\n`;
      } else {
        if (mappedResponse.venue) bodyText += `- Venue: ${mappedResponse.venue}\n`;
        if (mappedResponse.building) bodyText += `- Building: ${mappedResponse.building}\n`;
        if (mappedResponse.floor) bodyText += `- Floor: ${mappedResponse.floor}\n`;
        if (mappedResponse.location) bodyText += `- Location/Address: ${mappedResponse.location}\n`;
        if (mappedResponse.locationLink) bodyText += `- Map Link: ${mappedResponse.locationLink}\n`;
      }

      bodyText += `\nNotes/Reason: ${updateReason || mappedResponse.notes || "None"}\n\nBest regards,\n${mappedResponse.company} HR Team`;

      if (data.status === "Cancelled") {
        subject = `Schedule Cancelled: ${mappedResponse.type} - ${mappedResponse.personName}`;
      } else if (data.status === "Completed") {
        subject = `Schedule Completed: ${mappedResponse.type} - ${mappedResponse.personName}`;
      } else {
        subject = `Schedule Updated: ${mappedResponse.type} Rescheduled - ${mappedResponse.personName}`;
      }

      let templateType: any = "Interview";
      if (data.status === "Cancelled") {
        templateType = "Interview_Cancelled";
      } else if (data.status === "Completed") {
        templateType = "Interview_Completed";
      } else if (mappedResponse.isOnline) {
        templateType = "Interview_Online";
      } else {
        templateType = "Interview_Physical";
      }

      // Fetch applicant details if registered
      let applicantDetails: any = null;
      if (mappedResponse.applicantId) {
        applicantDetails = await prisma.applicant.findUnique({
          where: { id: mappedResponse.applicantId }
        });
      }

      // Resolve interviewer designation
      let interviewerDesignation = "N/A";
      if (mappedResponse.conductPerson) {
        const interviewerUser = await prisma.user.findFirst({
          where: { name: mappedResponse.conductPerson }
        });
        if (interviewerUser) {
          const interviewerStaff = await prisma.staff.findFirst({
            where: { email: interviewerUser.email }
          });
          interviewerDesignation = interviewerStaff?.position || interviewerUser.role || "N/A";
        }
      }

      // Notify all roles: Applicant, Conductor, HR, Assigned Staff
      const emailRecipients = new Set<string>();
      if (targetEmail) emailRecipients.add(targetEmail);
      
      if (mappedResponse.conductPerson) {
        const condUser = await prisma.user.findFirst({
          where: { name: mappedResponse.conductPerson }
        });
        if (condUser && condUser.email) emailRecipients.add(condUser.email);
      }

      const compDetails = await prisma.company.findFirst({
        where: { name: mappedResponse.company }
      });
      if (compDetails && compDetails.email) {
        emailRecipients.add(compDetails.email);
      } else {
        emailRecipients.add("hr@safayar-msjobs.com");
      }

      if (mappedResponse.scheduledBy) {
        const schUser = await prisma.user.findFirst({
          where: { name: mappedResponse.scheduledBy }
        });
        if (schUser && schUser.email) emailRecipients.add(schUser.email);
      }

      for (const recipientEmail of emailRecipients) {
        try {
          await sendEmail({
            to: recipientEmail,
            subject,
            body: bodyText,
            candidateName: mappedResponse.personName,
            company: mappedResponse.company,
            branch: mappedResponse.branch,
            templateType: templateType,
            templateData: {
              recipientName: mappedResponse.personName,
              applicantName: mappedResponse.personName,
              applicantId: mappedResponse.applicantId || "N/A",
              trackingNumber: applicantDetails?.trackingCode || applicantDetails?.id || "N/A",
              trackingCode: applicantDetails?.trackingCode || applicantDetails?.id || "N/A",
              position: mappedResponse.position || applicantDetails?.applyingPositions?.[0] || "N/A",
              applyingPosition: mappedResponse.position || applicantDetails?.applyingPositions?.[0] || "N/A",
              nationality: applicantDetails?.nationality || mappedResponse.nationality || "N/A",
              passportNumber: applicantDetails?.passportNumber || "N/A",
              visaStatus: applicantDetails?.visaStatus || applicantDetails?.visaType || "N/A",
              mobileNumber: mappedResponse.mobile || applicantDetails?.mobile || "N/A",
              emailAddress: mappedResponse.email || applicantDetails?.email || "N/A",
              currentStatus: applicantDetails?.status || "N/A",
              applicantCompany: applicantDetails?.company || "N/A",
              applicantBranch: applicantDetails?.branch || "N/A",

              role: mappedResponse.position || mappedResponse.meetingType || "Discussion",
              dateTime: mappedResponse.dateTime.replace("T", " "),
              date: mappedResponse.dateTime ? (mappedResponse.dateTime.split("T")[0] || mappedResponse.dateTime.split(" ")[0]) : "N/A",
              time: mappedResponse.dateTime ? (mappedResponse.dateTime.split("T")[1] || mappedResponse.dateTime.split(" ")[1]) : "N/A",
              link: mappedResponse.isOnline ? (mappedResponse.meetingLink || "Online") : (mappedResponse.location || "N/A"),

              onlinePhysical: mappedResponse.isOnline ? "Online" : "Physical",
              meetingMode: mappedResponse.mode || "",
              conductPersonName: mappedResponse.conductPerson || "",
              meetingLink: mappedResponse.isOnline ? (mappedResponse.meetingLink || "") : "",
              googleMapLink: !mappedResponse.isOnline ? (mappedResponse.locationLink || "") : "",
              notes: updateReason || mappedResponse.notes || "",
              title: mappedResponse.title || "Interview Session",
              timeZone: mappedResponse.timeZone,
              meetingId: mappedResponse.meetingId,
              passcode: mappedResponse.passcode,
              venue: mappedResponse.venue,
              building: mappedResponse.building,
              floor: mappedResponse.floor,
              location: mappedResponse.location,

              interviewerName: mappedResponse.conductPerson || "N/A",
              interviewerDesignation: interviewerDesignation,
              companyName: mappedResponse.company || "N/A",
              branchName: mappedResponse.branch || "N/A",
            }
          });
        } catch (err) {
          console.error("Async PUT interview email error:", err);
        }
      }
    }

    if (shouldNotify && targetPhone) {
      let templateType: any = "Interview_Scheduled";
      if (data.status === "Cancelled") {
        templateType = "Interview_Cancelled";
      } else if (data.status === "Rescheduled" || dateTimeChanged) {
        templateType = "Interview_Rescheduled";
      } else {
        templateType = "Status_Changed";
      }

      const waMessage = generateWhatsAppContent(templateType, {
        applicantName: mappedResponse.personName,
        company: mappedResponse.company,
        branch: mappedResponse.branch,
        position: mappedResponse.position || mappedResponse.meetingType || "Discussion",
        type: mappedResponse.type || "Interview",
        dateTime: mappedResponse.dateTime,
        isOnline: mappedResponse.isOnline,
        meetingMode: mappedResponse.mode,
        conductPerson: mappedResponse.conductPerson,
        meetingLink: mappedResponse.meetingLink,
        googleMapLink: mappedResponse.locationLink,
        notes: updateReason || mappedResponse.notes,
        status: data.status || mappedResponse.status,
        reason: updateReason
      });

      try {
        await sendWhatsApp({
          to: targetPhone,
          message: waMessage,
          candidateName: mappedResponse.personName,
          company: mappedResponse.company,
          branch: mappedResponse.branch
        });
      } catch (err) {
        console.error("Async PUT interview WhatsApp error:", err);
      }
    }

    return NextResponse.json(mappedResponse);
  } catch (error: any) {
    console.error("PUT interview error:", error);
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

    const existing = await prisma.interview.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Interview/Meeting not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "interviews", "delete", existing))) {
      await createAuditLog(user, "Status Changed", "interviews", null, `Unauthorized attempt to delete interview ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    await prisma.interview.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Interview/Meeting deleted" });
  } catch (error: any) {
    console.error("DELETE interview error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
