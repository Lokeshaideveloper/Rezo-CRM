'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { STAGE_COLORS, DealStage } from '@/types'
import { formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'pipeline' | 'trends'>('overview')

  const supabase = createClient()

  useEffect(() => {
    async function fetchAll() {
      const { data: { user: session } } = await supabase.auth.getUser()
      if (!session) return

      const [
        { data: dealsData },
        { data: accountsData },
        { data: contactsData },
        { data: tasksData },
        { data: userData },
      ] = await Promise.all([
        supabase.from('deals').select('*').order('created_at', { ascending: true }),
        supabase.from('accounts').select('id, industry'),
        supabase.from('contacts').select('id'),
        supabase.from('tasks').select('*').eq('completed', false),
        supabase.from('users').select('*').eq('id', session.id).single(),
      ])

      setDeals(dealsData || [])
      setAccounts(accountsData || [])
      setContacts(contactsData || [])
      setTasks(tasksData || [])
      setCurrentUser(userData)
      setLoading(false)
    }
    fetchAll()
  }, [supabase])

  const totalMRR = deals.reduce((sum, d) => sum + (d.expected_mrr || 0), 0)
  const wonMRR = deals.filter(d => d.stage === 'Won').reduce((sum, d) => sum + (d.expected_mrr || 0), 0)
  const openDeals = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length
  const myTasks = tasks.filter(t => t.assigned_to === currentUser?.id) || []

  const stages: DealStage[] = ['MQL', 'Demo/Discovery', 'SQL', 'Commercial', 'POC/Pilot', 'Won', 'Lost', 'On Hold']

  // Stage bar chart data
  const stageChartData = stages.map(stage => ({
    stage: stage === 'Demo/Discovery' ? 'Demo' : stage === 'POC/Pilot' ? 'POC' : stage,
    fullStage: stage,
    count: deals.filter(d => d.stage === stage).length,
    mrr: deals.filter(d => d.stage === stage).reduce((s, d) => s + (d.expected_mrr || 0), 0),
    color: STAGE_COLORS[stage],
  })).filter(d => d.count > 0)

  // Industry breakdown for pie
  const industryMap: Record<string, number> = {}
  accounts.forEach(a => {
    const ind = a.industry || 'Other'
    industryMap[ind] = (industryMap[ind] || 0) + 1
  })
  const industryData = Object.entries(industryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#94a3b8']

  // Monthly trend (last 6 months)
  const trendData: { month: string; deals: number; mrr: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const monthStr = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
    const monthDeals = deals.filter(deal => {
      const cd = new Date(deal.created_at)
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
    })
    trendData.push({
      month: monthStr,
      deals: monthDeals.length,
      mrr: monthDeals.reduce((s, deal) => s + (deal.expected_mrr || 0), 0),
    })
  }

  const stats = [
    { label: 'Pipeline MRR', value: formatCurrency(totalMRR), sub: 'Total expected', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Won MRR', value: formatCurrency(wonMRR), sub: 'Closed won', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Open Deals', value: openDeals, sub: 'In pipeline', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Accounts', value: accounts.length, sub: 'Total accounts', color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Contacts', value: contacts.length, sub: 'Total contacts', color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'My Tasks', value: myTasks.length, sub: 'Pending', color: 'text-red-600', bg: 'bg-red-50' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
          <p className="font-bold text-slate-700 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-medium">
              {p.name}: {p.name === 'MRR' ? formatCurrency(p.value) : p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Good ${getGreeting()}, ${currentUser?.full_name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here's what's happening in your pipeline"
      />

      <div className="p-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className={`card p-5 ${stat.bg} border-0`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Chart Tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['overview', 'pipeline', 'trends'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3.5 text-sm font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-red-700 border-b-2 border-red-600 bg-red-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab === 'overview' ? '📊 Overview' : tab === 'pipeline' ? '🏆 Pipeline' : '📈 Trends'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-8">
                {/* Stage bar chart */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Deals by Stage</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stageChartData} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                        {stageChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Industry Pie */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Accounts by Industry</h3>
                  {industryData.length === 0 ? (
                    <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">No data yet</div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={200}>
                        <PieChart>
                          <Pie
                            data={industryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {industryData.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 flex-1">
                        {industryData.map((item, i) => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-xs text-slate-600 flex-1 truncate">{item.name}</span>
                            <span className="text-xs font-bold text-slate-700">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'pipeline' && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4">MRR by Stage</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stageChartData} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="mrr" name="MRR" radius={[4, 4, 0, 0]}>
                      {stageChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-6 grid grid-cols-4 gap-3">
                  {stageChartData.map(s => (
                    <div key={s.fullStage} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-xs text-slate-500 font-medium truncate">{s.fullStage}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(s.mrr)}</p>
                      <p className="text-xs text-slate-400">{s.count} deal{s.count !== 1 ? 's' : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'trends' && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4">Monthly Activity (Last 6 Months)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="deals" name="New Deals" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
                    <Line yAxisId="right" type="monotone" dataKey="mrr" name="MRR" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* My Tasks */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">My Open Tasks</h2>
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-lg">✓</span>
                </div>
                <p className="text-sm text-slate-500">No open tasks. You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {myTasks.slice(0, 8).map((task: any) => {
                  const overdue = new Date(task.due_date) < new Date()
                  return (
                    <div key={task.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${overdue ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                        <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                          {overdue ? 'Overdue · ' : 'Due '}{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Deals */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Recent Deals</h2>
            <div className="space-y-2">
              {deals.slice(-5).reverse().map((deal: any) => (
                <div key={deal.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{deal.name}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(deal.expected_mrr)}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: STAGE_COLORS[deal.stage as DealStage] + '20',
                      color: STAGE_COLORS[deal.stage as DealStage]
                    }}
                  >
                    {deal.stage}
                  </span>
                </div>
              ))}
              {deals.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">No deals yet. Start by creating one!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
