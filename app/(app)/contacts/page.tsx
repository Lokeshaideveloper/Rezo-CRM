'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import ContactModal from '@/components/forms/ContactModal'
import BulkUploadModal from '@/components/forms/BulkUploadModal'
import { Contact } from '@/types'
import { getRoleColor } from '@/lib/utils'
import { Plus, Search, Upload, Pencil, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'

const CONTACT_ROLES = ['influencer', 'kdm', 'blocker', 'champion']

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const supabase = createClient()

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('contacts').select('*, account:accounts(id,name)').order('name')
    if (roleFilter) query = query.eq('role', roleFilter)
    const { data } = await query
    setContacts(data || [])
    setLoading(false)
  }, [supabase, roleFilter])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.account?.name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Contact deleted'); fetchContacts() }
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} contacts`}
        actions={
          <>
            <button onClick={() => setShowUpload(true)} className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
            <button onClick={() => { setEditContact(null); setShowModal(true) }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Contact
            </button>
          </>
        }
      />

      <div className="p-8 space-y-5">
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {CONTACT_ROLES.map(r => <option key={r} value={r} className="capitalize">{r.toUpperCase()}</option>)}
          </select>
          {(roleFilter || search) && (
            <button onClick={() => { setRoleFilter(''); setSearch('') }} className="text-sm text-indigo-600 font-medium">Clear</button>
          )}
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Contact', 'Account', 'Email', 'Phone', 'Designation', 'Role', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No contacts found</td></tr>
              ) : filtered.map(contact => (
                <tr key={contact.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-purple-700">{contact.name.charAt(0)}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{contact.account?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{contact.email}</td>
                  <td className="px-5 py-3.5 text-slate-600">{contact.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{contact.designation || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`badge capitalize ${getRoleColor(contact.role)}`}>{contact.role}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditContact(contact); setShowModal(true) }} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(contact.id)} className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600">
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

      {showModal && (
        <ContactModal contact={editContact} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchContacts() }} />
      )}
      {showUpload && (
        <BulkUploadModal entity="contacts" onClose={() => setShowUpload(false)} onSave={() => { setShowUpload(false); fetchContacts() }} />
      )}
    </div>
  )
}
