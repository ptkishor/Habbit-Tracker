import { useEffect, useRef } from 'react'
import Toast from './Toast'

export default function SnowCanvas() {
  const snowCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) return

    const canvas = snowCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let flakes: Array<{
      x: number
      y: number
      r: number
      v: number
      ph: number
      a: number
    }> = []

    let animationId: number
    let isRunning = !document.hidden

    function sizeSnow() {
      if (!canvas || !ctx) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      flakes = []
      const n = 35 // 35 subtle slow particles
      for (let i = 0; i < n; i++) {
        flakes.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: 0.8 + Math.random() * 2.0,
          v: 0.18 + Math.random() * 0.42,
          ph: Math.random() * 6,
          a: 0.2 + Math.random() * 0.4,
        })
      }
    }

    function isDark(): boolean {
      const a = document.documentElement.getAttribute('data-theme')
      return a ? a === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    function snowLoop() {
      if (!isRunning || !ctx) return
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const dk = isDark()

      flakes.forEach(f => {
        f.y += f.v
        f.ph += 0.012
        f.x += Math.sin(f.ph) * 0.35
        if (f.y > window.innerHeight + 5) {
          f.y = -5
          f.x = Math.random() * window.innerWidth
        }
        ctx.beginPath()
        ctx.fillStyle = dk
          ? `rgba(255,255,255,${f.a})`
          : `rgba(70,150,215,${f.a * 0.7})`
        ctx.arc(f.x, f.y, f.r, 0, 7)
        ctx.fill()
      })

      animationId = requestAnimationFrame(snowLoop)
    }

    sizeSnow()
    snowLoop()

    const handleResize = () => {
      sizeSnow()
    }
    window.addEventListener('resize', handleResize)

    const handleVisibility = () => {
      isRunning = !document.hidden
      if (isRunning) {
        cancelAnimationFrame(animationId)
        snowLoop()
      } else {
        cancelAnimationFrame(animationId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <>
      <canvas id="snow" ref={snowCanvasRef} aria-hidden="true" />
      <canvas id="fx" aria-hidden="true" />
      <Toast />
    </>
  )
}
