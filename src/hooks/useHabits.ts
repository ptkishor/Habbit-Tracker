import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Habit, Log } from '../types'

function getInitialRealHabits(): Habit[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem('wa_real_habits')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  return []
}

function getInitialRealLogs(): Log[] {
  if (typeof window === 'undefined') return []
  const saved = localStorage.getItem('wa_real_logs')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  return []
}

/**
 * Hook that loads real habits and daily execution logs.
 * Supports offline-first LocalStorage and real-time Supabase cloud sync.
 * Respects existing database contents without injecting default overrides.
 */
export function useHabits() {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>(() => getInitialRealHabits())
  const [logs, setLogs] = useState<Log[]>(() => getInitialRealLogs())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Load all active habits and all logs for this user from Supabase */
  const fetchAll = useCallback(async () => {
    if (!user) {
      setHabits(getInitialRealHabits())
      setLogs(getInitialRealLogs())
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [{ data: habitsData, error: hErr }, { data: logsData, error: lErr }] =
        await Promise.all([
          supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .eq('archived', false)
            .order('position', { ascending: true }),
          supabase
            .from('logs')
            .select('*')
            .eq('user_id', user.id),
        ])

      if (hErr) {
        console.error('Error fetching habits from Supabase:', hErr)
        setError(hErr.message)
      }
      if (lErr) {
        console.error('Error fetching logs from Supabase:', lErr)
        setError(lErr.message)
      }

      if (habitsData) {
        // Strictly keep whatever is in the database
        setHabits(habitsData as Habit[])
        localStorage.setItem('wa_real_habits', JSON.stringify(habitsData))
      }

      if (logsData) {
        setLogs(logsData as Log[])
        localStorage.setItem('wa_real_logs', JSON.stringify(logsData))
      }
    } catch (e: unknown) {
      console.warn('Network sync offline, using local data', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Real-time synchronization: subscribe to database changes for habits & logs
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`sync-habits-logs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          if (payload.eventType === 'INSERT') {
            const newHabit = payload.new as Habit
            if (!newHabit.archived) {
              setHabits(prev => {
                const exists = prev.some(h => h.id === newHabit.id)
                if (exists) return prev
                // If there's an optimistic placeholder with same name, replace it
                const optIdx = prev.findIndex(h => h.id.startsWith('custom-') && h.name === newHabit.name)
                let next: Habit[]
                if (optIdx >= 0) {
                  next = [...prev]
                  next[optIdx] = newHabit
                } else {
                  next = [...prev, newHabit]
                }
                next.sort((a, b) => a.position - b.position)
                localStorage.setItem('wa_real_habits', JSON.stringify(next))
                return next
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Habit
            setHabits(prev => {
              let next: Habit[]
              if (updated.archived) {
                next = prev.filter(h => h.id !== updated.id)
              } else {
                next = prev.map(h => (h.id === updated.id ? updated : h))
              }
              next.sort((a, b) => a.position - b.position)
              localStorage.setItem('wa_real_habits', JSON.stringify(next))
              return next
            })
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string })?.id
            if (oldId) {
              setHabits(prev => {
                const next = prev.filter(h => h.id !== oldId)
                localStorage.setItem('wa_real_habits', JSON.stringify(next))
                return next
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'logs',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newLog = payload.new as Log
            setLogs(prev => {
              const idx = prev.findIndex(l => l.habit_id === newLog.habit_id && l.date === newLog.date)
              let next: Log[]
              if (idx >= 0) {
                next = [...prev]
                next[idx] = newLog
              } else {
                next = [...prev, newLog]
              }
              localStorage.setItem('wa_real_logs', JSON.stringify(next))
              return next
            })
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id
            if (oldId) {
              setLogs(prev => {
                const next = prev.filter(l => l.id !== oldId)
                localStorage.setItem('wa_real_logs', JSON.stringify(next))
                return next
              })
            } else {
              fetchAll()
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchAll])

  /** Upsert a log entry for a habit on a given date */
  async function upsertLog(habitId: string, date: string, updates: Partial<Log>) {
    const userId = user?.id || 'real-user'
    let nextLogs: Log[] = []

    setLogs(prev => {
      const existing = prev.find(l => l.habit_id === habitId && l.date === date)
      const optimistic: Log = {
        id: existing?.id || `log-${date}-${habitId}`,
        habit_id: habitId,
        user_id: userId,
        date,
        status: updates.status !== undefined ? updates.status : existing?.status ?? null,
        value: updates.value !== undefined ? updates.value : existing?.value ?? 0,
      }
      const idx = prev.findIndex(l => l.habit_id === habitId && l.date === date)
      if (idx >= 0) {
        nextLogs = [...prev]
        nextLogs[idx] = optimistic
      } else {
        nextLogs = [...prev, optimistic]
      }
      localStorage.setItem('wa_real_logs', JSON.stringify(nextLogs))
      return nextLogs
    })

    if (user) {
      let targetHabitId = habitId
      // Ensure targetHabitId is a valid UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetHabitId)
      if (!isUuid) {
        const found = habits.find(h => h.id === habitId)
        if (found) {
          const { data: dbH } = await supabase
            .from('habits')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', found.name)
            .maybeSingle()
          if (dbH?.id) {
            targetHabitId = dbH.id
          }
        }
      }

      const logData = {
        habit_id: targetHabitId,
        user_id: user.id,
        date,
        status: updates.status !== undefined ? updates.status : null,
        value: updates.value !== undefined ? updates.value : 0,
      }

      try {
        const { data, error } = await supabase
          .from('logs')
          .upsert(logData, { onConflict: 'habit_id,date' })
          .select()
          .single()

        if (error) {
          console.error('upsertLog Supabase error:', error)
          setError(error.message)
        } else if (data) {
          setLogs(prev => {
            const next = prev.map(l =>
              (l.habit_id === habitId || l.habit_id === targetHabitId) && l.date === date
                ? (data as Log)
                : l
            )
            localStorage.setItem('wa_real_logs', JSON.stringify(next))
            return next
          })
        }
      } catch (err: any) {
        console.error('upsertLog network sync error:', err)
        setError(err?.message || 'Sync failed')
      }
    }
  }

  /** Add a new habit */
  async function addHabit(habit: Omit<Habit, 'id' | 'user_id' | 'created_at'>) {
    const userId = user?.id || 'real-user'
    const tempId = `custom-${Date.now()}`
    const newHabit: Habit = {
      ...habit,
      id: tempId,
      user_id: userId,
      position: habits.length + 1,
      archived: false,
    }

    setHabits(prev => {
      const next = [...prev, newHabit].sort((a, b) => a.position - b.position)
      localStorage.setItem('wa_real_habits', JSON.stringify(next))
      return next
    })

    if (user) {
      const payload: Record<string, unknown> = {
        name: habit.name,
        type: habit.type,
        target: habit.target ?? null,
        unit: habit.unit ?? null,
        color: habit.color ?? null,
        position: habits.length + 1,
        archived: false,
        user_id: user.id,
      }

      let { data, error } = await supabase.from('habits').insert(payload).select().single()
      if (error && error.message?.includes('color')) {
        delete payload.color
        const fallback = await supabase.from('habits').insert(payload).select().single()
        data = fallback.data
        error = fallback.error
      }

      if (error) {
        console.error('Error inserting habit into Supabase:', error)
        setError(error.message)
      } else if (data) {
        const savedHabit = data as Habit
        setHabits(prev => {
          const next = prev.map(h => (h.id === tempId ? savedHabit : h))
          localStorage.setItem('wa_real_habits', JSON.stringify(next))
          return next
        })
      }
    }
  }

  /** Update an existing habit */
  async function updateHabit(id: string, updates: Partial<Habit>) {
    setHabits(prev => {
      const next = prev.map(h => (h.id === id ? { ...h, ...updates } : h))
      localStorage.setItem('wa_real_habits', JSON.stringify(next))
      return next
    })

    if (user) {
      const payload: Record<string, unknown> = { ...updates }
      let { error } = await supabase.from('habits').update(payload).eq('id', id)
      if (error && error.message?.includes('color')) {
        delete payload.color
        const fallback = await supabase.from('habits').update(payload).eq('id', id)
        error = fallback.error
      }
      if (error) {
        console.error('Error updating habit in Supabase:', error)
        setError(error.message)
      }
    }
  }

  /** Archive (soft-delete) a habit */
  async function archiveHabit(id: string) {
    setHabits(prev => {
      const next = prev.filter(h => h.id !== id)
      localStorage.setItem('wa_real_habits', JSON.stringify(next))
      return next
    })

    if (user) {
      const { error } = await supabase.from('habits').update({ archived: true }).eq('id', id)
      if (error) {
        console.error('Error archiving habit in Supabase:', error)
        setError(error.message)
      }
    }
  }

  /** Reorder habits by setting new position values */
  async function reorderHabits(reordered: Habit[]) {
    const updated = reordered.map((h, i) => ({ ...h, position: i + 1 }))
    setHabits(updated)
    localStorage.setItem('wa_real_habits', JSON.stringify(updated))

    if (user) {
      const updates = updated.map((h, i) =>
        supabase.from('habits').update({ position: i + 1 }).eq('id', h.id)
      )
      const results = await Promise.all(updates)
      const err = results.find(r => r.error)?.error
      if (err) {
        console.error('Error reordering habits in Supabase:', err)
        setError(err.message)
      }
    }
  }

  /** Apply 1-click preset protocols */
  async function applyPresetHabits(newHabits: Omit<Habit, 'id' | 'user_id' | 'created_at'>[]) {
    const userId = user?.id || 'real-user'
    if (user) {
      // Archive existing habits
      await supabase.from('habits').update({ archived: true }).eq('user_id', user.id)
      const toInsert = newHabits.map((h, i) => ({
        ...h,
        user_id: user.id,
        position: i + 1,
        archived: false,
      }))
      let { data, error } = await supabase.from('habits').insert(toInsert).select()
      if (error && error.message?.includes('color')) {
        const fallback = toInsert.map(({ color, ...rest }) => rest)
        const res = await supabase.from('habits').insert(fallback).select()
        data = res.data
      }
      if (data) {
        setHabits(data as Habit[])
        localStorage.setItem('wa_real_habits', JSON.stringify(data))
      }
    } else {
      const remapped: Habit[] = newHabits.map((h, i) => ({
        ...h,
        id: `habit-${i + 1}`,
        user_id: userId,
        position: i + 1,
        archived: false,
      }))
      setHabits(remapped)
      localStorage.setItem('wa_real_habits', JSON.stringify(remapped))
    }
  }

  /** Reset all challenge logs */
  async function resetAllLogs() {
    setLogs([])
    localStorage.removeItem('wa_real_logs')
    if (user) {
      const { error } = await supabase.from('logs').delete().eq('user_id', user.id)
      if (error) {
        console.error('Error resetting logs in Supabase:', error)
        setError(error.message)
      }
    }
  }

  return {
    habits,
    logs,
    loading,
    error,
    upsertLog,
    addHabit,
    updateHabit,
    archiveHabit,
    reorderHabits,
    applyPresetHabits,
    resetAllLogs,
    refetch: fetchAll,
  }
}
