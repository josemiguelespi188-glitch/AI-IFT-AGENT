import { NextRequest, NextResponse } from "next/server";
import { deletePineconeFile } from "@/lib/pinecone";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    await deletePineconeFile(params.fileId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
