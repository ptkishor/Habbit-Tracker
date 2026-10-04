import React, { useRef, useEffect, useMemo } from 'react'
import type { DayStats, HabitStats, StreakInfo } from '../types'
import { toDateStr, today } from '../lib/dateUtils'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TOTAL = 90

interface InsightsViewProps {
  startDate: string
  durationDays: number
  threshold: number // 0-100
  dayStats: DayStats[]
  habitStats: HabitStats[]
  streaks: StreakInfo
}

function spline(p: [number, number][]): string {
  if (p.length < 2) return ''
  let d = 'M' + p[0][0] + ',' + p[0][1]
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] || p2
    d +=
      ' C' +
      (p1[0] + (p2[0] - p0[0]) / 6) +
      ',' +
      (p1[1] + (p2[1] - p0[1]) / 6) +
      ' ' +
      (p2[0] - (p3[0] - p1[0]) / 6) +
      ',' +
      (p2[1] - (p3[1] - p1[1]) / 6) +
      ' ' +
      p2[0] +
      ',' +
      p2[1]
  }
  return d
}

export default function InsightsView({
  startDate,
  durationDays = TOTAL,
  threshold = 80,
  dayStats,
  habitStats,
  streaks,
}: InsightsViewProps) {
  const trendRef = useRef<HTMLDivElement>(null)

  // Filter day stats that have happened up to today
  const todayStr = today()
  const validDays = useMemo(() => {
    return dayStats.filter(
      d => (d.date < todayStr || d.pct > 0) && d.total > 0
    )
  }, [dayStats, todayStr])

  const avgPct = useMemo(() => {
    if (!validDays.length) return 0
    return Math.round(
      validDays.reduce((acc, d) => acc + d.pct, 0) / validDays.length
    )
  }, [validDays])

  const perfectDaysCount = useMemo(() => {
    return validDays.filter(d => d.pct === 100).length
  }, [validDays])

  // Habit success rates
  const sortedHabitRates = useMemo(() => {
    return [...habitStats].sort((a, b) => b.pct - a.pct)
  }, [habitStats])

  // Weekday averages [Mon: 1, Tue: 2, ... Sun: 0]
  const weekdayData = useMemo(() => {
    const counts: Record<number, { sum: number; count: number }> = {
      1: { sum: 0, count: 0 },
      2: { sum: 0, count: 0 },
      3: { sum: 0, count: 0 },
      4: { sum: 0, count: 0 },
      5: { sum: 0, count: 0 },
      6: { sum: 0, count: 0 },
      0: { sum: 0, count: 0 },
    }

    validDays.forEach(d => {
      const dt = new Date(d.date)
      const dow = dt.getDay()
      if (counts[dow]) {
        counts[dow].sum += d.pct
        counts[dow].count++
      }
    })

    const order = [1, 2, 3, 4, 5, 6, 0]
    const vals = order.map(dow => {
      const entry = counts[dow]
      return entry.count > 0 ? Math.round(entry.sum / entry.count) : null
    })

    const known = vals.filter((x): x is number => x !== null)
    const lo = known.length > 2 ? Math.min(...known) : -1

    return order.map((dow, idx) => ({
      dow,
      label: WD[dow],
      pct: vals[idx],
      isLowest: vals[idx] !== null && vals[idx] === lo,
    }))
  }, [validDays])

  // Heatmap generation: 7 rows x N columns
  const heatmapData = useMemo(() => {
    const startObj = new Date(startDate)
    const off = (startObj.getDay() + 6) % 7 // Monday-first offset
    const totalDays = durationDays
    const cols = Math.ceil((totalDays + off) / 7)

    const dayMap = new Map<string, DayStats>()
    dayStats.forEach(d => dayMap.set(d.date, d))

    const cells = []
    for (let i = 1; i <= totalDays; i++) {
      const pos = i - 1 + off
      const col = Math.floor(pos / 7)
      const row = pos % 7
      const curDate = new Date(startObj)
      curDate.setDate(curDate.getDate() + (i - 1))
      const k = toDateStr(curDate)
      const isFuture = k > todayStr
      const stat = dayMap.get(k)
      const p = stat ? stat.pct : 0

      let cls = 'cell'
      let txt = `Day ${i}`
      if (isFuture) {
        cls += ' f'
      } else {
        if (p === 0) cls += ''
        else if (p < 40) cls += ' l1'
        else if (p < 65) cls += ' l2'
        else if (p < 85) cls += ' l3'
        else cls += ' l4'
        txt = `Day ${i}, ${curDate.getDate()} ${MON[curDate.getMonth()]}: ${p}%`
      }

      cells.push({
        i,
        col: col + 1,
        row: row + 1,
        cls,
        txt,
        waveDelay: col + row,
      })
    }

    return { cols, cells }
  }, [startDate, durationDays, dayStats, todayStr])

  // Draw Spline Trend into trendRef
  useEffect(() => {
    const box = trendRef.current
    if (!box) return

    const W = box.clientWidth
    const Ht = box.clientHeight
    if (!W || !Ht) return

    const data = validDays.slice(-30)
    if (data.length < 2) {
      box.innerHTML =
        '<div class="empty" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">Log two days and your curve shows up here.</div>'
      return
    }

    const m = { l: 36, r: 14, t: 12, b: 26 }
    const iw = W - m.l - m.r
    const ih = Ht - m.t - m.b

    const X = (i: number) => m.l + (i / (data.length - 1)) * iw
    const Y = (p: number) => m.t + (1 - p) * ih
    const thrDec = threshold / 100

    const pts: [number, number][] = data.map((d, i) => [X(i), Y(d.pct / 100)])
    const linePath = spline(pts)
    const areaPath = `${linePath} L${pts[pts.length - 1][0]},${m.t + ih} L${pts[0][0]},${m.t + ih} Z`

    let s = `<svg width="${W}" height="${Ht}" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Daily completion over the last 30 days">`
    s += `<defs>
      <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--ice)" stop-opacity=".38"/>
        <stop offset="1" stop-color="var(--ice)" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="var(--ice)"/>
        <stop offset="1" stop-color="var(--done)"/>
      </linearGradient>
    </defs>`

    // Grid lines for 0%, 50%, 100%
    ;[0, 0.5, 1].forEach(g => {
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(g)}" y2="${Y(g)}" stroke="var(--line)"/>`
      s += `<text x="${m.l - 8}" y="${Y(g) + 4}" text-anchor="end" font-size="12.5" fill="var(--ink3)">${Math.round(g * 100)}</text>`
    })

    // Goal threshold line
    s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(thrDec)}" y2="${Y(thrDec)}" stroke="var(--ember)" stroke-dasharray="4 5" opacity=".7"/>`
    s += `<text x="${W - m.r}" y="${Y(thrDec) - 5}" text-anchor="end" font-size="12.5" fill="var(--ember)">${threshold}% goal</text>`

    // Area & Line
    s += `<path class="areafade" d="${areaPath}" fill="url(#ag)"/>`
    s += `<path class="trace" pathLength="1" d="${linePath}" fill="none" stroke="url(#lg)" stroke-width="3" stroke-linecap="round"/>`

    // Last point dot
    const last = pts[pts.length - 1]
    s += `<circle class="areafade" cx="${last[0]}" cy="${last[1]}" r="5" fill="var(--done)" stroke="var(--card)" stroke-width="2.5"/>`

    // X-axis date labels
    data.forEach((d, i) => {
      if (i % 7 === 0 || i === data.length - 1) {
        if (
          i === data.length - 1 &&
          (data.length - 1) % 7 !== 0 &&
          data.length - 1 - Math.floor((data.length - 1) / 7) * 7 < 3
        ) {
          return
        }
        const dt = new Date(d.date)
        const anchor = i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'
        s += `<text x="${X(i)}" y="${Ht - 7}" text-anchor="${anchor}" font-size="12.5" fill="var(--ink3)">${dt.getDate()} ${MON[dt.getMonth()]}</text>`
      }
    })

    s += '</svg>'
    box.innerHTML = s
  }, [validDays, threshold])

  return (
    <div className="ins">
      {/* 4 KPI cards */}
      <div className="kpis">
        <div className="kpi" style={{ '--d': 0 } as React.CSSProperties}>
          <span>Average completion</span>
          <b>
            {avgPct}
            <small>%</small>
          </b>
        </div>
        <div className={`kpi ${streaks.current > 0 ? 'ember' : ''}`} style={{ '--d': 1 } as React.CSSProperties}>
          <span>{streaks.current === 0 && streaks.best > 0 ? 'Current (Reset)' : 'Current streak'}</span>
          <b>
            {streaks.current > 0 ? '🔥 ' : streaks.best > 0 ? '❄️ ' : ''}
            {streaks.current}
            <small>days</small>
          </b>
        </div>
        <div
          className="kpi"
          style={{
            '--d': 2,
            background: streaks.current === 0 && streaks.best > 0 ? 'rgba(56, 189, 248, 0.12)' : undefined,
            border: streaks.current === 0 && streaks.best > 0 ? '1px solid rgba(56, 189, 248, 0.35)' : undefined,
          } as React.CSSProperties}
          title={`All-time Highest Streak Record: ${streaks.best} Days`}
        >
          <span style={{ color: streaks.current === 0 && streaks.best > 0 ? 'var(--ice)' : undefined, fontWeight: streaks.current === 0 && streaks.best > 0 ? 700 : undefined }}>
            {streaks.current === 0 && streaks.best > 0 ? '🏆 Highest Record' : 'Best streak'}
          </span>
          <b>
            <span style={{ color: streaks.current === 0 && streaks.best > 0 ? 'var(--ice)' : undefined }}>
              {streaks.best}
            </span>
            <small>days</small>
          </b>
        </div>
        <div className="kpi" style={{ '--d': 3 } as React.CSSProperties}>
          <span>Perfect days</span>
          <b>
            {perfectDaysCount}
            <small>of {validDays.length}</small>
          </b>
        </div>
      </div>

      {/* 30-day spline trend */}
      <div className="c t">
        <h3>
          Daily completion<small>last 30 days</small>
        </h3>
        <div id="trend" ref={trendRef} />
      </div>

      {/* Habit success circular rings */}
      <div className="c h">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ margin: 0 }}>
            Habit success<small>circular rate meters</small>
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--ink3)' }}>{sortedHabitRates.length} active</span>
        </div>

        {sortedHabitRates.length === 0 ? (
          <div className="empty" style={{ margin: '20px 0' }}>
            No habit data to compute success rates. Add habits to view circular progress.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '12px',
              marginTop: '10px',
              maxHeight: '360px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {sortedHabitRates.map((item, idx) => {
              const isWeakest =
                idx === sortedHabitRates.length - 1 && validDays.length > 2
              const r = 28
              const circ = 2 * Math.PI * r
              const offset = circ * (1 - item.pct / 100)
              const col =
                item.pct >= threshold
                  ? 'var(--done)'
                  : item.pct >= 50
                  ? 'var(--ice)'
                  : item.pct > 0
                  ? 'var(--ember)'
                  : 'rgba(255,255,255,0.18)'

              return (
                <div
                  key={item.habit_id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px 10px',
                    borderRadius: '16px',
                    background: 'var(--card2)',
                    border: isWeakest ? '1px solid rgba(255, 107, 61, 0.4)' : '1px solid var(--line)',
                    position: 'relative',
                    transition: 'transform 0.2s, border-color 0.2s',
                    textAlign: 'center',
                  }}
                  title={`${item.habit_name}: ${item.pct}% (${item.completed_days} of ${item.total_days} days)`}
                >
                  {isWeakest && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '8px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: 'var(--miss)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Focus
                    </span>
                  )}

                  {/* Circular SVG Ring */}
                  <div style={{ position: 'relative', width: '72px', height: '72px' }}>
                    <svg width="72" height="72" viewBox="0 0 72 72">
                      <circle
                        cx="36"
                        cy="36"
                        r={r}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r={r}
                        fill="none"
                        stroke={col}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        transform="rotate(-90 36 36)"
                        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                      />
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: 'var(--ink)',
                      }}
                    >
                      {item.pct}%
                    </div>
                  </div>

                  {/* Habit Name & Days info */}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--ink)',
                      marginTop: '8px',
                      width: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.habit_name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--ink3)',
                      marginTop: '2px',
                    }}
                  >
                    {item.completed_days} / {item.total_days} days
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Challenge Heatmap */}
      <div className="c m">
        <h3>{durationDays}-day map</h3>
        <div
          className="hm"
          id="hm"
          style={{ gridTemplateColumns: `repeat(${heatmapData.cols}, 1fr)` }}
        >
          {heatmapData.cells.map(cell => (
            <div
              key={cell.i}
              className={cell.cls}
              title={cell.txt}
              style={
                {
                  gridColumn: cell.col,
                  gridRow: cell.row,
                  '--w': cell.waveDelay,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        <div className="legend">
          <span>Less</span>
          <i style={{ background: 'var(--tick-off)' }} />
          <i style={{ background: 'var(--h1)' }} />
          <i style={{ background: 'var(--h2)' }} />
          <i style={{ background: 'var(--h3)' }} />
          <i style={{ background: 'var(--h4)' }} />
          <span>More</span>
        </div>
      </div>

      {/* By weekday */}
      <div className="c w">
        <h3>By weekday</h3>
        <div className="wk" id="wk">
          {weekdayData.map(col => (
            <div
              key={col.dow}
              className={`wcol ${col.isLowest ? 'lo' : ''}`}
            >
              <span className="wv">
                {col.pct === null ? '' : `${col.pct}%`}
              </span>
              <div className="wplot">
                <div
                  className="wbar"
                  style={{ height: col.pct === null ? '0%' : `${col.pct}%` }}
                />
              </div>
              <span>{col.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
