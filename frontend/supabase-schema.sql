-- =============================================================
-- Axiskey — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Investors
CREATE TABLE IF NOT EXISTS investors (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name             TEXT NOT NULL,
  email                 TEXT UNIQUE,
  phone                 TEXT,
  entity_type           TEXT,
  accreditation_status  TEXT,
  deals                 TEXT[] DEFAULT '{}',
  portal_user_id        TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Inquiries (all incoming messages from any channel)
CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel       TEXT NOT NULL CHECK (channel IN ('email','zendesk','portal')),
  sender_email  TEXT,
  sender_name   TEXT,
  subject       TEXT,
  body          TEXT NOT NULL,
  client_name   TEXT,
  deal_name     TEXT,
  category      TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','responded','escalated')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Agent responses
CREATE TABLE IF NOT EXISTS responses (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id     UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  response_text  TEXT NOT NULL,
  subject_line   TEXT,
  confidence     FLOAT,
  channel        TEXT,
  sent           BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Escalations pending human review
CREATE TABLE IF NOT EXISTS escalations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id      UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  investor_name   TEXT,
  investor_email  TEXT,
  client_name     TEXT,
  deal_name       TEXT,
  channel         TEXT,
  category        TEXT,
  original_text   TEXT,
  info_found      TEXT,
  info_gaps       TEXT,
  draft_response  TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  final_response  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Clients / Sponsors
CREATE TABLE IF NOT EXISTS clients (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name            TEXT NOT NULL,
  portal_url             TEXT,
  sponsor_contact_name   TEXT,
  sponsor_contact_email  TEXT,
  tax_document_type      TEXT,
  distribution_schedule  TEXT,
  reinvestment_policy    TEXT,
  redemption_rules       TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base (general + client-specific Q&A)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic        TEXT NOT NULL,
  question     TEXT,
  answer       TEXT NOT NULL,
  client_name  TEXT,
  category     TEXT,
  source       TEXT DEFAULT 'manual',
  approved_by  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Documents uploaded to Pinecone
CREATE TABLE IF NOT EXISTS documents (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  client_name       TEXT,
  file_url          TEXT,
  pinecone_file_id  TEXT,
  status            TEXT DEFAULT 'processing' CHECK (status IN ('processing','ready','error')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on inquiries
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_status    ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_channel   ON inquiries(channel);
CREATE INDEX IF NOT EXISTS idx_inquiries_created   ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalations_status  ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_responses_inquiry   ON responses(inquiry_id);

-- Enable Realtime for dashboard live updates
ALTER PUBLICATION supabase_realtime ADD TABLE inquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE escalations;

-- =============================================================
-- Sample data (optional — remove in production)
-- =============================================================
INSERT INTO clients (client_name, portal_url, sponsor_contact_name, sponsor_contact_email, tax_document_type, distribution_schedule, reinvestment_policy, redemption_rules)
VALUES
  ('Phoenix American Hospitality','https://portal.tribexa.com/phoenix-american','Katie Ginther','katie.ginther@phoenixamericanhospitality.com','1099-DIV','Monthly on the 15th','Not available','Case-by-case via Katie Ginther'),
  ('Rastegar','https://portal.tribexa.com/rastegar','Diego Traversari','dtraversari@rastegar.com','K-1','Quarterly','DRIP available with 30-day notice','Quarterly with 60-day notice, min $25k via Diego Traversari')
ON CONFLICT DO NOTHING;
