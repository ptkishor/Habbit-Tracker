import type { Habit, Log, Profile } from '../types'
import { toDateStr } from './dateUtils'
import { addDays, parseISO } from 'date-fns'

export const DEMO_HABITS: Habit[] = [
  { id: 'noporn',    user_id: 'demo', name: 'No porn',           type: 'check',  color: 'shield', position: 1,  archived: false },
  { id: 'water',     user_id: 'demo', name: 'Drink water',       type: 'number', color: 'drop',   target: 3,    unit: 'L',     position: 2,  archived: false },
  { id: 'sleep8',    user_id: 'demo', name: 'Sleep',             type: 'number', color: 'moon',   target: 8,    unit: 'hrs',   position: 3,  archived: false },
  { id: 'protein',   user_id: 'demo', name: 'Max out protein',   type: 'check',  color: 'dumb',   position: 4,  archived: false },
  { id: 'read',      user_id: 'demo', name: 'Read',              type: 'number', color: 'book',   target: 10,   unit: 'pages', position: 5,  archived: false },
  { id: 'cold',      user_id: 'demo', name: 'Cold shower',       type: 'check',  color: 'snow',   position: 6,  archived: false },
  { id: 'steps',     user_id: 'demo', name: '10k steps',         type: 'number', color: 'walk',   target: 10000,unit: 'steps', position: 7,  archived: false },
  { id: 'nosex',     user_id: 'demo', name: 'No sex / PMO',      type: 'check',  color: 'shield', position: 8,  archived: false },
  { id: 'sugar',     user_id: 'demo', name: 'No sugar',          type: 'check',  color: 'ban',    position: 9,  archived: false },
  { id: 'alcohol',   user_id: 'demo', name: 'No alcohol',        type: 'check',  color: 'ban',    position: 10, archived: false },
  { id: 'distract',  user_id: 'demo', name: 'No distractions',   type: 'check',  color: 'ban',    position: 11, archived: false },
  { id: 'wake6',     user_id: 'demo', name: 'Wake up by 6 AM',   type: 'check',  color: 'sun',    position: 12, archived: false },
  { id: 'sleep10',   user_id: 'demo', name: 'Sleep by 10 PM',    type: 'check',  color: 'moon',   position: 13, archived: false },
  { id: 'focus',     user_id: 'demo', name: 'Focus on yourself', type: 'check',  color: 'target', position: 14, archived: false },
  { id: 'excuses',   user_id: 'demo', name: 'No excuses',        type: 'check',  color: 'flag',   position: 15, archived: false },
  { id: 'meditate',  user_id: 'demo', name: 'Meditate',          type: 'check',  color: 'heart',  position: 16, archived: false },
]

function rng(seed: number) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export function genDemoLogs(startDateStr: string): Log[] {
  const r = rng(20261001)
  const logs: Log[] = []
  let prev = false
  const DIFF: Record<string, number> = {
    noporn: 0.08,
    water: 0.06,
    sleep8: -0.14,
    protein: -0.05,
    read: -0.02,
    cold: -0.18,
    steps: -0.12,
    nosex: 0.12,
    sugar: -0.05,
    alcohol: 0.3,
    distract: -0.12,
    wake6: -0.22,
    sleep10: -0.1,
    focus: 0.05,
    excuses: 0,
    meditate: -0.14,
  }

  const startParsed = parseISO(startDateStr)

  for (let i = 0; i < 27; i++) {
    const d = addDays(startParsed, i)
    const dow = d.getDay()
    let base =
      0.5 +
      i * 0.007 +
      (r() - 0.5) * 0.18 -
      (dow === 6 || dow === 0 ? 0.13 : 0) +
      (prev ? 0.14 : -0.05)
    base = clamp(base, 0.2, 0.95)
    const dateKey = toDateStr(d)

    DEMO_HABITS.forEach(h => {
      const p = clamp(base + (DIFF[h.id] ?? 0), 0.04, 0.99)
      const done = r() < p
      let v = 0
      if (h.type === 'number') {
        const target = h.target ?? 1
        v = done ? target * (1 + r() * 0.12) : target * r() * 0.8
      }
      logs.push({
        id: `demo-${dateKey}-${h.id}`,
        habit_id: h.id,
        user_id: 'demo',
        date: dateKey,
        status: done ? 'done' : 'missed',
        value: Math.round(v * 10) / 10,
      })
    })

    prev = r() < 0.6
  }

  return logs
}

export function getDemoProfile(startDateStr: string): Profile {
  return {
    id: 'demo-user',
    start_date: startDateStr,
    duration_days: 90,
    threshold: 80,
    privacy_mode: false,
    display_name: 'Prashant',
  }
}
