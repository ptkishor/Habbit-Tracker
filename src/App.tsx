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
  isHabitDone,
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

  const startDate = profile?.start_date || currentToday
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

  // Real Day stats computed from real habits and logs
  const dayStats = useMemo(() => {
    return computeDayStats(challengeDates, habits, logs, threshold)
  }, [challengeDates, habits, logs, threshold])

  // Real Habit stats
  const habitStats = useMemo(() => {
    return computeHabitStats(habits, logs, challengeDates)
  }, [habits, logs, challengeDates])

  // Real Streaks
  const streaks = useMemo(() => {
    return computeStreaks(dayStats)
  }, [dayStats])

  // Selected date completion %
  const selectedDayPct = useMemo(() => {
    const active = habits.filter(h => !h.archived)
    if (!active.length) return 0
    const dayLogs = logs.filter(l => l.date === selectedDate)
    const logMap = new Map(dayLogs.map(l => [l.habit_id, l]))
    let done = 0
    for (const h of active) {
      if (isHabitDone(h, logMap.get(h.id))) done++
    }
    return done / active.length
  }, [habits, logs, selectedDate])

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

  const effectiveUserId = user?.id ?? 'real-user'
  const effectiveEmail = user?.email

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TabsNav activeTab={activeTab} onSelectTab={handleSelectTab} />

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
              habits={habits}
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
