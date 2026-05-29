'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import DealModal from '@/components/forms/DealModal'
import TaskModal from '@/components/forms/TaskModal'
import BulkUploadModal from '@/components/forms/BulkUploadModal'
import { Deal, PIPELINE_STAGES, DealStage, LEAD_SOURCES } from '@/types'
import { formatCurrency, formatDate, getStageColor } from '@/lib/utils'
import { Plus, Search, Upload, CheckSquare, Pencil, Trash2, ExternalLink, AlertTriangle, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

function isStale(deal: Deal): boolean {
  if (['Won', 'Lost', 'On Hold'].includes(deal.stage)) return false
  const updated = new Date(deal.updated_at || deal.created_at)
  const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince > 14
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showDealModal, setShowDealModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [staleOnly, setStaleOnly] = useState(false)
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const supabase = createClient()

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('deals')
      .select('*, owner:users!deals_owner_id_fkey(id,full_name,email), contact:contacts(id,name,email), account:accounts(id,name)')
      .order('created_at', { ascending: false })
    if (stageFilter) query = query.eq('stage', stageFilter)
    if (ownerFilter) query = query.eq('owner_id', ownerFilter)
    if (sourceFilter) query = query.eq('lead_source', sourceFilter)
    const { data, error } = await query
    if (error) toast.error('Failed to load deals')
    else setDeals(data || [])
    setLoading(false)
  }, [supabase, stageFilter, ownerFilter, sourceFilter])

  useEffect(() => { fetchDeals() }, [fetchDeals])
  useEffect(() => {
    supabase.from('users').select('id, full_name').then(({ data }) => setUsers(data || []))
  }, [supabase])

  let filtered = deals.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.account?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.contact?.name?.toLowerCase().includes(search.toLowerCase())
  )
  if (staleOnly) filtered = filtered.filter(isStale)

  const staleCount = deals.filter(isStale).length

  async function handleDelete(id: string) {
    if (!confirm('Delete this deal?')) return
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Deal deleted'); fetchDeals() }
  }

  function exportCSV() {
    const rows = [['Deal', 'Account', 'Contact', 'MRR', 'Stage', 'Probability', 'Lead Source', 'Owner', 'Close Date']]
    filtered.forEach(d => rows.push([
      d.name, d.account?.name || '', d.contact?.name || '',
      d.expected_mrr?.toString() || '0', d.stage,
      d.probability?.toString() || '', d.lead_source || '',
      d.owner?.full_name || '', d.close_date ? formatDate(d.close_date) : ''
    ]))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'deals.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => { setStageFilter(''); setOwnerFilter(''); setSourceFilter(''); setSearch(''); setStaleOnly(false) }
  const hasFilters = stageFilter || ownerFilter || sourceFilter || search || staleOnly

  return (
    <div>
      <PageHeader
        title="Deals"
        subtitle={`${deals.length} deals in pipeline`}
        actions={
          <>
            {staleCount > 0 && (
              <button
                onClick={() => setStaleOnly(s => !s)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${staleOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {staleCount} Stale Deal{staleCount !== 1 ? 's' : ''}
              </button>
            )}
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs">
              <Download className="w-4 h-4" /> Export
            </button>
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
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Search deals, accounts, contacts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-40" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="">All Stages</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input w-40" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="">All Owners</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          <select className="input w-36" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-red-600 font-medium hover:underline">Clear</button>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Deal', 'Account', 'MRR', 'Prob.', 'Source', 'Stage', 'Owner', 'Close Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">No deals found</td></tr>
                ) : filtered.map(deal => {
                  const stale = isStale(deal)
                  return (
                    <tr key={deal.id} className={`transition-colors ${stale ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {stale && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="No activity in 14+ days" />}
                          <Link href={`/deals/${deal.id}`} className="font-semibold text-slate-800 hover:text-red-700 transition-colors">{deal.name}</Link>
                        </div>
                        {deal.contact?.name && <p className="text-xs text-slate-400 mt-0.5 ml-5">{deal.contact.name}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        {deal.account ? (
                          <Link href={`/accounts/${deal.account_id}`} className="text-slate-600 hover:text-red-600 transition-colors">{deal.account.name}</Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{formatCurrency(deal.expected_mrr)}</td>
                      <td className="px-4 py-3.5">
                        {deal.probability != null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-slate-100 rounded-full">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${deal.probability}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 font-medium">{deal.probability}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        {deal.lead_source ? <span className="badge bg-slate-100 text-slate-600 text-xs">{deal.lead_source}</span> : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`badge text-xs ${getStageColor(deal.stage as DealStage)}`}>{deal.stage}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{deal.owner?.full_name || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">{deal.close_date ? formatDate(deal.close_date) : '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-0.5">
                          <Link href={`/deals/${deal.id}`} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button onClick={() => { setSelectedDeal(deal); setShowTaskModal(true) }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setEditDeal(deal); setShowDealModal(true) }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(deal.id)} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDealModal && (
        <DealModal deal={editDeal} onClose={() => setShowDealModal(false)} onSave={() => { setShowDealModal(false); fetchDeals() }} />
      )}
      {showTaskModal && selectedDeal && (
        <TaskModal deal={selectedDeal} onClose={() => setShowTaskModal(false)} onSave={() => setShowTaskModal(false)} />
      )}
      {showUpload && (
        <BulkUploadModal entity="deals" onClose={() => setShowUpload(false)} onSave={() => { setShowUpload(false); fetchDeals() }} />
      )}
    </div>
  )
}
