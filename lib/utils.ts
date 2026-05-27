import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DealStage } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getStageColor(stage: DealStage): string {
  const colors: Record<DealStage, string> = {
    'MQL': 'bg-indigo-100 text-indigo-700',
    'Demo/Discovery': 'bg-purple-100 text-purple-700',
    'SQL': 'bg-sky-100 text-sky-700',
    'Commercial': 'bg-amber-100 text-amber-700',
    'POC/Pilot': 'bg-emerald-100 text-emerald-700',
    'Won': 'bg-green-100 text-green-700',
    'Lost': 'bg-red-100 text-red-700',
    'On Hold': 'bg-slate-100 text-slate-600',
  }
  return colors[stage] || 'bg-gray-100 text-gray-600'
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    champion: 'bg-green-100 text-green-700',
    kdm: 'bg-blue-100 text-blue-700',
    influencer: 'bg-purple-100 text-purple-700',
    blocker: 'bg-red-100 text-red-700',
  }
  return colors[role] || 'bg-gray-100 text-gray-600'
}

export function getUserRoleBadge(role: string): string {
  const colors: Record<string, string> = {
    super_admin: 'bg-red-100 text-red-700',
    ae: 'bg-blue-100 text-blue-700',
    sdr: 'bg-emerald-100 text-emerald-700',
  }
  return colors[role] || 'bg-gray-100 text-gray-600'
}
