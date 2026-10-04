// Animated hand-drawn tick (✓) SVG — 32x32px checkbox
export function TickSVG({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className="tick-svg"
      style={{ overflow: 'visible' }}
    >
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="6"
        stroke="#1a6b3c"
        strokeWidth="2"
        fill="#eef7f0"
      />
      <path
        d="M8 16.5 L13.5 22 L24 10"
        stroke="#1a6b3c"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray="100"
        strokeDashoffset="100"
        style={{
          animation: 'drawTick 0.35s ease-out forwards',
        }}
      />
    </svg>
  )
}

// Animated hand-drawn cross (✗) SVG — 32x32px checkbox
export function CrossSVG({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className="cross-svg"
      style={{ overflow: 'visible' }}
    >
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="6"
        stroke="#b01a2e"
        strokeWidth="2"
        fill="#faebeb"
      />
      {/* First stroke: top-left to bottom-right */}
      <path
        d="M10 10 L22 22"
        stroke="#b01a2e"
        strokeWidth="2.75"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="100"
        strokeDashoffset="100"
        style={{
          animation: 'drawCross 0.25s ease-out forwards',
        }}
      />
      {/* Second stroke: top-right to bottom-left */}
      <path
        d="M22 10 L10 22"
        stroke="#b01a2e"
        strokeWidth="2.75"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="100"
        strokeDashoffset="100"
        style={{
          animation: 'drawCross 0.25s ease-out 0.15s forwards',
        }}
      />
    </svg>
  )
}

// Empty box (not yet filled) — 32x32px checkbox
export function EmptyBox({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="6"
        stroke="#c4baa1"
        strokeWidth="2"
        fill="#fffef9"
      />
    </svg>
  )
}
