import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseISO, isToday, isFuture } from 'date-fns'
import { Plus, Flame, Award, CheckCircle2, Sparkles, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAuth } from '../context/AuthContext'
import { useHabits } from '../hooks/useHabits'
import HabitRow from '../components/HabitRow'
import Heatmap from '../components/Heatmap'
import FrostProgressRing from '../components/FrostProgressRing'
import DateStrip from '../components/DateStrip'
import {
  today,
  computeStreaks,
  computeDayStats,
  getChallengeDates,
  isHabitDone,
  getChallengeDayStatus,
} from '../lib/dateUtils'

const MOTIVATIONAL_QUOTES = [
  "Small disciplines repeated with consistency every day lead to great achievements.",
  "You don't have to be extreme, just consistent. Win today.",
  "The cold builds character. Lock in your habits.",
  "Your future self is watching you right now through memories.",
  "Action precedes motivation. Do the work and momentum follows.",
  "The standard you walk past is the standard you accept.",
  "Embrace the silence of the grind. Let results speak.",
  "Ninety days of relentless focus will redefine your year.",
]

function getGreeting(email?: string) {
  const hour = new Date().getHours()
  const name = email ? email.split('@')[0] : 'Warrior'
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
  if (hour < 12) return `Good morning, ${capitalized}`
  if (hour < 17) return `Good afternoon, ${capitalized}`
  return `Good evening, ${capitalized}`
}

