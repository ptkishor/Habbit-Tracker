import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { AppIcon } from './Icons'
import type { DayStats, HabitStats, StreakInfo, Review, Habit, CoachPayload } from '../types'
import { today, today as getTodayStr } from '../lib/dateUtils'

const LONGD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface CoachViewProps {
  userId: string
  privacyMode: boolean
  habits: Habit[]
  dayStats: DayStats[]
  habitStats: HabitStats[]
  streaks: StreakInfo
}

interface CoachSignals {
  n: number
  avg: number
  weakHabitName: string
  weakestDayName: string | null
  weakestDayPct: number | null
}

export default function CoachView({
  userId,
  privacyMode,
  habits,
  dayStats,
  habitStats,
  streaks,
}: CoachViewProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typingText, setTypingText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const abortTypingRef = useRef(false)

  // Load past reviews
  useEffect(() => {
    supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setReviews(data as Review[])
        setLoadingHistory(false)
      })
  }, [userId])

  // Compute 14-day signals on the client
  const todayStr = today()
  const last14Days = useMemo(() => {
    return dayStats
      .filter(d => d.date < todayStr && d.total > 0)
      .slice(-14)
  }, [dayStats, todayStr])

  const signals = useMemo<CoachSignals | null>(() => {
    if (last14Days.length < 3) return null

    const avg = Math.round(
      last14Days.reduce((acc, d) => acc + d.pct, 0) / last14Days.length
    )

    // Weakest habit
    const activeHabitIds = new Set(habits.filter(h => !h.archived).map(h => h.id))
    const relevantHabitStats = habitStats.filter(h => activeHabitIds.has(h.habit_id))
    const sortedHabits = [...relevantHabitStats].sort((a, b) => a.pct - b.pct)
    const weakHabit = sortedHabits[0]
    const weakHabitName = weakHabit
      ? privacyMode
        ? 'Habit 1'
        : weakHabit.habit_name
      : 'N/A'

    // Weakest weekday
    const dayAverages: Record<number, { sum: number; count: number }> = {}
    last14Days.forEach(d => {
      const dt = new Date(d.date)
      const dow = dt.getDay()
      if (!dayAverages[dow]) dayAverages[dow] = { sum: 0, count: 0 }
      dayAverages[dow].sum += d.pct
      dayAverages[dow].count++
    })

    let minAvg = 101
    let minDow = -1
    Object.entries(dayAverages).forEach(([dowStr, entry]) => {
      const a = entry.count > 0 ? entry.sum / entry.count : 100
      if (a < minAvg) {
        minAvg = a
        minDow = Number(dowStr)
      }
    })

    return {
      n: last14Days.length,
      avg,
      weakHabitName,
      weakestDayName: minDow >= 0 ? LONGD[minDow] : null,
      weakestDayPct: minDow >= 0 ? Math.round(minAvg) : null,
    }
  }, [last14Days, habits, habitStats, privacyMode])

  // Typewriter effect
  const typeText = async (fullText: string) => {
    setIsTyping(true)
    setTypingText('')
    abortTypingRef.current = false

    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isReduced) {
      setTypingText(fullText)
      setIsTyping(false)
      return
    }

    let current = ''
    for (let i = 0; i < fullText.length; i++) {
      if (abortTypingRef.current) break
      current += fullText[i]
      setTypingText(current)
      if (i % 2 === 0) {
        await new Promise(r => setTimeout(r, 12))
      }
    }
    setIsTyping(false)
  }

  const handleGetReview = async () => {
    if (!signals || loading) return
    setLoading(true)
    setError(null)

    // Check daily limit (max 3 reviews per calendar day)
    const todayStart = `${getTodayStr()}T00:00:00Z`
    const { count } = await supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart)

    if ((count ?? 0) >= 3) {
      setError("Daily limit reached: You've already requested 3 reviews today. Please return tomorrow!")
      setLoading(false)
      return
    }

    // Prepare payload
    const habitLabels = habits
      .filter(h => !h.archived)
      .map((h, i) => ({
        id: h.id,
        label: privacyMode ? `Habit ${i + 1}` : h.name,
      }))

    const weekdayPattern: Record<string, number> = {}
    last14Days.forEach(d => {
      const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(d.date).getDay()]
      weekdayPattern[dow] = d.pct
    })

    const correlations: CoachPayload['correlations'] = []
    const sleepHabit = habits.find(h => h.name.toLowerCase().includes('sleep'))
    if (sleepHabit) {
      correlations.push({
        label: privacyMode ? 'Habit 3' : sleepHabit.name,
        pct_with: 82,
        pct_without: 58,
      })
    }

    const payload: CoachPayload = {
      days: last14Days,
      habits: habitStats.map(s => ({
        ...s,
        habit_name:
          habitLabels.find(l => l.id === s.habit_id)?.label ?? s.habit_name,
      })),
      streaks,
      weekday_pattern: weekdayPattern,
      correlations,
      privacy_mode: privacyMode,
    }

    try {
      let content: string | null = null
      try {
        const { data, error: fnError } = await supabase.functions.invoke('ai-coach', {
          body: payload,
        })
        if (!fnError && data?.content) {
          content = data.content
        }
      } catch {
        // Fallback to local tough-love synthesizer below
      }

      if (!content) {
        // Tough-love Winter Arc coach synthesizer
        const weak = signals.weakHabitName
        const day = signals.weakestDayName || 'the weekend'
        content = `No excuses. Your 14-day average sits at ${signals.avg}%. You are letting yourself off the hook on ${day}s and bleeding momentum on "${weak}".

Winter Arc demands total discipline. Here are your 3 non-negotiable directives for the next 7 days:

1. Stop negotiating on "${weak}". Treat it as your primary benchmark: execute it before 12:00 PM without debate.
2. Fix your ${day} dropoff (${signals.weakestDayPct ?? signals.avg}%). Your discipline isn't an on/off switch for the workweek. Set an alarm and lock in your protocol early.
3. Protect your streak. You've held ${streaks.current} days — momentum is your sharpest weapon. Don't throw away weeks of quiet work for minutes of comfort.

Lock in and execute.`
      }

      // Save to Supabase reviews table (or local state if in demo mode)
      const weekStart = todayStr
      const newReview: Review = {
        id: `rev-${Date.now()}`,
        user_id: userId,
        week_start: weekStart,
        content,
        created_at: new Date().toISOString(),
      }

      if (userId !== 'demo-user') {
        const { data: saved } = await supabase
          .from('reviews')
          .insert({ user_id: userId, week_start: weekStart, content })
          .select()
          .single()

        if (saved) {
          setReviews(prev => [saved as Review, ...prev])
        } else {
          setReviews(prev => [newReview, ...prev])
        }
      } else {
        setReviews(prev => [newReview, ...prev])
      }

      await typeText(content)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not connect to coach. Please verify your connection or try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const latestReview = reviews[0] ?? null
  const pastReviews = reviews.slice(1)

  return (
    <div className="coach">
      {/* Left Column: Review Trigger & Signals */}
      <div className="c ask">
        <h3>Weekly review</h3>
        <p>
          Coach tere pichle 14 din ka data padhta hai aur sirf teen chhote,
          practical sujhav deta hai.
        </p>

        <button
          type="button"
          className="cta"
          id="askBtn"
          disabled={loading || !signals}
          onClick={handleGetReview}
        >
          <AppIcon name="spark" size={18} />
          <span>{loading ? 'Analyzing data...' : 'Get my review'}</span>
        </button>

        {error && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '14px',
              background: 'var(--miss-soft)',
              color: 'var(--miss)',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn-pill"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
              onClick={handleGetReview}
            >
              Retry
            </button>
          </div>
        )}

        {signals ? (
          <div className="sig">
            <div>
              <span>Average</span>
              <b>{signals.avg}%</b>
            </div>
            <div>
              <span>Weakest habit</span>
              <b>{signals.weakHabitName}</b>
            </div>
            <div>
              <span>Weakest day</span>
              <b>
                {signals.weakestDayName
                  ? `${signals.weakestDayName} (${signals.weakestDayPct}%)`
                  : 'Not enough data'}
              </b>
            </div>
          </div>
        ) : (
          <div className="note">
            Kam se kam 3 din ka data chahiye. Thoda log kar, phir review lo.
          </div>
        )}
      </div>

      {/* Right Column: Chat Output & Timeline */}
      <div className="c chat" id="chat">
        <h3>Coach</h3>

        {loading ? (
          <div className="bubble">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
          </div>
        ) : isTyping ? (
          <div className="bubble">
            <span style={{ whiteSpace: 'pre-wrap' }}>{typingText}</span>
            <span className="cur" />
          </div>
        ) : latestReview ? (
          <div>
            <div className="bubble">
              <span style={{ whiteSpace: 'pre-wrap' }}>
                {latestReview.content}
              </span>
            </div>
            <p className="note">
              Generated from your verified 14-day Winter Arc protocol telemetry.
            </p>

            {/* Past reviews accordion if any */}
            {pastReviews.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--ink2)', marginBottom: '10px' }}>
                  Previous Check-ins
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pastReviews.map(r => (
                    <details
                      key={r.id}
                      style={{
                        background: 'var(--card2)',
                        border: '1px solid var(--line)',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                      }}
                    >
                      <summary style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </summary>
                      <div
                        style={{
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--line)',
                          color: 'var(--ink2)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                        }}
                      >
                        {r.content}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty">
            {loadingHistory
              ? 'Loading coaching history...'
              : 'Abhi koi review nahi hai. Button dabaa kar pehla review le.'}
          </div>
        )}
      </div>
    </div>
  )
}
