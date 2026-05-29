'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { formatCurrency } from '@/lib/utils'
import { STAGE_COLORS, DealStage } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']

export default function ReportsPage() {
  const [deals, setDeals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m')
  const supabase = createClient()

  useEffect(() => {
    async function fetchAll() {
      const [{ data: d }, { data: u }] = await Promise.all([
        supabase.from('deals').select('*, owner:users!deals_owner_id_fkey(id,full_name)').order('created_at'),
        supabase.from('users').select('id, full_name'),
      ])
      setDeals(d || [])
      setUsers(u || [])
      setLoading(false)
    }
    fetchAll()
  }, [supabase])

  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12

  const trendData = Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const monthDeals = deals.filter(deal => {
      const cd = new Date(deal.created_at)
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
    })
    const wonDeals = monthDeals.filter(deal => deal.stage === 'Won')
    return {
      month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      created: monthDeals.length,
      won: wonDeals.length,
      mrr: wonDeals.reduce((s, deal) => s + (deal.expected_mrr || 0), 0),
    }
  })

  const stages: DealStage[] = ['MQL', 'Demo/Discovery', 'SQL', 'Commercial', 'POC/Pilot']
  const funnelData = stages.map(stage => ({
    stage, count: deals.filter(d => d.stage === stage).length,
    mrr: deals.filter(d => d.stage === stage).reduce((s, d) => s + (d.expected_mrr || 0), 0),
    color: STAGE_COLORS[stage],
  }))

  const won = deals.filter(d => d.stage === 'Won')
  const lost = deals.filter(d => d.stage === 'Lost')
  const total = deals.length
  const winRate = total > 0 ? Math.round((won.length / total) * 100) : 0

  const sourceMap: Record<string, { count: number; mrr: number }> = {}
  deals.forEach(d => {
    const s = d.lead_source || 'Unknown'
    if (!sourceMap[s]) sourceMap[s] = { count: 0, mrr: 0 }
    sourceMap[s].count++
    sourceMap[s].mrr += d.expected_mrr || 0
  })
  const sourceData = Object.entries(sourceMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.mrr - a.mrr)

  const repData = users.map(user => {
    const userDeals = deals.filter(d => d.owner?.id === user.id)
    const userWon = userDeals.filter(d => d.stage === 'Won')
    return {
      fullName: user.full_name,
      deals: userDeals.length,
      won: userWon.length,
      pipeline: userDeals.reduce((s, d) => s + (d.expected_mrr || 0), 0),
      wonMrr: userWon.reduce((s, d) => s + (d.expected_mrr || 0), 0),
      winRate: userDeals.length > 0 ? Math.round((userWon.length / userDeals.length) * 100) : 0,
    }
  }).filter(r => r.deals > 0).sort((a, b) => b.wonMrr - a.wonMrr)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-bold text-slate-700 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {['Won MRR', 'Pipeline', 'MRR'].includes(p.name) ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-slate-400 animate-pulse">Loading reports...</div></div>

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales analytics and performance insights"
        actions={
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['3m', '6m', '12m'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${period === p ? 'bg-white shadow text-red-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {p === '3m' ? '3 Mo' : p === '6m' ? '6 Mo' : '12 Mo'}
              </button>
            ))}
          </div>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Pipeline', value: formatCurrency(deals.reduce((s, d) => s + (d.expected_mrr || 0), 0)), sub: `${total} deals` },
            { label: 'Won MRR', value: formatCurrency(won.reduce((s, d) => s + (d.expected_mrr || 0), 0)), sub: `${won.length} closed` },
            { label: 'Win Rate', value: `${winRate}%`, sub: `${won.length} won / ${lost.length} lost` },
            { label: 'Avg Deal Size', value: formatCurrency(won.length > 0 ? won.reduce((s, d) => s + (d.expected_mrr || 0), 0) / won.length : 0), sub: 'Won deals only' },
          ].map(kpi => (
            <div key={kpi.label} className="card p-5 bg-red-50 border-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Monthly Activity (Last {months} months)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Line yAxisId="left" type="monotone" dataKey="created" name="New Deals" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
              <Line yAxisId="left" type="monotone" dataKey="won" name="Won" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} />
              <Line yAxisId="right" type="monotone" dataKey="mrr" name="Won MRR" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Active Pipeline by Stage</h3>
            <div className="space-y-3">
              {funnelData.map(s => (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{s.stage}</span>
                    <span className="text-slate-500">{s.count} · {formatCurrency(s.mrr)}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${funnelData[0].count > 0 ? (s.count / funnelData[0].count) * 100 : 0}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Deals by Lead Source</h3>
            {sourceData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No lead source data yet</div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="count">
                      {sourceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sourceData.slice(0, 6).map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-slate-600 flex-1 truncate">{item.name}</span>
                      <span className="text-xs font-bold text-slate-700">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Rep Leaderboard</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['#', 'Rep', 'Deals', 'Won', 'Win Rate', 'Pipeline MRR', 'Won MRR'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {repData.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No data yet</td></tr>
              ) : repData.map((rep, i) => (
                <tr key={rep.fullName} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>{i+1}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-red-700">{rep.fullName.charAt(0)}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{rep.fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{rep.deals}</td>
                  <td className="px-5 py-3.5 text-green-600 font-semibold">{rep.won}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-16">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${rep.winRate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{rep.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{formatCurrency(rep.pipeline)}</td>
                  <td className="px-5 py-3.5 font-bold text-green-600">{formatCurrency(rep.wonMrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
