'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { Deal, PIPELINE_STAGES, DealStage, STAGE_COLORS } from '@/types'
import { formatCurrency, getStageColor } from '@/lib/utils'
import DealModal from '@/components/forms/DealModal'
import { Plus, GripVertical, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [dragDeal, setDragDeal] = useState<Deal | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [mrrMin, setMrrMin] = useState('')
  const [mrrMax, setMrrMax] = useState('')
  const [closeDateFrom, setCloseDateFrom] = useState('')
  const [closeDateTo, setCloseDateTo] = useState('')
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])

  const supabase = createClient()

  const fetchDeals = useCallback(async () => {
    let query = supabase
      .from('deals')
      .select(`*, owner:users!deals_owner_id_fkey(id,full_name), contact:contacts(id,name), account:accounts(id,name)`)
      .order('created_at', { ascending: false })

    if (ownerFilter) query = query.eq('owner_id', ownerFilter)
    if (mrrMin) query = query.gte('expected_mrr', Number(mrrMin))
    if (mrrMax) query = query.lte('expected_mrr', Number(mrrMax))
    if (closeDateFrom) query = query.gte('close_date', closeDateFrom)
    if (closeDateTo) query = query.lte('close_date', closeDateTo)

    const { data } = await query
    setDeals(data || [])
    setLoading(false)
  }, [supabase, ownerFilter, mrrMin, mrrMax, closeDateFrom, closeDateTo])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  useEffect(() => {
    supabase.from('users').select('id, full_name').then(({ data }) => setUsers(data || []))
  }, [supabase])

  const activeFilterCount = [ownerFilter, mrrMin, mrrMax, closeDateFrom, closeDateTo, search].filter(Boolean).length

  const filteredDeals = deals.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.account?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.contact?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const dealsByStage = (stage: DealStage) => filteredDeals.filter(d => d.stage === stage)
  const stageTotal = (stage: DealStage) => dealsByStage(stage).reduce((s, d) => s + (d.expected_mrr || 0), 0)

  async function handleDrop(stage: DealStage) {
    if (!dragDeal || dragDeal.stage === stage) { setDragDeal(null); setDragOverStage(null); return }
    const { error } = await supabase.from('deals').update({ stage }).eq('id', dragDeal.id)
    if (error) toast.error('Failed to move deal')
    else {
      setDeals(prev => prev.map(d => d.id === dragDeal.id ? { ...d, stage } : d))
      toast.success(`Moved to ${stage}`)
    }
    setDragDeal(null)
    setDragOverStage(null)
  }

  function clearFilters() {
    setSearch('')
    setOwnerFilter('')
    setMrrMin('')
    setMrrMax('')
    setCloseDateFrom('')
    setCloseDateTo('')
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="Pipeline"
        subtitle="Drag and drop deals between stages"
        actions={
          <button onClick={() => { setEditDeal(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Deal
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-white space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 text-sm w-full"
              placeholder="Search deals, accounts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400 font-medium">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} shown
          </span>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pb-2 animate-in slide-in-from-top-1 duration-150">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</label>
              <select
                className="input w-44 text-sm"
                value={ownerFilter}
                onChange={e => setOwnerFilter(e.target.value)}
              >
                <option value="">All Owners</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Min MRR (₹)</label>
              <input
                type="number"
                className="input w-36 text-sm"
                placeholder="e.g. 50000"
                value={mrrMin}
                onChange={e => setMrrMin(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Max MRR (₹)</label>
              <input
                type="number"
                className="input w-36 text-sm"
                placeholder="e.g. 500000"
                value={mrrMax}
                onChange={e => setMrrMax(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Close Date From</label>
              <input
                type="date"
                className="input w-40 text-sm"
                value={closeDateFrom}
                onChange={e => setCloseDateFrom(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Close Date To</label>
              <input
                type="date"
                className="input w-40 text-sm"
                value={closeDateTo}
                onChange={e => setCloseDateTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-x-auto kanban-scroll p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${PIPELINE_STAGES.length * 280}px` }}>
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = dealsByStage(stage)
            const color = STAGE_COLORS[stage]
            const isOver = dragOverStage === stage

            return (
              <div
                key={stage}
                className="flex flex-col w-[272px] shrink-0"
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage) }}
                onDrop={() => handleDrop(stage)}
                onDragLeave={() => setDragOverStage(null)}
              >
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-bold text-slate-700">{stage}</span>
                      <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 ml-4.5 pl-4">{formatCurrency(stageTotal(stage))}</p>
                </div>

                <div
                  className={`flex-1 col-scroll overflow-y-auto rounded-xl p-2 space-y-2.5 transition-all min-h-[100px] ${
                    isOver
                      ? 'bg-indigo-50 border-2 border-dashed border-indigo-300'
                      : 'bg-slate-100/70 border-2 border-transparent'
                  }`}
                >
                  {loading ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
                  ) : stageDeals.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      {isOver ? '📥 Drop here' : 'No deals'}
                    </div>
                  ) : stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => setDragDeal(deal)}
                      onDragEnd={() => { setDragDeal(null); setDragOverStage(null) }}
                      onClick={() => { setEditDeal(deal); setShowModal(true) }}
                      className={`bg-white rounded-lg border border-slate-200 p-3.5 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${
                        dragDeal?.id === deal.id ? 'opacity-40 rotate-2' : 'hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{deal.name}</p>
                          {deal.account && (
                            <p className="text-xs text-slate-500 truncate mt-0.5">{deal.account.name}</p>
                          )}
                          <div className="flex items-center justify-between mt-2.5">
                            <span className="text-sm font-bold text-indigo-600">
                              {formatCurrency(deal.expected_mrr)}
                            </span>
                            {deal.owner && (
                              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-indigo-700">
                                  {deal.owner.full_name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          {deal.close_date && (
                            <p className="text-xs text-slate-400 mt-1.5">
                              Close: {new Date(deal.close_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showModal && (
        <DealModal
          deal={editDeal}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchDeals() }}
        />
      )}
    </div>
  )
}
