import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, BarChart3, Sparkles, Settings, Flame, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import { useTheme } from '../context/ThemeContext'

const NAV_ITEMS = [
  { to: '/',          icon: CalendarDays, label: 'Today',    end: true },
  { to: '/analytics', icon: BarChart3,    label: 'Analytics', end: false },
  { to: '/coach',     icon: Sparkles,     label: 'AI Coach',  end: false },
  { to: '/settings',  icon: Settings,     label: 'Settings',  end: false },
]

export default function Sidebar() {
  const { user } = useAuth()
  const { streaks } = useAnalytics()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  return (
    <aside
      className="hidden lg:flex flex-col w-[260px] min-w-[260px] h-[100dvh] sticky top-0 p-4 z-40 select-none"
      aria-label="Main navigation"
    >
      <div className="arc-card flex-1 flex flex-col p-4 bg-[#0d101a] border border-white/[0.08] rounded-2xl overflow-hidden justify-between">

        {/* ── Brand Header ── */}
        <div>
          <div className="flex items-center justify-between pb-5 mb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#38bdf8] to-[#6366f1] flex items-center justify-center text-lg shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                ❄️
              </div>
              <div>
                <div className="font-heading font-bold text-[17px] tracking-tight text-white leading-tight">
                  Winter Arc
                </div>
                <div className="text-[12px] font-medium text-slate-400">90-Day Challenge</div>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1" aria-label="Pages">
            {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => {
              const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[14px] transition-all ${
                    isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavHighlight"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border border-sky-400/25"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className={`relative z-10 transition-colors ${isActive ? 'text-[#38bdf8]' : 'text-slate-400'}`}
                  />
                  <span className="relative z-10">{label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* ── User & Streak Footer ── */}
        <div className="pt-4 border-t border-white/[0.08]">
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366f1] to-[#38bdf8] flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase() ?? 'W'}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">
                  {user?.email?.split('@')[0] ?? 'Arc Warrior'}
                </div>
                <div className="text-[11px] text-slate-400">Day by day</div>
              </div>
            </div>

            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 flex-shrink-0"
              title={`${streaks.current} Day Streak`}
            >
              <Flame size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-heading font-bold text-xs">{streaks.current}d</span>
            </div>
          </div>
        </div>

      </div>
    </aside>
  )
}
