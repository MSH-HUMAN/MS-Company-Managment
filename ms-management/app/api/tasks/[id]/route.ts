import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, canModifyRecord } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/notifications";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Normalize Prisma Task → frontend Task shape
function normalizeTask(t: any) {
  return {
    ...t,
    deadline: t.deadline || t.dueDate || "",
    assignedDate: t.assignedDate || "",
    history: Array.isArray(t.history) ? t.history : (t.history ? JSON.parse(JSON.stringify(t.history)) : []),
    incompleteReason: t.incompleteReason || undefined,
    applicantId: t.applicantId || undefined,
    applicantName: t.applicantName || undefined,
    targetDocument: t.targetDocument || undefined,
  };
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    const existing = await prisma.task.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Tenancy Check — Super Admin and System-company users can update any task
    const isSystemUser = user.company === "System" || user.role === "Super Admin";
    if (!isSystemUser) {
      if (existing.company !== user.company) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (user.role === "Branch Admin" && existing.branch !== user.branch) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Prevent changing the company/branch via payload
      if (data.company && data.company !== user.company) {
        return NextResponse.json({ error: "Cannot change task's company" }, { status: 403 });
      }
      if (user.role === "Branch Admin" && data.branch && data.branch !== user.branch) {
        return NextResponse.json({ error: "Cannot change task's branch" }, { status: 403 });
      }
    }

    // Authorization & Action checks:
    // Staff can only update task status and complete tasks assigned to them.
    // Managers/Admins can edit anything.
    const userStaff = await prisma.staff.findFirst({ where: { email: user.email } });
    const userStaffId = userStaff?.id;
    const isAssignedToUser = (userStaffId && existing.assignedToId === userStaffId) ||
                             existing.assignedTo.trim().toLowerCase() === user.name.trim().toLowerCase() ||
                             existing.createdBy === user.name;
    const isStaff = user.role === "Staff";

    if (isStaff) {
      if (!isAssignedToUser) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      if (!(await canModifyRecord(user, "tasks", "edit", existing))) {
        await createAuditLog(user, "Status Changed", "tasks", null, `Unauthorized attempt to edit task ${id}`, request.headers.get("x-forwarded-for"));
        return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
      }
    }

    // Require completion proof in history when marking as Completed
    if (data.status === "Completed" && existing.status !== "Completed") {
      const hasProofInHistory = data.history && Array.isArray(data.history) && data.history.some((h: any) => h.note && h.note.includes("Uploaded Proofs:"));
      if (!hasProofInHistory) {
        return NextResponse.json({ error: "Proof of completion is required to mark task as completed." }, { status: 400 });
      }
    }

    let updatePayload: any = {};

    if (isStaff) {
      // Staff can only update status, completedAt, feedback, incompleteReason, and history
      updatePayload = {
        status: data.status !== undefined ? data.status : undefined,
        completedAt: data.completedAt !== undefined ? data.completedAt : undefined,
        feedback: data.feedback !== undefined ? data.feedback : undefined,
        incompleteReason: data.incompleteReason !== undefined ? data.incompleteReason : undefined,
        history: data.history !== undefined ? data.history : undefined
      };
    } else {
      // Admins/Managers can update anything
      updatePayload = {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        assignedTo: data.assignedTo ?? undefined,
        assignedToId: data.assignedToId ?? undefined,
        assignedToRole: data.assignedToRole !== undefined ? data.assignedToRole : undefined,
        status: data.status ?? undefined,
        priority: data.priority ?? undefined,
        dueDate: data.deadline !== undefined ? data.deadline : (data.dueDate ?? undefined),
        deadline: data.deadline ?? undefined,
        assignedDate: data.assignedDate ?? undefined,
        company: data.company ?? undefined,
        branch: data.branch ?? undefined,
        completedAt: data.completedAt !== undefined ? data.completedAt : undefined,
        feedback: data.feedback !== undefined ? data.feedback : undefined,
        applicantId: data.applicantId !== undefined ? data.applicantId : undefined,
        applicantName: data.applicantName !== undefined ? data.applicantName : undefined,
        targetDocument: data.targetDocument !== undefined ? data.targetDocument : undefined,
        incompleteReason: data.incompleteReason !== undefined ? data.incompleteReason : undefined,
        history: data.history !== undefined ? data.history : undefined
      };
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updatePayload
    });

    // Send email alert on reassignment
    if (data.assignedTo && data.assignedTo.trim().toLowerCase() !== existing.assignedTo.trim().toLowerCase()) {
      try {
        let assigneeEmail: string | null = null;
        let assigneeName = updated.assignedTo;
        let userMember: any = null;

        // 1. Try finding in Staff (case-insensitive fallback)
        let staffMember = await prisma.staff.findFirst({
          where: { name: updated.assignedTo }
        });
        
        if (!staffMember) {
          const staffList = await prisma.staff.findMany({
            where: { company: updated.company }
          });
          staffMember = staffList.find(s => s.name.trim().toLowerCase() === updated.assignedTo.trim().toLowerCase()) || null;
        }

        if (staffMember && staffMember.email) {
          assigneeEmail = staffMember.email;
          assigneeName = staffMember.name;
        } else {
          // 2. Try finding in User (case-insensitive fallback)
          userMember = await prisma.user.findFirst({
            where: { name: updated.assignedTo }
          });
          
          if (!userMember) {
            const userList = await prisma.user.findMany({
              where: { company: updated.company }
            });
            userMember = userList.find(u => u.name.trim().toLowerCase() === updated.assignedTo.trim().toLowerCase()) || null;
          }

          if (userMember && userMember.email) {
            assigneeEmail = userMember.email;
            assigneeName = userMember.name;
          }
        }

        if (assigneeEmail) {
          const applicantInfo = updated.applicantName ? `\n- Linked Candidate: ${updated.applicantName}` : "";
          const targetDocInfo = updated.targetDocument ? `\n- Document to Verify: ${updated.targetDocument}` : "";
          const emailBody = `Dear ${assigneeName},

A task has been reassigned to you: "${updated.title}".

Task Details:
- Title: ${updated.title}
- Description: ${updated.description || "No description provided."}
- Priority: ${updated.priority}
- Due Date: ${updated.dueDate || "No due date specified."}${applicantInfo}${targetDocInfo}
- Reassigned By: ${user.name}

Please review this task on your dashboard.

Best regards,
${updated.company} HR & Management System`;

          sendEmail({
            to: assigneeEmail,
            subject: `Task Reassigned to You: ${updated.title}`,
            body: emailBody,
            candidateName: assigneeName,
            company: updated.company,
            branch: updated.branch,
            templateType: "Task_Assigned",
            templateData: {
              recipientName: assigneeName,
              announcementTitle: `Task Reassigned: ${updated.title}`,
              announcementMessage: `A task has been reassigned to you: **${updated.title}**.\n\n**Description:** ${updated.description || "No description provided."}\n\n**Priority:** ${updated.priority}\n\n**Due Date:** ${updated.dueDate || "N/A"}`,
              notes: `Reassigned By: ${user.name}`
            }
          }).catch(err => console.error("Async task reassign email error:", err));
          
          if (userMember) {
            await prisma.notification.create({
              data: {
                title: "Task Reassigned",
                message: `Task "${updated.title}" has been assigned to you.`,
                type: "Task",
                userId: userMember.id,
                company: updated.company,
                branch: updated.branch,
                link: "/tasks",
                createdAt: new Date().toISOString()
              }
            });
          }
        } else {
          console.warn(`[EMAIL-SERVICE] Reassignee '${updated.assignedTo}' email not found in Staff or User tables.`);
        }
      } catch (emailErr) {
        console.error("Error setting up task reassign email:", emailErr);
      }
    }

    // Completion & Status Update Email Alerts
    if (data.status === "Completed" && existing.status !== "Completed") {
      try {
        let feedbackComments = "";
        let proofFileNames = "";
        if (data.feedback) {
          try {
            const parsedFeedback = typeof data.feedback === "string" ? JSON.parse(data.feedback) : data.feedback;
            feedbackComments = parsedFeedback.comments || "";
            if (Array.isArray(parsedFeedback.proofs)) {
              proofFileNames = parsedFeedback.proofs.map((p: any) => p.name || p.url || p).join(", ");
            }
          } catch (e) {}
        }

        const completionTime = updated.completedAt || new Date().toISOString().replace("T", " ").slice(0, 19);

        // Collect recipient emails: Creator + Super Admins
        const recipientEmails = new Set<string>();
        
        if (updated.createdBy) {
          const creator = await prisma.user.findFirst({ where: { name: updated.createdBy } });
          if (creator && creator.email) {
            recipientEmails.add(creator.email);
            // Create in-app notification for creator
            await prisma.notification.create({
              data: {
                title: "Task Completed",
                message: `Task "${updated.title}" was completed by ${user.name}.`,
                type: "Success",
                userId: creator.id,
                company: updated.company,
                branch: updated.branch,
                link: "/tasks",
                createdAt: new Date().toISOString()
              }
            });
          }
        }

        const superAdmins = await prisma.user.findMany({ where: { role: "Super Admin" } });
        superAdmins.forEach(sa => {
          if (sa.email) recipientEmails.add(sa.email);
        });

        const emailBody = `Task Completion Notification:

Task "${updated.title}" has been completed by ${user.name}.

Details:
- Employee: ${user.name} (${user.role})
- Task Title: ${updated.title}
- Completion Time: ${completionTime}
- Company / Branch: ${updated.company} / ${updated.branch}
- Remarks: ${feedbackComments || "Task completed successfully."}
${proofFileNames ? `- Attachments / Uploaded Proofs: ${proofFileNames}` : ""}
- Completion Status: Completed

Please view task on dashboard: https://mshorizonuae.com/tasks

Best regards,
${updated.company} Management System`;

        recipientEmails.forEach(email => {
          sendEmail({
            to: email,
            subject: `[Task Completed] ${updated.title} - ${user.name}`,
            body: emailBody,
            company: updated.company,
            branch: updated.branch,
            templateType: "Announcement",
            templateData: {
              recipientName: "Management",
              announcementTitle: `Task Completed: ${updated.title}`,
              announcementMessage: `Employee **${user.name}** has completed task **"${updated.title}"**.\n\n**Completion Time:** ${completionTime}\n\n**Remarks:** ${feedbackComments || "Completed"}\n\n${proofFileNames ? `**Uploaded Proofs:** ${proofFileNames}` : ""}`,
              notes: `Company: ${updated.company}`
            }
          }).catch(err => console.error("Async completion email error:", err));
        });

        // Record Activity Log
        await createAuditLog(user, "Completed", "tasks", existing.status, `Completed task ${updated.title}`, request.headers.get("x-forwarded-for"));

      } catch (completionErr) {
        console.error("Error setting up task completion alerts:", completionErr);
      }
    } else if (data.status && data.status !== existing.status && updated.createdBy) {
      try {
        const creator = await prisma.user.findFirst({
          where: { name: updated.createdBy }
        });
        if (creator) {
          await prisma.notification.create({
            data: {
              title: "Task Status Updated",
              message: `Task "${updated.title}" was marked as ${data.status} by ${user.name}.`,
              type: "Task",
              userId: creator.id,
              company: updated.company,
              branch: updated.branch,
              link: "/tasks",
              createdAt: new Date().toISOString()
            }
          });
        }
      } catch (err) {
        console.error("Error setting up task creator notification:", err);
      }
    }

    return NextResponse.json(normalizeTask(updated));
  } catch (error: any) {
    console.error("PUT task error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.task.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "tasks", "delete", existing))) {
      await createAuditLog(user, "Status Changed", "tasks", null, `Unauthorized attempt to delete task ${id}`, request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error: any) {
    console.error("DELETE task error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
