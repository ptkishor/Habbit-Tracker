import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  radius: number
  speedY: number
  speedX: number
  opacity: number
}

export default function SnowParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let isVisible = !document.hidden
    const maxParticles = 30

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleVisibilityChange = () => {
      isVisible = !document.hidden
      if (isVisible) {
        lastTime = performance.now()
        animationFrameId = requestAnimationFrame(animate)
      } else {
        cancelAnimationFrame(animationFrameId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const particles: Particle[] = []
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.5 + 0.6,
        speedY: Math.random() * 0.4 + 0.2,
        speedX: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.25 + 0.08,
      })
    }

    let lastTime = performance.now()

    function animate(currentTime: number) {
      if (!isVisible || !ctx || !canvas) return

      const delta = (currentTime - lastTime) / 1000
      lastTime = currentTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.y += p.speedY * (delta * 60)
        p.x += p.speedX * (delta * 60)

        if (p.y > canvas.height + 5) {
          p.y = -5
          p.x = Math.random() * canvas.width
        }
        if (p.x > canvas.width + 5) p.x = -5
        if (p.x < -5) p.x = canvas.width + 5

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
      aria-hidden="true"
    />
  )
}
