interface ProgressRingProps {
  pct: number          // 0-100
  size?: number        // diameter in px
  strokeWidth?: number
  label?: string
}

export default function ProgressRing({
  pct,
  size = 120,
  strokeWidth = 10,
  label,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (pct / 100) * circumference

  // Color: green when high, amber when medium, red when low
  const color =
    pct >= 80 ? '#1a6b3c' :
    pct >= 50 ? '#b07a1a' :
    '#b01a2e'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track (faded) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#c8bfa8"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          className="progress-ring__circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>
      {/* Center label */}
      <div className="relative" style={{ marginTop: -(size / 2 + 16) }}>
        <span className="font-heading text-2xl text-ink" style={{ lineHeight: 1 }}>
          {pct}%
        </span>
      </div>
      <div style={{ marginTop: size / 2 - 8 }}>
        {label && <p className="font-hand text-ink-faded text-sm text-center">{label}</p>}
      </div>
    </div>
  )
}
