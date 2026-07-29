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

    const filter = await getPermissionScopedFilter(user, "interviews", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "interviews", null, "Unauthorized attempt to view interviews", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Interviews are for recruiters/managers, staff don't see them usually.
    // In this dashboard we return interviews based on tenancy filter
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
      candidateResponse: i.candidateResponse || ""
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

    if (!(await hasPermissionBackend(user, "interviews", "create"))) {
      await createAuditLog(user, "Status Changed", "interviews", null, "Unauthorized attempt to create interview", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.personName || !data.dateTime || !data.type) {
      return NextResponse.json(
        { error: "Person name, type, and date/time are required" },
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
      if (user.role !== "Company Admin" && branch !== user.branch) {
        return NextResponse.json({ error: "Forbidden - branch mismatch" }, { status: 403 });
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
        candidateResponse: data.candidateResponse || ""
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
      candidateResponse: interview.candidateResponse || ""
    };

    // Trigger real-time notifications for the scheduled interview/meeting
    if (mappedResponse.email && data.autoEmail !== false) {
      const templateType = mappedResponse.type === "Meeting" 
        ? "Interview" 
        : (mappedResponse.isOnline ? "Interview_Online" : "Interview_Physical");

      const generated = generateEmailContent(templateType as any, {
        applicantName: mappedResponse.personName,
        company: company,
        branch: branch,
        date: mappedResponse.dateTime.replace("T", " "),
        role: mappedResponse.position || mappedResponse.meetingType || "Assessment Sync",
        link: mappedResponse.isOnline ? (mappedResponse.meetingLink || "") : (mappedResponse.locationLink || ""),
        notes: mappedResponse.notes || ""
      });

      try {
        await sendEmail({
          to: mappedResponse.email,
          subject: generated.subject,
          body: generated.body,
          candidateName: mappedResponse.personName,
          company: company,
          branch: branch,
          templateType: templateType as any,
          templateData: {
            recipientName: mappedResponse.personName,
            role: mappedResponse.position || mappedResponse.meetingType || "Assessment Sync",
            dateTime: mappedResponse.dateTime.replace("T", " "),
            onlinePhysical: mappedResponse.isOnline ? "Online" : "Physical",
            meetingMode: mappedResponse.mode || "",
            conductPersonName: mappedResponse.conductPerson || "",
            meetingLink: mappedResponse.isOnline ? (mappedResponse.meetingLink || "") : "",
            googleMapLink: !mappedResponse.isOnline ? (mappedResponse.locationLink || "") : "",
            notes: mappedResponse.notes || ""
          }
        });
      } catch (err) {
        console.error("Async interview email error:", err);
      }
    }

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
        meetingLink: mappedResponse.meetingLink,
        googleMapLink: mappedResponse.locationLink,
        notes: mappedResponse.notes
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

    // Add dashboard notification to the assigned HR / conductPerson
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
