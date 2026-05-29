'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import { Account, STAGE_COLORS, DealStage } from '@/types'
import { formatCurrency, formatDate, getStageColor, getRoleColor } from '@/lib/utils'
import AccountModal from '@/components/forms/AccountModal'
import ContactModal from '@/components/forms/ContactModal'
import {
  ArrowLeft, Building2, Globe, MapPin, Briefcase, Users, TrendingUp,
  Pencil, Plus, ExternalLink, Linkedin, Phone, Mail, Trash2, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SIZE_COLORS: Record<string, string> = {
  'Startup': 'bg-emerald-100 text-emerald-700',
  'SMB': 'bg-blue-100 text-blue-700',
  'Mid-Market': 'bg-purple-100 text-purple-700',
  'Enterprise': 'bg-red-100 text-red-700',
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [account, setAccount] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'contacts' | 'deals' | 'overview'>('overview')
  const [showEditAccount, setShowEditAccount] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [{ data: acc }, { data: cts }, { data: dls }] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', id).single(),
      supabase.from('contacts').select('*').eq('account_id', id).order('name'),
      supabase.from('deals').select('*, owner:users!deals_owner_id_fkey(id,full_name), contact:contacts(id,name)').eq('account_id', id).order('created_at', { ascending: false }),
    ])
    setAccount(acc)
    setContacts(cts || [])
    setDeals(dls || [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleDeleteContact(contactId: string) {
    if (!confirm('Delete this contact?')) return
    const { error } = await supabase.from('contacts').delete().eq('id', contactId)
    if (error) toast.error('Failed to delete contact')
    else { toast.success('Contact deleted'); fetchAll() }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm animate-pulse">Loading account...</div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-slate-500">Account not found</p>
        <button onClick={() => router.push('/accounts')} className="btn-primary">Back to Accounts</button>
      </div>
    )
  }

  const totalMRR = deals.reduce((s, d) => s + (d.expected_mrr || 0), 0)
  const wonMRR = deals.filter(d => d.stage === 'Won').reduce((s, d) => s + (d.expected_mrr || 0), 0)
  const openDeals = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <button onClick={() => router.push('/accounts')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Accounts
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
              <Building2 className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {account.industry && (
                  <span className="badge bg-slate-100 text-slate-600 text-xs">{account.industry}</span>
                )}
                {account.size && (
                  <span className={`badge text-xs ${SIZE_COLORS[account.size] || 'bg-slate-100 text-slate-600'}`}>{account.size}</span>
                )}
                {account.city && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />{account.city}
                  </span>
                )}
                {account.website && (
                  <a href={account.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                    <Globe className="w-3 h-3" />{account.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {account.linkedin_url && (
                  <a href={account.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Linkedin className="w-3 h-3" />LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
          <button onClick={() => setShowEditAccount(true)} className="btn-secondary flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Edit Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline MRR', value: formatCurrency(totalMRR), icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Won MRR', value: formatCurrency(wonMRR), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Open Deals', value: openDeals, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Contacts', value: contacts.length, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className={`card p-5 ${stat.bg} border-0`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="px-8">
        <div className="flex border-b border-slate-200 mb-6">
          {(['overview', 'contacts', 'deals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'text-red-700 border-b-2 border-red-600 bg-red-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab === 'overview' ? '📋 Overview' : tab === 'contacts' ? `👥 Contacts (${contacts.length})` : `💼 Deals (${deals.length})`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6 pb-8">
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Account Details</h3>
              <dl className="space-y-3">
                {[
                  { label: 'Company Name', value: account.name },
                  { label: 'Industry', value: account.industry },
                  { label: 'Company Size', value: account.size },
                  { label: 'City', value: account.city },
                  { label: 'Website', value: account.website, link: true },
                  { label: 'LinkedIn', value: account.linkedin_url, link: true, label2: 'View Profile' },
                  { label: 'Added On', value: formatDate(account.created_at) },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} className="flex justify-between items-start gap-4">
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">{item.label}</dt>
                    <dd className="text-sm text-slate-800 text-right">
                      {item.link
                        ? <a href={item.value} target="_blank" rel="noreferrer" className="text-red-600 hover:underline">{item.label2 || item.value}</a>
                        : item.value
                      }
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Recent deals mini-list */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Recent Deals</h3>
              {deals.length === 0 ? (
                <p className="text-slate-400 text-sm py-4 text-center">No deals yet</p>
              ) : (
                <div className="space-y-2">
                  {deals.slice(0, 5).map(deal => (
                    <Link key={deal.id} href={`/deals/${deal.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-red-50 transition-colors group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-red-700">{deal.name}</p>
                        <p className="text-xs text-slate-400">{formatCurrency(deal.expected_mrr)}</p>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ml-2"
                        style={{ background: STAGE_COLORS[deal.stage as DealStage] + '20', color: STAGE_COLORS[deal.stage as DealStage] }}
                      >
                        {deal.stage}
                      </span>
                    </Link>
                  ))}
                  {deals.length > 5 && (
                    <button onClick={() => setActiveTab('deals')} className="text-xs text-red-600 hover:underline w-full text-center pt-1">
                      View all {deals.length} deals →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="pb-8">
            <div className="flex justify-end mb-4">
              <button onClick={() => { setEditContact(null); setShowAddContact(true) }} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Contact
              </button>
            </div>
            {contacts.length === 0 ? (
              <div className="card p-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No contacts yet</p>
                <p className="text-slate-400 text-sm mt-1">Add contacts associated with this account</p>
                <button onClick={() => setShowAddContact(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add First Contact
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map(contact => (
                  <div key={contact.id} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-red-700">{contact.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{contact.name}</p>
                          {contact.designation && <p className="text-xs text-slate-500">{contact.designation}</p>}
                          <span className={`badge mt-1 text-xs capitalize ${getRoleColor(contact.role)}`}>{contact.role}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditContact(contact); setShowAddContact(true) }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteContact(contact.id)} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-red-600">
                          <Mail className="w-3.5 h-3.5 shrink-0" />{contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-xs text-slate-600 hover:text-red-600">
                          <Phone className="w-3.5 h-3.5 shrink-0" />{contact.phone}
                        </a>
                      )}
                      {contact.linkedin_url && (
                        <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                          <Linkedin className="w-3.5 h-3.5 shrink-0" />LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === 'deals' && (
          <div className="pb-8">
            <div className="flex justify-end mb-4">
              <Link href="/deals" className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Deal
              </Link>
            </div>
            {deals.length === 0 ? (
              <div className="card p-12 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No deals yet for this account</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Deal', 'MRR', 'Stage', 'Owner', 'Close Date', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {deals.map(deal => (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{deal.name}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{formatCurrency(deal.expected_mrr)}</td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={{ background: STAGE_COLORS[deal.stage as DealStage] + '20', color: STAGE_COLORS[deal.stage as DealStage] }}>
                            {deal.stage}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{deal.owner?.full_name || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-500">{deal.close_date ? formatDate(deal.close_date) : '—'}</td>
                        <td className="px-5 py-3.5">
                          <Link href={`/deals/${deal.id}`} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 inline-block">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showEditAccount && (
        <AccountModal account={account} onClose={() => setShowEditAccount(false)} onSave={() => { setShowEditAccount(false); fetchAll() }} />
      )}
      {showAddContact && (
        <ContactModal
          contact={editContact}
          defaultAccountId={id}
          onClose={() => { setShowAddContact(false); setEditContact(null) }}
          onSave={() => { setShowAddContact(false); setEditContact(null); fetchAll() }}
        />
      )}
    </div>
  )
}