// Rolling mechanical slot counter for streaks
function SlotNumber({ value }: { value: number }) {
  return (
    <span className="inline-flex overflow-hidden h-[1.15em] relative">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function DailyPage() {
  const { user, profile } = useAuth()
  const { habits, logs, upsertLog, addHabit, loading } = useHabits()
  const [currentDate, setCurrentDate] = useState(today())
  const [showAddHabit, setShowAddHabit] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitType, setNewHabitType] = useState<'check' | 'number'>('check')
  const [newHabitTarget, setNewHabitTarget] = useState('')
  const [newHabitUnit, setNewHabitUnit] = useState('')
  const [showDayCompleteBanner, setShowDayCompleteBanner] = useState(false)

  if (!profile) return null

  const startDate = profile.start_date
  const challengeStatus = getChallengeDayStatus(currentDate, startDate, profile.duration_days)
  const isLocked = isFuture(parseISO(currentDate)) && !isToday(parseISO(currentDate))
  const activeHabits = habits.filter(h => !h.archived)

  // Current day logs
  const dayLogs = logs.filter(l => l.date === currentDate)
  const logMap = new Map(dayLogs.map(l => [l.habit_id, l]))

  // Completed habits calculation
  const done = activeHabits.filter(h => isHabitDone(h, logMap.get(h.id))).length
  const totalActive = activeHabits.length
  const completionPct = totalActive > 0 ? Math.round((done / totalActive) * 100) : 0

  // Streaks calculation
  const challengeDates = getChallengeDates(startDate, profile.duration_days)
  const dayStats = computeDayStats(challengeDates, habits, logs, profile.threshold)
  const { current: currentStreak, best: bestStreak } = computeStreaks(dayStats)

  // Fullscreen confetti and banner when 100% completed
  useEffect(() => {
    if (completionPct === 100 && totalActive > 0) {
      setShowDayCompleteBanner(true)
      // Confetti + snowflake burst
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#5ac8fa', '#7c5cff', '#34d399', '#2dd4bf', '#ffffff'],
        ticks: 120,
      })
      const timer = setTimeout(() => setShowDayCompleteBanner(false), 4500)
      return () => clearTimeout(timer)
    } else {
      setShowDayCompleteBanner(false)
    }
  }, [completionPct, totalActive])

  async function handleAddHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!newHabitName.trim()) return
    await addHabit({
      name: newHabitName.trim(),
      type: newHabitType,
      target: newHabitType === 'number' ? parseFloat(newHabitTarget) || undefined : undefined,
      unit: newHabitType === 'number' ? newHabitUnit.trim() || undefined : undefined,
      position: habits.length + 1,
      archived: false,
    })
    setNewHabitName('')
    setNewHabitTarget('')
    setNewHabitUnit('')
    setShowAddHabit(false)
  }

  const quoteIndex = challengeStatus.clampedDayNumber % MOTIVATIONAL_QUOTES.length
  const quote = MOTIVATIONAL_QUOTES[quoteIndex]

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col h-full lg:h-[100dvh] lg:overflow-hidden select-none">

      {/* ════════ TOP ROW: Full width, compact header (max ~130px tall) ════════ */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="flex-shrink-0 mb-3 sm:mb-4 glass-card p-3 sm:px-5 sm:py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
      >
        {/* Left: Greeting + Motivational Quote */}
        <div className="min-w-0 flex-shrink-0 lg:max-w-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
            <h1 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-white truncate">
              {getGreeting(user?.email)}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate font-normal">
            "{quote}"
          </p>
        </div>

        {/* Center: Compact DateStrip Calendar */}
        <div className="flex-1 min-w-0 max-w-xl mx-auto lg:mx-4">
          <DateStrip
            currentDate={currentDate}
            startDate={startDate}
            onSelectDate={setCurrentDate}
          />
        </div>

        {/* Right: Challenge Day Progress Badge */}
        <div className="flex items-center justify-end gap-3 flex-shrink-0">
          <div className="glass-panel px-3.5 py-1.5 rounded-xl flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                {challengeStatus.statusText}
              </div>
              <div className="font-heading font-bold text-white text-sm sm:text-base leading-tight">
                Day {challengeStatus.clampedDayNumber} <span className="text-xs font-normal text-slate-400">/ {profile.duration_days}</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#38bdf8] to-[#6366f1] flex items-center justify-center font-heading font-bold text-xs text-white shadow-glow flex-shrink-0">
              ❄️
            </div>
          </div>
        </div>
      </motion.div>

      {/* ════════ MAIN 12-COLUMN GRID (Left 7 cols, Right 5 cols) ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 flex-1 min-h-0 lg:overflow-hidden pb-4 lg:pb-2">

        {/* ── LEFT (7 cols): Daily Protocol 2-Column Grid (all 16 habits fit) ── */}
        <div className="lg:col-span-7 flex flex-col h-full lg:overflow-hidden glass-card p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="font-heading font-bold text-lg sm:text-xl text-white">
                Daily Protocol
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                {done} / {totalActive} Done
              </span>
            </div>

            {!isLocked && (
              <button
                onClick={() => setShowAddHabit(!showAddHabit)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white/80 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <Plus size={14} /> Add Habit
              </button>
            )}
          </div>

          {/* Quick Add Habit Dropdown Modal / Form */}
          <AnimatePresence>
            {showAddHabit && !isLocked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 p-3.5 rounded-2xl glass-panel border border-white/15 flex-shrink-0"
              >
                <form onSubmit={handleAddHabit} className="flex flex-col sm:flex-row gap-2.5 items-center">
                  <input
                    className="glass-input h-10 text-sm flex-1"
                    placeholder="Habit name (e.g. Cold Shower, Read 20m)..."
                    value={newHabitName}
                    onChange={e => setNewHabitName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    {(['check', 'number'] as const).map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setNewHabitType(t)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          newHabitType === t
                            ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-white'
                            : 'bg-white/[0.04] border-white/10 text-white/50'
                        }`}
                      >
                        {t === 'check' ? 'Tick' : 'Number'}
                      </button>
                    ))}
                    {newHabitType === 'number' && (
                      <input
                        className="glass-input h-10 w-16 text-xs text-center"
                        placeholder="Target"
                        value={newHabitTarget}
                        onChange={e => setNewHabitTarget(e.target.value)}
                      />
                    )}
                    <button type="submit" className="btn-frost h-10 px-4 text-xs font-semibold">
                      Add ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddHabit(false)}
                      className="btn-ghost h-10 px-3 text-xs"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2-Column Grid of Compact Habit Cards (~64px each) */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-2 flex-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : activeHabits.length === 0 ? (
            <div className="py-12 text-center my-auto">
              <div className="text-3xl mb-2">📋</div>
              <h3 className="font-heading font-bold text-white text-base">No Habits Found</h3>
              <p className="text-xs text-slate-400 mt-1">Add your daily habits above to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 lg:overflow-y-auto pr-1 no-scrollbar auto-rows-max">
              {activeHabits.map((habit, idx) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  log={logMap.get(habit.id)}
                  date={currentDate}
                  locked={isLocked}
                  index={idx}
                  onUpdate={upsertLog}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT (5 cols): Progress Ring + Streaks + 90-Day Grid Heatmap ── */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 h-full lg:overflow-y-auto no-scrollbar">

          {/* Top telemetry card: 170px Progress Ring + Streaks side by side */}
          <div className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-around gap-4 flex-shrink-0">
            {/* Big 170px Progress Ring */}
            <div className="flex-shrink-0 py-1">
              <FrostProgressRing pct={completionPct} size={170} strokeWidth={13} label="Protocol" />
            </div>

            {/* Streak Badges side-by-side with slot number */}
            <div className="flex flex-row sm:flex-col gap-3 w-full sm:w-auto justify-around">
              {/* Current Streak */}
              <div className="glass-panel p-3 sm:px-4 sm:py-3 rounded-2xl flex-1 sm:min-w-[130px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Streak</span>
                  <Flame size={16} className="text-amber-400 fill-amber-400 animate-flame" />
                </div>
                <div className="font-heading font-bold text-2xl sm:text-3xl text-white flex items-baseline gap-1">
                  <SlotNumber value={currentStreak} />
                  <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>

              {/* Peak Best Record */}
              <div className="glass-panel p-3 sm:px-4 sm:py-3 rounded-2xl flex-1 sm:min-w-[130px]">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Peak</span>
                  <Award size={16} className="text-[#38bdf8]" />
                </div>
                <div className="font-heading font-bold text-2xl sm:text-3xl text-white flex items-baseline gap-1">
                  <SlotNumber value={bestStreak} />
                  <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle card: 90-Day Grid Heatmap (18-20px cells filling width) */}
          <div className="glass-card p-4 sm:p-5 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-heading font-bold text-sm sm:text-base text-white">90-Day Arc Grid</h3>
              <span className="text-[11px] font-semibold text-slate-400">Telemetry Map</span>
            </div>
            <Heatmap dayStats={dayStats} totalDays={profile.duration_days} />
          </div>

          {/* Bottom card: Timeline bar */}
          <div className="glass-card p-3.5 sm:p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-heading font-semibold text-white">Arc Timeline</span>
              <span className="font-bold text-[#38bdf8]">Day {challengeStatus.clampedDayNumber} / {profile.duration_days}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] via-[#6366f1] to-[#10b981]"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, Math.max(0, (challengeStatus.clampedDayNumber / profile.duration_days) * 100))}%`,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>{startDate}</span>
              <span>{challengeStatus.statusText}</span>
            </div>
          </div>

        </div>

      </div>

      {/* ── Glowing DAY COMPLETE Spring Banner (auto-dismiss) ── */}
      <AnimatePresence>
        {showDayCompleteBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
            className="fixed inset-x-0 bottom-24 lg:bottom-12 z-50 flex justify-center pointer-events-none px-4"
          >
            <div className="glass-card p-4 px-6 sm:px-8 flex items-center gap-4 border-2 border-emerald-400/60 bg-[#070b1a]/95 backdrop-blur-2xl shadow-[0_16px_50px_rgba(52,211,153,0.45)] pointer-events-auto">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 flex items-center justify-center text-white shadow-[0_0_20px_#34d399] flex-shrink-0">
                <CheckCircle2 size={26} strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-heading font-bold text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
                  <span>DAY COMPLETE</span>
                  <Sparkles size={18} className="text-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs sm:text-sm text-emerald-300 font-medium mt-0.5">
                  All 16 habits executed. Streak extended!
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
