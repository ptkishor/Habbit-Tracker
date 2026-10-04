import { useRef, useEffect } from 'react'
import { AppIcon } from './Icons'

export type TabKey = 'today' | 'insights' | 'coach' | 'settings'

interface TabsNavProps {
  activeTab: TabKey
  onSelectTab: (tab: TabKey) => void
}

const TABS: Array<{ key: TabKey; icon: string; label: string }> = [
  { key: 'today', icon: 'today', label: 'Today' },
  { key: 'insights', icon: 'chart', label: 'Insights' },
  { key: 'coach', icon: 'spark', label: 'Coach' },
]

export default function TabsNav({ activeTab, onSelectTab }: TabsNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const indRef = useRef<HTMLSpanElement>(null)

  const moveIndicator = () => {
    if (!navRef.current || !indRef.current) return
    const activeBtn = navRef.current.querySelector<HTMLButtonElement>('button.on')
    if (activeBtn) {
      indRef.current.style.opacity = '1'
      indRef.current.style.width = `${activeBtn.offsetWidth}px`
      indRef.current.style.transform = `translateX(${activeBtn.offsetLeft}px)`
    } else {
      indRef.current.style.opacity = '0'
    }
  }

  useEffect(() => {
    moveIndicator()
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(moveIndicator)
    }
    const handleResize = () => moveIndicator()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeTab])

  return (
    <nav ref={navRef} className="tabs" id="tabs" aria-label="Sections">
      <span ref={indRef} className="ind" />
      {TABS.map(({ key, icon, label }) => {
        const isOn = activeTab === key
        return (
          <button
            key={key}
            type="button"
            data-t={key}
            className={isOn ? 'on' : ''}
            aria-current={isOn ? 'page' : 'false'}
            onClick={() => onSelectTab(key)}
          >
            <AppIcon name={icon} size={16} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
