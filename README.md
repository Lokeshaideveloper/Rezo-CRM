# Pipeline CRM

A modern, full-featured CRM built with Next.js 14, Supabase, Resend, and deployed on Vercel.

## Features

- **Authentication** — Email/password login via Supabase Auth
- **4 Tabs** — Dashboard, Deals, Accounts, Contacts
- **Pipeline Kanban** — Drag-and-drop deals across 8 stages
- **Deal Management** — Full CRUD with owner, account, contact tagging
- **Task System** — Create tasks on deals with email notifications (Resend)
- **Bulk Upload** — CSV import for Deals, Accounts, Contacts
- **Filtering** — Search + filter on every entity
- **User Roles** — Super Admin, AE, SDR
- **Responsive** — Works on desktop and tablet

## Pipeline Stages

MQL → Demo/Discovery → SQL → Commercial → POC/Pilot → Won / Lost / On Hold

## Quick Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd pipeline-crm
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Resend Setup

1. Create account at [resend.com](https://resend.com)
2. Verify your domain (or use `onboarding@resend.dev` for testing)
3. Create an API key → `RESEND_API_KEY`
4. Set `FROM_EMAIL` to your verified email/domain

### 4. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
FROM_EMAIL=crm@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

### Via GitHub

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Add all environment variables from `.env.local`
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel URL
5. Deploy!

### Via Vercel CLI

```bash
npm i -g vercel
vercel
# Follow prompts, add env vars
vercel --prod
```

## Updating User Roles

After a user signs up, update their role in Supabase:

```sql
UPDATE public.users SET role = 'ae' WHERE email = 'user@example.com';
-- roles: 'super_admin', 'ae', 'sdr'
```

## Bulk Upload CSV Format

### Accounts
```csv
name,industry,city
Acme Corp,SaaS,Bengaluru
```

### Contacts
```csv
name,email,phone,designation,role
Priya Sharma,priya@acme.com,+91 98765 43210,CTO,kdm
```
Role values: `influencer`, `kdm`, `blocker`, `champion`

### Deals
```csv
name,expected_mrr,close_date,stage
Enterprise Deal,50000,2024-12-31,MQL
```
Stage values: `MQL`, `Demo/Discovery`, `SQL`, `Commercial`, `POC/Pilot`, `Won`, `Lost`, `On Hold`

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Email | Resend |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| Language | TypeScript |

## Project Structure

```
crm/
├── app/
│   ├── (app)/              # Protected routes (with sidebar)
│   │   ├── dashboard/      # Dashboard with stats
│   │   ├── deals/          # Deals table + CRUD
│   │   ├── pipeline/       # Kanban board
│   │   ├── accounts/       # Accounts grid
│   │   └── contacts/       # Contacts table
│   ├── auth/login/         # Login/signup page
│   └── api/tasks/notify/   # Email notification endpoint
├── components/
│   ├── layout/             # Sidebar, PageHeader
│   └── forms/              # DealModal, TaskModal, etc.
├── lib/
│   ├── supabase.ts         # Supabase clients
│   ├── email.ts            # Resend email templates
│   └── utils.ts            # Helpers
├── types/index.ts          # TypeScript types
└── supabase-schema.sql     # Run this in Supabase SQL editor
```
