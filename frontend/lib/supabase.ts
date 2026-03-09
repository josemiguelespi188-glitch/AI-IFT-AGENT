import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon);

// ── Types ──────────────────────────────────────────────
export type InquiryStatus = "pending" | "responded" | "escalated";
export type Channel = "email" | "zendesk" | "portal";
export type Category =
  | "distributions" | "tax_documents" | "account_activation"
  | "banking_changes" | "accreditation" | "investment_status"
  | "redemption_request" | "technical_portal_help" | "other";

export interface Inquiry {
  id: string;
  channel: Channel;
  sender_email: string | null;
  sender_name: string | null;
  subject: string | null;
  body: string;
  client_name: string | null;
  deal_name: string | null;
  category: Category | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface Escalation {
  id: string;
  inquiry_id: string;
  investor_name: string | null;
  investor_email: string | null;
  client_name: string | null;
  deal_name: string | null;
  channel: Channel;
  category: Category;
  original_text: string;
  info_found: string | null;
  info_gaps: string | null;
  draft_response: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  final_response: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  client_name: string;
  portal_url: string | null;
  sponsor_contact_name: string | null;
  sponsor_contact_email: string | null;
  notes: string | null;
  created_at: string;
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  question: string | null;
  answer: string;
  client_name: string | null;
  category: string | null;
  source: string;
  approved_by: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  file_url: string | null;
  pinecone_file_id: string | null;
  status: "processing" | "ready" | "error";
  created_at: string;
}
