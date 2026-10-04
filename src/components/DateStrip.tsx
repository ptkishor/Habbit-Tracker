import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO, addDays, isToday, isFuture } from 'date-fns'
import { today } from '../lib/dateUtils'

interface DateStripProps {
  currentDate: string
  startDate: string
  onSelectDate: (date: string) => void
}

export default function DateStrip({ currentDate, startDate, onSelectDate }: DateStripProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const todayStr = today()

  // Generate date list: past 12 days to today
  const dates: string[] = []
  const todayDate = parseISO(todayStr)
  for (let i = -12; i <= 2; i++) {
    const dStr = format(addDays(todayDate, i), 'yyyy-MM-dd')
    if (dStr >= startDate) {
      dates.push(dStr)
    }
  }

  useEffect(() => {
    const activeEl = containerRef.current?.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [currentDate])

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar select-none"
    >
      {dates.map((dateStr) => {
        const isSelected = dateStr === currentDate
        const isCurrentDay = isToday(parseISO(dateStr))
        const isLocked = isFuture(parseISO(dateStr)) && !isCurrentDay
        const dateObj = parseISO(dateStr)
        const dayOfWeek = format(dateObj, 'EEE')
        const dayNumber = format(dateObj, 'd')

        return (
          <button
            key={dateStr}
            data-active={isSelected ? 'true' : 'false'}
            disabled={isLocked}
            onClick={() => onSelectDate(dateStr)}
            className={`relative flex flex-col items-center justify-center min-w-[48px] sm:min-w-[52px] h-[54px] sm:h-[58px] rounded-xl transition-all duration-200 flex-shrink-0 ${
              isLocked
                ? 'opacity-30 cursor-not-allowed'
                : 'cursor-pointer hover:border-white/20'
            } ${
              isSelected
                ? 'text-white font-bold'
                : 'text-white/60 hover:text-white/90 bg-white/[0.03] border border-white/5'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="activeDateStripPill"
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#38bdf8]/20 to-[#6366f1]/25 border border-sky-400/35 shadow-glow"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}

            {/* Today indicator dot */}
            {isCurrentDay && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8]" />
            )}

            <span className="relative z-10 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              {dayOfWeek}
            </span>
            <span className="relative z-10 text-[16px] sm:text-[17px] font-heading font-bold">
              {dayNumber}
            </span>
          </button>
        )
      })}
    </div>
  )
}
