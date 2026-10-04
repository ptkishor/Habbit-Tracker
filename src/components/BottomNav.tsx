import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, BarChart3, Sparkles, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',          icon: CalendarDays, label: 'Today',    end: true },
  { to: '/analytics', icon: BarChart3,    label: 'Analytics', end: false },
  { to: '/coach',     icon: Sparkles,     label: 'AI Coach',  end: false },
  { to: '/settings',  icon: Settings,     label: 'Settings',  end: false },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center p-3 pointer-events-none"
      style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}
      aria-label="Mobile navigation"
    >
      {/* Floating pill container */}
      <div className="pointer-events-auto flex items-center justify-around gap-1 px-3 py-1.5 rounded-full bg-[#0d101a]/90 backdrop-blur-2xl border border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] w-full max-w-[360px]">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[56px] min-h-[48px] rounded-full transition-all group"
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/30 shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon
                size={19}
                strokeWidth={1.85}
                className={`relative z-10 transition-colors ${
                  isActive ? 'text-[#38bdf8] scale-105' : 'text-slate-400 group-hover:text-white'
                }`}
              />
              <span
                className={`relative z-10 text-[11px] font-medium tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-white'
                }`}
              >
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
