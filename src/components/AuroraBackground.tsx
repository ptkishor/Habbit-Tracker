import { ReactNode } from 'react'
import SnowParticles from './SnowParticles'

export default function AuroraBackground({ children }: { children?: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#090b10] text-[#f8fafc]">
      {/* ── Ambient Top Glow (Linear / Apple style) ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle 800px at 50% -100px, rgba(56, 189, 248, 0.08), transparent 70%),
            radial-gradient(circle 600px at 85% 15%, rgba(99, 102, 241, 0.06), transparent 60%)
          `,
        }}
        aria-hidden="true"
      />

      {/* ── Subtle Snow ── */}
      <SnowParticles />

      {/* ── Content ── */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {children}
      </div>
    </div>
  )
}
