import { useState, useRef, useEffect, MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Droplets, Dumbbell, BookOpen, Moon, Footprints,
  Code2, Brain, Utensils, PenTool, Sun, Sparkles, X
} from 'lucide-react'
import type { Habit, Log } from '../types'
import { isHabitDone } from '../lib/dateUtils'

type LogStatus = 'done' | 'missed' | null

interface HabitRowProps {
  habit: Habit
  log?: Log
  date: string
  locked: boolean
  index: number
  onUpdate: (habitId: string, date: string, updates: Partial<Log>) => Promise<void>
}

function getHabitIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes('water') || n.includes('drink') || n.includes('hydrate')) return Droplets
  if (n.includes('workout') || n.includes('gym') || n.includes('lift') || n.includes('exercise')) return Dumbbell
  if (n.includes('read') || n.includes('book') || n.includes('study')) return BookOpen
  if (n.includes('sleep') || n.includes('rest') || n.includes('bed')) return Moon
  if (n.includes('walk') || n.includes('step') || n.includes('run')) return Footprints
  if (n.includes('code') || n.includes('dev') || n.includes('program')) return Code2
  if (n.includes('meditat') || n.includes('mind') || n.includes('breath')) return Brain
  if (n.includes('diet') || n.includes('fast') || n.includes('eat') || n.includes('protein')) return Utensils
  if (n.includes('journal') || n.includes('write')) return PenTool
  if (n.includes('wake') || n.includes('morning') || n.includes('sun')) return Sun
  return Sparkles
}

