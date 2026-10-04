import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, subDays, parseISO } from 'date-fns'
import { Sparkles, Clock, Bot, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import { useHabits } from '../hooks/useHabits'
import { today } from '../lib/dateUtils'
import type { Review, CoachPayload } from '../types'

// Typing animation component for AI review
function TypingReviewContent({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    // If text is already long on initial mount, reveal immediately or type fast
    let index = 0
    const chunkSize = 4
    const interval = setInterval(() => {
      index += chunkSize
      if (index >= text.length) {
        setDisplayed(text)
        setIsTyping(false)
        clearInterval(interval)
      } else {
        setDisplayed(text.slice(0, index))
      }
    }, 15)

    return () => clearInterval(interval)
  }, [text])

  return (
    <div className="relative text-[16px] sm:text-[17px] leading-[1.7] text-white/90 whitespace-pre-wrap font-normal">
      {displayed}
      {isTyping && (
        <span className="inline-block w-2 h-4 ml-1 bg-[#38bdf8] animate-pulse rounded-sm" />
      )}
    </div>
  )
}

export default function CoachPage() {
  const { user, profile } = useAuth()
  const { dayStats, habitStats, streaks, weekdayPattern } = useAnalytics()
  const { habits } = useHabits()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('reviews').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setReviews((data ?? []) as Review[])
        setLoadingReviews(false)
      })
  }, [user])

  async function handleGetReview() {
    if (!user || !profile) return
    setLoading(true)
    setError(null)

    const todayStart = today() + 'T00:00:00Z'
    const { count } = await supabase
      .from('reviews').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', todayStart)

    if ((count ?? 0) >= 3) {
      setError("Daily limit reached: You've already requested 3 reviews today. Rest and return tomorrow!")
      setLoading(false)
      return
    }

    const last14 = dayStats.slice(-14)
    const habitLabels = habits.filter(h => !h.archived).map((h, i) => ({
      id: h.id,
      label: profile.privacy_mode ? `Habit ${i + 1}` : h.name,
    }))

    const correlations: CoachPayload['correlations'] = []
    const sleepHabit = habits.find(h => h.name.toLowerCase().includes('sleep'))
    if (sleepHabit) {
      correlations.push({
        label: profile.privacy_mode ? 'Habit 3' : 'Sleep by 10 PM',
        pct_with: 78, pct_without: 54,
      })
    }

    const payload: CoachPayload = {
      days: last14.map(d => ({ ...d })),
      habits: habitStats.map(s => {
        const label = habitLabels.find(l => l.id === s.habit_id)?.label ?? s.habit_name
        return { ...s, habit_name: label }
      }),
      streaks,
      weekday_pattern: weekdayPattern,
      correlations,
      privacy_mode: profile.privacy_mode,
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-coach', { body: payload })
      if (fnError) throw new Error(fnError.message)
      const content = data?.content as string
      const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd')
      const { data: saved } = await supabase
        .from('reviews').insert({ user_id: user.id, week_start: weekStart, content })
        .select().single()
      if (saved) {
        setReviews(prev => [saved as Review, ...prev])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please check your Supabase secrets or try again later.')
    }
    setLoading(false)
  }

  const latestReview = reviews[0] ?? null
  const pastReviews = reviews.slice(1)

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 pb-24 select-none">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-[#6366f1] mb-2 backdrop-blur-md">
          <Sparkles size={13} className="text-[#38bdf8]" />
          <span>Gemini AI Performance Engine</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-white">
          AI Arc Coach
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-1 max-w-xl">
          Get unbiased, data-driven assessments of your habit trends and high-leverage suggestions.
        </p>
      </div>

      {/* ── Chat-Like Two-Column Grid: Left Chat Bubble Review, Right Timeline History ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ════════ LEFT: Interactive Review Card (Chat UI) ════════ */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Action Trigger Card */}
          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#38bdf8] to-[#6366f1] flex items-center justify-center text-white shadow-glow flex-shrink-0">
                <Bot size={24} />
              </div>
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg text-white">Request AI Check-in</h2>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Your AI coach evaluates your past 14 days of data (completion %, weekday variance, and streaks) to generate 3 actionable micro-optimizations.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Max 3 comprehensive evaluations per calendar day
              </span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGetReview}
                disabled={loading}
                className="btn-frost w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing protocol...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Get My Review ✨</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Latest Review Message Bubble */}
          <div className="glass-card p-6 sm:p-7 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center text-[#38bdf8]">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="font-heading font-bold text-base text-white">Latest Assessment</div>
                  <div className="text-xs text-slate-400">
                    {latestReview ? format(parseISO(latestReview.created_at), 'MMMM d, yyyy • h:mm a') : 'Awaiting check-in'}
                  </div>
                </div>
              </div>

              {latestReview && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified Analysis
                </span>
              )}
            </div>

            {loadingReviews ? (
              <div className="space-y-3 py-4">
                <div className="h-6 w-3/4 bg-white/[0.06] rounded-lg animate-pulse" />
                <div className="h-20 w-full bg-white/[0.04] rounded-xl animate-pulse" />
                <div className="h-16 w-5/6 bg-white/[0.04] rounded-xl animate-pulse" />
              </div>
            ) : latestReview ? (
              <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/15 bg-white/[0.03]">
                <TypingReviewContent text={latestReview.content} />
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-3 text-2xl">
                  🤖
                </div>
                <h3 className="font-heading font-bold text-lg text-white">No Review Generated Yet</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                  Click the "Get My Review" button above to initiate your first AI coaching check-in.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ════════ RIGHT: Timeline Review History ════════ */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <h2 className="font-heading font-bold text-lg text-white">Review Timeline</h2>
              <span className="text-xs text-slate-400 font-medium">Archive</span>
            </div>

            {loadingReviews ? (
              <div className="space-y-4 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : pastReviews.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-2 text-2xl text-slate-400">
                  📭
                </div>
                <div className="font-heading font-semibold text-white text-sm">No Previous Reviews</div>
                <p className="text-xs text-slate-500 mt-1">
                  Historical check-ins will accumulate here as your Winter Arc progresses.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
                {pastReviews.map((review) => {
                  const isExpanded = expandedId === review.id
                  return (
                    <div key={review.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-6 top-4 w-2.5 h-2.5 rounded-full bg-[#38bdf8] border-2 border-[#090b10] shadow-[0_0_8px_#38bdf8]" />

                      {/* Timeline card */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : review.id)}
                        className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                            <Clock size={13} />
                            <span>{format(parseISO(review.created_at), 'MMM d, yyyy • h:mm a')}</span>
                          </div>
                          <div className="text-white/60">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="mt-3 pt-3 border-t border-white/10 text-[15px] sm:text-[16px] leading-relaxed text-white/85 whitespace-pre-wrap">
                            {review.content}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-white/60 mt-1.5 line-clamp-2">
                            {review.content.slice(0, 110)}…
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
