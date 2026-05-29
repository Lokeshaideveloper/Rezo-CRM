'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Deal } from '@/types'
import { X, Loader2, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  deal: Deal
  onClose: () => void
  onSave: () => void
}

export default function TaskModal({ deal, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
  })
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState<{ id: string; title: string; completed: boolean; due_date: string }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('users').select('id, full_name, email').order('full_name').then(({ data }) => setUsers(data || []))
    supabase.from('tasks').select('id, title, completed, due_date').eq('deal_id', deal.id).order('created_at', { ascending: false }).then(({ data }) => setTasks(data || []))
  }, [supabase, deal.id])

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.assigned_to || !form.due_date) return toast.error('Title, assignee and due date are required')
    setLoading(true)

    const { data: session } = await supabase.auth.getSession()
    const { error } = await supabase.from('tasks').insert({
      deal_id: deal.id,
      title: form.title,
      description: form.description,
      due_date: form.due_date,
      assigned_to: form.assigned_to,
      created_by: session.session!.user.id,
      completed: false,
    })

    if (error) {
      toast.error(error.message)
    } else {
      // Trigger email notification via API route
      await fetch('/api/tasks/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, deal_id: deal.id, deal_name: deal.name }),
      })
      toast.success('Task created & notification sent')
      setForm({ title: '', description: '', due_date: '', assigned_to: '' })
      // Refresh task list
      const { data } = await supabase.from('tasks').select('id, title, completed, due_date').eq('deal_id', deal.id).order('created_at', { ascending: false })
      setTasks(data || [])
      onSave()
    }
    setLoading(false)
  }

  async function toggleTask(id: string, completed: boolean) {
    await supabase.from('tasks').update({ completed: !completed }).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">{deal.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing tasks */}
          {tasks.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Existing Tasks</h3>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <button onClick={() => toggleTask(task.id, task.completed)} className="mt-0.5 shrink-0">
                      <CheckSquare className={`w-4 h-4 ${task.completed ? 'text-green-500' : 'text-slate-300'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Due {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New task form */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Add New Task</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Title *</label>
                <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Follow up on proposal" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none h-20" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional details..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Due Date *</label>
                  <input className="input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
                </div>
                <div>
                  <label className="label">Assign To *</label>
                  <select className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">Select user</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={onClose} className="btn-secondary">Close</button>
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
