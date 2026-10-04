import { useRef, useEffect, useMemo } from 'react'
import { parseISO, addDays } from 'date-fns'
import type { DayStats } from '../types'
import { toDateStr, today, getDayNumber } from '../lib/dateUtils'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DEFAULT_TOTAL = 90

interface DayStripProps {
  startDate: string
  durationDays?: number
  selectedDate: string
  dayStats: DayStats[]
  onSelectDate: (date: string) => void
}

export default function DayStrip({
  startDate,
  durationDays = DEFAULT_TOTAL,
  selectedDate,
  dayStats,
  onSelectDate,
}: DayStripProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const totalDays = durationDays || DEFAULT_TOTAL

  const statsMap = useMemo(() => {
    const map = new Map<string, number>()
    dayStats.forEach(d => map.set(d.date, d.pct / 100))
    return map
  }, [dayStats])

  const todayStr = today()
  const todayIdx = Math.max(1, getDayNumber(todayStr, startDate))
  // Sliding 14-day window: if today is Day 1..7, show Days 1 to 14
  // Otherwise center around todayIdx, clamped to 1..totalDays
  const from = Math.max(1, Math.min(Math.max(1, totalDays - 13), todayIdx <= 7 ? 1 : todayIdx - 6))
  const to = Math.min(totalDays, from + 13)

  const chips = useMemo(() => {
    const list = []
    const startObj = parseISO(startDate)

    for (let i = from; i <= to; i++) {
      const d = addDays(startObj, i - 1)
      const k = toDateStr(d)
      const p = statsMap.get(k) ?? 0
      const isSelected = k === selectedDate
      const isToday = k === todayStr
      const isLocked = k > todayStr

      list.push({
        dayIndex: i,
        dateKey: k,
        dateObj: d,
        pct: p,
        isSelected,
        isToday,
        isLocked,
      })
    }
    return list
  }, [startDate, from, to, todayStr, statsMap, selectedDate])

  useEffect(() => {
    const activeEl = containerRef.current?.querySelector('.chip.on')
    if (activeEl) {
      activeEl.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedDate])

  return (
    <div ref={containerRef} className="strip" id="strip" aria-label="Pick a day">
      {chips.map(chip => (
        <button
          key={chip.dateKey}
          type="button"
          disabled={chip.isLocked}
          className={`chip ${chip.isSelected ? 'on' : ''} ${chip.isLocked ? 'locked' : ''} ${chip.isToday ? 'today-chip' : ''}`}
          data-k={chip.dateKey}
          title={`Day ${chip.dayIndex} of ${totalDays} (${chip.dateKey})${chip.isToday ? ' • Today' : ''}`}
          aria-label={`Day ${chip.dayIndex} of ${totalDays}`}
          onClick={() => {
            if (!chip.isLocked) onSelectDate(chip.dateKey)
          }}
        >
          <span className="wd">{WD[chip.dateObj.getDay()]}</span>
          <span className="dd">{chip.dateObj.getDate()}</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: chip.isSelected ? '#0FB3A0' : chip.isToday ? 'var(--ice)' : 'var(--ink3)',
              marginTop: '1px',
            }}
          >
            D{chip.dayIndex}
          </span>
          <i style={{ '--p': chip.pct } as React.CSSProperties} />
        </button>
      ))}
    </div>
  )
}
