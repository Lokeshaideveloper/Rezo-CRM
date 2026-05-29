'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import { User, Loader2, Shield, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['super_admin', 'ae', 'sdr']

export default function SettingsPage() {
  const [profile, setProfile] = useState({ full_name: '', email: '', role: '' })
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'team'>('profile')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) setProfile({ full_name: data.full_name, email: data.email, role: data.role })
      const { data: team } = await supabase.from('users').select('*').order('full_name')
      setTeamMembers(team || [])
    }
    load()
  }, [supabase])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile.full_name.trim()) return toast.error('Name is required')
    setLoading(true)
    const { error } = await supabase.from('users').update({ full_name: profile.full_name }).eq('id', currentUserId)
    if (error) toast.error(error.message)
    else toast.success('Profile updated!')
    setLoading(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwords.new || passwords.new.length < 8) return toast.error('Password must be at least 8 characters')
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match')
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.new })
    if (error) toast.error(error.message)
    else { toast.success('Password changed!'); setPasswords({ current: '', new: '', confirm: '' }) }
    setPwLoading(false)
  }

  async function handleRoleChange(userId: string, role: string) {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId)
    if (error) toast.error('Failed to update role')
    else {
      toast.success('Role updated')
      setTeamMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m))
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile and team" />

      <div className="p-8">
        <div className="max-w-3xl">
          <div className="flex border-b border-slate-200 mb-6">
            {([['profile', '👤 My Profile'], ['team', '👥 Team']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'text-red-700 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Personal Info</h3>
                    <p className="text-xs text-slate-500">Update your name and view your role</p>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input bg-slate-50" value={profile.email} disabled />
                    <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <input className="input bg-slate-50 capitalize" value={profile.role.replace('_', ' ')} disabled />
                    <p className="text-xs text-slate-400 mt-1">Contact a super admin to change your role</p>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Change Password</h3>
                    <p className="text-xs text-slate-500">Minimum 8 characters</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="label">New Password</label>
                    <input className="input" type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input className="input" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="••••••••" />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
                      {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <Users className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-slate-800">Team Members ({teamMembers.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Member', 'Email', 'Role', ''].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teamMembers.map(member => (
                    <tr key={member.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-red-700">{member.full_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{member.full_name}</p>
                            {member.id === currentUserId && <span className="text-xs text-red-600 font-medium">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{member.email}</td>
                      <td className="px-5 py-3.5">
                        {profile.role === 'super_admin' && member.id !== currentUserId ? (
                          <select
                            className="input w-36 text-xs py-1"
                            value={member.role}
                            onChange={e => handleRoleChange(member.id, e.target.value)}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                          </select>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600 capitalize text-xs">{member.role.replace('_', ' ')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(member.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
