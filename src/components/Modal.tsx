import React, { useEffect, useRef } from 'react'
import { AppIcon } from './Icons'

interface ModalProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function Modal({ isOpen, title, onClose, children }: ModalProps) {
  const modalBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    // Focus first input or button in modal
    const focusable = modalBoxRef.current?.querySelectorAll<HTMLElement>(
      'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable && focusable.length > 0) {
      focusable[0].focus()
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div ref={modalBoxRef} className="modal-box">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
            {title}
          </h3>
          <button
            type="button"
            className="iconbtn"
            style={{ width: '32px', height: '32px' }}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <AppIcon name="x" size={16} />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
