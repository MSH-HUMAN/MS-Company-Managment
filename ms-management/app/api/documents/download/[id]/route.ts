import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-storage";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: params.id },
    });

    if (!attachment) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // If file is in Supabase Storage, generate a fresh signed URL
    if (attachment.storagePath) {
      const { data, error } = await getSupabaseAdmin().storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(attachment.storagePath, 60 * 60); // 1 hour

      if (error || !data?.signedUrl) {
        console.error("[DOWNLOAD] Signed URL error:", error);
        return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
      }

      // Redirect to signed URL
      return NextResponse.redirect(data.signedUrl);
    }

    // Legacy: file stored as base64 in DB
    if (attachment.data) {
      const base64Data = attachment.data.includes(",")
        ? attachment.data.split(",")[1]
        : attachment.data;
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": attachment.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${attachment.name}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: "File data not available" }, { status: 404 });
  } catch (error: any) {
    console.error("[DOWNLOAD] Error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