export default function HabitRow({ habit, log, date, locked, index, onUpdate }: HabitRowProps) {
  const [numberValue, setNumberValue] = useState<string>(log?.value?.toString() ?? '')
  const [showInput, setShowInput] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showInput && inputRef.current) inputRef.current.focus()
  }, [showInput])

  useEffect(() => {
    setNumberValue(log?.value?.toString() ?? '')
  }, [log?.value])

  const currentStatus: LogStatus = log?.status ?? null
  const done = isHabitDone(habit, log)
  const missed = currentStatus === 'missed'
  const IconComponent = getHabitIcon(habit.name)

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10) } catch {}
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  // Toggle habit status
  async function handleToggle(e: MouseEvent) {
    if (locked) return
    triggerHaptic()

    let next: LogStatus
    if (currentStatus === null) {
      next = 'done'
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 700)

      // Burst 14-16 particles directly from checkbox
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top + rect.height / 2) / window.innerHeight
      confetti({
        particleCount: 15,
        spread: 50,
        origin: { x, y },
        colors: ['#5ac8fa', '#7c5cff', '#34d399', '#2dd4bf'],
        ticks: 80,
        gravity: 1.2,
        scalar: 0.65,
      })
    } else if (currentStatus === 'done') {
      next = 'missed'
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 450)
    } else {
      next = null
    }

    await onUpdate(habit.id, date, { status: next, value: undefined })
  }

  async function handleNumberSubmit(val: string) {
    setShowInput(false)
    const num = parseFloat(val)
    if (isNaN(num)) return
    const isDone = habit.target !== undefined && num >= habit.target
    triggerHaptic()

    if (isDone) {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 700)
      confetti({
        particleCount: 15,
        spread: 45,
        colors: ['#5ac8fa', '#34d399', '#7c5cff'],
        ticks: 70,
        scalar: 0.65,
      })
    } else {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 400)
    }

    await onUpdate(habit.id, date, { value: num, status: isDone ? 'done' : 'missed' })
  }

  const numCurrent = log?.value ?? 0
  const numTarget = habit.target ?? 1
  const numProgress = habit.type === 'number' && habit.target ? Math.min(100, Math.round((numCurrent / numTarget) * 100)) : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }}
      animate={{
        opacity: locked ? 0.45 : 1,
        scale: 1,
        filter: 'blur(0px)',
        x: isShaking ? [-6, 6, -5, 5, -2, 2, 0] : 0,
      }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.035, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
      className={`group relative flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border transition-all duration-200 overflow-hidden min-h-[58px] sm:min-h-[64px] select-none ${
        done
          ? 'bg-emerald-500/[0.08] border-emerald-500/30 shadow-[0_4px_16px_rgba(52,211,153,0.12)]'
          : missed
          ? 'bg-rose-500/[0.08] border-rose-500/30 shadow-[0_4px_16px_rgba(251,113,133,0.12)]'
          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'
      }`}
      onClick={(e) => {
        if (!locked && habit.type === 'check') handleToggle(e)
      }}
    >
      {/* ── Spotlight Glow tracking mouse cursor ── */}
      {mousePos && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 opacity-100"
          style={{
            background: `radial-gradient(160px circle at ${mousePos.x}px ${mousePos.y}px, rgba(90, 200, 250, 0.14), transparent 80%)`,
          }}
        />
      )}

      {/* ── Emerald Flash Wave on Just Completed ── */}
      {justCompleted && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="pointer-events-none absolute inset-0 bg-emerald-400/20"
        />
      )}

      {/* ── Left Content: Icon + Title + Progress ── */}
      <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1 pr-2">
        {/* Habit Icon */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            done
              ? 'bg-emerald-500/20 text-emerald-400'
              : missed
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-white/[0.06] text-[#5ac8fa] group-hover:bg-white/10'
          }`}
        >
          <IconComponent size={19} strokeWidth={1.75} />
        </div>

        {/* Title and stats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold text-[16px] sm:text-[17px] leading-tight truncate transition-all duration-200 ${
                done
                  ? 'text-white/40 line-through'
                  : missed
                  ? 'text-rose-200/90'
                  : 'text-white/90 group-hover:text-white'
              }`}
            >
              {habit.name}
            </span>

            {/* Target label for number habits */}
            {habit.type === 'number' && habit.target !== undefined && (
              <span className="text-[12px] font-medium text-white/45 hidden sm:inline flex-shrink-0">
                {habit.target}{habit.unit ? ` ${habit.unit}` : ''}
              </span>
            )}
          </div>

          {/* Number progress bar */}
          {habit.type === 'number' && habit.target !== undefined && (
            <div className="w-full max-w-[180px] mt-1 flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    done
                      ? 'bg-emerald-400'
                      : 'bg-gradient-to-r from-[#5ac8fa] to-[#7c5cff]'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${numProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <span className="text-[11px] font-medium text-white/40">
                {numCurrent}/{habit.target}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Target (Checkbox / Numeric Input) ── */}
      <div
        className="relative z-10 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation()
          if (locked) return
          if (habit.type === 'number') {
            setShowInput(true)
          } else {
            handleToggle(e)
          }
        }}
      >
        {showInput && habit.type === 'number' ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              className="glass-input w-18 sm:w-20 py-1 px-2 text-center text-sm font-semibold rounded-xl"
              placeholder="0"
              value={numberValue}
              onChange={e => setNumberValue(e.target.value)}
              onBlur={() => handleNumberSubmit(numberValue)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleNumberSubmit(numberValue)
                if (e.key === 'Escape') setShowInput(false)
              }}
            />
          </div>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              done
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-[0_0_18px_rgba(52,211,153,0.45)]'
                : missed
                ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-[0_0_18px_rgba(251,113,133,0.45)]'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white/40 hover:text-white/80'
            }`}
            aria-label={`Toggle ${habit.name}`}
          >
            {/* Ring Ripple on click */}
            {justCompleted && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0.9 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 rounded-2xl border-2 border-emerald-400 pointer-events-none"
              />
            )}

            <AnimatePresence mode="wait">
              {done ? (
                <motion.svg
                  key="done"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ scale: 0.4, rotate: -25 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0.4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                >
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </motion.svg>
              ) : missed ? (
                <motion.div
                  key="missed"
                  initial={{ scale: 0.4, rotate: 90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0.4 }}
                >
                  <X size={19} strokeWidth={2.75} />
                </motion.div>
              ) : habit.type === 'number' && numCurrent > 0 ? (
                <span className="text-xs font-bold text-white">
                  {numCurrent}
                </span>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30" />
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}
