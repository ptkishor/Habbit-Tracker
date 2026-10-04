import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AppIcon } from '../components/Icons'
import ThemeToggle from '../components/ThemeToggle'

interface AuthPageProps {
  onEnterDemo?: () => void
}

export default function AuthPage({ onEnterDemo }: AuthPageProps) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const fn = mode === 'signin' ? signIn : signUp
    const { error: authError } = await fn(email, password)

    if (authError) {
      setError(authError.message)
    } else if (mode === 'signup') {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
        <ThemeToggle />
      </div>

      <div
        className="c"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '28px 24px',
          borderRadius: '26px',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--ice), var(--done))',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 20px -6px rgba(47, 155, 234, 0.45)',
            }}
          >
            <AppIcon name="snow" size={24} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, lineHeight: 1.1 }}>
            Winter Arc
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink2)', margin: '4px 0 0' }}>
            90 Days of Relentless Focus &amp; Protocol Mastery
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div
          className="tabs"
          style={{ width: '100%', display: 'flex', marginBottom: '18px' }}
        >
          <button
            type="button"
            className={mode === 'signin' ? 'on' : ''}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => {
              setMode('signin')
              setError(null)
            }}
          >
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'on' : ''}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => {
              setMode('signup')
              setError(null)
            }}
          >
            <span>Create Account</span>
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--done)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px',
              }}
            >
              <AppIcon name="check" size={22} strokeWidth={2.8} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Check Your Inbox
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--ink2)', lineHeight: 1.5 }}>
              We sent a verification link to <b>{email}</b>. Confirm your email to enter your Winter Arc.
            </p>
            <button
              type="button"
              className="btn-pill"
              style={{ marginTop: '16px', width: '100%' }}
              onClick={() => {
                setSuccess(false)
                setMode('signin')
              }}
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: 'var(--miss-soft)',
                  color: 'var(--miss)',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AppIcon name="alert" size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="cta"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: '6px',
              }}
            >
              {loading ? (
                <span>Connecting...</span>
              ) : mode === 'signin' ? (
                <span>Enter Winter Arc &rarr;</span>
              ) : (
                <span>Begin 90-Day Challenge &rarr;</span>
              )}
            </button>

            {onEnterDemo && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn-pill"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={onEnterDemo}
                >
                  <AppIcon name="snow" size={15} />
                  <span>Continue on Day 1 (Local Mode)</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
