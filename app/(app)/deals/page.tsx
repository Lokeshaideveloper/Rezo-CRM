'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import DealModal from '@/components/forms/DealModal'
import TaskModal from '@/components/forms/TaskModal'
import BulkUploadModal from '@/components/forms/BulkUploadModal'
import { Deal, PIPELINE_STAGES, DealStage } from '@/types'
import { formatCurrency, formatDate, getStageColor } from '@/lib/utils'
import { Plus, Search, Filter, Upload, CheckSquare, Pencil, Trash2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showDealModal, setShowDealModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [ownerFilter, setOwnerFilter] = useState<string>('')
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const supabase = createClient()

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('deals')
      .select(`*, owner:users!deals_owner_id_fkey(id,full_name,email), contact:contacts(id,name,email), account:accounts(id,name)`)
      .order('created_at', { ascending: false })

    if (stageFilter) query = query.eq('stage', stageFilter)
    if (ownerFilter) query = query.eq('owner_id', ownerFilter)

    const { data, error } = await query
    if (error) toast.error('Failed to load deals')
    else setDeals(data || [])
    setLoading(false)
  }, [supabase, stageFilter, ownerFilter])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  useEffect(() => {
    supabase.from('users').select('id, full_name').then(({ data }) => setUsers(data || []))
  }, [supabase])

  const filtered = deals.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.account?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.contact?.name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this deal?')) return
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deal deleted'); fetchDeals() }
  }

  return (
    <div>
      <PageHeader
        title="Deals"
        subtitle={`${deals.length} deals in pipeline`}
        actions={
          <>
            <button onClick={() => setShowUpload(true)} className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={() => { setEditDeal(null); setShowDealModal(true) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Deal
            </button>
          </>
        }
      />

      <div className="p-8 space-y-5">
        {/* Filters */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search deals, accounts, contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input w-44"
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
          >
            <option value="">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="input w-44"
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
          >
            <option value="">All Owners</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          {(stageFilter || ownerFilter || search) && (
            <button
              onClick={() => { setStageFilter(''); setOwnerFilter(''); setSearch('') }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Deal', 'Account', 'Contact', 'MRR', 'Stage', 'Owner', 'Close Date', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No deals found</td></tr>
                ) : filtered.map(deal => (
                  <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{deal.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{deal.account?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{deal.contact?.name || '—'}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatCurrency(deal.expected_mrr)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${getStageColor(deal.stage as DealStage)}`}>{deal.stage}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{deal.owner?.full_name || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{deal.close_date ? formatDate(deal.close_date) : '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/deals/${deal.id}`}
                          title="View details"
                          className="p-1.5 hover:bg-indigo-50 rounded-md transition-colors text-slate-400 hover:text-indigo-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => { setSelectedDeal(deal); setShowTaskModal(true) }}
                          title="Add Task"
                          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-indigo-600"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditDeal(deal); setShowDealModal(true) }}
                          title="Edit"
                          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-slate-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          title="Delete"
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDealModal && (
        <DealModal
          deal={editDeal}
          onClose={() => setShowDealModal(false)}
          onSave={() => { setShowDealModal(false); fetchDeals() }}
        />
      )}
      {showTaskModal && selectedDeal && (
        <TaskModal
          deal={selectedDeal}
          onClose={() => setShowTaskModal(false)}
          onSave={() => setShowTaskModal(false)}
        />
      )}
      {showUpload && (
        <BulkUploadModal
          entity="deals"
          onClose={() => setShowUpload(false)}
          onSave={() => { setShowUpload(false); fetchDeals() }}
        />
      )}
    </div>
  )
}
