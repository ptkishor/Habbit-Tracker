import React, { useEffect, useRef, useState, useMemo } from 'react'
import ThemeToggle from './ThemeToggle'
import type { DayStats } from '../types'
import { getChallengeDayStatus, toDateStr, today } from '../lib/dateUtils'
import { addDays, parseISO } from 'date-fns'

const DEFAULT_TOTAL = 90
const C = 2 * Math.PI * 132

function tickCol(p: number) {
  if (p >= 0.8) return '#19C7AE' // Done Teal for completed
  if (p > 0) return '#FF6B3D'    // Ember Orange for partial
  return 'rgba(234,243,251,0.18)' // Past uncompleted
}

function useAnimatedNumber(value: number, duration = 650) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced || prevRef.current === value) {
      setDisplay(value)
      prevRef.current = value
      return
    }

    const startVal = prevRef.current
    const endVal = value
    const startTime = performance.now()
    let frameId: number

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, Math.max(0, elapsed / duration))
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(startVal + (endVal - startVal) * ease))
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        prevRef.current = endVal
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [value, duration])

  return display
}

interface DialPanelProps {
  startDate: string
  durationDays: number
  selectedDate: string
  dayStats: DayStats[]
  streakCurrent: number
  streakBest: number
  averagePct: number
  selectedDayPct: number
  onOpenStreakDetails?: () => void
}

export default function DialPanel({
  startDate,
  durationDays = DEFAULT_TOTAL,
  selectedDate,
  dayStats,
  streakCurrent,
  streakBest,
  averagePct,
  selectedDayPct,
  onOpenStreakDetails,
}: DialPanelProps) {
  const totalDays = durationDays || DEFAULT_TOTAL
  const status = useMemo(
    () => getChallengeDayStatus(selectedDate, startDate, totalDays),
    [selectedDate, startDate, totalDays]
  )

  const dayMap = useMemo(() => {
    const map = new Map<string, number>()
    dayStats.forEach(d => map.set(d.date, d.pct / 100))
    return map
  }, [dayStats])

  const animDayNum = useAnimatedNumber(status.clampedDayNumber)
  const animPct = useAnimatedNumber(Math.round(selectedDayPct * 100))
  const animStreak = useAnimatedNumber(streakCurrent)
  const animBest = useAnimatedNumber(streakBest)
  const animAvg = useAnimatedNumber(averagePct)

  const arcOffset = C * (1 - selectedDayPct)

  // Compute ticks for challenge duration
  const ticks = useMemo(() => {
    const arr = []
    const selIdx = status.clampedDayNumber
    const todayStr = today()
    const todayStatus = getChallengeDayStatus(
      todayStr,
      startDate,
      totalDays
    )
    const tIdx = todayStatus.clampedDayNumber
    const startParsed = parseISO(startDate)

    for (let i = 1; i <= totalDays; i++) {
      let col: string
      let r1 = 168
      let r2 = 190
      let w = 4

      // Look up local date for day i
      const d = addDays(startParsed, i - 1)
      const key = toDateStr(d)
      const p = dayMap.get(key) ?? 0

      if (i > tIdx) {
        col = 'rgba(234,243,251,0.1)' // Dimmed for future days
      } else {
        col = tickCol(p)
      }

      if (i === selIdx) {
        r1 = 152
        r2 = 194
        col = '#FFFFFF'
        w = 5.5
      }

      const a = ((i - 1) / totalDays) * Math.PI * 2 - Math.PI / 2
      const c = Math.cos(a)
      const s = Math.sin(a)

      arr.push({
        i,
        x1: 200 + r1 * c,
        y1: 200 + r1 * s,
        x2: 200 + r2 * c,
        y2: 200 + r2 * s,
        w,
        col,
      })
    }
    return arr
  }, [startDate, totalDays, status.clampedDayNumber, dayMap])

  return (
    <aside className="panel" aria-label="Challenge progress">
      {/* Brand */}
      <div className="brand">
        <svg
          className="mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M4.2 7l15.6 10M4.2 17L19.8 7M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />
        </svg>
        <div>
          <b>Winter Arc</b>
          <span>{totalDays}-day challenge</span>
        </div>
      </div>

      {/* Dial */}
      <div className="dialwrap">
        <svg id="dial" viewBox="0 0 400 400" role="img" aria-label={`${totalDays}-day dial`}>
          <defs>
            <linearGradient id="arcg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5ED0FF" />
              <stop offset="1%" stopColor="#2DD4B0" />
            </linearGradient>
          </defs>
          <circle
            cx="200"
            cy="200"
            r="132"
            fill="none"
            stroke="rgba(255,255,255,.09)"
            strokeWidth="10"
          />
          <circle
            id="arc"
            cx="200"
            cy="200"
            r="132"
            fill="none"
            stroke="url(#arcg)"
            strokeWidth="10"
            strokeLinecap="round"
            transform="rotate(-90 200 200)"
            strokeDasharray={C}
            strokeDashoffset={arcOffset}
          />
          {ticks.map(t => (
            <line
              key={t.i}
              className="tk"
              data-i={t.i}
              style={{ '--i': t.i } as React.CSSProperties}
              strokeLinecap="round"
              strokeWidth={t.w}
              stroke={t.col}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
            />
          ))}
        </svg>

        <div className="dialcenter">
          <span className="dl">
            {!status.isStarted ? 'Starts in' : status.isCompleted ? 'Challenge' : 'Day'}
          </span>
          <span className="dn" id="dayNum">
            {!status.isStarted ? (status.daysUntil ?? 1) : status.isCompleted ? String(totalDays) : animDayNum}
          </span>
          <span className="dof">
            {!status.isStarted
              ? (status.daysUntil ?? 1) === 1 ? 'day' : 'days'
              : status.isCompleted ? 'Complete' : `of ${totalDays}`}
          </span>
        </div>
      </div>

      {/* Today percentage */}
      <div className="today-pct">
        <b id="pctNum">{animPct}</b>% of habits done
      </div>

      {/* Stats row */}
      <div className="stats">
        <button
          type="button"
          className="stat"
          onClick={onOpenStreakDetails}
          style={{
            cursor: onOpenStreakDetails ? 'pointer' : 'default',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
          title="Click to view streak breakdown & rules"
        >
          <span className="sl">Streak</span>
          <b>
            <span className="fl" role="img" aria-label="flame" style={{ display: 'inline-block', fontSize: '18px', lineHeight: 1 }}>
              🔥
            </span>
            <span id="stStreak">{animStreak}</span>
            <small>days</small>
          </b>
        </button>
        <div className="stat">
          <span className="sl">Best</span>
          <b>
            <span id="stBest">{animBest}</span>
            <small>days</small>
          </b>
        </div>
        <div className="stat">
          <span className="sl">Average</span>
          <b>
            <span id="stAvg">{animAvg}</span>
            <small>%</small>
          </b>
        </div>
      </div>

      {/* Footer with theme toggle */}
      <div className="panelfoot">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(234,243,251,0.7)', fontWeight: 500 }}>
            Winter Arc &bull; Day {status.clampedDayNumber}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  )
}
