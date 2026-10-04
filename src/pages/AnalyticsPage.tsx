import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from 'recharts'
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAuth } from '../context/AuthContext'
import { useHabits } from '../hooks/useHabits'
import Heatmap from '../components/Heatmap'
import FrostProgressRing from '../components/FrostProgressRing'
import { format, parseISO } from 'date-fns'
import { today, getChallengeDayStatus } from '../lib/dateUtils'

// Custom Glassmorphic Tooltip for Recharts
function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 px-4 border border-white/20 bg-[#0d101a]/95 backdrop-blur-2xl shadow-xl">
      <p className="text-[12px] font-medium text-slate-400">{label}</p>
      <p className="font-heading font-bold text-lg text-white flex items-center gap-1.5 mt-0.5">
        <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
        {payload[0].value}% <span className="text-xs font-normal text-slate-400">completion</span>
      </p>
    </div>
  )
}

function EmptyChartState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center h-[220px]">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-2xl mb-3 text-slate-400">
        📊
      </div>
      <div className="font-heading font-semibold text-white text-base">{title}</div>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const { logs } = useHabits()
  const {
    dayStats, habitStats, streaks, weekdayPattern,
    todayPct, weakestHabit,
    thisWeekAvg, lastWeekAvg,
  } = useAnalytics()

  if (!profile) return null

  const todayStr = today()
  const challengeStatus = getChallengeDayStatus(todayStr, profile.start_date, profile.duration_days)
  const hasLogs = logs.length > 0

  const lineData = dayStats.slice(-30).map(d => ({
    label: format(parseISO(d.date), 'MMM d'),
    pct: d.pct,
  }))

  const barData = [...habitStats].sort((a, b) => a.pct - b.pct).slice(0, 8)

  const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekdayData = DOW_ORDER.map(d => ({ day: d, pct: weekdayPattern[d] ?? 0 }))
  const weekDiff = thisWeekAvg - lastWeekAvg

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 pb-24 select-none">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-[#38bdf8] mb-2 backdrop-blur-md">
          <Sparkles size={13} />
          <span>{challengeStatus.statusText}</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-white">
          Performance Analytics
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-1">
          Deep telemetry on your consistency, momentum, and habit completion rates.
        </p>
      </div>

      {/* ── Bento Grid: Mixed Card Sizes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

        {/* ── Bento Card 1: Today's Completion (lg:col-span-4) ── */}
        <div className="lg:col-span-4 glass-card-interactive p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg text-white">Today's Pulse</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] text-slate-300">
              Live Rate
            </span>
          </div>

          <div className="py-2 flex justify-center">
            <FrostProgressRing pct={todayPct} size={150} strokeWidth={12} label="Done Today" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-center">
            <div className="glass-panel p-2.5 rounded-xl">
              <div className="font-heading font-bold text-xl text-amber-300">🔥 {streaks.current}d</div>
              <div className="text-[11px] text-slate-400">Current Streak</div>
            </div>
            <div className="glass-panel p-2.5 rounded-xl">
              <div className="font-heading font-bold text-xl text-[#38bdf8]">⭐ {streaks.best}d</div>
              <div className="text-[11px] text-slate-400">Best Record</div>
            </div>
          </div>
        </div>

        {/* ── Bento Card 2: Week-vs-Week Momentum (lg:col-span-8) ── */}
        <div className="lg:col-span-8 glass-card-interactive p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-lg text-white">Weekly Delta</h2>
              <p className="text-xs text-slate-400 mt-0.5">Rolling 7-day average comparison</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-heading font-bold text-sm ${
              weekDiff >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              {weekDiff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{weekDiff >= 0 ? `+${weekDiff}%` : `${weekDiff}%`}</span>
            </div>
          </div>

          {!hasLogs ? (
            <EmptyChartState
              title="Data will appear after you log your first day"
              subtitle="Keep tracking your daily protocol to view week-over-week trends."
            />
          ) : (
            <div className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl">
                  <div className="text-xs text-slate-400 font-medium">Last Week Average</div>
                  <div className="font-heading font-bold text-3xl sm:text-4xl text-white mt-1">
                    {lastWeekAvg}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Previous baseline</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl">
                  <div className="text-xs text-slate-400 font-medium">This Week Average</div>
                  <div className="font-heading font-bold text-3xl sm:text-4xl text-[#38bdf8] mt-1">
                    {thisWeekAvg}%
                  </div>
                  <div className="text-[11px] text-[#38bdf8]/70 mt-1">Current trajectory</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl col-span-2 sm:col-span-1">
                  <div className="text-xs text-slate-400 font-medium">Consistency Grade</div>
                  <div className="font-heading font-bold text-3xl sm:text-4xl text-[#6366f1] mt-1">
                    {thisWeekAvg >= 80 ? 'A+' : thisWeekAvg >= 65 ? 'B' : 'Building'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Target: {profile.threshold}%</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 mt-4 text-xs text-slate-300">
                💡 {weekDiff >= 0
                  ? 'Strong momentum! You are executing above your previous week pace.'
                  : 'Slight dip this week. Focus on your top 2 non-negotiable habits today to rebound.'}
              </div>
            </div>
          )}
        </div>

        {/* ── Bento Card 3: 30-Day Completion Trend (Wide Area Chart, lg:col-span-12) ── */}
        <div className="lg:col-span-12 glass-card-interactive p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-lg text-white">
                30-Day Completion Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily performance over the past month</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              <span>Completion %</span>
            </div>
          </div>

          {!hasLogs || lineData.length === 0 ? (
            <EmptyChartState
              title="Data will appear after you log your first day"
              subtitle="Daily data points will automatically plot on this trendline."
            />
          ) : (
            <div className="w-full h-[260px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                      <stop offset="85%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<GlassTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    fill="url(#areaGrad)"
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#090b10', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Bento Card 4: Habit Success Rates (Horizontal Bars, lg:col-span-7) ── */}
        <div className="lg:col-span-7 glass-card-interactive p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-heading font-bold text-lg text-white">Habit Success Rates</h2>
                <p className="text-xs text-slate-400 mt-0.5">Individual consistency breakdown</p>
              </div>
              {weakestHabit && hasLogs && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Focus: {weakestHabit.habit_name}
                </span>
              )}
            </div>

            {!hasLogs || barData.length === 0 ? (
              <EmptyChartState
                title="Data will appear after you log your first day"
                subtitle="Your habits will be ranked by completion rate here."
              />
            ) : (
              <div className="w-full h-[240px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 15, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
                      tickFormatter={v => `${v}%`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="habit_name"
                      tick={{ fill: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'Plus Jakarta Sans' }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />
                    <Tooltip content={<GlassTooltip />} />
                    <Bar dataKey="pct" radius={[0, 8, 8, 0]} maxBarSize={16}>
                      {barData.map((entry, i) => (
                        <Cell
                          key={entry.habit_id}
                          fill={i === 0 ? '#f43f5e' : i < 3 ? '#38bdf8' : '#10b981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Bento Card 5: Weekday Pattern (lg:col-span-5) ── */}
        <div className="lg:col-span-5 glass-card-interactive p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-heading font-bold text-lg text-white">Weekday Patterns</h2>
                <p className="text-xs text-slate-400 mt-0.5">Which days you execute best</p>
              </div>
            </div>

            {!hasLogs ? (
              <EmptyChartState
                title="Data will appear after you log your first day"
                subtitle="Weekday analysis will reveal your strongest and weakest days."
              />
            ) : (
              <div>
                <div className="w-full h-[200px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekdayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip content={<GlassTooltip />} />
                      <Bar dataKey="pct" maxBarSize={28} radius={[6, 6, 0, 0]}>
                        {weekdayData.map(entry => {
                          const min = Math.min(...weekdayData.map(d => d.pct))
                          return (
                            <Cell
                              key={entry.day}
                              fill={entry.pct === min ? '#f43f5e' : '#6366f1'}
                            />
                          )
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 text-xs text-slate-400 text-center font-medium">
                  {(() => {
                    const min = weekdayData.reduce((a, b) => a.pct < b.pct ? a : b)
                    return `Vulnerable day: ${min.day} (${min.pct}% completion)`
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bento Card 6: 90-Day Master Heatmap (Full Width, lg:col-span-12) ── */}
        <div className="lg:col-span-12 glass-card-interactive p-6 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-lg text-white">
                90-Day Winter Arc Grid
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Every single day of your discipline journey mapped in intensity
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.06] text-white/70">
              {profile.duration_days} Days
            </div>
          </div>

          <Heatmap dayStats={dayStats} totalDays={profile.duration_days} />
        </div>

      </div>
    </div>
  )
}
