import React, { useState } from 'react'
import { AppIcon, AVAILABLE_HABIT_ICONS, getHabitIconName } from './Icons'
import Modal from './Modal'
import { showToast } from '../lib/effects'
import type { Habit, Profile, Log } from '../types'
import { supabase } from '../lib/supabase'
import { today, getChallengeDayStatus } from '../lib/dateUtils'

interface SettingsViewProps {
  userEmail?: string
  profile: Profile
  habits: Habit[]
  logs: Log[]
  onRefreshProfile: () => Promise<void>
  onUpdateProfile?: (updates: Partial<Profile>) => Promise<void>
  onSignOut: () => Promise<void>
  onAddHabit: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onUpdateHabit: (id: string, updates: Partial<Habit>) => Promise<void>
  onArchiveHabit: (id: string) => Promise<void>
  onReorderHabits: (reordered: Habit[]) => Promise<void>
  onOpenAuth?: () => void
  onResetAllLogs?: () => Promise<void>
}

export default function SettingsView({
  userEmail,
  profile,
  habits,
  logs,
  onRefreshProfile,
  onUpdateProfile,
  onSignOut,
  onAddHabit,
  onUpdateHabit,
  onArchiveHabit,
  onReorderHabits,
  onOpenAuth,
  onResetAllLogs,
}: SettingsViewProps) {
  // Protocol settings
  const [startDate, setStartDate] = useState(profile.start_date || today())
  const [durationDays, setDurationDays] = useState(profile.duration_days ?? 90)
  const [threshold, setThreshold] = useState(profile.threshold ?? 80)
  const [privacyMode, setPrivacyMode] = useState(profile.privacy_mode ?? false)
  const [savingProtocol, setSavingProtocol] = useState(false)

  // Reactively sync form fields whenever profile updates from Supabase
  React.useEffect(() => {
    if (profile) {
      setStartDate(profile.start_date || today())
      setDurationDays(profile.duration_days ?? 90)
      setThreshold(profile.threshold ?? 80)
      setPrivacyMode(profile.privacy_mode ?? false)
    }
  }, [profile])

  // Current challenge status calculated live from startDate and durationDays
  const currentStatus = getChallengeDayStatus(today(), startDate, durationDays)

  // Filter only active (non-archived) habits
  const activeHabits = React.useMemo(() => habits.filter(h => !h.archived), [habits])

  // Habit modal state
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false)
  const [habitName, setHabitName] = useState('')
  const [habitType, setHabitType] = useState<'check' | 'number'>('check')
  const [habitTarget, setHabitTarget] = useState('1')
  const [habitUnit, setHabitUnit] = useState('')
  const [habitStep, setHabitStep] = useState('1')
  const [habitIcon, setHabitIcon] = useState('spark')
  const [savingHabit, setSavingHabit] = useState(false)

  // Confirm Reset modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSaveProtocol = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProtocol(true)
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          start_date: startDate,
          duration_days: durationDays,
          threshold,
          privacy_mode: privacyMode,
        })
      } else {
        const { error } = await supabase
          .from('profiles')
          .update({
            start_date: startDate,
            duration_days: durationDays,
            threshold,
            privacy_mode: privacyMode,
          })
          .eq('id', profile.id)

        if (error) throw error
        await onRefreshProfile()
      }
      showToast('Protocol parameters updated and synced to cloud')
    } catch {
      showToast('Failed to update protocol')
    } finally {
      setSavingProtocol(false)
    }
  }

  const handleStartTodayDayOne = async () => {
    const todayStr = today()
    setStartDate(todayStr)
    setSavingProtocol(true)
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({ start_date: todayStr })
      } else {
        await supabase
          .from('profiles')
          .update({ start_date: todayStr })
          .eq('id', profile.id)
        await onRefreshProfile()
      }
      showToast('Winter Arc started today — Day 1 of 90 locked in! ❄️')
    } catch {
      showToast('Failed to set start date')
    } finally {
      setSavingProtocol(false)
    }
  }

  const openAddHabitModal = () => {
    setEditingHabit(null)
    setHabitName('')
    setHabitType('check')
    setHabitTarget('1')
    setHabitUnit('')
    setHabitStep('1')
    setHabitIcon('spark')
    setIsHabitModalOpen(true)
  }

  const openEditHabitModal = (h: Habit) => {
    setEditingHabit(h)
    setHabitName(h.name)
    setHabitType(h.type)
    setHabitTarget(h.target?.toString() ?? '1')
    setHabitUnit(h.unit ?? '')
    setHabitStep((h as any).step?.toString() ?? '1')
    setHabitIcon(h.color || getHabitIconName(h.name))
    setIsHabitModalOpen(true)
  }

  const handleSaveHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!habitName.trim()) return
    setSavingHabit(true)

    try {
      const parsedTarget =
        habitType === 'number' ? parseFloat(habitTarget) || 1 : undefined
      const targetUnit = habitType === 'number' ? habitUnit.trim() : undefined
      const parsedStep =
        habitType === 'number' ? parseFloat(habitStep) || 1 : undefined

      if (editingHabit) {
        await onUpdateHabit(editingHabit.id, {
          name: habitName.trim(),
          type: habitType,
          target: parsedTarget,
          unit: targetUnit,
          color: habitIcon,
          ...((parsedStep ? { step: parsedStep } : {}) as any),
        })
        showToast('Habit updated')
      } else {
        await onAddHabit({
          name: habitName.trim(),
          type: habitType,
          target: parsedTarget,
          unit: targetUnit,
          color: habitIcon,
          position: habits.length + 1,
          archived: false,
          ...((parsedStep ? { step: parsedStep } : {}) as any),
        })
        showToast('New habit added')
      }
      setIsHabitModalOpen(false)
    } catch {
      showToast('Failed to save habit')
    } finally {
      setSavingHabit(false)
    }
  }

  const handleMoveHabit = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= activeHabits.length) return

    const reordered = [...activeHabits]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp
    await onReorderHabits(reordered)
  }

  const handleResetChallenge = async () => {
    setResetting(true)
    try {
      const todayStr = today()
      if (onResetAllLogs) {
        await onResetAllLogs()
      } else {
        await supabase
          .from('logs')
          .delete()
          .eq('user_id', profile.id)
      }
      if (onUpdateProfile) {
        await onUpdateProfile({ start_date: todayStr })
        setStartDate(todayStr)
      }
      setIsResetModalOpen(false)
      showToast('All logs reset — Day 1 starts fresh today! ❄️')
    } catch {
      showToast('Failed to reset logs')
    } finally {
      setResetting(false)
    }
  }

  const handleExportJSON = () => {
    const data = { profile, habits, logs }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `winter-arc-${startDate}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const header = 'date,habit_name,status,value\n'
    const rows = logs
      .map(l => {
        const habit = habits.find(h => h.id === l.habit_id)
        return `${l.date},"${habit?.name ?? l.habit_id}",${l.status ?? ''},${l.value ?? ''}`
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `winter-arc-${startDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleEnableReminders = async () => {
    if (!('Notification' in window)) {
      showToast('Notifications are not supported in this browser')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      new Notification('Winter Arc ❄️', {
        body: 'Evening reminder enabled! Lock in your habits daily.',
      })
      showToast('Reminders enabled')
    } else {
      showToast('Notification permission was denied')
    }
  }

  return (
    <div className="settings-grid">
      {/* ── 1. Challenge Protocol ── */}
      <div className="c">
        <h3>
          Challenge Protocol<small>Parameters &amp; rules</small>
        </h3>
        <form onSubmit={handleSaveProtocol}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Start Date</label>
              <button
                type="button"
                className="btn-pill"
                style={{ padding: '3px 8px', fontSize: '11.5px', color: 'var(--ice)', borderColor: 'var(--ice)' }}
                onClick={handleStartTodayDayOne}
                title="Align start date to today so challenge is Day 1 of 90"
              >
                Start Day 1 Today
              </button>
            </div>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '12.5px', color: 'var(--ink2)' }}>
              <span>Challenge status:</span>
              <b style={{ color: currentStatus.isCompleted ? 'var(--miss)' : 'var(--done)' }}>
                {currentStatus.statusText}
              </b>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Challenge Duration (Days)</label>
            <input
              type="number"
              min={1}
              max={365}
              className="form-input"
              value={durationDays}
              onChange={e => setDurationDays(Math.max(1, parseInt(e.target.value) || 90))}
            />
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ink2)',
              }}
            >
              <span>Daily Goal Threshold</span>
              <b style={{ color: 'var(--ice)' }}>{threshold}%</b>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--ice)',
                marginTop: '6px',
                cursor: 'pointer',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderTop: '1px solid var(--line)',
              marginTop: '12px',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Privacy Mode</div>
              <div style={{ fontSize: '12.5px', color: 'var(--ink3)' }}>
                Anonymize habit names in AI prompts
              </div>
            </div>
            <button
              type="button"
              className="sw"
              aria-pressed={privacyMode}
              onClick={() => setPrivacyMode(p => !p)}
            >
              <i />
            </button>
          </div>

          <button
            type="submit"
            className="cta"
            disabled={savingProtocol}
            style={{ width: '100%', marginTop: '10px' }}
          >
            <span>{savingProtocol ? 'Saving...' : 'Save Parameters'}</span>
          </button>
        </form>
      </div>

      {/* ── 2. Habits Protocol ── */}
      <div className="c" style={{ gridColumn: 'span 1' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <h3 style={{ margin: 0 }}>
            Habits<small>{activeHabits.length} active</small>
          </h3>
          <button
            type="button"
            className="btn-pill"
            style={{ padding: '6px 12px', fontSize: '13px' }}
            onClick={openAddHabitModal}
          >
            <AppIcon name="plus" size={14} />
            <span>Add</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxHeight: '340px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {activeHabits.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'var(--card2)',
                border: '1px solid var(--line)',
                fontSize: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span className="ico" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                  <AppIcon name={h.color || getHabitIconName(h.name)} size={14} />
                </span>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={i === 0}
                  className="step"
                  style={{ opacity: i === 0 ? 0.3 : 1 }}
                  onClick={() => handleMoveHabit(i, 'up')}
                  aria-label="Move habit up"
                >
                  <span style={{ fontSize: '13px' }}>&uarr;</span>
                </button>
                <button
                  type="button"
                  disabled={i === activeHabits.length - 1}
                  className="step"
                  style={{ opacity: i === activeHabits.length - 1 ? 0.3 : 1 }}
                  onClick={() => handleMoveHabit(i, 'down')}
                  aria-label="Move habit down"
                >
                  <span style={{ fontSize: '13px' }}>&darr;</span>
                </button>
                <button
                  type="button"
                  className="step"
                  onClick={() => openEditHabitModal(h)}
                  aria-label="Edit habit"
                >
                  <AppIcon name="edit" size={13} />
                </button>
                <button
                  type="button"
                  className="step"
                  style={{ color: 'var(--miss)' }}
                  onClick={() => onArchiveHabit(h.id)}
                  aria-label="Archive habit"
                >
                  <AppIcon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Notifications & Reminders ── */}
      <div className="c">
        <h3>
          Daily Reminders<small>Accountability</small>
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink2)', margin: '0 0 14px' }}>
          Get an automated evening reminder prompt to review and log your daily protocol before midnight.
        </p>
        <button
          type="button"
          className="btn-pill"
          onClick={handleEnableReminders}
        >
          <AppIcon name="bell" size={16} />
          <span>Enable Reminders</span>
        </button>
      </div>

      {/* ── 4. Data Export ── */}
      <div className="c">
        <h3>
          Data Export<small>Backups &amp; telemetry</small>
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--ink2)', margin: '0 0 14px' }}>
          Download your full challenge history, habits, and daily execution logs.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-pill" onClick={handleExportJSON}>
            <AppIcon name="download" size={15} />
            <span>Export JSON</span>
          </button>
          <button type="button" className="btn-pill" onClick={handleExportCSV}>
            <AppIcon name="download" size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 5. Account & Danger Zone ── */}
      <div className="c" style={{ gridColumn: 'span 1' }}>
        <h3>
          Account &amp; Reset<small>Session</small>
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            marginBottom: '14px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {userEmail || 'Local Mode (Day 1)'}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink3)' }}>
              {userEmail ? 'Signed into Supabase' : 'Real data stored on this device'}
            </div>
          </div>
          {userEmail ? (
            <button
              type="button"
              className="btn-pill danger"
              onClick={onSignOut}
            >
              <AppIcon name="logout" size={15} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-pill"
              style={{ color: 'var(--ice)', borderColor: 'var(--ice)', gap: '6px' }}
              onClick={onOpenAuth}
            >
              <AppIcon name="mail" size={15} />
              <span>Sync Cloud</span>
            </button>
          )}
        </div>

        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--miss)', marginBottom: '4px' }}>
            Danger Zone
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--ink2)', margin: '0 0 10px' }}>
            Wipe all habit logs to start the challenge fresh. Habit configurations will be preserved.
          </p>
          <button
            type="button"
            className="btn-pill danger"
            onClick={() => setIsResetModalOpen(true)}
          >
            <AppIcon name="alert" size={15} />
            <span>Reset Challenge Logs</span>
          </button>
        </div>
      </div>

      {/* ── Add / Edit Habit Modal ── */}
      <Modal
        isOpen={isHabitModalOpen}
        title={editingHabit ? 'Edit Habit' : 'Add New Habit'}
        onClose={() => setIsHabitModalOpen(false)}
      >
        <form onSubmit={handleSaveHabit}>
          <div className="form-group">
            <label>Habit Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Cold shower, Read, 10k steps"
              value={habitName}
              onChange={e => setHabitName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn-pill ${habitType === 'check' ? 'on' : ''}`}
                style={{
                  flex: 1,
                  background: habitType === 'check' ? 'var(--ink)' : 'var(--card2)',
                  color: habitType === 'check' ? 'var(--bg)' : 'var(--ink)',
                }}
                onClick={() => setHabitType('check')}
              >
                Yes / No Check
              </button>
              <button
                type="button"
                className={`btn-pill ${habitType === 'number' ? 'on' : ''}`}
                style={{
                  flex: 1,
                  background: habitType === 'number' ? 'var(--ink)' : 'var(--card2)',
                  color: habitType === 'number' ? 'var(--bg)' : 'var(--ink)',
                }}
                onClick={() => setHabitType('number')}
              >
                Numeric Target
              </button>
            </div>
          </div>

          {habitType === 'number' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div className="form-group">
                <label>Daily Target</label>
                <input
                  type="number"
                  step="any"
                  required
                  className="form-input"
                  placeholder="e.g. 10000"
                  value={habitTarget}
                  onChange={e => setHabitTarget(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Unit</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="steps, L, hrs"
                  value={habitUnit}
                  onChange={e => setHabitUnit(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Step Increment</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="1 or 1000"
                  value={habitStep}
                  onChange={e => setHabitStep(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Icon Picker */}
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label>Select Icon</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '6px',
                marginTop: '4px',
              }}
            >
              {AVAILABLE_HABIT_ICONS.map(icName => (
                <button
                  key={icName}
                  type="button"
                  className="iconbtn"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: habitIcon === icName ? 'var(--ink)' : 'var(--card2)',
                    color: habitIcon === icName ? 'var(--bg)' : 'var(--ink)',
                    borderColor: habitIcon === icName ? 'transparent' : 'var(--line2)',
                  }}
                  onClick={() => setHabitIcon(icName)}
                >
                  <AppIcon name={icName} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button
              type="submit"
              className="cta"
              disabled={savingHabit}
              style={{ flex: 1 }}
            >
              <span>{savingHabit ? 'Saving...' : editingHabit ? 'Save Changes' : 'Create Habit'}</span>
            </button>
            <button
              type="button"
              className="btn-pill"
              onClick={() => setIsHabitModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Custom Reset Confirmation Modal ── */}
      <Modal
        isOpen={isResetModalOpen}
        title="Reset Challenge Confirmation"
        onClose={() => setIsResetModalOpen(false)}
      >
        <p style={{ fontSize: '14.5px', color: 'var(--ink2)', lineHeight: 1.5, margin: '0 0 16px' }}>
          Are you sure you want to reset all logged days? This action permanently clears your history, streak records, and heatmap. Your habits will remain configured.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-pill"
            onClick={() => setIsResetModalOpen(false)}
          >
            Keep Data
          </button>
          <button
            type="button"
            className="btn-pill danger"
            disabled={resetting}
            onClick={handleResetChallenge}
          >
            <span>{resetting ? 'Resetting...' : 'Yes, Reset All'}</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}
