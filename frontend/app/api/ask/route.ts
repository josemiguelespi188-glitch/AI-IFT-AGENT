import { NextRequest, NextResponse } from "next/server";
import { askAssistant } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }
    const answer = await askAssistant(question);
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get answer" },
      { status: 500 }
    );
  }
}
