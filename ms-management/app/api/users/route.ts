import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSessionUser, getTenantScopeFilter, hasPermissionBackend, createAuditLog, getPermissionScopedFilter } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/notifications";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await getPermissionScopedFilter(user, "users", "view", "company", "branch");
    if (!filter) {
      await createAuditLog(user, "Status Changed", "users", null, "Unauthorized attempt to view user list", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    // Don't fetch password hashes to frontend
    const users = await prisma.user.findMany({
      where: filter,
      orderBy: { name: "asc" }
    });

    // Strip password field
    const safeUsers = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    return NextResponse.json(safeUsers);
  } catch (error: any) {
    console.error("GET users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await hasPermissionBackend(currentUser, "users", "create"))) {
      await createAuditLog(currentUser, "Status Changed", "users", null, "Unauthorized attempt to create user account", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Forbidden: Access Denied" }, { status: 403 });
    }

    const data = await request.json();

    if (!data.name || !data.email || !data.role || !data.company) {
      return NextResponse.json(
        { error: "Name, email, role, and company are required" },
        { status: 400 }
      );
    }

    // Check if company has branches
    const companyBranches = await prisma.branch.findMany({
      where: { company: data.company }
    });
    if (companyBranches.length > 0 && (!data.branch || data.branch === "")) {
      return NextResponse.json(
        { error: "Branch is required because the selected company has branches" },
        { status: 400 }
      );
    }

    // Tenancy Check: Company Admin can only create users for their own company
    if (currentUser.role === "Company Admin" && data.company !== currentUser.company) {
      return NextResponse.json(
        { error: "Cannot create user for another company" },
        { status: 403 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email address already registered" },
        { status: 409 }
      );
    }

    const defaultPassword = data.password && data.password.trim() !== "" ? data.password : "123456";

    // Hash password
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        id: data.id || undefined,
        name: data.name,
        email: data.email.trim().toLowerCase(),
        password: hashedPassword,
        mobile: data.mobile || "",
        whatsapp: data.whatsapp || "",
        role: data.role,
        company: data.company,
        branch: data.branch,
        status: data.status || "Active",
        lastLogin: "-",
        photo: data.photo || null,
        permissions: data.permissions || null
      }
    });

    // Send welcome email with default credentials
    try {
      await sendEmail({
        to: newUser.email,
        subject: "Welcome to MS Horizon - Account Created",
        body: `Dear ${newUser.name},\n\nYour user account has been successfully created by the administrator.\n\nHere are your login credentials:\n- Login Email: ${newUser.email}\n- Default Password: ${defaultPassword}\n- Assigned Role: ${newUser.role}\n\nPlease log in and update your password immediately.`,
        candidateName: newUser.name,
        company: newUser.company,
        branch: newUser.branch,
        templateType: "User_Account_Created",
        templateData: {
          recipientName: newUser.name,
          role: newUser.role,
          tempPassword: defaultPassword,
          portalUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://mshorizonuae.com").replace(/\/$/, "")}/login`
        }
      });
    } catch (mailErr) {
      console.error("Welcome email failed:", mailErr);
    }

    // Strip password hash
    const { password, ...safeUser } = newUser;

    return NextResponse.json(safeUser);
  } catch (error: any) {
    console.error("POST user error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
