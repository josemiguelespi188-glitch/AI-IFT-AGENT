import { Pinecone } from "@pinecone-database/pinecone";

const ASSISTANT_NAME = process.env.PINECONE_ASSISTANT_NAME ?? "axiskey-assistant";

let _pc: Pinecone | null = null;

function getPinecone() {
  if (!_pc) _pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  return _pc;
}

// ── Assistant helpers ──────────────────────────────────

export async function getOrCreateAssistant() {
  const pc = getPinecone();
  try {
    const assistant = pc.assistant(ASSISTANT_NAME);
    // Verify it exists by describing it
    await assistant.describeAssistant();
    return assistant;
  } catch {
    // Create if not found
    await pc.createAssistant({
      name: ASSISTANT_NAME,
      instructions:
        "You are Axiskey, an expert investor relations assistant for Industry FinTech (IFT). " +
        "Answer investor questions accurately based on the documents provided. " +
        "Be professional, concise, and always cite the source document when possible. " +
        "Never make up specific numbers, dates, or financial data not found in documents.",
    });
    return pc.assistant(ASSISTANT_NAME);
  }
}

export async function uploadFileToPinecone(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const assistant = await getOrCreateAssistant();
  const blob = new Blob([fileBuffer], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  const response = await assistant.uploadFile(file);
  return response.id;
}

export async function listPineconeFiles() {
  const assistant = await getOrCreateAssistant();
  return assistant.listFiles();
}

export async function deletePineconeFile(fileId: string) {
  const assistant = await getOrCreateAssistant();
  await assistant.deleteFile(fileId);
}

export async function askAssistant(question: string): Promise<string> {
  const assistant = await getOrCreateAssistant();
  const response = await assistant.chat({
    messages: [{ role: "user", content: question }],
  });
  return response.message?.content?.[0]?.text ?? "No response from assistant.";
}
