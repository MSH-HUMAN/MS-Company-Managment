import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, createAuditLog, getPermissionScopedFilter } from "@/lib/auth-helpers";
import { sendEmail, sendWhatsApp, generateWhatsAppContent } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "interviews", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "interviews", null, "Unauthorized attempt to view interviews", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const interviews = await prisma.interview.findMany({
      where: filter,
      orderBy: { dateTime: "asc" }
    });

    const mapped = interviews.map((i: any) => ({
      id: i.id,
      applicantId: i.applicantId || undefined,
      applicantName: i.applicantName,
      type: i.type,
      conductPerson: i.conductPersonName,
      personName: i.personName,
      mobile: i.mobileNumber,
      whatsapp: i.whatsAppNumber,
      email: i.emailId,
      nationality: i.nationality,
      meetingType: i.meetingType || undefined,
      position: i.interviewPosition || undefined,
      dateTime: i.dateTime,
      isOnline: i.onlinePhysical === "Online",
      mode: i.meetingMode,
      meetingLink: i.meetingLink,
      locationLink: i.googleMapLink,
      notes: i.notes || undefined,
      status: i.status,
      company: i.company,
      branch: i.branch,
      scheduledBy: i.scheduledBy || "",
      interviewResult: i.interviewResult || "",
      feedback: i.feedback || "",
      remarks: i.remarks || "",
      candidateResponse: i.candidateResponse || "",
      // New columns
      title: i.title || "",
      timeZone: i.timeZone || "Asia/Dubai",
      meetingId: i.meetingId || "",
      passcode: i.passcode || "",
      venue: i.venue || "",
      building: i.building || "",
      floor: i.floor || "",
      location: i.location || "",
      attachments: i.attachments || []
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("GET interviews error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Strict validation rules relaxed: Name, DateTime, Type, and Mode are required
    if (!data.personName || !data.dateTime || !data.type || !data.mode) {
      return NextResponse.json(
        { error: "Candidate Name, Date/Time, Type, and Interview Mode are required" },
        { status: 400 }
      );
    }

    // Tenancy Check
    let company = data.company || user.company;
    let branch = data.branch || user.branch;

    if (user.role !== "Super Admin") {
      if (company !== user.company) {
        return NextResponse.json({ error: "Forbidden - company mismatch" }, { status: 403 });
      }
    }

    const conductPersonName = data.conductPerson || data.conductPersonName || user.name;
    const emailId = data.email || data.emailId || "";
    const mobileNumber = data.mobile || data.mobileNumber || "";
    const whatsAppNumber = data.whatsapp || data.whatsAppNumber || "";
    const interviewPosition = data.position || data.interviewPosition || null;
    const onlinePhysical = data.isOnline !== undefined ? (data.isOnline ? "Online" : "Physical") : (data.onlinePhysical || "Online");
    const meetingMode = data.mode || data.meetingMode || "Zoom";
    const googleMapLink = data.locationLink || data.googleMapLink || null;

    const interview = await prisma.interview.create({
      data: {
        id: data.id || undefined,
        applicantId: data.applicantId || null,
        applicantName: data.applicantName || "",
        type: data.type,
        conductPersonName,
        personName: data.personName,
        mobileNumber,
        whatsAppNumber,
        emailId,
        nationality: data.nationality || "",
        meetingType: data.meetingType || null,
        interviewPosition,
        dateTime: data.dateTime,
        onlinePhysical,
        meetingMode,
        meetingLink: data.meetingLink || null,
        googleMapLink,
        notes: data.notes || null,
        status: data.status || "Scheduled",
        company,
        branch,
        scheduledBy: user.name || "System",
        interviewResult: data.interviewResult || "",
        feedback: data.feedback || "",
        remarks: data.remarks || "",
        candidateResponse: data.candidateResponse || "",
        // New columns
        title: data.title || "",
        timeZone: data.timeZone || "Asia/Dubai",
        meetingId: data.meetingId || null,
        passcode: data.passcode || null,
        venue: data.venue || null,
        building: data.building || null,
        floor: data.floor || null,
        location: data.location || null,
        attachments: data.attachments || []
      }
    });

    if (interview.applicantId) {
      const applicant = await prisma.applicant.findUnique({
        where: { id: interview.applicantId }
      });
      if (applicant) {
        let currentHistory: any[] = [];
        try {
          if (applicant.statusHistory) {
            currentHistory = typeof applicant.statusHistory === 'string'
              ? JSON.parse(applicant.statusHistory)
              : (applicant.statusHistory as any[]);
          }
        } catch (e) {
          console.error("Parse status history error:", e);
        }

        const newHistoryItem = {
          oldStatus: applicant.status,
          newStatus: "Interview Scheduled",
          changedBy: user.name,
          date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          reason: `Interview scheduled on ${interview.dateTime.replace("T", " ")} (${interview.type})`
        };

        await prisma.applicant.update({
          where: { id: interview.applicantId },
          data: {
            status: "Interview Scheduled",
            statusHistory: [newHistoryItem, ...currentHistory] as any
          }
        });
      }
    }

    const mappedResponse = {
      id: interview.id,
      applicantId: interview.applicantId || undefined,
      applicantName: interview.applicantName,
      type: interview.type,
      conductPerson: interview.conductPersonName,
      personName: interview.personName,
      mobile: interview.mobileNumber,
      whatsapp: interview.whatsAppNumber,
      email: interview.emailId,
      nationality: interview.nationality,
      meetingType: interview.meetingType || undefined,
      position: interview.interviewPosition || undefined,
      dateTime: interview.dateTime,
      isOnline: interview.onlinePhysical === "Online",
      mode: interview.meetingMode,
      meetingLink: interview.meetingLink,
      locationLink: interview.googleMapLink,
      notes: interview.notes || undefined,
      status: interview.status,
      company: interview.company,
      branch: interview.branch,
      scheduledBy: interview.scheduledBy || "",
      interviewResult: interview.interviewResult || "",
      feedback: interview.feedback || "",
      remarks: interview.remarks || "",
      candidateResponse: interview.candidateResponse || "",
      // New columns
      title: interview.title || "",
      timeZone: interview.timeZone || "Asia/Dubai",
      meetingId: interview.meetingId || "",
      passcode: interview.passcode || "",
      venue: interview.venue || "",
      building: interview.building || "",
      floor: interview.floor || "",
      location: interview.location || "",
      attachments: interview.attachments || []
    };

    // Construct highly-detailed plain-text notification body including all fields
    let bodyText = `Dear ${mappedResponse.personName},

You have been scheduled for a ${mappedResponse.type} for the position of ${mappedResponse.position || mappedResponse.meetingType || "Candidate"} at ${company}.

Schedule Details:
- Title: ${mappedResponse.title || "Interview Session"}
- Conductor: ${mappedResponse.conductPerson}
- Date & Time: ${mappedResponse.dateTime.replace("T", " ")} (${mappedResponse.timeZone})
- Mode: ${mappedResponse.isOnline ? `Online (${mappedResponse.mode})` : "Physical Interview"}
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

    bodyText += `\nNotes: ${mappedResponse.notes || "None"}\n\nBest regards,\n${company} HR Team`;

    // Fetch applicant details if registered
    let applicantDetails: any = null;
    if (interview.applicantId) {
      applicantDetails = await prisma.applicant.findUnique({
        where: { id: interview.applicantId }
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

    // Trigger email alerts for all roles: Applicant, Interviewer, HR, Assigned Staff
    if (data.autoEmail !== false) {
      const emailRecipients = new Set<string>();

      // 1. Applicant Email
      if (mappedResponse.email) {
        emailRecipients.add(mappedResponse.email);
      }

      // 2. Interviewer / Conduct Person Email
      if (mappedResponse.conductPerson) {
        const condUser = await prisma.user.findFirst({
          where: { name: mappedResponse.conductPerson }
        });
        if (condUser && condUser.email) {
          emailRecipients.add(condUser.email);
        }
      }

      // 3. Company Admin / HR Email
      const compDetails = await prisma.company.findFirst({
        where: { name: company }
      });
      if (compDetails && compDetails.email) {
        emailRecipients.add(compDetails.email);
      } else {
        emailRecipients.add("mshorizonfze@gmail.com"); // default HR fallback
      }

      // 4. Assigned Staff / ScheduledBy Email
      if (mappedResponse.scheduledBy) {
        const schUser = await prisma.user.findFirst({
          where: { name: mappedResponse.scheduledBy }
        });
        if (schUser && schUser.email) {
          emailRecipients.add(schUser.email);
        }
      }

      const templateType = mappedResponse.type === "Meeting" 
        ? "Interview" 
        : (mappedResponse.isOnline ? "Interview_Online" : "Interview_Physical");

      for (const recipientEmail of emailRecipients) {
        try {
          await sendEmail({
            to: recipientEmail,
            subject: `Interview Details - ${mappedResponse.personName} - ${mappedResponse.title || "Scheduled Session"}`,
            body: bodyText,
            candidateName: mappedResponse.personName,
            company: company,
            branch: branch,
            templateType: templateType as any,
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

              role: mappedResponse.position || mappedResponse.meetingType || "Assessment Sync",
              dateTime: mappedResponse.dateTime.replace("T", " "),
              date: mappedResponse.dateTime ? (mappedResponse.dateTime.split("T")[0] || mappedResponse.dateTime.split(" ")[0]) : "N/A",
              time: mappedResponse.dateTime ? (mappedResponse.dateTime.split("T")[1] || mappedResponse.dateTime.split(" ")[1]) : "N/A",
              link: mappedResponse.isOnline ? (mappedResponse.meetingLink || "Online") : (mappedResponse.location || "N/A"),

              onlinePhysical: mappedResponse.isOnline ? "Online" : "Physical",
              meetingMode: mappedResponse.mode || "",
              conductPersonName: mappedResponse.conductPerson || "",
              meetingLink: mappedResponse.isOnline ? (mappedResponse.meetingLink || "") : "",
              googleMapLink: !mappedResponse.isOnline ? (mappedResponse.locationLink || "") : "",
              notes: mappedResponse.notes || "",
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
          console.error(`Async interview email error for ${recipientEmail}:`, err);
        }
      }
    }

    // Trigger Twilio WhatsApp Alert
    if ((mappedResponse.whatsapp || mappedResponse.mobile) && data.autoWhatsapp !== false) {
      const waNumber = mappedResponse.whatsapp || mappedResponse.mobile;
      const waMessage = generateWhatsAppContent("Interview_Scheduled", {
        applicantName: mappedResponse.personName,
        company: mappedResponse.company || company,
        branch: mappedResponse.branch || branch,
        position: mappedResponse.position || mappedResponse.meetingType || "Assessment Sync",
        type: mappedResponse.type || "Interview",
        dateTime: mappedResponse.dateTime,
        isOnline: mappedResponse.isOnline,
        meetingMode: mappedResponse.mode,
        conductPerson: mappedResponse.conductPerson,
        meetingLink: mappedResponse.meetingLink ?? undefined,
        googleMapLink: mappedResponse.locationLink ?? undefined,
        notes: mappedResponse.notes,
        trackingCode: applicantDetails?.trackingCode || applicantDetails?.id || undefined,
        meetingId: mappedResponse.meetingId ?? undefined,
        passcode: mappedResponse.passcode ?? undefined,
        venue: mappedResponse.venue ?? undefined,
        building: mappedResponse.building ?? undefined,
        floor: mappedResponse.floor ?? undefined,
        location: mappedResponse.location ?? undefined
      });

      try {
        await sendWhatsApp({
          to: waNumber,
          message: waMessage,
          candidateName: mappedResponse.personName,
          company: company,
          branch: branch
        });
      } catch (err) {
        console.error("Async interview WhatsApp error:", err);
      }
    }

    // Dashboard Notification to Conductor
    if (mappedResponse.conductPerson) {
      try {
        const assignedUser = await prisma.user.findFirst({
          where: { name: mappedResponse.conductPerson }
        });
        if (assignedUser) {
          await prisma.notification.create({
            data: {
              title: "New Interview Scheduled",
              message: `You have been assigned to conduct an interview with ${mappedResponse.personName} on ${mappedResponse.dateTime.replace("T", " ")}.`,
              type: "Interview",
              userId: assignedUser.id,
              company: company,
              branch: branch,
              link: "/interviews",
              createdAt: new Date().toISOString()
            }
          });
        }
      } catch (err) {
        console.error("Async interview notification error:", err);
      }
    }

    return NextResponse.json(mappedResponse);
  } catch (error: any) {
    console.error("POST interview error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
