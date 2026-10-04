import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DayStats } from '../types'
import { heatmapLevel } from '../lib/dateUtils'
import { format, parseISO } from 'date-fns'

interface HeatmapProps {
  dayStats: DayStats[]
  totalDays: number
}

// Gradient intensity: Slate -> Ice-blue -> Teal -> Emerald
const LEVEL_STYLES = [
  'bg-white/[0.04] border-white/5',
  'bg-sky-500/40 border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.25)]',
  'bg-cyan-400/65 border-cyan-300/60 shadow-[0_0_10px_rgba(34,211,238,0.35)]',
  'bg-teal-400/85 border-teal-300/70 shadow-[0_0_12px_rgba(45,212,191,0.45)]',
  'bg-emerald-400 border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.55)]',
]

export default function Heatmap({ dayStats, totalDays }: HeatmapProps) {
  const [hoveredStat, setHoveredStat] = useState<{ stat: DayStats | null; x: number; y: number } | null>(null)

  // Chunk days into weeks (7 rows × N columns)
  const weeks: (DayStats | null)[][] = []
  let current: (DayStats | null)[] = []

  for (let day = 0; day < totalDays; day++) {
    current.push(dayStats[day] ?? null)
    if (current.length === 7 || day === totalDays - 1) {
      while (current.length < 7) current.push(null)
      weeks.push(current)
      current = []
    }
  }

  const dowLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div className="relative w-full overflow-x-auto pb-1 select-none">
      <div className="w-full flex flex-col items-center sm:items-start">
        <div className="flex gap-2 w-full justify-between items-start">

          {/* DOW labels */}
          <div className="flex flex-col gap-1.5 pt-5 text-[11px] font-semibold text-white/40 text-center w-3.5 flex-shrink-0">
            {dowLabels.map((d, i) => (
              <div key={i} className="h-4 sm:h-[19px] flex items-center justify-center">
                {i % 2 === 0 ? d : ''}
              </div>
            ))}
          </div>

          {/* Weeks columns: 18-20px cell size filling width */}
          <div className="flex gap-1.5 sm:gap-2 flex-1 justify-between">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1.5 flex-1 items-center">
                {/* Week number header */}
                <div className="h-3.5 text-[10px] font-semibold text-white/40 text-center">
                  {wi % 3 === 0 ? `W${wi + 1}` : ''}
                </div>

                {/* 7 Days in this week */}
                {week.map((stat, di) => {
                  const level = stat ? heatmapLevel(stat.pct) : 0
                  const isFuture = !stat

                  return (
                    <motion.div
                      key={di}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: isFuture ? 0.35 : 1 }}
                      transition={{
                        delay: (wi + di) * 0.012, // diagonal wave animation
                        duration: 0.3,
                        ease: 'easeOut',
                      }}
                      whileHover={{ scale: 1.4, zIndex: 30 }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setHoveredStat({ stat, x: rect.left + rect.width / 2, y: rect.top })
                      }}
                      onMouseLeave={() => setHoveredStat(null)}
                      className={`w-4 h-4 sm:w-[19px] sm:h-[19px] rounded-md border cursor-pointer transition-colors ${
                        isFuture
                          ? 'bg-white/[0.03] border-white/5'
                          : LEVEL_STYLES[level]
                      }`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5 text-xs text-white/50 w-full justify-between">
          <span className="text-[11px] font-medium">Less Active</span>
          <div className="flex items-center gap-1.5">
            {LEVEL_STYLES.map((style, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-sm border ${style}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium">Goal Hit</span>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      <AnimatePresence>
        {hoveredStat && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: -6, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: hoveredStat.x,
              top: hoveredStat.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 100,
            }}
            className="pointer-events-none px-3 py-1.5 rounded-xl bg-[#0c1229]/95 backdrop-blur-md border border-white/20 shadow-xl text-center"
          >
            {hoveredStat.stat ? (
              <>
                <div className="text-[11px] text-white/60 font-medium">
                  {format(parseISO(hoveredStat.stat.date), 'EEE, MMM d, yyyy')}
                </div>
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                  <span className="text-[#34d399]">{hoveredStat.stat.pct}%</span> done ({hoveredStat.stat.completed}/{hoveredStat.stat.total})
                </div>
              </>
            ) : (
              <div className="text-xs text-white/50">Future Day</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
