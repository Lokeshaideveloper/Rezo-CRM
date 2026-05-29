export type UserRole = 'super_admin' | 'ae' | 'sdr'

export type DealStage =
  | 'MQL'
  | 'Demo/Discovery'
  | 'SQL'
  | 'Commercial'
  | 'POC/Pilot'
  | 'Won'
  | 'Lost'
  | 'On Hold'

export type ContactRole = 'influencer' | 'kdm' | 'blocker' | 'champion'

export type LeadSource =
  | 'Inbound'
  | 'Outbound'
  | 'Referral'
  | 'Event'
  | 'Partner'
  | 'Cold Call'
  | 'LinkedIn'
  | 'Website'
  | 'Other'

export type CompanySize = 'Startup' | 'SMB' | 'Mid-Market' | 'Enterprise'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface Account {
  id: string
  name: string
  industry: string
  city: string
  website?: string
  size?: CompanySize
  linkedin_url?: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  designation: string
  role: ContactRole
  account_id: string
  account?: Account
  linkedin_url?: string
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  name: string
  expected_mrr: number
  close_date: string
  stage: DealStage
  probability?: number
  lead_source?: LeadSource
  description?: string
  owner_id: string
  owner?: User
  contact_id: string
  contact?: Contact
  account_id: string
  account?: Account
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  deal_id: string
  deal?: Deal
  title: string
  description: string
  due_date: string
  assigned_to: string
  assigned_user?: User
  created_by: string
  created_by_user?: User
  completed: boolean
  created_at: string
  updated_at: string
}

export const PIPELINE_STAGES: DealStage[] = [
  'MQL', 'Demo/Discovery', 'SQL', 'Commercial', 'POC/Pilot', 'Won', 'Lost', 'On Hold',
]

export const STAGE_COLORS: Record<DealStage, string> = {
  'MQL': '#ef4444',
  'Demo/Discovery': '#f97316',
  'SQL': '#eab308',
  'Commercial': '#3b82f6',
  'POC/Pilot': '#8b5cf6',
  'Won': '#22c55e',
  'Lost': '#94a3b8',
  'On Hold': '#64748b',
}

export const LEAD_SOURCES: LeadSource[] = [
  'Inbound', 'Outbound', 'Referral', 'Event', 'Partner', 'Cold Call', 'LinkedIn', 'Website', 'Other'
]

export const COMPANY_SIZES: CompanySize[] = ['Startup', 'SMB', 'Mid-Market', 'Enterprise']

export const INDUSTRIES = [
  'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'Manufacturing',
  'Education', 'Logistics', 'Real Estate', 'Media', 'Other'
]
