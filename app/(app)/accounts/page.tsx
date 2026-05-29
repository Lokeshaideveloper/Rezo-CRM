'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AccountModal from '@/components/forms/AccountModal'
import BulkUploadModal from '@/components/forms/BulkUploadModal'
import { Account, INDUSTRIES } from '@/types'
import { Plus, Search, Upload, Pencil, Trash2, Building2, Globe, Users, Briefcase, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const SIZE_COLORS: Record<string, string> = {
  'Startup': 'bg-emerald-100 text-emerald-700',
  'SMB': 'bg-blue-100 text-blue-700',
  'Mid-Market': 'bg-purple-100 text-purple-700',
  'Enterprise': 'bg-red-100 text-red-700',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const supabase = createClient()

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('accounts')
      .select(`*, contacts:contacts(count), deals:deals(count)`)
      .order('name')
    if (industryFilter) query = query.eq('industry', industryFilter)
    const { data } = await query
    setAccounts(data || [])
    setLoading(false)
  }, [supabase, industryFilter])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.city?.toLowerCase().includes(search.toLowerCase()) ||
    a.industry?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this account?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Account deleted'); fetchAccounts() }
  }

  function handleEdit(e: React.MouseEvent, account: Account) {
    e.preventDefault(); e.stopPropagation()
    setEditAccount(account); setShowModal(true)
  }

  // Export CSV
  function exportCSV() {
    const rows = [['Name', 'Industry', 'Size', 'City', 'Website', 'LinkedIn']]
    filtered.forEach(a => rows.push([a.name, a.industry || '', a.size || '', a.city || '', a.website || '', a.linkedin_url || '']))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'accounts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} accounts`}
        actions={
          <>
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
              Export CSV
            </button>
            <button onClick={() => setShowUpload(true)} className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={() => { setEditAccount(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Account
            </button>
          </>
        }
      />

      <div className="p-8 space-y-5">
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-44" value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}>
            <option value="">All Industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          {(industryFilter || search) && (
            <button onClick={() => { setIndustryFilter(''); setSearch('') }} className="text-sm text-red-600 font-medium">Clear</button>
          )}
        </div>

        {/* Table view */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Account', 'Industry', 'Size', 'City', 'Contacts', 'Deals', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No accounts found</td></tr>
              ) : filtered.map(account => (
                <tr key={account.id} className="hover:bg-red-50/30 transition-colors cursor-pointer group">
                  <td className="px-5 py-3.5">
                    <Link href={`/accounts/${account.id}`} className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-red-700 transition-colors">{account.name}</p>
                        {account.website && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3" />
                            {account.website.replace(/^https?:\/\//, '')}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    {account.industry && <span className="badge bg-slate-100 text-slate-600">{account.industry}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {account.size && <span className={`badge ${SIZE_COLORS[account.size] || 'bg-slate-100 text-slate-600'}`}>{account.size}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{account.city || '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Users className="w-3.5 h-3.5" />
                      <span>{account.contacts?.[0]?.count ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 text-slate-600">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{account.deals?.[0]?.count ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => handleEdit(e, account)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={e => handleDelete(e, account.id)} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <Link href={`/accounts/${account.id}`} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-red-600">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AccountModal account={editAccount} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchAccounts() }} />
      )}
      {showUpload && (
        <BulkUploadModal entity="accounts" onClose={() => setShowUpload(false)} onSave={() => { setShowUpload(false); fetchAccounts() }} />
      )}
    </div>
  )
}
