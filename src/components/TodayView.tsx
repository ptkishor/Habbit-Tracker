import { useCallback, useMemo } from 'react'
import type { Habit, Log } from '../types'
import HabitTile from './HabitTile'
import { celebrate, showToast, burst } from '../lib/effects'
import { playCelebrationSound } from '../lib/soundEffects'
import { isHabitDone, today, getDayNumber } from '../lib/dateUtils'

interface TodayViewProps {
  userId: string
  habits: Habit[]
  logs: Log[]
  selectedDate: string
  startDate: string
  onUpdateLog: (habitId: string, date: string, updates: Partial<Log>) => Promise<void>
}

export default function TodayView({
  userId,
  habits,
  logs,
  selectedDate,
  startDate,
  onUpdateLog,
}: TodayViewProps) {
  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits])
  const todayStr = today()
  const isLocked = selectedDate > todayStr

  // Build log map for selectedDate
  const logMap = useMemo(() => {
    const map = new Map<string, Log>()
    logs
      .filter(l => l.date === selectedDate)
      .forEach(l => map.set(l.habit_id, l))
    return map
  }, [logs, selectedDate])

  const handleAction = useCallback(
    async (
      habit: Habit,
      action: 'ok' | 'no' | 'inc' | 'dec',
      btnEl: HTMLElement | null,
      tileEl: HTMLElement | null
    ) => {
      const curLog = logMap.get(habit.id) || {
        id: '',
        habit_id: habit.id,
        user_id: userId,
        date: selectedDate,
        status: null,
        value: 0,
      }

      let nextStatus = curLog.status
      let nextValue = curLog.value ?? 0

      if (action === 'inc' || action === 'dec') {
        const stepSize =
          (habit as any).step ??
          (habit.unit === 'steps' ? 1000 : habit.unit === 'L' ? 0.5 : habit.unit === 'pages' ? 2 : 1)
        const step = (action === 'inc' ? 1 : -1) * stepSize
        nextValue = Math.max(0, Math.round((nextValue + step) * 100) / 100)
        const target = habit.target ?? 1
        if (nextValue >= target) {
          if (nextStatus !== 'done') {
            nextStatus = 'done'
            burst(btnEl)
          }
        } else if (nextStatus === 'done') {
          nextStatus = null
        }
      } else if (action === 'ok') {
        if (nextStatus === 'done') {
          nextStatus = null
          if (habit.type === 'number') nextValue = 0
        } else {
          nextStatus = 'done'
          if (habit.type === 'number' && nextValue < (habit.target ?? 1)) {
            nextValue = habit.target ?? 1
          }
          burst(btnEl)
        }
      } else if (action === 'no') {
        if (nextStatus === 'missed') {
          nextStatus = null
        } else {
          nextStatus = 'missed'
          if (tileEl) {
            tileEl.animate(
              [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' },
                { transform: 'translateX(-3px)' },
                { transform: 'translateX(0)' },
              ],
              { duration: 340 }
            )
          }
        }
      }

      // Check if all active habits will now be completed
      const doneCountBefore = activeHabits.filter(h =>
        isHabitDone(h, logMap.get(h.id))
      ).length

      const wasAlreadyDone = isHabitDone(habit, curLog)
      const isNowDone = isHabitDone(habit, {
        ...curLog,
        status: nextStatus,
        value: nextValue,
      })

      const netDelta = (isNowDone ? 1 : 0) - (wasAlreadyDone ? 1 : 0)
      const willBeAllDone =
        activeHabits.length > 0 &&
        doneCountBefore + netDelta === activeHabits.length

      try {
        await onUpdateLog(habit.id, selectedDate, {
          status: nextStatus,
          value: habit.type === 'number' ? nextValue : undefined,
        })

        if (willBeAllDone && !wasAlreadyDone) {
          const celebrKey = `wa_cel_${userId}_${selectedDate}`
          const alreadyCelebrated = localStorage.getItem(celebrKey)
          if (!alreadyCelebrated) {
            localStorage.setItem(celebrKey, '1')
            const dayNum = Math.max(1, getDayNumber(selectedDate, startDate))
            celebrate(dayNum)
            playCelebrationSound()
          }
        }
      } catch (err) {
        showToast('Failed to update habit. Please check your connection.')
      }
    },
    [logMap, userId, selectedDate, activeHabits, onUpdateLog, startDate]
  )

  if (activeHabits.length === 0) {
    return (
      <div className="empty" style={{ margin: '40px auto' }}>
        No active habits found. Add habits in Settings to begin your protocol.
      </div>
    )
  }

  return (
    <div className="habits" id="habits">
      {activeHabits.map((habit, idx) => (
        <HabitTile
          key={habit.id}
          habit={habit}
          log={logMap.get(habit.id)}
          index={idx}
          locked={isLocked}
          onAction={(action, btnEl, tileEl) =>
            handleAction(habit, action, btnEl, tileEl)
          }
        />
      ))}
    </div>
  )
}
