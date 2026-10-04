import { format, differenceInDays, parseISO, addDays } from 'date-fns'
import type { DayStats, HabitStats, Log, Habit, StreakInfo } from '../types'

/** Format a Date or ISO string as "YYYY-MM-DD" */
export function toDateStr(d: Date | string): string {
  return typeof d === 'string' ? d.slice(0, 10) : format(d, 'yyyy-MM-dd')
}

/** Return today as "YYYY-MM-DD" */
export function today(): string {
  return toDateStr(new Date())
}

/** Compute which day number (1-based) a given date is in the challenge */
export function getDayNumber(dateStr: string, startDate: string): number {
  return differenceInDays(parseISO(dateStr), parseISO(startDate)) + 1
}

export interface ChallengeDayStatus {
  dayNumber: number
  clampedDayNumber: number
  statusText: string
  isStarted: boolean
  isCompleted: boolean
  daysUntil?: number
}

/** Compute status and clamp day number to 1..durationDays */
export function getChallengeDayStatus(
  dateStr: string,
  startDate: string,
  durationDays: number
): ChallengeDayStatus {
  const day = getDayNumber(dateStr, startDate)
  if (day < 1) {
    const diff = differenceInDays(parseISO(startDate), parseISO(dateStr))
    const daysUntil = Math.max(1, diff)
    return {
      dayNumber: 1,
      clampedDayNumber: 1,
      daysUntil,
      statusText: daysUntil <= 1 ? 'Starts in 1 day' : `Starts in ${daysUntil} days`,
      isStarted: false,
      isCompleted: false,
    }
  }
  if (day > durationDays) {
    return {
      dayNumber: durationDays,
      clampedDayNumber: durationDays,
      statusText: 'Challenge complete',
      isStarted: true,
      isCompleted: true,
    }
  }
  return {
    dayNumber: day,
    clampedDayNumber: Math.min(day, durationDays),
    statusText: `Day ${Math.min(day, durationDays)} of ${durationDays}`,
    isStarted: true,
    isCompleted: false,
  }
}

/** Generate every date in the challenge as an array of "YYYY-MM-DD" strings */
export function getChallengeDates(startDate: string, durationDays: number): string[] {
  return Array.from({ length: durationDays }, (_, i) =>
    toDateStr(addDays(parseISO(startDate), i))
  )
}

/**
 * For each date in the challenge, compute completion stats.
 * Only includes dates up to today.
 */
export function computeDayStats(
  dates: string[],
  habits: Habit[],
  logs: Log[],
  threshold: number
): DayStats[] {
  const todayStr = today()
  const activeHabits = habits.filter(h => !h.archived)
  const logMap = new Map<string, Map<string, Log>>()

  // Build a quick lookup: dateStr -> habitId -> Log
  for (const log of logs) {
    if (!logMap.has(log.date)) logMap.set(log.date, new Map())
    logMap.get(log.date)!.set(log.habit_id, log)
  }

  return dates
    .filter(d => d <= todayStr)
    .map(date => {
      const dayLogs = logMap.get(date) ?? new Map<string, Log>()
      let completed = 0
      for (const habit of activeHabits) {
        const log = dayLogs.get(habit.id)
        if (isHabitDone(habit, log)) completed++
      }
      const total = activeHabits.length
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0
      return { date, total, completed, pct, isDone: pct >= threshold }
    })
}

/** Determine if a habit is completed based on its log entry */
export function isHabitDone(habit: Habit, log?: Log): boolean {
  if (!log) return false
  if (habit.type === 'check') return log.status === 'done'
  if (habit.type === 'number') {
    if (log.status === 'done') return true
    if (log.status !== 'missed' && log.value !== undefined && habit.target !== undefined && habit.target > 0) {
      return log.value >= habit.target
    }
  }
  return false
}

/** Compute per-habit success rates over given logs */
export function computeHabitStats(
  habits: Habit[],
  logs: Log[],
  dates: string[]
): HabitStats[] {
  const todayStr = today()
  const pastDates = dates.filter(d => d <= todayStr)

  return habits.filter(h => !h.archived).map(habit => {
    const habitLogs = logs.filter(l => l.habit_id === habit.id)
    const logMap = new Map(habitLogs.map(l => [l.date, l]))
    let completed = 0
    for (const date of pastDates) {
      if (isHabitDone(habit, logMap.get(date))) completed++
    }
    const total = pastDates.length
    return {
      habit_id: habit.id,
      habit_name: habit.name,
      total_days: total,
      completed_days: completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })
}

/**
 * Compute current streak and best streak from day stats.
 * - Completed days (isDone === true) build and maintain streak.
 * - Today in progress (isDone === false) does NOT break yesterday's streak.
 * - When today is completed, streak increases by 1.
 * - 1 grace day per calendar week protects the streak from resetting.
 */
export function computeStreaks(dayStats: DayStats[], todayStr = today()): StreakInfo {
  if (!dayStats || dayStats.length === 0) return { current: 0, best: 0 }

  const sorted = [...dayStats].sort((a, b) => a.date.localeCompare(b.date))
  const pastDays = sorted.filter(d => d.date < todayStr)
  const todayStat = sorted.find(d => d.date === todayStr)

  let best = 0
  let runningStreak = 0
  let graceDayUsedThisWeek = false
  let currentWeek = ''

  function getWeekKey(dateStr: string) {
    const d = parseISO(dateStr)
    const day = (d.getDay() + 6) % 7 // Monday = 0
    const monday = new Date(d)
    monday.setDate(d.getDate() - day)
    return toDateStr(monday)
  }

  // Iterate through all past days
  for (let i = 0; i < pastDays.length; i++) {
    const d = pastDays[i]
    const wKey = getWeekKey(d.date)
    if (wKey !== currentWeek) {
      currentWeek = wKey
      graceDayUsedThisWeek = false
    }

    if (d.isDone) {
      runningStreak++
    } else {
      if (!graceDayUsedThisWeek && runningStreak > 0) {
        // Weekly grace day: protects streak from resetting to 0
        graceDayUsedThisWeek = true
      } else {
        // Streak broken
        runningStreak = 0
      }
    }
    if (runningStreak > best) best = runningStreak
  }

  // Determine current active streak
  let current = 0
  const isTodayDone = todayStat ? todayStat.isDone : false

  if (isTodayDone) {
    current = runningStreak + 1
  } else {
    // Today is in progress — maintain previous streak
    current = runningStreak
  }

  if (current > best) best = current

  return { current, best }
}

/** Get the day-of-week label (Mon, Tue, ...) for an ISO date string */
export function getDayOfWeek(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE')
}

/** Compute average completion % for each weekday */
export function computeWeekdayPattern(dayStats: DayStats[]): Record<string, number> {
  const acc: Record<string, { sum: number; count: number }> = {}
  for (const d of dayStats) {
    const dow = getDayOfWeek(d.date)
    if (!acc[dow]) acc[dow] = { sum: 0, count: 0 }
    acc[dow].sum += d.pct
    acc[dow].count++
  }
  const result: Record<string, number> = {}
  for (const [dow, { sum, count }] of Object.entries(acc)) {
    result[dow] = count > 0 ? Math.round(sum / count) : 0
  }
  return result
}

/** Get heatmap intensity level 0-4 from a completion % */
export function heatmapLevel(pct: number): 0 | 1 | 2 | 3 | 4 {
  if (pct === 0) return 0
  if (pct < 30) return 1
  if (pct < 60) return 2
  if (pct < 85) return 3
  return 4
}
