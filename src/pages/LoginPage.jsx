import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!email.trim()) return setError('Please enter your email')
    if (mode === 'login' && !password) return setError('Please enter your password')

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setError(error.message)

    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setSuccess('Password reset email sent! Check your inbox.')
    }

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ink)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'radial-gradient(circle, #00c9a7 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* Brand block */}
      <div style={{ textAlign: 'center', marginBottom: '36px', position: 'relative' }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, var(--teal) 0%, #00a88c 100%)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem',
          margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(0,201,167,0.35)',
        }}>🌶️</div>

        <h1 style={{ color: 'var(--white)', fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          Mayur Masala
        </h1>
        <div style={{ color: 'var(--teal)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '5px' }}>
          Billing System
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '380px',
        backdropFilter: 'blur(12px)',
      }}>
        {mode === 'forgot' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>Reset Password</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Enter your email and we'll send a reset link</div>
          </div>
        )}

        {/* Email */}
        <div className="form-group">
          <label className="form-label" style={{ color: 'rgba(255,255,255,0.45)' }}>Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
            style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'var(--white)' }}
          />
        </div>

        {/* Password — only on sign in */}
        {mode === 'login' && (
          <div className="form-group">
            <label className="form-label" style={{ color: 'rgba(255,255,255,0.45)' }}>Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'var(--white)' }}
            />
          </div>
        )}

        {/* Error / success */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '16px' }}>
            ✕ {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(0,201,167,0.12)', border: '1px solid rgba(0,201,167,0.25)', borderRadius: '8px', padding: '10px 14px', color: 'var(--teal)', fontSize: '0.85rem', marginBottom: '16px' }}>
            ✓ {success}
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSubmit}
          disabled={loading}
          style={{ marginBottom: '16px' }}
        >
          {loading ? '⏳ Please wait…' : mode === 'login' ? 'Sign In →' : 'Send Reset Link →'}
        </button>

        {/* Toggle forgot / back */}
        <div style={{ textAlign: 'center' }}>
          {mode === 'login' ? (
            <button
              onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}
            >
              Forgot password?
            </button>
          ) : (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}
            >
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '32px', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', textAlign: 'center' }}>
        Mayur Masala · Billing System
      </div>
    </div>
  )
}
