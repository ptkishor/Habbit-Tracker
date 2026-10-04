import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface FrostProgressRingProps {
  pct: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  label?: string
}

export default function FrostProgressRing({
  pct,
  size = 170,
  strokeWidth = 14,
  showLabel = true,
  label = 'Completed',
}: FrostProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r

  // Animated number count-up using spring physics
  const springValue = useSpring(0, { stiffness: 45, damping: 18 })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    springValue.set(pct)
  }, [pct, springValue])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest))
    })
    return () => unsubscribe()
  }, [springValue])

  const strokeDashoffset = useTransform(springValue, [0, 100], [circ, 0])
  const gradientId = `ringGradient-${size}`

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow pulse when in progress */}
      {pct > 0 && (
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-4 rounded-full bg-gradient-to-tr from-[#38bdf8]/20 via-[#6366f1]/20 to-[#10b981]/20 blur-xl pointer-events-none"
        />
      )}

      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />

        {/* Animated gradient progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ strokeDashoffset }}
          filter="url(#glowFilter)"
        />
      </svg>

      {/* Inner percentage display: big number 40px+ */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            className="font-heading font-bold text-white tracking-tight"
            style={{ fontSize: '42px', lineHeight: 1 }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {displayValue}%
          </motion.span>
          {label && (
            <span className="text-[12px] font-semibold text-white/50 tracking-wider uppercase mt-1">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
