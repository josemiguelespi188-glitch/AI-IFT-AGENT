import { NextRequest, NextResponse } from "next/server";
import { uploadFileToPinecone } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = form.get("name") as string ?? "document";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pineconeFileId = await uploadFileToPinecone(buffer, name, file.type || "application/octet-stream");

    return NextResponse.json({ pineconeFileId });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
