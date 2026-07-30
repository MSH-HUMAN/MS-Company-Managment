import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Await params if it is a promise (Next.js 15 compatibility)
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Attachment ID is required" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const rawData = attachment.data;
    let base64Data = rawData;
    let mimeType = attachment.type || "application/octet-stream";

    if (rawData.includes("base64,")) {
      const parts = rawData.split("base64,");
      base64Data = parts[1];
      const match = parts[0].match(/data:([^;]+)/);
      if (match) {
        mimeType = match[1];
      }
    }

    const buffer = Buffer.from(base64Data, "base64");

    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.name)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Download API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
