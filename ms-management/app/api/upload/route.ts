import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, uploadId, chunkIndex, data, name, type, size } = body;

    if (!uploadId) {
      return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
    }

    if (action === "chunk") {
      if (chunkIndex === undefined || !data) {
        return NextResponse.json({ error: "chunkIndex and data are required for chunk upload" }, { status: 400 });
      }

      await prisma.fileChunk.create({
        data: {
          uploadId,
          chunkIndex: Number(chunkIndex),
          data: String(data),
        },
      });

      return NextResponse.json({ success: true, chunkIndex });
    }

    if (action === "complete") {
      if (!name || !type || size === undefined) {
        return NextResponse.json({ error: "name, type, and size are required for complete upload" }, { status: 400 });
      }

      // Fetch all chunks ordered by index
      const chunks = await prisma.fileChunk.findMany({
        where: { uploadId },
        orderBy: { chunkIndex: "asc" },
      });

      if (chunks.length === 0) {
        return NextResponse.json({ error: "No chunks found for this uploadId" }, { status: 400 });
      }

      // Assemble chunks
      const completeData = chunks.map((c) => c.data).join("");

      // Save complete attachment
      const attachment = await prisma.attachment.create({
        data: {
          id: uploadId,
          name,
          type,
          size: Number(size),
          url: `/api/documents/download/${uploadId}`,
          createdAt: new Date().toISOString().slice(0, 10),
          data: completeData,
        },
      });

      // Cleanup chunks asynchronously
      await prisma.fileChunk.deleteMany({
        where: { uploadId },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: attachment.id,
          name: attachment.name,
          uploadedBy: user.name || "System",
          uploadedDate: attachment.createdAt,
          type: attachment.type,
          url: attachment.url,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
