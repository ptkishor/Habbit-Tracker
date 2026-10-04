import { useState, useEffect, useMemo, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import SnowCanvas from './components/SnowCanvas'
import DialPanel from './components/DialPanel'
import DayStrip from './components/DayStrip'
import TodayView from './components/TodayView'
import InsightsView from './components/InsightsView'
import CoachView from './components/CoachView'
import SettingsView from './components/SettingsView'
import TabsNav, { TabKey } from './components/TabsNav'
import AuthPage from './pages/AuthPage'
import Modal from './components/Modal'
import { SkeletonDialPanel, SkeletonTile } from './components/Skeleton'
import { useHabits } from './hooks/useHabits'
import {
  today,
  computeDayStats,
  computeHabitStats,
  computeStreaks,
  getChallengeDates,
  getChallengeDayStatus,
} from './lib/dateUtils'
import { AppIcon } from './components/Icons'

const QUOTES = [
  'Discipline is a decision you make again each morning.',
  'Once momentum kicks in, going backward isn\'t even an option.',
  'Commit for 3 months. Build a version of yourself you\'re proud of.',
  'Cold builds character. Lock in.',
  'Small wins, stacked daily.',
  'Quiet work now, loud results later.',
  'The standard: no junk, hydrate, train, sleep, execute.',
]

const LONGD = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const MON = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function getGreeting(displayName?: string, email?: string): string {
  const h = new Date().getHours()
  const timeGreeting =
    h < 5
      ? 'Still up'
      : h < 12
      ? 'Good morning'
      : h < 17
      ? 'Good afternoon'
      : 'Good evening'

  let name = displayName
  if (!name && email) {
    const raw = email.split('@')[0]
    name = raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  return name ? `${timeGreeting}, ${name}` : timeGreeting
}

function MainApp() {
  const { user, profile, refreshProfile, signOut, updateProfile } = useAuth()
  const {
    habits,
    logs,
    loading: loadingHabits,
    error: habitError,
    upsertLog,
    addHabit,
    updateHabit,
    archiveHabit,
    reorderHabits,
    resetAllLogs,
    refetch,
  } = useHabits()

  const currentToday = today()
  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [selectedDate, setSelectedDate] = useState<string>(currentToday)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false)

  // Midnight watcher to auto-advance to current day
  useEffect(() => {
    const checkDate = () => {
      const nowToday = today()
      if (nowToday !== selectedDate && selectedDate === currentToday) {
        setSelectedDate(nowToday)
      }
    }
    const interval = setInterval(checkDate, 60000)
    window.addEventListener('focus', checkDate)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', checkDate)
    }
  }, [currentToday, selectedDate])

  const effectiveUserId = user?.id ?? 'real-user'
  const effectiveEmail = user?.email

  // Load immutable locked snapshots to ensure added/removed habits never alter locked days
  const [lockedSnapshots, setLockedSnapshots] = useState<
    Record<string, { total: number; completed: number; pct: number; isDone: boolean }>
  >(() => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem(`wa_locked_snapshots_${effectiveUserId}`)
      if (!saved) return {}
      const parsed = JSON.parse(saved)
      // Heal any corrupted snapshot where total was inflated due to un-deduplicated habits
      let healed = false
      for (const k of Object.keys(parsed)) {
        if (parsed[k]?.total > 20) {
          delete parsed[k]
          healed = true
        }
      }
      if (healed) {
        localStorage.setItem(`wa_locked_snapshots_${effectiveUserId}`, JSON.stringify(parsed))
      }
      return parsed
    } catch {
      return {}
    }
  })

  // Watch for snapshot updates across views
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `wa_locked_snapshots_${effectiveUserId}` && e.newValue) {
        try {
          setLockedSnapshots(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [effectiveUserId])

  const earliestLogDate = useMemo(() => {
    if (!logs.length) return currentToday
    const validDates = logs.map(l => l.date).filter(Boolean).sort()
    return validDates[0] || currentToday
  }, [logs, currentToday])

  const effectiveStartDate = useMemo(() => {
    if (profile?.start_date) {
      return profile.start_date < earliestLogDate ? profile.start_date : (logs.length > 0 ? earliestLogDate : profile.start_date)
    }
    return logs.length > 0 ? earliestLogDate : currentToday
  }, [profile?.start_date, earliestLogDate, logs.length, currentToday])

  const startDate = effectiveStartDate
  const durationDays = profile?.duration_days ?? 90
  const threshold = profile?.threshold ?? 80

  // Guarantee selectedDate does not exceed currentToday (future dates are locked)
  useEffect(() => {
    if (selectedDate > currentToday) {
      setSelectedDate(currentToday)
    }
  }, [currentToday, selectedDate])

  const dayStatus = useMemo(() => {
    return getChallengeDayStatus(selectedDate, startDate, durationDays)
  }, [selectedDate, startDate, durationDays])

  const challengeDates = useMemo(() => {
    return getChallengeDates(startDate, durationDays)
  }, [startDate, durationDays])

  // Include both challenge dates and all logged dates so past logs are never omitted
  const allStatsDates = useMemo(() => {
    const datesSet = new Set<string>(challengeDates)
    for (const l of logs) {
      if (l.date && l.date <= currentToday) {
        datesSet.add(l.date)
      }
    }
    return Array.from(datesSet).sort()
  }, [challengeDates, logs, currentToday])

  // Real Day stats computed from real habits and logs (preserving locked day snapshots)
  const dayStats = useMemo(() => {
    return computeDayStats(allStatsDates, habits, logs, threshold, lockedSnapshots)
  }, [allStatsDates, habits, logs, threshold, lockedSnapshots])

  // Real Habit stats
  const habitStats = useMemo(() => {
    return computeHabitStats(habits, logs, challengeDates)
  }, [habits, logs, challengeDates])

  // Real Streaks live computed
  const streaks = useMemo(() => {
    return computeStreaks(dayStats, currentToday)
  }, [dayStats, currentToday])

  // Selected date completion %
  const selectedDayPct = useMemo(() => {
    const stat = dayStats.find(d => d.date === selectedDate)
    if (stat && stat.total > 0) {
      return stat.completed / stat.total
    }
    return 0
  }, [dayStats, selectedDate])

  // Historical Average completion %
  const averagePct = useMemo(() => {
    const past = dayStats.filter(
      d => (d.date < currentToday || d.pct > 0) && d.total > 0
    )
    if (!past.length) return 0
    return Math.round(past.reduce((acc, d) => acc + d.pct, 0) / past.length)
  }, [dayStats, currentToday])

  // Header date & quote
  const selDateObj = useMemo(() => new Date(selectedDate), [selectedDate])
  const quote = useMemo(() => {
    const d = new Date()
    return QUOTES[(d.getDate() + d.getMonth()) % QUOTES.length]
  }, [])

  const handleSelectTab = useCallback((t: TabKey) => {
    setActiveTab(t)
    if (window.innerWidth <= 980) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  return (
    <div className="app">
      {/* ── Left Panel (Brand, 90-Tick Dial, Streak Stats, Footer) ── */}
      {loadingHabits ? (
        <SkeletonDialPanel />
      ) : (
        <DialPanel
          startDate={startDate}
          durationDays={durationDays}
          selectedDate={selectedDate}
          dayStats={dayStats}
          streakCurrent={streaks.current}
          streakBest={streaks.best}
          averagePct={averagePct}
          selectedDayPct={selectedDayPct}
          onOpenStreakDetails={() => setIsStreakModalOpen(true)}
        />
      )}

      {/* ── Main View (Header, Tabs, Strip, Content) ── */}
      <main className="main">
        {/* Top Header */}
        <header className="top">
          <div>
            <h1 id="greet">
              {getGreeting(
                profile?.display_name ||
                  user?.user_metadata?.display_name ||
                  user?.user_metadata?.full_name,
                effectiveEmail
              )}
            </h1>
            <p className="sub" id="sub" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <b>
                {LONGD[selDateObj.getDay()]}, {selDateObj.getDate()}{' '}
                {MON[selDateObj.getMonth()]}
              </b>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 9px',
                  borderRadius: '99px',
                  background: 'rgba(94, 208, 255, 0.12)',
                  border: '1px solid rgba(94, 208, 255, 0.3)',
                  color: 'var(--ice)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {dayStatus.statusText}
              </span>
              <span style={{ opacity: 0.4 }}>—</span>
              <span>{quote}</span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <TabsNav activeTab={activeTab} onSelectTab={handleSelectTab} />

            {/* Live Interactive Streak Button */}
            <button
              type="button"
              className="btn-pill"
              id="streak-header-btn"
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                background: streaks.current > 0
                  ? 'radial-gradient(ellipse at center, rgba(255, 107, 61, 0.22) 0%, rgba(255, 107, 61, 0.08) 100%)'
                  : streaks.best > 0
                  ? 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0.06) 100%)'
                  : 'var(--card)',
                borderColor: streaks.current > 0
                  ? 'rgba(255, 107, 61, 0.45)'
                  : streaks.best > 0
                  ? 'rgba(56, 189, 248, 0.4)'
                  : 'var(--line)',
                color: streaks.current > 0
                  ? '#FFA726'
                  : streaks.best > 0
                  ? 'var(--ice)'
                  : 'var(--ink2)',
                borderRadius: '99px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: streaks.current > 0
                  ? '0 0 14px rgba(255, 107, 61, 0.25)'
                  : streaks.best > 0
                  ? '0 0 12px rgba(56, 189, 248, 0.2)'
                  : 'none',
                transition: 'all .25s ease',
              }}
              onClick={() => setIsStreakModalOpen(true)}
              title={
                streaks.current > 0
                  ? `Active Streak: ${streaks.current} Days • Highest: ${streaks.best} Days`
                  : streaks.best > 0
                  ? `Streak broken (0d). All-time Highest: ${streaks.best} Days! Click for details.`
                  : 'Streak: 0d. Start completing daily habits!'
              }
            >
              <span
                style={{
                  fontSize: '15px',
                  lineHeight: 1,
                  filter: streaks.current > 0 ? 'drop-shadow(0 0 6px rgba(255, 107, 61, 0.8))' : 'none',
                }}
              >
                {streaks.current > 0 ? '🔥' : streaks.best > 0 ? '🏆' : '🔥'}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {streaks.current > 0
                  ? `${streaks.current}d Streak`
                  : streaks.best > 0
                  ? `0d • Highest: ${streaks.best}d`
                  : '0d Streak'}
              </span>
              {streaks.current > 0 && streaks.best > streaks.current && (
                <span style={{ fontSize: '11px', opacity: 0.75, fontWeight: 600 }}>
                  (Highest: {streaks.best}d)
                </span>
              )}
            </button>

            {/* Cloud Sync Status / Refresh button */}
            {user ? (
              <button
                type="button"
                className="btn-pill"
                style={{
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  background: 'var(--card)',
                  borderColor: habitError ? 'var(--miss)' : 'var(--done)',
                  color: habitError ? 'var(--miss)' : 'var(--done)',
                  borderRadius: '99px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
                onClick={async () => {
                  await Promise.all([refetch(), refreshProfile()])
                }}
                title="Click to force sync with Supabase database"
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: loadingHabits ? 'var(--ember)' : habitError ? 'var(--miss)' : 'var(--done)',
                    display: 'inline-block',
                  }}
                />
                <span>{loadingHabits ? 'Syncing...' : habitError ? 'Sync Error' : 'Cloud Synced'}</span>
                <AppIcon name="refresh" size={12} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-pill"
                style={{
                  padding: '8px 14px',
                  fontSize: '13px',
                  background: 'var(--card)',
                  borderColor: 'var(--ice)',
                  color: 'var(--ice)',
                  borderRadius: '99px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={() => setIsAuthModalOpen(true)}
                title="Connect Supabase for cloud backup"
              >
                <AppIcon name="mail" size={14} />
                <span>Sync Cloud</span>
              </button>
            )}

            {/* Settings Gear Button */}
            <button
              type="button"
              className={`iconbtn ${activeTab === 'settings' ? 'on' : ''}`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: activeTab === 'settings' ? 'var(--card)' : 'transparent',
                borderColor: activeTab === 'settings' ? 'var(--ice)' : 'var(--line)',
                color: activeTab === 'settings' ? 'var(--ice)' : 'var(--ink2)',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--line)',
                transition: 'all .25s',
              }}
              onClick={() => handleSelectTab('settings')}
              title="Settings & Protocol"
              aria-label="Settings"
            >
              <AppIcon name="gear" size={17} />
            </button>
          </div>
        </header>

        {/* Error banner if network sync fails */}
        {habitError && (
          <div
            style={{
              padding: '10px 14px',
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
            <span>Telemetry notice: Running in offline local mode. Changes will sync once connected.</span>
            <button
              type="button"
              className="btn-pill"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
              onClick={refetch}
            >
              <AppIcon name="refresh" size={13} />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {/* 14-Day Date Strip (shown on Today tab) */}
        {activeTab === 'today' && (
          <DayStrip
            startDate={startDate}
            durationDays={durationDays}
            selectedDate={selectedDate}
            dayStats={dayStats}
            onSelectDate={setSelectedDate}
          />
        )}

        {/* Content Views */}
        <section key={activeTab} className="view in" id="view">
          {loadingHabits ? (
            <div className="habits">
              {Array.from({ length: 16 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : activeTab === 'today' ? (
            <TodayView
              userId={effectiveUserId}
              habits={habits}
              logs={logs}
              selectedDate={selectedDate}
              startDate={startDate}
              streaks={streaks}
              onUpdateLog={upsertLog}
              onGoToSettings={() => handleSelectTab('settings')}
            />
          ) : activeTab === 'insights' ? (
            <InsightsView
              startDate={startDate}
              durationDays={durationDays}
              threshold={threshold}
              dayStats={dayStats}
              habitStats={habitStats}
              streaks={streaks}
            />
          ) : activeTab === 'coach' ? (
            <CoachView
              userId={effectiveUserId}
              privacyMode={profile?.privacy_mode ?? false}
              habits={habits}
              dayStats={dayStats}
              habitStats={habitStats}
              streaks={streaks}
            />
          ) : (
            <SettingsView
              userEmail={effectiveEmail}
              profile={profile!}
              habits={habits.filter(h => !h.archived)}
              logs={logs}
              onRefreshProfile={refreshProfile}
              onUpdateProfile={updateProfile}
              onSignOut={signOut}
              onAddHabit={addHabit}
              onUpdateHabit={updateHabit}
              onArchiveHabit={archiveHabit}
              onReorderHabits={reorderHabits}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onResetAllLogs={resetAllLogs}
            />
          )}
        </section>
      </main>

      {/* Supabase Auth Modal for Cloud Sync */}
      <Modal
        isOpen={isAuthModalOpen}
        title="Supabase Cloud Account"
        onClose={() => setIsAuthModalOpen(false)}
      >
        <AuthPage onEnterDemo={() => setIsAuthModalOpen(false)} />
      </Modal>

      {/* Streak Details Modal */}
      <Modal
        isOpen={isStreakModalOpen}
        title="Streak Intelligence & Milestones"
        onClose={() => setIsStreakModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Flame or Highest Streak Banner */}
          {streaks.current > 0 ? (
            <div
              style={{
                padding: '22px 18px',
                borderRadius: '20px',
                background: 'radial-gradient(ellipse at center, rgba(255, 107, 61, 0.22) 0%, rgba(255, 107, 61, 0.05) 100%)',
                border: '1px solid rgba(255, 107, 61, 0.4)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '42px', lineHeight: 1 }}>🔥</div>
              <div
                style={{
                  fontSize: '34px',
                  fontWeight: 800,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  color: '#FFA726',
                  letterSpacing: '-0.03em',
                }}
              >
                {streaks.current} <span style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ink)' }}>Days Active Streak</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink2)', maxWidth: '340px' }}>
                Your daily momentum is burning strong! Keep logging every day to build a habit that cannot be broken.
              </div>
            </div>
          ) : streaks.best > 0 ? (
            <div
              style={{
                padding: '22px 18px',
                borderRadius: '20px',
                background: 'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '42px', lineHeight: 1 }}>🏆</div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  color: 'var(--ice)',
                  letterSpacing: '-0.03em',
                }}
              >
                Highest Streak: {streaks.best} Days
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 12px',
                  borderRadius: '99px',
                  background: 'rgba(229, 72, 77, 0.15)',
                  color: 'var(--miss)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <span>Current Streak: 0 Days (Streak Broken)</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink2)', maxWidth: '360px' }}>
                Your streak was interrupted, but your personal record of <b>{streaks.best} days</b> remains locked in your history! Complete &gt;= {threshold}% of your habits today to ignite your next streak!
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '22px 18px',
                borderRadius: '20px',
                background: 'radial-gradient(ellipse at center, rgba(94, 208, 255, 0.15) 0%, rgba(94, 208, 255, 0.04) 100%)',
                border: '1px solid rgba(94, 208, 255, 0.3)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '42px', lineHeight: 1 }}>⚡</div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  color: 'var(--ice)',
                  letterSpacing: '-0.03em',
                }}
              >
                0 Days Active Streak
              </div>
              <div style={{ fontSize: '13px', color: 'var(--ink2)', maxWidth: '340px' }}>
                Complete &gt;= {threshold}% of your daily habits today to ignite your streak counter!
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--card2)',
                border: '1px solid var(--line)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11.5px', color: 'var(--ink3)', fontWeight: 600, textTransform: 'uppercase' }}>
                Personal Best
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ice)', marginTop: '4px' }}>
                ⭐ {streaks.best}d
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                background: 'var(--card2)',
                border: '1px solid var(--line)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11.5px', color: 'var(--ink3)', fontWeight: 600, textTransform: 'uppercase' }}>
                Daily Standard
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--done)', marginTop: '4px' }}>
                🎯 {threshold}%
              </div>
            </div>
          </div>

          {/* Rules & Protections */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: 'var(--card2)',
              border: '1px solid var(--line)',
              fontSize: '13px',
              color: 'var(--ink2)',
              lineHeight: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🛡️</span>
              <span>Streak Rules & Auto-Lock Protection</span>
            </div>
            <div>
              &bull; <b>1 Weekly Grace Day:</b> 1 missed day per calendar week is protected so your streak won't immediately reset.
            </div>
            <div>
              &bull; <b>12-Hour Auto-Lock Cutoff:</b> Every day automatically locks 12 hours after midnight (12:00 PM noon next day). Past habits cannot be altered.
            </div>
            <div>
              &bull; <b>Today in Progress:</b> Working through habits today maintains your previous streak safely while the day is ongoing.
            </div>
          </div>

          {/* CTA to Insights */}
          <button
            type="button"
            className="cta"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              setIsStreakModalOpen(false)
              handleSelectTab('insights')
            }}
          >
            <span>View Habit Success Circles & Insights &rarr;</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}

function AppContent() {
  const { loading } = useAuth()

  useEffect(() => {
    // Erase mock demo flags completely
    localStorage.removeItem('wa_demo')
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink2)',
          fontFamily: 'Bricolage Grotesque, sans-serif',
          fontSize: '18px',
          fontWeight: 700,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>❄️</div>
          <div>Entering the Winter Arc...</div>
        </div>
      </div>
    )
  }

  return <MainApp />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SnowCanvas />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
