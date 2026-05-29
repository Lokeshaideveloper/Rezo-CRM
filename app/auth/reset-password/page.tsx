'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2, Zap } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) toast.error(error.message)
    else {
      setDone(true)
      toast.success('Password updated!')
      setTimeout(() => router.push('/dashboard'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">Rezo <span className="text-zinc-500">CRM</span></span>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Set new password</h1>
          <p className="text-sm text-slate-500 mb-6">Choose a strong password for your account</p>
          {done ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-800 font-semibold">Password updated! Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 characters" required />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
