import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog } from "@/lib/auth-helpers";
import { sendEmail, generateEmailContent, sendTaskEmailNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(user, "emails", "view"))) {
      await createAuditLog(user, "Status Changed", "emails", null, "Unauthorized attempt to view email history", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const filter = getTenantScopeFilter(user, "company", "branch");

    const emails = await prisma.sentEmail.findMany({
      where: filter,
      orderBy: { sentAt: "desc" }
    });

    return NextResponse.json(emails);
  } catch (error: any) {
    console.error("GET emails error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(user, "emails", "create"))) {
      await createAuditLog(user, "Status Changed", "emails", null, "Unauthorized attempt to send email", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.to) {
      return NextResponse.json({ error: "To is required" }, { status: 400 });
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.to)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (data.templateType === "Task_Assigned" && data.templateData) {
      await sendTaskEmailNotification({
        to: data.to,
        assigneeName: data.templateData.recipientName || data.templateData.assigneeName || "Staff Member",
        taskTitle: data.templateData.title || "Task Alert",
        taskDescription: data.templateData.description,
        priority: data.templateData.priority || "Medium",
        assignedBy: data.templateData.assignedBy || user.name,
        company: data.templateData.company || user.company,
        branch: data.templateData.branch || user.branch,
        assignedDate: data.templateData.assignedDate || new Date().toISOString().slice(0, 10),
        dueDate: data.templateData.dueDate || data.templateData.deadline || "",
        status: data.templateData.status || "Pending",
        eventType: data.templateData.eventType || "Task Assigned",
        taskId: data.templateData.taskId
      });
      return NextResponse.json({ success: true, message: "Task notification email dispatched successfully" });
    }

    let finalSubject = data.subject;
    let finalBody = data.body;

    // Use the central template generator if a template type is provided
    if (data.templateType) {
      if (!data.templateData) {
        return NextResponse.json({ error: "templateData is required when templateType is provided" }, { status: 400 });
      }
      try {
        const generated = generateEmailContent(data.templateType, {
          ...data.templateData,
          company: data.templateData.company || user.company,
          branch: data.templateData.branch || user.branch
        });
        finalSubject = generated.subject;
        finalBody = generated.body;
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Invalid template configuration" }, { status: 400 });
      }
    } else {
      // Fallback for custom generic emails
      if (!data.subject || !data.body) {
        return NextResponse.json({ error: "Subject and body are required if no templateType is specified" }, { status: 400 });
      }
    }

    // sendEmail handles both SMTP sending and Prisma SentEmail DB creation
    await sendEmail({
      to: data.to,
      subject: finalSubject,
      body: finalBody,
      candidateName: data.candidateName || null,
      company: data.company || user.company,
      branch: data.branch || user.branch,
      templateType: data.templateType || null,
      templateData: data.templateData || null
    });

    const logged = await prisma.sentEmail.findFirst({
      where: { to: data.to, subject: data.subject },
      orderBy: { sentAt: "desc" }
    });

    return NextResponse.json(logged);
  } catch (error: any) {
    console.error("POST email error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
