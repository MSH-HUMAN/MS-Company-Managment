import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

// Guarantee that this route always returns a JSON response,
// even when Prisma crashes during module initialisation.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = (email as string).trim().toLowerCase();

    // Query database for the user
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });
    } catch (dbErr: any) {
      console.error("Login DB query error:", dbErr);
      return NextResponse.json(
        { error: "Database connection failed. Please try again later. (" + (dbErr?.code || dbErr?.message || "unknown") + ")" },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email address" },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === "Disabled") {
      return NextResponse.json(
        { error: "Your account has been disabled. Please contact your administrator." },
        { status: 403 }
      );
    }
    if (user.status === "Suspended") {
      return NextResponse.json(
        { error: "Your account is suspended. Please contact your administrator." },
        { status: 403 }
      );
    }
    if (user.status === "Pending") {
      return NextResponse.json(
        { error: "Your account is pending approval. Please contact your administrator." },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      branch: user.branch
    });

    // Create log entry and update lastLogin asynchronously in background
    prisma.activityLog.create({
      data: {
        dateTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        userName: user.name,
        role: user.role,
        company: user.company,
        branch: user.branch,
        action: "Login",
        module: "Security",
        newValue: "User signed in successfully",
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1"
      }
    }).catch(err => console.error("Login activity log error:", err));

    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date().toISOString().replace("T", " ").slice(0, 19) }
    }).catch(err => console.error("Login lastLogin update error:", err));

    // Set HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        branch: user.branch,
        status: user.status,
        photo: user.photo,
        permissions: user.permissions
      }
    });

    // Cookie is active for 7 days
    const cookieExpiry = 60 * 60 * 24 * 7;
    
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: cookieExpiry,
      path: "/"
    });

    return response;
  } catch (error: any) {
    console.error("Login API error:", error);
    // Always return JSON — never let Next.js emit an empty 500 body
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
