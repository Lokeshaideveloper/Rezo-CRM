'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2, Zap } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [fullName, setFullName] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        if (error) throw error
        setResetSent(true)
        toast.success('Reset link sent! Check your inbox.')
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } }
        })
        if (error) throw error
        if (data.user && !data.session) {
          toast.success('Check your email to confirm your account!')
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-xl">Rezo</span>
            <span className="text-zinc-500 text-xl"> CRM</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-slate-900 mb-1">
            {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset password'}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'login' ? 'Welcome back!' : mode === 'signup' ? 'Get started with Rezo CRM' : 'Enter your email to receive a reset link'}
          </p>

          {resetSent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-800 font-semibold text-sm">Reset link sent!</p>
              <p className="text-green-600 text-xs mt-1">Check your inbox and click the link to reset your password.</p>
              <button onClick={() => { setMode('login'); setResetSent(false) }} className="text-red-600 text-sm font-medium mt-3 hover:underline">
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" required />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('forgot')} className="text-xs text-red-600 hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!resetSent && (
            <div className="mt-5 text-center text-sm text-slate-500">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => setMode('signup')} className="text-red-600 font-semibold hover:underline">Sign up</button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => setMode('login')} className="text-red-600 font-semibold hover:underline">Sign in</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
