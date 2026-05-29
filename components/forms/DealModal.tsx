'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Deal, PIPELINE_STAGES, LEAD_SOURCES } from '@/types'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { deal: Deal | null; onClose: () => void; onSave: () => void }

export default function DealModal({ deal, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: deal?.name || '',
    expected_mrr: deal?.expected_mrr?.toString() || '',
    close_date: deal?.close_date?.split('T')[0] || '',
    stage: deal?.stage || 'MQL',
    probability: deal?.probability?.toString() || '',
    lead_source: deal?.lead_source || '',
    description: deal?.description || '',
    owner_id: deal?.owner_id || '',
    contact_id: deal?.contact_id || '',
    account_id: deal?.account_id || '',
  })
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([])
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('id, full_name').order('full_name'),
      supabase.from('contacts').select('id, name').order('name'),
      supabase.from('accounts').select('id, name').order('name'),
    ]).then(([u, c, a]) => {
      setUsers(u.data || [])
      setContacts(c.data || [])
      setAccounts(a.data || [])
    })
  }, [supabase])

  // Auto-set probability based on stage
  function handleStageChange(stage: string) {
    const defaults: Record<string, number> = {
      'MQL': 10, 'Demo/Discovery': 25, 'SQL': 40, 'Commercial': 60,
      'POC/Pilot': 75, 'Won': 100, 'Lost': 0, 'On Hold': 20,
    }
    setForm(f => ({ ...f, stage: stage as DealStage, probability: defaults[stage]?.toString() || f.probability }))
  }

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.owner_id) return toast.error('Name and owner are required')
    setLoading(true)
    const payload = {
      name: form.name,
      expected_mrr: parseFloat(form.expected_mrr) || 0,
      close_date: form.close_date || null,
      stage: form.stage,
      probability: form.probability ? parseInt(form.probability) : null,
      lead_source: form.lead_source || null,
      description: form.description || null,
      owner_id: form.owner_id,
      contact_id: form.contact_id || null,
      account_id: form.account_id || null,
    }
    const { error } = deal
      ? await supabase.from('deals').update(payload).eq('id', deal.id)
      : await supabase.from('deals').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success(deal ? 'Deal updated' : 'Deal created'); onSave() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{deal ? 'Edit Deal' : 'New Deal'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Deal Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enterprise deal with Acme" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Expected MRR (₹)</label>
              <input className="input" type="number" value={form.expected_mrr} onChange={e => set('expected_mrr', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Close Date</label>
              <input className="input" type="date" value={form.close_date} onChange={e => set('close_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Stage</label>
              <select className="input" value={form.stage} onChange={e => handleStageChange(e.target.value)}>
                {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Probability (%)</label>
              <input className="input" type="number" min="0" max="100" value={form.probability} onChange={e => set('probability', e.target.value)} placeholder="Auto from stage" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Lead Source</label>
              <select className="input" value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
                <option value="">Select source</option>
                {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Owner *</label>
              <select className="input" value={form.owner_id} onChange={e => set('owner_id', e.target.value)} required>
                <option value="">Select owner</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Account</label>
              <select className="input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Primary Contact</label>
              <select className="input" value={form.contact_id} onChange={e => set('contact_id', e.target.value)}>
                <option value="">Select contact</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Deal notes, context, key requirements..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {deal ? 'Update' : 'Create'} Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
