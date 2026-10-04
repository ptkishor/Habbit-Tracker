import React, { useRef } from 'react'
import type { Habit, Log } from '../types'
import { AppIcon, getHabitIconName } from './Icons'
import { burst } from '../lib/effects'
import { playHabitDoneSound, playHabitMissSound, playStepSound } from '../lib/soundEffects'

interface HabitTileProps {
  habit: Habit
  log?: Log
  index: number
  locked: boolean
  onAction: (
    action: 'ok' | 'no' | 'inc' | 'dec',
    buttonEl: HTMLElement | null,
    tileEl: HTMLElement | null
  ) => void
}

function fmtVal(habit: Habit, v: number): string {
  const target = habit.target ?? 1
  const unit = habit.unit || ''
  const n =
    unit === 'steps'
      ? Math.round(v).toLocaleString('en-IN')
      : Math.round(v * 10) / 10
  const t =
    unit === 'steps' ? target.toLocaleString('en-IN') : target
  return `${n} / ${t} ${unit}`.trim()
}

export default function HabitTile({
  habit,
  log,
  index,
  locked,
  onAction,
}: HabitTileProps) {
  const tileRef = useRef<HTMLDivElement>(null)
  const okBtnRef = useRef<HTMLButtonElement>(null)
  const isNumber = habit.type === 'number'
  const isDone = log?.status === 'done'
  const isMiss = log?.status === 'missed'
  const val = log?.value ?? 0
  const target = habit.target ?? 1
  const pct = isNumber ? Math.min(1, Math.max(0, val / target)) : 0
  const iconName = habit.color ? habit.color : getHabitIconName(habit.name)

  const handleTileClick = (e: React.MouseEvent) => {
    if (locked) return
    // If clicked on an action button, let that button's onClick handle it
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    if (!isDone) {
      burst(okBtnRef.current)
      playHabitDoneSound()
    } else {
      playHabitMissSound()
    }
    onAction('ok', okBtnRef.current, tileRef.current)
  }

  const handleOkClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (locked) return
    if (!isDone) {
      burst(e.currentTarget)
      playHabitDoneSound()
    } else {
      playHabitMissSound()
    }
    onAction('ok', e.currentTarget, tileRef.current)
  }

  const handleNoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (locked) return
    playHabitMissSound()
    if (!isMiss && tileRef.current) {
      tileRef.current.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 340 }
      )
    }
    onAction('no', e.currentTarget, tileRef.current)
  }

  const handleStep = (
    e: React.MouseEvent<HTMLButtonElement>,
    action: 'inc' | 'dec'
  ) => {
    e.stopPropagation()
    if (locked) return
    playStepSound(action)
    onAction(action, e.currentTarget, tileRef.current)
  }

  return (
    <div
      ref={tileRef}
      className={`tile ${isDone ? 'is-done' : ''} ${isMiss ? 'is-miss' : ''}`}
      style={{ '--d': index } as React.CSSProperties}
      data-id={habit.id}
      onClick={handleTileClick}
    >
      <span className="fill" />

      {/* Icon */}
      <span className="ico">
        <AppIcon name={iconName} size={18} />
      </span>

      {/* Title & optional number progress */}
      <div className="txt">
        <div className="nm">{habit.name}</div>
        {isNumber && (
          <div className="sub2">
            <div className="bar">
              <i style={{ width: `${pct * 100}%` }} />
            </div>
            <span className="val">{fmtVal(habit, val)}</span>
          </div>
        )}
      </div>

      {/* Stepper for number habit */}
      {isNumber && (
        <div className="step">
          <button
            type="button"
            data-a="dec"
            aria-label={`Decrease ${habit.name}`}
            disabled={locked}
            onClick={e => handleStep(e, 'dec')}
          >
            &minus;
          </button>
          <button
            type="button"
            data-a="inc"
            aria-label={`Increase ${habit.name}`}
            disabled={locked}
            onClick={e => handleStep(e, 'inc')}
          >
            +
          </button>
        </div>
      )}

      {/* Check and Cross action buttons */}
      <div className="acts">
        <button
          ref={okBtnRef}
          type="button"
          className="b ok"
          data-a="ok"
          aria-label={`Mark ${habit.name} done`}
          aria-pressed={isDone}
          disabled={locked}
          onClick={handleOkClick}
        >
          <AppIcon name="check" size={17} strokeWidth={2.6} />
        </button>
        <button
          type="button"
          className="b no"
          data-a="no"
          aria-label={`Mark ${habit.name} missed`}
          aria-pressed={isMiss}
          disabled={locked}
          onClick={handleNoClick}
        >
          <AppIcon name="x" size={17} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  )
}
