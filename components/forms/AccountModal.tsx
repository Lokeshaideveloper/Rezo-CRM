'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account, INDUSTRIES } from '@/types'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { account: Account | null; onClose: () => void; onSave: () => void }

export default function AccountModal({ account, onClose, onSave }: Props) {
  const [form, setForm] = useState({ name: account?.name || '', industry: account?.industry || '', city: account?.city || '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) return toast.error('Account name is required')
    setLoading(true)
    const { error } = account
      ? await supabase.from('accounts').update(form).eq('id', account.id)
      : await supabase.from('accounts').insert(form)
    if (error) toast.error(error.message)
    else { toast.success(account ? 'Account updated' : 'Account created'); onSave() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{account ? 'Edit Account' : 'New Account'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Account Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" required />
          </div>
          <div>
            <label className="label">Industry</label>
            <select className="input" value={form.industry} onChange={e => set('industry', e.target.value)}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {account ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
