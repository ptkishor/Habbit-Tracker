import { SVG_PATHS } from '../components/Icons'

const isReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

let toastTimer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string) {
  if (typeof document === 'undefined') return
  const toastEl = document.getElementById('toast')
  if (!toastEl) return

  toastEl.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG_PATHS.spark}</svg><span>${message}</span>`
  toastEl.classList.add('show')

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show')
  }, 2800)
}

export function burst(target: HTMLElement | null) {
  if (!target || isReducedMotion() || typeof document === 'undefined') return

  const rect = target.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const colors = ['#FFFFFF', '#9BE7FF', '#5ED0FF', '#2DD4B0', '#BFF5EA']

  // Expanding ring
  const ring = document.createElement('span')
  ring.className = 'pt'
  ring.style.cssText = `left:${cx}px;top:${cy}px;width:36px;height:36px;border:2px solid #fff;margin:-18px 0 0 -18px`
  document.body.appendChild(ring)

  ring.animate(
    [
      { transform: 'scale(.6)', opacity: 0.9 },
      { transform: 'scale(2.8)', opacity: 0 },
    ],
    { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' }
  ).onfinish = () => ring.remove()

  // 16 burst particles
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('span')
    const sz = 5 + Math.random() * 7
    const ang = Math.random() * Math.PI * 2
    const dist = 34 + Math.random() * 58
    p.className = 'pt' + (i % 3 === 0 ? ' fk' : '')
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;margin:-${sz / 2}px 0 0 -${sz / 2}px;background:${colors[i % colors.length]}`
    document.body.appendChild(p)

    p.animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
        {
          transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(0) rotate(200deg)`,
          opacity: 0,
        },
      ],
      { duration: 600 + Math.random() * 350, easing: 'cubic-bezier(.15,.8,.3,1)' }
    ).onfinish = () => p.remove()
  }
}

export function celebrate(dayNumber: number) {
  showToast(`Day ${dayNumber} complete`)
  if (isReducedMotion() || typeof window === 'undefined') return

  const canvas = document.getElementById('fx') as HTMLCanvasElement | null
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const colors = ['#FFFFFF', '#9BE7FF', '#5ED0FF', '#2DD4B0', '#FF8A5C']
  const ps: Array<{
    x: number
    y: number
    vx: number
    vy: number
    r: number
    c: string
    rot: number
    vr: number
    sq: boolean
  }> = []

  for (let i = 0; i < 150; i++) {
    ps.push({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 2 + Math.random() * 3.2,
      r: 2 + Math.random() * 4,
      c: colors[i % colors.length],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.2,
      sq: i % 3 === 0,
    })
  }

  const t0 = performance.now()
  function frame(t: number) {
    if (!ctx) return
    const elapsed = t - t0
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    ps.forEach(p => {
      p.x += p.vx + Math.sin((p.y + p.r) * 0.02)
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = Math.min(1, Math.max(0, 1 - (elapsed - 1600) / 900))
      ctx.fillStyle = p.c
      if (p.sq) {
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.r, 0, 7)
        ctx.fill()
      }
      ctx.restore()
    })

    if (elapsed < 2500) {
      requestAnimationFrame(frame)
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
  }
  requestAnimationFrame(frame)
}
