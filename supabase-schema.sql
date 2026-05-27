-- ============================================================
-- Pipeline CRM - Supabase SQL Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE (mirrors auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sdr' CHECK (role IN ('super_admin', 'ae', 'sdr')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACCOUNTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  designation TEXT,
  role TEXT NOT NULL DEFAULT 'influencer' CHECK (role IN ('influencer', 'kdm', 'blocker', 'champion')),
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  expected_mrr NUMERIC DEFAULT 0,
  close_date DATE,
  stage TEXT NOT NULL DEFAULT 'MQL' CHECK (
    stage IN ('MQL', 'Demo/Discovery', 'SQL', 'Commercial', 'POC/Pilot', 'Won', 'Lost', 'On Hold')
  ),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','accounts','contacts','deals','tasks'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t);
  END LOOP;
END$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can see all other users (needed for dropdowns)
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Accounts: authenticated users can CRUD
CREATE POLICY "accounts_all" ON public.accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contacts: authenticated users can CRUD
CREATE POLICY "contacts_all" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Deals: authenticated users can CRUD
CREATE POLICY "deals_all" ON public.deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tasks: authenticated users can CRUD
CREATE POLICY "tasks_all" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTION: auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_deals_owner ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_account ON public.deals(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal ON public.tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);


-- ─────────────────────────────────────────────
-- Snippets table (added in v2)
-- ─────────────────────────────────────────────
create table if not exists snippets (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  category    text not null default 'Other',
  tags        text[] default '{}',
  created_by  uuid references users(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS: all authenticated users can read; only creator can edit/delete
alter table snippets enable row level security;

create policy "Snippets: read for authenticated"
  on snippets for select
  using (auth.role() = 'authenticated');

create policy "Snippets: insert for authenticated"
  on snippets for insert
  with check (auth.uid() = created_by);

create policy "Snippets: update own"
  on snippets for update
  using (auth.uid() = created_by);

create policy "Snippets: delete own"
  on snippets for delete
  using (auth.uid() = created_by);


-- ─────────────────────────────────────────────
-- Deal Notes table (added in v3)
-- ─────────────────────────────────────────────
create table if not exists deal_notes (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  content     text not null,
  created_by  uuid not null references users(id) on delete restrict,
  created_at  timestamptz default now()
);

alter table deal_notes enable row level security;
create policy "deal_notes_all" on deal_notes for all to authenticated using (true) with check (true);

create index if not exists idx_deal_notes_deal on deal_notes(deal_id);


-- ─────────────────────────────────────────────
-- Deal Attachments table (added in v3)
-- ─────────────────────────────────────────────
create table if not exists deal_attachments (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references deals(id) on delete cascade,
  file_name     text not null,
  file_size     bigint not null,
  file_type     text not null,
  storage_path  text not null,
  uploaded_by   uuid not null references users(id) on delete restrict,
  created_at    timestamptz default now()
);

alter table deal_attachments enable row level security;
create policy "deal_attachments_all" on deal_attachments for all to authenticated using (true) with check (true);

create index if not exists idx_deal_attachments_deal on deal_attachments(deal_id);


-- ─────────────────────────────────────────────
-- Deal Emails table (added in v4)
-- ─────────────────────────────────────────────
create table if not exists deal_emails (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  to_email    text not null,
  to_name     text,
  subject     text not null,
  body        text not null,
  sent_by     uuid not null references users(id) on delete restrict,
  resend_id   text,
  created_at  timestamptz default now()
);

alter table deal_emails enable row level security;
create policy "deal_emails_all" on deal_emails for all to authenticated using (true) with check (true);

create index if not exists idx_deal_emails_deal on deal_emails(deal_id);
