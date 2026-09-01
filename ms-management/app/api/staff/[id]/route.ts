import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, hasPermissionBackend, createAuditLog, canModifyRecord } from "@/lib/auth-helpers";
import { sendEmail, sendWhatsApp } from "@/lib/notifications";
import bcrypt from "bcryptjs";

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

    const existing = await prisma.staff.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "staff", "edit", existing))) {
      await createAuditLog(user, "Status Changed", "staff", null, `Unauthorized attempt to edit staff record ${id}`, request.headers.get("x-forwarded-for"));
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
        return NextResponse.json({ error: "Cannot change staff's company" }, { status: 403 });
      }
      if (user.role === "Branch Admin" && data.branch && data.branch !== user.branch) {
        return NextResponse.json({ error: "Cannot change staff's branch" }, { status: 403 });
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

        const existingApplicant = await prisma.applicant.findFirst({
          where: { email: emailLower }
        });
        if (existingApplicant) {
          return NextResponse.json(
            { error: "An applicant with this email address already exists." },
            { status: 400 }
          );
        }
      }

      const existingStaff = await prisma.staff.findFirst({
        where: { email: emailLower, id: { not: id } }
      });
      if (existingStaff) {
        return NextResponse.json(
          { error: "A staff member with this email address already exists." },
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
              id: { not: id },
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

    // Validate passport uniqueness in Staff and Applicant tables (case-insensitive, excluding current staff ID)
    if (data.passportNumber && data.passportNumber.trim() !== "") {
      const passportTrimmed = data.passportNumber.trim();
      
      const existingStaffPassport = await prisma.staff.findFirst({
        where: { passportNumber: { equals: passportTrimmed }, id: { not: id } }
      });
      if (existingStaffPassport) {
        return NextResponse.json(
          { error: `Passport number (${passportTrimmed}) is already registered for staff member ${existingStaffPassport.name}.` },
          { status: 400 }
        );
      }

      const existingAppPassport = await prisma.applicant.findFirst({
        where: { passportNumber: { equals: passportTrimmed } }
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
      if (val === null) return null;
      if (typeof val === "string") return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return JSON.stringify([]);
    };

    const updated = await prisma.staff.update({
      where: { id },
      data: {
        photo: data.photo !== undefined ? data.photo : undefined,
        name: data.name ?? undefined,
        nationality: data.nationality ?? undefined,
        nationalityFlag: data.nationalityFlag ?? undefined,
        mobile: data.mobile ?? undefined,
        whatsapp: data.whatsapp ?? undefined,
        email: data.email ?? undefined,
        birthday: data.birthday ?? undefined,
        position: data.position ?? undefined,
        joiningDate: data.joiningDate ?? undefined,
        passportExpiry: data.passportExpiry ?? undefined,
        visaExpiry: data.visaExpiry ?? undefined,
        passportNumber: data.passportNumber ?? undefined,
        emiratesId: data.emiratesId ?? undefined,
        status: data.status ?? undefined,
        gender: data.gender ?? undefined,
        company: data.company ?? undefined,
        branch: data.branch ?? undefined,
        documents: stringifyArrayOrUndefined(data.documents),
        basicSalary: data.basicSalary !== undefined ? (data.basicSalary !== null ? parseFloat(data.basicSalary) : null) : undefined,
        housingAllowance: data.housingAllowance !== undefined ? (data.housingAllowance !== null ? parseFloat(data.housingAllowance) : null) : undefined,
        transportAllowance: data.transportAllowance !== undefined ? (data.transportAllowance !== null ? parseFloat(data.transportAllowance) : null) : undefined,
        overtimeRate: data.overtimeRate !== undefined ? (data.overtimeRate !== null ? parseFloat(data.overtimeRate) : null) : undefined,
        shiftId: data.shiftId !== undefined ? data.shiftId : undefined,
        salaryType: data.salaryType !== undefined ? data.salaryType : undefined,
        permissions: stringifyArrayOrUndefined(data.permissions)
      }
    });

    // If status has changed, trigger real-time notifications
    if (data.status && data.status !== existing.status && updated.email) {
      const emailBody = `Dear ${updated.name},

Your employment record status at ${updated.company} has been updated to: ${updated.status}.

Best regards,
${updated.company} HR Team`;

      sendEmail({
        to: updated.email,
        subject: `Employment Record Status Updated: ${updated.status}`,
        body: emailBody,
        candidateName: updated.name,
        company: updated.company,
        branch: updated.branch,
        templateType: "Status_Changed",
        templateData: {
          recipientName: updated.name,
          newStatus: updated.status,
          previousStatus: existing.status,
          notes: `Your employment record status has been officially updated to: ${updated.status}.`
        }
      }).catch(err => console.error("Async staff status update email error:", err));
    } else if (updated.email && Object.keys(data).some(key => data[key] !== undefined && data[key] !== (existing as any)[key])) {
      // General profile update
      const emailBody = `Dear ${updated.name},

This is to notify you that your employee record details at ${updated.company} have been updated in our management system.

Employee Details:
- Name: ${updated.name}
- Position: ${updated.position}
- Branch: ${updated.branch}

If you did not authorize this change or have questions, please contact the HR department.

Best regards,
${updated.company} HR Team`;

      sendEmail({
        to: updated.email,
        subject: `Employment Record Updated: ${updated.name}`,
        body: emailBody,
        candidateName: updated.name,
        company: updated.company,
        branch: updated.branch,
        templateType: "Staff_Updated",
        templateData: {
          recipientName: updated.name,
          newStatus: "Profile Updated",
          notes: `Your employee profile has been updated. Position: ${updated.position}, Branch: ${updated.branch}. If you did not request this update, contact HR.`
        }
      }).catch(err => console.error("Async general staff update email error:", err));
    }

    if (data.status && data.status !== existing.status && (updated.whatsapp || updated.mobile)) {
      const waNumber = updated.whatsapp || updated.mobile;
      const waMessage = `Dear ${updated.name}, your employment record status at ${updated.company} has been updated to: ${updated.status}.`;

      sendWhatsApp({
        to: waNumber,
        message: waMessage,
        candidateName: updated.name,
        company: updated.company,
        branch: updated.branch
      }).catch(err => console.error("Async staff status update WhatsApp error:", err));
    }

    // Sync changes to corresponding User record
    if (existing.email || data.email) {
      const oldEmail = existing.email ? existing.email.trim().toLowerCase() : "";
      const newEmail = data.email ? data.email.trim().toLowerCase() : oldEmail;

      const dbUser = oldEmail ? await prisma.user.findUnique({ where: { email: oldEmail } }) : null;

      if (dbUser) {
        // Update user account details
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            name: data.name ?? undefined,
            email: newEmail || undefined,
            mobile: data.mobile ?? undefined,
            whatsapp: data.whatsapp ?? undefined,
            status: data.status ? (data.status === "Active" ? "Active" : "Disabled") : undefined,
            company: data.company ?? undefined,
            branch: data.branch ?? undefined,
            role: data.role ?? undefined,
            permissions: data.permissions !== undefined ? data.permissions : undefined
          }
        });
      } else if (newEmail) {
        // Create user account if a staff member is assigned an email for the first time
        const hasSystemAccess = data.role === undefined || data.role !== "";
        if (hasSystemAccess) {
          const temporaryPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = bcrypt.hashSync(temporaryPassword, 10);
          let role = data.role;
          if (!role) {
            role = "Staff";
            const pos = (data.position || existing.position || "").toLowerCase();
            if (pos.includes("hr manager") || pos.includes("hr")) role = "HR Manager";
            else if (pos.includes("recruiter")) role = "Recruiter";
            else if (pos.includes("accountant")) role = "Accountant";
            else if (pos.includes("branch admin")) role = "Branch Admin";
            else if (pos.includes("admin")) role = "Admin";
          }

          await prisma.user.create({
            data: {
              name: data.name || existing.name,
              email: newEmail,
              password: hashedPassword,
              mobile: data.mobile || existing.mobile || "",
              whatsapp: data.whatsapp || existing.whatsapp || "",
              role,
              company: data.company || existing.company,
              branch: data.branch || existing.branch,
              status: data.status === "Inactive" ? "Disabled" : "Active",
              lastLogin: "",
              permissions: data.permissions || existing.permissions || null
            }
          });

          // Send welcome email with login details
          const emailBody = `Dear ${data.name || existing.name},

An online portal account has been created for you at ${data.company || existing.company}!

Here are your login credentials:
- Login Email: ${newEmail}
- Temporary Password: ${temporaryPassword}

Please log in and update your password immediately by clicking on your profile avatar in the sidebar.

Best regards,
${data.company || existing.company} HR Team`;

          sendEmail({
            to: newEmail,
            subject: `Your Login Credentials - Portal Account Created`,
            body: emailBody,
            candidateName: data.name || existing.name,
            company: data.company || existing.company,
            branch: data.branch || existing.branch,
            templateType: "Welcome_Employee",
            templateData: {
              recipientName: data.name || existing.name,
              position: existing.position,
              employerName: data.company || existing.company,
              startDate: existing.joiningDate,
              workLocation: data.branch || existing.branch || "Main Branch",
              tempPassword: temporaryPassword,
              portalUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "")}/login`
            }
          }).catch(err => console.error("Async staff updated email sending error:", err));
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT staff error:", error);
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

    const existing = await prisma.staff.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (!(await canModifyRecord(user, "staff", "delete", existing))) {
      await createAuditLog(user, "Status Changed", "staff", null, `Unauthorized attempt to delete staff record ${id}`, request.headers.get("x-forwarded-for"));
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

    // Delete corresponding User account if exists
    if (existing.email) {
      await prisma.user.deleteMany({
        where: { email: existing.email.trim().toLowerCase() }
      });
    }

    await prisma.staff.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Staff member deleted" });
  } catch (error: any) {
    console.error("DELETE staff error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
