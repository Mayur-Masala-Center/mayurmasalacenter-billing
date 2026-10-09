import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { isOwner } from '../lib/roles'
import { todayIST, billDay } from '../lib/billUtils'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState({ items: 0, bills: 0, drafts: 0 })
  const owner = isOwner(user?.email)
  const [today, setToday] = useState(null)      // owner only: { sales, count }

  // Today's printed bills (a bill belongs to its billing date, so backdated ones don't count)
  useEffect(() => {
    if (!owner) return
    const day = todayIST()
    supabase.from('bills').select('total_amount, billing_date, created_at').eq('status', 'final')
      .gte('created_at', day + 'T00:00:00+05:30')
      .then(({ data }) => {
        const mine = (data || []).filter(b => billDay(b) === day)
        setToday({ sales: mine.reduce((t, b) => t + Number(b.total_amount), 0), count: mine.length })
      })
  }, [owner])

  useEffect(() => {
    Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }),
      supabase.from('bills').select('id', { count: 'exact', head: true }),
      supabase.from('bills').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    ]).then(([items, bills, drafts]) => {
      setStats({ items: items.count || 0, bills: bills.count || 0, drafts: drafts.count || 0 })
    })
  }, [])

  return (
    <div style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>

      {/* Hero */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          width: 80, height: 80,
          background: 'linear-gradient(135deg, var(--teal) 0%, #00a88c 100%)',
          borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem',
          margin: '0 auto 20px',
          boxShadow: '0 8px 32px rgba(0,201,167,0.25)',
        }}>🌶️</div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Mayur Masala
        </h1>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--teal-dark)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '12px' }}>
          Billing System
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 380 }}>
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}. Create, save and print bills quickly.
        </p>
      </div>

      {owner && today && (
        <div style={{ background: 'var(--ink)', color: 'var(--white)', borderRadius: 'var(--radius)', padding: '16px 28px', marginBottom: 20, minWidth: 260 }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Today's sales</div>
          <div style={{ color: 'var(--teal)', fontSize: '2rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>₹{today.sales.toFixed(0)}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{today.count} printed bill{today.count === 1 ? '' : 's'}</div>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Items', value: stats.items, icon: '📦' },
          { label: 'Bills', value: stats.bills, icon: '🧾' },
          { label: 'Drafts', value: stats.drafts, icon: '💾' },
        ].map(s => (
          <div key={s.label} style={{
            textAlign: 'center',
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px 28px',
            boxShadow: 'var(--shadow-sm)',
            minWidth: 100,
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: 340 }}>
        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/bill')}>
          🧾 Start New Bill
        </button>
        <button className="btn btn-dark btn-full btn-lg" onClick={() => navigate('/dashboard')}>
          📊 Billing Dashboard
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/items')}>
          📦 Manage Items
        </button>
      </div>

      {/* How it works */}
      <div style={{ marginTop: '56px', maxWidth: 560, width: '100%' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '16px' }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {[
            { icon: '📦', label: 'Add Items', desc: 'Save item names once for quick picking' },
            { icon: '✏️', label: 'Build Bill', desc: 'Enter customer, items, price and qty' },
            { icon: '💾', label: 'Save Draft', desc: 'Keep a bill aside to finish later' },
            { icon: '🖨️', label: 'Print', desc: 'One tap saves and prints the bill' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
