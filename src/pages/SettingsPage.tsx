import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Download, AlertTriangle, Bell, Eye, EyeOff, Check,
  Moon, Sun, Shield, LogOut, Sliders, Palette
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useHabits } from '../hooks/useHabits'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { today } from '../lib/dateUtils'

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { habits, logs } = useHabits()
  const { theme, toggleTheme } = useTheme()

  const [startDate, setStartDate] = useState(profile?.start_date ?? today())
  const [threshold, setThreshold] = useState(profile?.threshold ?? 80)
  const [privacyMode, setPrivacyMode] = useState(profile?.privacy_mode ?? false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [notifRequested, setNotifRequested] = useState(false)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      start_date: startDate,
      threshold,
      privacy_mode: privacyMode,
    }).eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleReset() {
    if (!user) return
    await supabase.from('logs').delete().eq('user_id', user.id)
    setConfirmReset(false)
    window.location.reload()
  }

  function exportJSON() {
    const data = { profile, habits, logs }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `winter-arc-telemetry-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCSV() {
    const header = 'date,habit_name,status,value\n'
    const rows = logs.map(log => {
      const habit = habits.find(h => h.id === log.habit_id)
      return `${log.date},"${habit?.name ?? log.habit_id}",${log.status ?? ''},${log.value ?? ''}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `winter-arc-telemetry-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function requestNotifications() {
    const permission = await Notification.requestPermission()
    setNotifRequested(true)
    if (permission === 'granted') {
      new Notification('Winter Arc ❄️', {
        body: "Reminders enabled! You'll get nudged every evening.",
        icon: '/favicon.svg',
      })
    }
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-6 pb-24 select-none">

      {/* ── Page Header ── */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-white">
          System Settings
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-1">
          Customize challenge parameters, appearance, and protocol preferences.
        </p>
      </div>

      <div className="space-y-6">

        {/* ── Section 1: Challenge Protocol ── */}
        <div className="glass-card p-6 sm:p-7">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-[#38bdf8]">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">Protocol Configuration</h2>
              <p className="text-xs text-slate-400">Manage challenge timeline and strictness</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-semibold text-white/90 block mb-2">
                Challenge Start Date
              </label>
              <input
                type="date"
                className="glass-input h-12 text-base"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Day 1 begins on this timestamp. Defaults to today's date.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white/90">
                  Daily Completion Threshold
                </label>
                <span className="font-heading font-bold text-[#38bdf8] text-base">
                  {threshold}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full accent-[#38bdf8] h-2 bg-white/10 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1 font-medium">
                <span>50%</span>
                <span>80% (Standard Arc)</span>
                <span>100%</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div>
                <span className="text-sm font-semibold text-white/90 block">Privacy Mode</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Anonymize habit names to generic labels when sending prompts to the AI Coach
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => setPrivacyMode(p => !p)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
                  privacyMode
                    ? 'bg-[#6366f1]/25 border-[#6366f1] text-white shadow-glow-violet'
                    : 'bg-white/[0.04] border-white/15 text-slate-400 hover:text-white'
                }`}
                aria-label="Toggle privacy mode"
              >
                {privacyMode ? <EyeOff size={19} /> : <Eye size={19} />}
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="btn-frost w-full h-12 text-base font-semibold mt-4"
            >
              {saved ? (
                <>
                  <Check size={18} /> Protocol Saved!
                </>
              ) : saving ? (
                'Saving changes...'
              ) : (
                'Save Protocol Changes'
              )}
            </motion.button>
          </div>
        </div>

        {/* ── Section 2: Appearance & Theme ── */}
        <div className="glass-card p-6 sm:p-7">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-[#6366f1]">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">Visual Aesthetic</h2>
              <p className="text-xs text-slate-400">Frost Glass dark and frosted light themes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { if (theme !== 'dark') toggleTheme() }}
              className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border-sky-400/40 shadow-glow'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#090b10] border border-white/20 flex items-center justify-center text-amber-300">
                  <Moon size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">Frost Midnight (Default)</div>
                  <div className="text-xs text-slate-400">Deep obsidian with drifting snow</div>
                </div>
              </div>
              {theme === 'dark' && <Check size={18} className="text-[#38bdf8]" />}
            </button>

            <button
              onClick={() => { if (theme !== 'light') toggleTheme() }}
              className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                theme === 'light'
                  ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/15 border-sky-400/40 shadow-glow'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-amber-500">
                  <Sun size={18} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">Frosted White</div>
                  <div className="text-xs text-slate-400">Ice-blue bright daylight theme</div>
                </div>
              </div>
              {theme === 'light' && <Check size={18} className="text-[#38bdf8]" />}
            </button>
          </div>
        </div>

        {/* ── Section 3: Daily Notifications ── */}
        <div className="glass-card p-6 sm:p-7">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-[#10b981]">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">Streak Reminders</h2>
              <p className="text-xs text-slate-400">Keep your accountability chain intact</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-400 max-w-md">
              Enable browser push notifications to receive an evening prompt to log your daily protocols before midnight.
            </p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={requestNotifications}
              disabled={notifRequested}
              className="btn-ghost flex-shrink-0"
            >
              <Bell size={17} />
              {notifRequested ? 'Permission Requested' : 'Enable Reminders'}
            </motion.button>
          </div>
        </div>

        {/* ── Section 4: Telemetry Export ── */}
        <div className="glass-card p-6 sm:p-7">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-[#38bdf8]">
              <Download size={20} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">Data Export</h2>
              <p className="text-xs text-slate-400">Download your full history and metrics</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-400 max-w-md">
              Export all your daily habit logs, streak records, and profile parameters anytime.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={exportJSON} className="btn-ghost text-xs sm:text-sm">
                <Download size={15} /> Export JSON
              </button>
              <button onClick={exportCSV} className="btn-ghost text-xs sm:text-sm">
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 5: Account & Danger Zone ── */}
        <div className="glass-card p-6 sm:p-7">
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center text-white">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="font-heading font-bold text-lg text-white">Account Session</h2>
                <p className="text-xs text-slate-400">Logged in as {user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="btn-ghost text-rose-300 border-rose-500/30 hover:bg-rose-500/10 text-xs sm:text-sm"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          {/* Danger Zone Reset */}
          <div className="p-4 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20">
            <div className="flex items-center gap-2 text-rose-300 font-heading font-bold text-sm mb-1">
              <AlertTriangle size={17} /> Danger Zone: Reset Protocol
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Wipe all log entries to start fresh. Your custom habit templates will be preserved.
            </p>

            {confirmReset ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors"
                >
                  Confirm Full Wipe
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="btn-ghost text-xs py-2 px-3"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-3.5 py-2 rounded-xl border border-rose-500/30 hover:border-rose-500/60 text-rose-300 text-xs font-semibold hover:bg-rose-500/10 transition-colors"
              >
                Reset All Logs
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
