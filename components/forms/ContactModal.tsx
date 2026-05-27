'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/types'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['influencer', 'kdm', 'blocker', 'champion']

interface Props { contact: Contact | null; onClose: () => void; onSave: () => void }

export default function ContactModal({ contact, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    designation: contact?.designation || '',
    role: contact?.role || 'influencer',
    account_id: contact?.account_id || '',
  })
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => setAccounts(data || []))
  }, [supabase])

  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) return toast.error('Name and email are required')
    setLoading(true)
    const payload = { ...form, account_id: form.account_id || null }
    const { error } = contact
      ? await supabase.from('contacts').update(payload).eq('id', contact.id)
      : await supabase.from('contacts').insert(payload)
    if (error) toast.error(error.message)
    else { toast.success(contact ? 'Contact updated' : 'Contact created'); onSave() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">{contact ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Priya Sharma" required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="priya@company.com" required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className="label">Designation</label>
            <input className="input" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="CTO" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Account</label>
              <select className="input" value={form.account_id} onChange={e => set('account_id', e.target.value)}>
                <option value="">No account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {contact ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
