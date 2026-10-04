import { useTheme } from '../context/ThemeContext'
import { AppIcon } from './Icons'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className={`iconbtn ${className}`}
      id="themeBtn"
      onClick={toggleTheme}
      aria-label="Switch theme"
    >
      <AppIcon name={isDark ? 'sunlg' : 'moon'} size={17} />
    </button>
  )
}
