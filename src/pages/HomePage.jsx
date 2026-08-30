import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState({ items: 0, bills: 0, pending: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }),
      supabase.from('bills').select('id', { count: 'exact', head: true }),
      supabase.from('bills').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([items, bills, pending]) => {
      setStats({ items: items.count || 0, bills: bills.count || 0, pending: pending.count || 0 })
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
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}. Manage your store's billing with barcode scanning.
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Items', value: stats.items, icon: '📦' },
          { label: 'Bills', value: stats.bills, icon: '🧾' },
          { label: 'Pending', value: stats.pending, icon: '⏳' },
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
        <button className="btn btn-primary btn-full btn-lg" onClick={() => navigate('/scan')}>
          📷 Start New Bill
        </button>
        <button className="btn btn-dark btn-full btn-lg" onClick={() => navigate('/dashboard')}>
          📊 Billing Dashboard
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/items')}>
          📦 Manage Items & Barcodes
        </button>
      </div>

      {/* How it works */}
      <div style={{ marginTop: '56px', maxWidth: 560, width: '100%' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '16px' }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {[
            { icon: '📦', label: 'Add Items', desc: 'Create products with auto-generated barcodes' },
            { icon: '🖨️', label: 'Print Labels', desc: 'Print & stick barcode labels on products' },
            { icon: '📷', label: 'Scan to Bill', desc: 'Scan items to build the customer\'s cart' },
            { icon: '💰', label: 'Collect', desc: 'Biller marks payment as received' },
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
