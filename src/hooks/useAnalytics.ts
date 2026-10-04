import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useHabits } from './useHabits'
import {
  computeDayStats,
  computeHabitStats,
  computeStreaks,
  computeWeekdayPattern,
  getChallengeDates,
  today,
  getDayNumber,
} from '../lib/dateUtils'

/**
 * Derives all analytics data from raw habits + logs.
 * Memoized so charts don't re-render unnecessarily.
 */
export function useAnalytics() {
  const { profile } = useAuth()
  const { habits, logs } = useHabits()

  const challengeDates = useMemo(() => {
    if (!profile) return []
    return getChallengeDates(profile.start_date, profile.duration_days)
  }, [profile])

  const dayStats = useMemo(() => {
    if (!profile) return []
    return computeDayStats(challengeDates, habits, logs, profile.threshold)
  }, [challengeDates, habits, logs, profile])

  const habitStats = useMemo(
    () => computeHabitStats(habits, logs, challengeDates),
    [habits, logs, challengeDates]
  )

  const streaks = useMemo(() => computeStreaks(dayStats), [dayStats])

  const weekdayPattern = useMemo(() => computeWeekdayPattern(dayStats), [dayStats])

  const todayStr = today()
  const currentDayNumber = profile
    ? getDayNumber(todayStr, profile.start_date)
    : 0

  const todayStat = dayStats.find(d => d.date === todayStr)
  const todayPct = todayStat?.pct ?? 0

  // Weakest habit
  const weakestHabit = habitStats.length
    ? habitStats.reduce((a, b) => (a.pct < b.pct ? a : b))
    : null

  // This week vs last week average
  const getWeekAvg = (offsetWeeks: number) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - offsetWeeks * 7)
    const end = new Date(cutoff)
    end.setDate(end.getDate() + 7)
    const weekDays = dayStats.filter(d => {
      const dt = new Date(d.date)
      return dt >= cutoff && dt < end
    })
    if (!weekDays.length) return 0
    return Math.round(weekDays.reduce((s, d) => s + d.pct, 0) / weekDays.length)
  }

  const thisWeekAvg = getWeekAvg(0)
  const lastWeekAvg = getWeekAvg(1)

  return {
    dayStats,
    habitStats,
    streaks,
    weekdayPattern,
    currentDayNumber,
    todayPct,
    weakestHabit,
    thisWeekAvg,
    lastWeekAvg,
    challengeDates,
  }
}
