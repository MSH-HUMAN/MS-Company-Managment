import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog, getPermissionScopedFilter } from "@/lib/auth-helpers";
import { sendEmail, sendWhatsApp } from "@/lib/notifications";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "staff", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "staff", null, "Unauthorized attempt to view staff records", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const staff = await prisma.staff.findMany({
      where: filter,
      orderBy: { name: "asc" }
    });

    return NextResponse.json(staff);
  } catch (error: any) {
    console.error("GET staff error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(user, "staff", "create"))) {
      await createAuditLog(user, "Status Changed", "staff", null, "Unauthorized attempt to create staff record", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.name || !data.company) {
      return NextResponse.json(
        { error: "Name and company are required" },
        { status: 400 }
      );
    }
    const branch = data.branch || user.branch || "Main Branch";

    // Tenancy Check: Company Admin can create for any branch in their company. Others only their own.
    if (user.role !== "Super Admin") {
      if (data.company !== user.company) {
        return NextResponse.json({ error: "Cannot create staff for another company" }, { status: 403 });
      }
      if (user.role !== "Company Admin" && branch !== user.branch) {
        return NextResponse.json({ error: "Cannot create staff for another branch" }, { status: 403 });
      }
    }

    // Validate email uniqueness strictly against existing Staff members
    if (data.email && data.email.trim() !== "") {
      const emailLower = data.email.trim().toLowerCase();
      
      const existingStaff = await prisma.staff.findFirst({
        where: { email: emailLower }
      });
      if (existingStaff) {
        return NextResponse.json(
          { error: `A staff member with email address (${emailLower}) already exists.` },
          { status: 400 }
        );
      }
    }

    // Check phone/whatsapp uniqueness in Staff and Applicant tables
    if (data.mobile || data.whatsapp) {
      const cleanMobile = data.mobile ? data.mobile.trim().replace(/[^0-9+]/g, "") : "";
      const cleanWhatsapp = data.whatsapp ? data.whatsapp.trim().replace(/[^0-9+]/g, "") : "";
      
      if (cleanMobile || cleanWhatsapp) {
        const numbersToCheck = [cleanMobile, cleanWhatsapp].filter(n => n.length > 5);
        for (const num of numbersToCheck) {
          // Check in Staff
          const dupStaff = await prisma.staff.findFirst({
            where: {
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

    // Validate passport uniqueness in Staff and Applicant tables (case-insensitive)
    if (data.passportNumber && data.passportNumber.trim() !== "") {
      const passportTrimmed = data.passportNumber.trim();
      
      const existingStaffPassport = await prisma.staff.findFirst({
        where: { passportNumber: { equals: passportTrimmed } }
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

    // Auto-generate temporary password if email is provided and they have system access
    let temporaryPassword = "";
    let hashedPassword = "";
    const hasSystemAccess = data.role === undefined || data.role !== "";
    if (data.email && data.email.trim() !== "" && hasSystemAccess) {
      // Generate a secure 8-character random password
      temporaryPassword = Math.random().toString(36).slice(-8);
      hashedPassword = bcrypt.hashSync(temporaryPassword, 10);
    }

    const stringifyArray = (val: any) => {
      if (!val) return "[]";
      if (typeof val === "string") return val;
      if (Array.isArray(val)) return JSON.stringify(val);
      return JSON.stringify([]);
    };

    const newStaff = await prisma.staff.create({
      data: {
        id: data.id || undefined,
        photo: data.photo || null,
        name: data.name,
        nationality: data.nationality || "",
        nationalityFlag: data.nationalityFlag || "",
        mobile: data.mobile || "",
        whatsapp: data.whatsapp || "",
        email: data.email || "",
        birthday: data.birthday || "",
        position: data.position || "",
        joiningDate: data.joiningDate || "",
        passportExpiry: data.passportExpiry || "",
        visaExpiry: data.visaExpiry || "",
        passportNumber: data.passportNumber || "",
        emiratesId: data.emiratesId || "",
        status: data.status || "Active",
        gender: data.gender || "",
        company: data.company,
        branch: branch,
        createdBy: user.name,
        createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
        documents: stringifyArray(data.documents),
        basicSalary: data.basicSalary !== undefined ? parseFloat(data.basicSalary) : 3000,
        housingAllowance: data.housingAllowance !== undefined ? parseFloat(data.housingAllowance) : 1000,
        transportAllowance: data.transportAllowance !== undefined ? parseFloat(data.transportAllowance) : 500,
        overtimeRate: data.overtimeRate !== undefined ? parseFloat(data.overtimeRate) : 15,
        shiftId: data.shiftId || "",
        salaryType: data.salaryType || "Monthly",
        permissions: stringifyArray(data.permissions)
      }
    });

    // Create or update corresponding User account for logins if email is provided and system access is enabled
    if (newStaff.email && newStaff.email.trim() !== "" && hasSystemAccess) {
      let role = data.role;
      if (!role) {
        // Fallback to position guessing if role was not selected/passed
        role = "Staff";
        const pos = (newStaff.position || "").toLowerCase();
        if (pos.includes("hr manager") || pos.includes("hr")) role = "HR Manager";
        else if (pos.includes("recruiter")) role = "Recruiter";
        else if (pos.includes("accountant")) role = "Accountant";
        else if (pos.includes("branch admin")) role = "Branch Admin";
        else if (pos.includes("admin")) role = "Admin";
      }

      const emailLower = newStaff.email.trim().toLowerCase();
      await prisma.user.upsert({
        where: { email: emailLower },
        update: {
          name: newStaff.name,
          role,
          company: newStaff.company,
          branch: newStaff.branch,
          status: "Active",
          ...(hashedPassword ? { password: hashedPassword } : {}),
          permissions: data.permissions || undefined
        },
        create: {
          name: newStaff.name,
          email: emailLower,
          password: hashedPassword || bcrypt.hashSync("ms123456", 10),
          mobile: newStaff.mobile || "",
          whatsapp: newStaff.whatsapp || "",
          role,
          company: newStaff.company,
          branch: newStaff.branch,
          status: "Active",
          lastLogin: "",
          permissions: data.permissions || null
        }
      });
    }

    // Trigger real-time notifications for staff
    if (newStaff.email) {
      let emailBody = `
        <div style="font-family: sans-serif; color: #334155;">
          <p style="font-size: 15px; margin-bottom: 16px;">
            Dear <strong style="color: #0f172a;">${newStaff.name}</strong>,
          </p>
          <p style="font-size: 14px; margin-bottom: 20px;">
            Welcome to the team at <strong style="color: #2563eb;">${newStaff.company}</strong>! We are excited to have you on board.
          </p>
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; margin-bottom: 12px; color: #0f172a; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Registration Details</h4>
            <ul style="list-style-type: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #2563eb; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Employee ID:</span> 
                <span style="color: #2563eb; font-weight: 700; font-family: monospace;">${newStaff.id}</span>
              </li>
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #059669; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Name:</span> 
                <span style="color: #059669; font-weight: 600;">${newStaff.name}</span>
              </li>
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #4f46e5; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Position:</span> 
                <span style="color: #4f46e5; font-weight: 600;">${newStaff.position}</span>
              </li>
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #0284c7; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Company:</span> 
                <span style="color: #0284c7; font-weight: 600;">${newStaff.company}</span>
              </li>
              <li style="margin-bottom: 10px; font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #9333ea; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Branch:</span> 
                <span style="color: #9333ea; font-weight: 600;">${newStaff.branch}</span>
              </li>
              <li style="font-size: 14px; display: flex; align-items: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #ea580c; margin-right: 10px;"></span>
                <span style="color: #64748b; font-weight: 600; min-width: 130px; display: inline-block;">Joining Date:</span> 
                <span style="color: #ea580c; font-weight: 600;">${newStaff.joiningDate}</span>
              </li>
            </ul>
          </div>
      `;

      if (temporaryPassword) {
        const portalUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "")}/login`;
        emailBody += `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h4 style="margin-top: 0; margin-bottom: 8px; color: #166534; font-size: 14px;">System Access Account Created</h4>
            <p style="margin-top: 0; margin-bottom: 12px; font-size: 13px; color: #15803d;">You can now log in to the Employee Portal with your credentials:</p>
            <ul style="list-style-type: none; padding: 0; margin: 0 0 14px 0;">
              <li style="margin-bottom: 6px; font-size: 13px;"><strong style="color: #166534;">Employee ID:</strong> <span style="font-family: monospace; font-weight: bold;">${newStaff.id}</span></li>
              <li style="margin-bottom: 6px; font-size: 13px;"><strong style="color: #166534;">Login Email:</strong> ${newStaff.email}</li>
              <li style="font-size: 13px;"><strong style="color: #166534;">Temporary Password:</strong> <span style="font-family: monospace; background-color: #dcfce7; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #86efac;">${temporaryPassword}</span></li>
            </ul>
            <div style="margin-top: 14px;">
              <a href="${portalUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #166534; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 13px;">🔑 Login to Employee Portal</a>
            </div>
            <p style="margin-top: 12px; margin-bottom: 0; font-size: 11px; color: #15803d; font-style: italic;">Please log in and change your temporary password after your first login.</p>
          </div>
        `;
      } else {
        emailBody += `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              <strong>Note:</strong> A system login account was not requested for your profile. If you require access to the employee portal in the future, please contact your HR or System Administrator.
            </p>
          </div>
        `;
      }

      emailBody += `
          <p style="font-size: 14px; margin-bottom: 8px;">Best regards,</p>
          <p style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 0;">${newStaff.company} HR Team</p>
        </div>
      `;

      await sendEmail({
        to: newStaff.email,
        subject: `Welcome to the team at ${newStaff.company} - Staff Registration Success`,
        body: emailBody,
        candidateName: newStaff.name,
        company: newStaff.company,
        branch: newStaff.branch,
        templateType: temporaryPassword ? "Welcome_Employee" : "Registration_Successful",
        templateData: {
          recipientName: newStaff.name,
          position: newStaff.position,
          employerName: newStaff.company,
          startDate: newStaff.joiningDate,
          workLocation: newStaff.branch || "Main Branch",
          tempPassword: temporaryPassword || "",
          portalUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "")}/login`
        }
      }).catch(err => console.error("Async staff email sending error:", err));
    }

    if (newStaff.whatsapp || newStaff.mobile) {
      const waNumber = newStaff.whatsapp || newStaff.mobile;
      let waMessage = `Dear ${newStaff.name}, welcome to ${newStaff.company}! Your staff registration is complete as a ${newStaff.position}.`;
      if (temporaryPassword) {
        waMessage += ` Your temporary portal password is: ${temporaryPassword}. Please log in and change it.`;
      }

      await sendWhatsApp({
        to: waNumber,
        message: waMessage,
        candidateName: newStaff.name,
        company: newStaff.company,
        branch: newStaff.branch
      }).catch(err => console.error("Async staff WhatsApp sending error:", err));
    }

    return NextResponse.json(newStaff);
  } catch (error: any) {
    console.error("POST staff error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
