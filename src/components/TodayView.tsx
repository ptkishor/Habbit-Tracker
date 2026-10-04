import { useState, useCallback, useMemo, useEffect } from 'react'
import type { Habit, Log, StreakInfo } from '../types'
import HabitTile from './HabitTile'
import Modal from './Modal'
import { AppIcon } from './Icons'
import { celebrate, showToast, burst } from '../lib/effects'
import { playCelebrationSound } from '../lib/soundEffects'
import {
  isHabitDone,
  today,
  getDayNumber,
  isDatePastAutoLockCutoff,
  getAutoLockRemainingText,
  deduplicateHabits,
} from '../lib/dateUtils'

interface TodayViewProps {
  userId: string
  habits: Habit[]
  logs: Log[]
  selectedDate: string
  startDate: string
  streaks?: StreakInfo
  onUpdateLog: (habitId: string, date: string, updates: Partial<Log>) => Promise<void>
  onGoToSettings?: () => void
}

export default function TodayView({
  userId,
  habits,
  logs,
  selectedDate,
  startDate,
  streaks,
  onUpdateLog,
  onGoToSettings,
}: TodayViewProps) {
  const todayStr = today()

  // Track finalized / locked dates across sessions and devices
  const [submittedDates, setSubmittedDates] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(`wa_submitted_dates_${userId}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Synchronize submitted state if database logs have 'final_submitted' in notes
  const isSubmittedFromLogs = useMemo(() => {
    return logs.some(l => l.date === selectedDate && l.notes?.includes('final_submitted'))
  }, [logs, selectedDate])

  // 12-hour auto-lock cutoff: past days auto-lock 12 hours after day ends (next day 12:00 PM noon)
  const isAutoLocked = useMemo(() => {
    return isDatePastAutoLockCutoff(selectedDate)
  }, [selectedDate])

  const isDaySubmitted = submittedDates.includes(selectedDate) || isSubmittedFromLogs
  const isFuture = selectedDate > todayStr
  const isLocked = isFuture || isDaySubmitted || isAutoLocked

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Keep submittedDates in localStorage
  useEffect(() => {
    if (isSubmittedFromLogs && !submittedDates.includes(selectedDate)) {
      setSubmittedDates(prev => {
        const next = [...prev, selectedDate]
        localStorage.setItem(`wa_submitted_dates_${userId}`, JSON.stringify(next))
        return next
      })
    }
  }, [isSubmittedFromLogs, selectedDate, userId, submittedDates])

  // Canonicalize habits (deduplicates rows with same name/id, maps superseded IDs)
  const { canonicalHabits, idRedirectMap } = useMemo(() => {
    return deduplicateHabits(habits)
  }, [habits])

  // Build log map for selectedDate with redirected canonical habit IDs
  const logMap = useMemo(() => {
    const map = new Map<string, Log>()
    logs
      .filter(l => l.date === selectedDate)
      .forEach(l => {
        const canonicalId = idRedirectMap.get(l.habit_id) || l.habit_id
        const existing = map.get(canonicalId)
        // If duplicate logs exist for the same canonical habit, preserve 'done'
        if (!existing || (existing.status !== 'done' && l.status === 'done')) {
          map.set(canonicalId, { ...l, habit_id: canonicalId })
        }
      })
    return map
  }, [logs, selectedDate, idRedirectMap])

  // The active challenge habits: Day 1 through Day 90 always show the user's active challenge habits.
  // Archived preset habits are strictly excluded everywhere so Day 1 and Day 5 have the exact same habits!
  const activeHabits = useMemo(() => {
    return canonicalHabits.filter(h => !h.archived)
  }, [canonicalHabits])

  const doneCount = useMemo(() => {
    return activeHabits.filter(h => isHabitDone(h, logMap.get(h.id))).length
  }, [activeHabits, logMap])

  // Persist snapshot of locked days to ensure immutable day preservation,
  // and heal any old corrupted snapshot where total doesn't match activeHabits
  useEffect(() => {
    if (!isLocked || activeHabits.length === 0) return
    const key = `wa_locked_snapshots_${userId}`
    try {
      const saved = localStorage.getItem(key)
      const snapshots = saved ? JSON.parse(saved) : {}
      const existing = snapshots[selectedDate]
      const needsHealing = existing && (existing.total !== activeHabits.length || existing.total > 15)

      if (!existing || needsHealing) {
        const pct = Math.round((doneCount / activeHabits.length) * 100)
        snapshots[selectedDate] = {
          total: activeHabits.length,
          completed: doneCount,
          pct,
          isDone: pct >= 80,
          habitIds: activeHabits.map(h => h.id),
        }
        localStorage.setItem(key, JSON.stringify(snapshots))
      }
    } catch {
      // ignore
    }
  }, [isLocked, selectedDate, activeHabits, doneCount, userId])

  const handleAction = useCallback(
    async (
      habit: Habit,
      action: 'ok' | 'no' | 'inc' | 'dec',
      btnEl: HTMLElement | null,
      tileEl: HTMLElement | null
    ) => {
      if (isLocked) {
        showToast(
          isDaySubmitted
            ? 'Day is finalized and locked.'
            : isAutoLocked
            ? 'Day is auto-locked (12h window ended). Past habits cannot be changed.'
            : 'Future day is locked until that date.'
        )
        return
      }

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
    [logMap, userId, selectedDate, activeHabits, onUpdateLog, startDate, isLocked]
  )

  const handleConfirmFinalSubmit = async () => {
    setSubmitting(true)
    try {
      // 1. Mark in local storage
      const next = Array.from(new Set([...submittedDates, selectedDate]))
      setSubmittedDates(next)
      localStorage.setItem(`wa_submitted_dates_${userId}`, JSON.stringify(next))

      // 2. Persist 'final_submitted' in Supabase logs for all active habits
      for (const h of activeHabits) {
        const cur = logMap.get(h.id)
        await onUpdateLog(h.id, selectedDate, {
          status: cur?.status ?? null,
          value: cur?.value ?? 0,
          notes: 'final_submitted',
        })
      }

      setIsSubmitModalOpen(false)
      showToast(`Date ${selectedDate} finalized and locked permanently! 🔒`)
      playCelebrationSound()
    } catch {
      showToast('Error locking day. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (activeHabits.length === 0) {
    return (
      <div
        className="c"
        style={{
          margin: '40px auto',
          maxWidth: '460px',
          textAlign: 'center',
          padding: '36px 24px',
          borderRadius: '24px',
        }}
      >
        <div style={{ fontSize: '38px', marginBottom: '12px' }}>🎯</div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
          No Goals or Habits Set
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink2)', lineHeight: 1.5, margin: '0 0 20px' }}>
          You have full control. No default habits are loaded. Add your custom habits and daily targets to start your challenge.
        </p>
        {onGoToSettings && (
          <button
            type="button"
            className="cta"
            style={{ margin: '0 auto', display: 'inline-flex' }}
            onClick={onGoToSettings}
          >
            <AppIcon name="plus" size={16} />
            <span>Set Custom Goals in Settings &rarr;</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── Day Action Header: Progress & Final Submit ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 18px',
          background: isDaySubmitted
            ? 'rgba(25, 199, 174, 0.08)'
            : isAutoLocked
            ? 'rgba(229, 72, 77, 0.08)'
            : 'var(--card)',
          border: isDaySubmitted
            ? '1px solid rgba(25, 199, 174, 0.3)'
            : isAutoLocked
            ? '1px solid rgba(229, 72, 77, 0.3)'
            : '1px solid var(--line)',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: isDaySubmitted
                ? 'rgba(25, 199, 174, 0.15)'
                : isAutoLocked
                ? 'rgba(229, 72, 77, 0.15)'
                : 'var(--card2)',
              color: isDaySubmitted ? 'var(--done)' : isAutoLocked ? 'var(--miss)' : 'var(--ice)',
            }}
          >
            <AppIcon name={isDaySubmitted || isAutoLocked ? 'lock' : 'today'} size={18} />
          </span>
          <div>
            <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ink)' }}>
              {isDaySubmitted
                ? 'Day Locked & Finalized'
                : isAutoLocked
                ? 'Day Auto-Locked (12h Expired)'
                : isFuture
                ? 'Future Day (Locked)'
                : 'Day In Progress'}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink3)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '3px' }}>
              <span>{doneCount} of {activeHabits.length} habits completed for {selectedDate}</span>
              {!isDaySubmitted && !isFuture && (
                <span style={{ opacity: 0.85 }}>
                  • {getAutoLockRemainingText(selectedDate)}
                </span>
              )}
              {streaks && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 8px',
                    borderRadius: '99px',
                    background: streaks.current > 0 ? 'rgba(255, 107, 61, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                    border: streaks.current > 0 ? '1px solid rgba(255, 107, 61, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                    color: streaks.current > 0 ? '#FFA726' : 'var(--ice)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                  title={streaks.current > 0 ? `Active Streak: ${streaks.current} Days • Highest: ${streaks.best} Days` : streaks.best > 0 ? `Streak broken (0d). Highest Streak: ${streaks.best} Days` : 'Streak: 0d'}
                >
                  {streaks.current > 0 ? (
                    <>
                      <span>🔥</span>
                      <span>{streaks.current}d Streak</span>
                      {streaks.best > streaks.current && <span style={{ opacity: 0.7 }}>• Best: {streaks.best}d</span>}
                    </>
                  ) : streaks.best > 0 ? (
                    <>
                      <span>🏆</span>
                      <span>Highest: {streaks.best}d</span>
                      <span style={{ opacity: 0.65 }}>(Current: 0d)</span>
                    </>
                  ) : (
                    <>
                      <span>🔥</span>
                      <span>Streak: 0d</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lock button or status badge */}
        <div>
          {isDaySubmitted ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '99px',
                background: 'rgba(25, 199, 174, 0.15)',
                color: 'var(--done)',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              <AppIcon name="lock" size={13} />
              <span>Final Submitted (Cannot Change)</span>
            </div>
          ) : isAutoLocked ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '99px',
                background: 'rgba(229, 72, 77, 0.15)',
                color: 'var(--miss)',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
              title="Day automatically locked 12 hours after midnight. Past edits are closed."
            >
              <AppIcon name="lock" size={13} />
              <span>Auto-Locked (12h Expired)</span>
            </div>
          ) : isFuture ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '99px',
                background: 'var(--card2)',
                color: 'var(--ink3)',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              <AppIcon name="snow" size={13} />
              <span>Unlocks On Date</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn-pill"
              style={{
                background: 'var(--card2)',
                borderColor: 'var(--ice)',
                color: 'var(--ice)',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                cursor: 'pointer',
              }}
              onClick={() => setIsSubmitModalOpen(true)}
              title="Lock habits for this date permanently"
            >
              <AppIcon name="lock" size={14} />
              <span>Final Submit Day</span>
            </button>
          )}
        </div>
      </div>

      {/* Habit Tiles Grid */}
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

      {/* ── Final Submit Confirmation Modal ── */}
      <Modal
        isOpen={isSubmitModalOpen}
        title="Final Submit & Lock Day"
        onClose={() => setIsSubmitModalOpen(false)}
      >
        <div>
          <p style={{ fontSize: '14.5px', color: 'var(--ink2)', lineHeight: 1.55, margin: '0 0 16px' }}>
            Are you sure you want to finalize the submission for <b>{selectedDate}</b>?
          </p>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--miss-soft)',
              color: 'var(--miss)',
              fontSize: '13px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AppIcon name="lock" size={16} />
            <span>Once submitted, habit records for this date are locked and cannot be edited.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cta"
              disabled={submitting}
              style={{ background: 'var(--done)', borderColor: 'var(--done)' }}
              onClick={handleConfirmFinalSubmit}
            >
              <AppIcon name="lock" size={15} />
              <span>{submitting ? 'Locking...' : 'Confirm & Lock Day'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
