import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-storage";
import prisma from "@/lib/prisma";

export const maxDuration = 60; // 60 second timeout for large uploads

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const applicantId = formData.get("applicantId") as string | null;
    const slotLabel = formData.get("slotLabel") as string | null;
    const documentType = formData.get("documentType") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/zip",
      "application/x-zip-compressed",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Supported: PDF, DOC, DOCX, JPG, PNG, ZIP" },
        { status: 400 }
      );
    }

    // Max 50 MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50 MB." },
        { status: 400 }
      );
    }

    // Build storage path: documents/{applicantId}/{timestamp}-{filename}
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = applicantId
      ? `applicants/${applicantId}/${timestamp}-${safeFileName}`
      : `general/${timestamp}-${safeFileName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const supabaseAdmin = getSupabaseAdmin();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[UPLOAD] Supabase storage error:", uploadError);
      
      // If bucket doesn't exist, create it and retry
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("bucket")) {
        await getSupabaseAdmin().storage.createBucket(STORAGE_BUCKET, {
          public: false,
          fileSizeLimit: MAX_SIZE,
          allowedMimeTypes: allowedTypes,
        });

        const { data: retryData, error: retryError } = await getSupabaseAdmin().storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (retryError) {
          return NextResponse.json({ error: "Storage upload failed: " + retryError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "Storage upload failed: " + uploadError.message }, { status: 500 });
      }
    }

    // Generate signed URL (valid for 1 year)
    const { data: signedUrlData } = await getSupabaseAdmin().storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    const fileUrl = signedUrlData?.signedUrl || storagePath;

    // Save record to DB (no base64 data — just metadata + URL)
    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        type: file.type,
        size: file.size,
        url: fileUrl,
        storagePath,
        createdAt: new Date().toISOString().slice(0, 10),
        uploadedBy: user.name || "System",
        applicantId: applicantId || null,
        slotLabel: slotLabel || null,
        documentType: documentType || null,
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: attachment.id,
        name: attachment.name,
        uploadedBy: attachment.uploadedBy || user.name,
        uploadedDate: attachment.createdAt,
        type: attachment.type,
        size: attachment.size,
        url: fileUrl,
        storagePath,
      },
    });
  } catch (error: any) {
    console.error("[UPLOAD] Error:", error);
    return NextResponse.json({ error: "Upload failed: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
