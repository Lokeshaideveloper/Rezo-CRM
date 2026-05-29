-- ============================================================
-- Rezo CRM — Supabase Schema v2
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'sdr' CHECK (role IN ('super_admin', 'ae', 'sdr')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  industry     TEXT,
  city         TEXT,
  website      TEXT,
  size         TEXT CHECK (size IN ('Startup', 'SMB', 'Mid-Market', 'Enterprise')),
  linkedin_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contacts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  designation  TEXT,
  role         TEXT DEFAULT 'influencer' CHECK (role IN ('influencer', 'kdm', 'blocker', 'champion')),
  account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  linkedin_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  expected_mrr  NUMERIC DEFAULT 0,
  close_date    DATE,
  stage         TEXT NOT NULL DEFAULT 'MQL'
                CHECK (stage IN ('MQL','Demo/Discovery','SQL','Commercial','POC/Pilot','Won','Lost','On Hold')),
  probability   INTEGER CHECK (probability BETWEEN 0 AND 100),
  lead_source   TEXT CHECK (lead_source IN ('Inbound','Outbound','Referral','Event','Partner','Cold Call','LinkedIn','Website','Other')),
  description   TEXT,
  owner_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tasks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id     UUID REFERENCES deals(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deal Notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id    UUID REFERENCES deals(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deal Attachments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id      UUID REFERENCES deals(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_size    INTEGER,
  file_type    TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deal Emails ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_emails (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id    UUID REFERENCES deals(id) ON DELETE CASCADE,
  to_email   TEXT NOT NULL,
  to_name    TEXT,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  sent_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email Snippets ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS snippets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  subject    TEXT,
  body       TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Updated_at triggers ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','accounts','contacts','deals','tasks','snippets']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

-- ── Handle new auth user ─────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'sdr'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access (tighten per role if needed)
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','accounts','contacts','deals','tasks','deal_notes','deal_attachments','deal_emails','snippets']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated users full access" ON %s', t);
    EXECUTE format('CREATE POLICY "Authenticated users full access" ON %s FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ── Storage bucket for deal attachments ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-attachments', 'deal-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'deal-attachments');

DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
CREATE POLICY "Authenticated users can read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'deal-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'deal-attachments');

-- ── Migration for existing databases (add new columns) ───────
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS size TEXT CHECK (size IN ('Startup', 'SMB', 'Mid-Market', 'Enterprise'));
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS probability INTEGER CHECK (probability BETWEEN 0 AND 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS description TEXT;

