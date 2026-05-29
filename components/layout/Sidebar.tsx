'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Briefcase, Building2, Users,
  Kanban, LogOut, Zap, ChevronRight, FileText,
  BarChart3, Settings
} from 'lucide-react'
import { cn, getUserRoleBadge } from '@/lib/utils'
import { User } from '@/types'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/deals', label: 'Deals', icon: Briefcase },
  { href: '/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/snippets', label: 'Snippets', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-60 bg-zinc-950 flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight">Rezo</span>
            <span className="block text-zinc-500 text-xs">CRM</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-red-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800">
        {user && (
          <div className="mb-3 px-3 py-2.5 bg-zinc-900 rounded-lg">
            <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-zinc-500 text-xs truncate">{user.email}</p>
            <span className={cn('badge mt-1.5 text-xs capitalize', getUserRoleBadge(user.role))}>
              {user.role.replace('_', ' ')}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-zinc-400 hover:text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
