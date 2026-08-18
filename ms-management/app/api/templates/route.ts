import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { templateName: "asc" }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET templates error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "Super Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    const template = await prisma.emailTemplate.create({
      data: {
        templateName: data.templateName,
        subject: data.subject || "",
        body: data.body || "",
        headerDesign: data.headerDesign || null,
        bannerImage: data.bannerImage || null,
        icon: data.icon || null,
        footerContent: data.footerContent || null,
        brandColors: data.brandColors || {},
        versionHistory: JSON.stringify([]),
        type: data.type || "Email",
        isEnabled: data.isEnabled ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("POST template error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
