import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, canModifyRecord } from "@/lib/auth-helpers";

type RouteParams = {
  params: Promise<{ id: string }>;
};

import { sendEmail, sendWhatsApp, generateWhatsAppContent } from "@/lib/notifications";

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

    // Support keeping a manual reason in notes or as part of the notification
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
      candidateResponse: updated.candidateResponse || ""
    };

    // ── Determine what changed and notify ──────────────────────────────────
    const targetEmail = mappedResponse.email;
    const targetPhone = mappedResponse.whatsapp || mappedResponse.mobile;
    const shouldNotify = statusChanged || dateTimeChanged;

    if (shouldNotify && targetEmail) {
      let subject = "";
      let body = "";

      if (data.status === "Cancelled") {
        subject = `Schedule Cancelled: ${mappedResponse.type}`;
        body = `Dear ${mappedResponse.personName},

We regret to inform you that your ${mappedResponse.type} scheduled for ${existing.dateTime.replace("T", " ")} has been cancelled.

Reason for cancellation:
${updateReason || "No reason provided by coordinator"}

We apologize for any inconvenience. If you have questions or want to discuss future openings, please contact us.

Best regards,
${mappedResponse.company} Recruitment Team`;

      } else if (data.status === "Completed") {
        subject = `Schedule Completed: ${mappedResponse.type}`;
        body = `Dear ${mappedResponse.personName},

Your ${mappedResponse.type} has been marked as Completed. Thank you for your time.

We will be in touch shortly with the next steps.

Best regards,
${mappedResponse.company} Recruitment Team`;

      } else if (data.status === "Rescheduled" || dateTimeChanged) {
        // Fire for: explicit Rescheduled status OR any dateTime change
        const isOnline = mappedResponse.isOnline;
        const locationInfo = isOnline
          ? `New Mode: ${mappedResponse.mode}\nNew Meeting Link: ${mappedResponse.meetingLink || "To be provided"}`
          : `New Location: Physical / Google Maps: ${mappedResponse.locationLink || "To be provided"}`;

        subject = `Schedule Updated: Your ${mappedResponse.type} Has Been Rescheduled`;
        body = `Dear ${mappedResponse.personName},

Please be informed that your ${mappedResponse.type} has been rescheduled.

New Schedule Details:
- Position/Subject: ${mappedResponse.position || "Discussion"}
- New Date & Time: ${mappedResponse.dateTime.replace("T", " ")}
- Type: ${mappedResponse.isOnline ? "Online" : "Physical"}
- ${locationInfo}
- Conducted By: ${mappedResponse.conductPerson}

${updateReason ? `Reason for rescheduling:\n${updateReason}\n` : ""}If you have any questions, please contact our HR team.

Best regards,
${mappedResponse.company} Recruitment Team`;

      } else {
        subject = `Schedule Status Update: ${mappedResponse.type}`;
        body = `Dear ${mappedResponse.personName},

Your ${mappedResponse.type} status has been updated to: ${data.status || mappedResponse.status}.

Best regards,
${mappedResponse.company} Recruitment Team`;
      }

      let templateType: any = "Interview";
      if (data.status === "Cancelled") {
        templateType = "Interview_Cancelled"; // Red banner — cancellation notice
      } else if (data.status === "Completed") {
        templateType = "Interview_Completed"; // Emerald banner — thank-you / completion
      } else if (mappedResponse.isOnline) {
        templateType = "Interview_Online"; // Teal banner
      } else {
        templateType = "Interview_Physical"; // Amber/Gold banner
      }

      try {
        await sendEmail({
          to: targetEmail,
          subject,
          body,
          candidateName: mappedResponse.personName,
          company: mappedResponse.company,
          branch: mappedResponse.branch,
          templateType: templateType,
          templateData: {
            recipientName: mappedResponse.personName,
            role: mappedResponse.position || mappedResponse.meetingType || "Discussion",
            dateTime: mappedResponse.dateTime.replace("T", " "),
            onlinePhysical: mappedResponse.isOnline ? "Online" : "Physical",
            meetingMode: mappedResponse.mode || "",
            conductPersonName: mappedResponse.conductPerson || "",
            meetingLink: mappedResponse.isOnline ? (mappedResponse.meetingLink || "") : "",
            googleMapLink: !mappedResponse.isOnline ? (mappedResponse.locationLink || "") : "",
            notes: updateReason || mappedResponse.notes || ""
          }
        });
      } catch (err) {
        console.error("Async PUT interview email error:", err);
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
