'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import AccountModal from '@/components/forms/AccountModal'
import BulkUploadModal from '@/components/forms/BulkUploadModal'
import { Account, INDUSTRIES } from '@/types'
import { Plus, Search, Upload, Pencil, Trash2, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const supabase = createClient()

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('accounts').select('*').order('name')
    if (industryFilter) query = query.eq('industry', industryFilter)
    const { data } = await query
    setAccounts(data || [])
    setLoading(false)
  }, [supabase, industryFilter])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.city?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Account deleted'); fetchAccounts() }
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${accounts.length} accounts`}
        actions={
          <>
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
            <button onClick={() => { setIndustryFilter(''); setSearch('') }} className="text-sm text-indigo-600 font-medium">Clear</button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-400">No accounts found</div>
          ) : filtered.map(account => (
            <div key={account.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{account.name}</p>
                    <p className="text-xs text-slate-500">{account.city}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditAccount(account); setShowModal(true) }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(account.id)} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {account.industry && (
                <div className="mt-3">
                  <span className="badge bg-slate-100 text-slate-600 text-xs">{account.industry}</span>
                </div>
              )}
            </div>
          ))}
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
