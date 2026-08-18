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

    const filter = await getPermissionScopedFilter(user, "requests", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "requests", null, "Unauthorized attempt to view requests", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const requests = await prisma.staffRequest.findMany({
      where: filter,
      orderBy: { date: "desc" }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    console.error("GET requests error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(user, "requests", "create"))) {
      await createAuditLog(user, "Status Changed", "requests", null, "Unauthorized attempt to create request", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.requestType || !data.description) {
      return NextResponse.json(
        { error: "Request type and description are required" },
        { status: 400 }
      );
    }

    const staffMember = await prisma.staff.findFirst({
      where: { email: user.email }
    });
    const staffId = staffMember ? staffMember.id : user.id;

    const newRequest = await prisma.staffRequest.create({
      data: {
        id: data.id || undefined,
        staffId: staffId,
        name: user.name,
        mobile: data.mobile || user.mobile || "",
        whatsapp: data.whatsapp || user.whatsapp || "",
        email: user.email,
        requestType: data.requestType,
        description: data.description,
        attachment: data.attachment || null,
        date: data.date || new Date().toISOString().slice(0, 10),
        signature: data.signature || null,
        status: "Pending", // Always starts as Pending
        reason: null,
        reply: null,
        company: user.company,
        branch: user.branch,
       history: JSON.stringify([{
  date: new Date().toISOString().replace("T", " ").slice(0, 19),
  action: "Created",
  user: user.email || "Unknown"
       }])
      }
    }); 
  
  

      
    

    // Send email alert to HR/Management about the new request
    try {
      let recipientEmail = "aqeelamrahman@gmail.com"; // default fallback
      const targetComp = await prisma.internalCompany.findFirst({
        where: { name: user.company }
      });
      if (targetComp && targetComp.email) {
        recipientEmail = targetComp.email.trim();
      } else {
        const siteSettings = await prisma.siteSettings.findUnique({
          where: { id: "SETTINGS" }
        });
        if (siteSettings && siteSettings.email) {
          recipientEmail = siteSettings.email.trim();
        }
      }

      await sendEmail({
        to: recipientEmail,
        subject: `[New Staff Request] ${user.name} - ${newRequest.requestType}`,
        body: `Dear HR Team,\n\nA new staff request has been submitted.\n\nRequest Details:\n- Employee Name: ${user.name}\n- Company: ${user.company}\n- Request Type: ${newRequest.requestType}\n- Date: ${newRequest.date}\n- Description: ${newRequest.description}\n\nPlease review this request in the system dashboard.\n\nBest regards,\nMS Horizon System Support`,
        candidateName: user.name,
        company: user.company,
        branch: user.branch,
        templateType: "General_Announcement",
        templateData: {
          recipientName: "HR Team",
          announcementTitle: `New Staff Request: ${newRequest.requestType}`,
          announcementMessage: `A new staff request has been submitted by **${user.name}**.\n\n**Request Type:** ${newRequest.requestType}\n**Date:** ${newRequest.date}\n**Description:** ${newRequest.description}`,
          notes: "Please review this request on the system admin dashboard."
        }
      });

      await prisma.notification.create({
        data: {
          title: "New Staff Request",
          message: `${user.name} has submitted a new ${newRequest.requestType} request.`,
          type: "Request",
          userId: "admin", // Targets Admins via scope filtering
          company: user.company,
          branch: user.branch,
          link: "/requests",
          createdAt: new Date().toISOString()
        }
      });
    } catch (e) {
      console.error("Failed to send staff request notification:", e);
    }

    return NextResponse.json(newRequest);
  } catch (error: any) {
    console.error("POST request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
