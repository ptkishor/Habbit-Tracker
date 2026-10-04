import type { Habit } from '../types'

/**
 * 16 Core Habits for Winter Arc.
 * Each habit includes type, targets (for number type), unit, and icon identifier.
 */
export const DEFAULT_HABITS: Omit<Habit, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'No porn',            type: 'check',  color: 'shield', position: 1,  archived: false },
  { name: 'Drink water',        type: 'number', color: 'drop',   target: 3,    unit: 'L',     position: 2,  archived: false },
  { name: 'Sleep',              type: 'number', color: 'moon',   target: 8,    unit: 'hrs',   position: 3,  archived: false },
  { name: 'Max out protein',    type: 'check',  color: 'dumb',   position: 4,  archived: false },
  { name: 'Read',               type: 'number', color: 'book',   target: 10,   unit: 'pages', position: 5,  archived: false },
  { name: 'Cold shower',        type: 'check',  color: 'snow',   position: 6,  archived: false },
  { name: '10k steps',          type: 'number', color: 'walk',   target: 10000,unit: 'steps', position: 7,  archived: false },
  { name: 'No sex / PMO',       type: 'check',  color: 'shield', position: 8,  archived: false },
  { name: 'No sugar',           type: 'check',  color: 'ban',    position: 9,  archived: false },
  { name: 'No alcohol',         type: 'check',  color: 'ban',    position: 10, archived: false },
  { name: 'No distractions',    type: 'check',  color: 'ban',    position: 11, archived: false },
  { name: 'Wake up by 6 AM',    type: 'check',  color: 'sun',    position: 12, archived: false },
  { name: 'Sleep by 10 PM',     type: 'check',  color: 'moon',   position: 13, archived: false },
  { name: 'Focus on yourself',  type: 'check',  color: 'target', position: 14, archived: false },
  { name: 'No excuses',         type: 'check',  color: 'flag',   position: 15, archived: false },
  { name: 'Meditate',           type: 'check',  color: 'heart',  position: 16, archived: false },
]

/**
 * 1-Click Preset Protocol: "The Standard (8 Reel Habits)"
 */
export const STANDARD_8_HABITS: Omit<Habit, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'Wake up by 6 AM',    type: 'check',  color: 'sun',    position: 1, archived: false },
  { name: 'Drink water',        type: 'number', color: 'drop',   target: 3,    unit: 'L',     position: 2, archived: false },
  { name: 'Cold shower',        type: 'check',  color: 'snow',   position: 3, archived: false },
  { name: 'Read',               type: 'number', color: 'book',   target: 10,   unit: 'pages', position: 4, archived: false },
  { name: '10k steps',          type: 'number', color: 'walk',   target: 10000,unit: 'steps', position: 5, archived: false },
  { name: 'Max out protein',    type: 'check',  color: 'dumb',   position: 6, archived: false },
  { name: 'No sugar',           type: 'check',  color: 'ban',    position: 7, archived: false },
  { name: 'Sleep by 10 PM',     type: 'check',  color: 'moon',   position: 8, archived: false },
]
