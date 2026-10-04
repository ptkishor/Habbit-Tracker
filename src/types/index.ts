// ─── Database types mirroring Supabase schema ───

export interface Profile {
  id: string                   // same as auth user id
  start_date: string           // ISO date string e.g. "2025-10-01"
  duration_days: number        // default 90
  threshold: number            // completion % to count a day as "done" (default 80)
  privacy_mode: boolean        // anonymise habit names when sending to AI
  display_name?: string
  created_at?: string
  updated_at?: string
}

export type HabitType = 'check' | 'number'
export type LogStatus = 'done' | 'missed' | null

export interface Habit {
  id: string
  user_id: string
  name: string
  type: HabitType
  target?: number              // for number type: daily target value
  unit?: string                // e.g. "L", "steps", "pages"
  position: number             // sort order
  archived: boolean
  color?: string               // optional per-habit accent
  created_at?: string
}

export interface Log {
  id: string
  habit_id: string
  user_id: string
  date: string                 // ISO date "YYYY-MM-DD"
  status: LogStatus
  value?: number               // for number habits
  notes?: string
  created_at?: string
}

export interface Review {
  id: string
  user_id: string
  created_at: string
  week_start: string
  content: string
}

// ─── Computed / UI types ───

export interface DayStats {
  date: string
  total: number
  completed: number
  pct: number                  // 0-100
  isDone: boolean              // pct >= threshold
}

export interface HabitStats {
  habit_id: string
  habit_name: string
  total_days: number
  completed_days: number
  pct: number
}

export interface StreakInfo {
  current: number
  best: number
}

// ─── AI Coach payload (sent to edge function) ───
export interface CoachPayload {
  days: DayStats[]             // last 14 days
  habits: HabitStats[]
  streaks: StreakInfo
  weekday_pattern: Record<string, number>   // e.g. { Mon: 75, Tue: 90, ... }
  correlations: Array<{ label: string; pct_with: number; pct_without: number }>
  privacy_mode: boolean
}
