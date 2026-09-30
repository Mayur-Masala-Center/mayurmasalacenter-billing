import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useAuth } from '../lib/AuthContext'
import { bluetoothPrint } from '../lib/print'

// ── Today's date (Asia/Kolkata) as YYYY-MM-DD ──────────────────────
// Defaults the billing-date picker and caps it so a bill can't be
// dated into the future — past dates are fine (backdating).
function todayIST() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const y = ist.getFullYear()
  const m = String(ist.getMonth() + 1).padStart(2, '0')
  const d = String(ist.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const round2 = n => Math.round(n * 100) / 100
// Same name + same price = same line; same name at a new price = new line.
const lineKey = (name, price) => `${name.toLowerCase().trim()}|${price}`

const darkInput = {
  background: 'var(--ink-mid)', border: '1.5px solid rgba(255,255,255,0.1)',
  color: 'var(--white)', fontSize: '1.05rem',
}
const roundBtn = {
  width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)',
  background: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1,
}

// Steps: 'start' | 'bill'
export default function BillPage() {
  const toast    = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { id: draftId } = useParams()

  const [step, setStep]                 = useState(draftId ? 'bill' : 'start')
  const [loadingDraft, setLoadingDraft] = useState(!!draftId)
  const [customerName, setCustomerName] = useState('')
  const [billingDate, setBillingDate]   = useState(todayIST())
  const [cart, setCart]                 = useState([])
  const [discountPct, setDiscountPct]   = useState(0)
  const [saving, setSaving]             = useState(false)
  const [catalog, setCatalog]           = useState([])
  const [form, setForm]                 = useState({ name: '', price: '', qty: 1 })
  const priceRef = useRef(null)

  // ── Item catalog (names only) for suggestions ──
  useEffect(() => {
    supabase.from('items').select('name').order('name').then(({ data }) => {
      setCatalog((data || []).map(i => i.name))
    })
  }, [])

  // ── Reopen a saved draft: /bill/:id ──
  useEffect(() => {
    if (!draftId) return
    ;(async () => {
      const { data: bill } = await supabase.from('bills').select('*').eq('id', draftId).single()
      if (!bill || bill.status !== 'draft') {
        toast('This bill is not an editable draft', 'error')
        navigate('/bill', { replace: true })
        return
      }
      const { data: lines } = await supabase.from('bill_items').select('*').eq('bill_id', draftId)
      setCustomerName(bill.customer_name)
      if (bill.billing_date) setBillingDate(bill.billing_date)
      setDiscountPct(Number(bill.discount_percent || 0))
      setCart((lines || []).map(l => ({
        key: lineKey(l.item_name, Number(l.item_price)),
        name: l.item_name, price: Number(l.item_price), qty: l.quantity,
      })))
      setLoadingDraft(false)
    })()
  }, [draftId, navigate, toast])

  // ── Guard against losing an in-progress bill ──
  const hasUnsavedWork = step === 'bill' && cart.length > 0
  const unsavedRef = useRef(hasUnsavedWork)
  useEffect(() => { unsavedRef.current = hasUnsavedWork }, [hasUnsavedWork])

  useEffect(() => {
    // Sentinel history entry so the first "back" press is caught by us.
    window.history.pushState({ billGuard: true }, '')
    const onPop = () => {
      if (unsavedRef.current) {
        if (window.confirm('Discard this bill? Unsaved items will be lost.')) navigate('/')
        else window.history.pushState({ billGuard: true }, '')
      } else navigate('/')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [navigate])

  useEffect(() => {
    const onUnload = e => { if (unsavedRef.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  // ── Totals ──
  const subtotal    = useMemo(() => cart.reduce((s, c) => s + c.price * c.qty, 0), [cart])
  const discountAmt = round2((subtotal * discountPct) / 100)
  const total       = round2(subtotal - discountAmt)
  const cartCount   = cart.reduce((s, c) => s + c.qty, 0)

  // ── Cart actions ──
  const suggestions = useMemo(() => {
    const q = form.name.trim().toLowerCase()
    if (!q) return []
    return catalog.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 5)
  }, [form.name, catalog])

  const addItem = () => {
    const name = form.name.trim()
    const price = parseFloat(form.price)
    if (!name) return toast('Enter item name', 'error')
    if (isNaN(price) || price <= 0) return toast('Enter a valid price', 'error')
    const key = lineKey(name, price)
    setCart(prev => prev.some(c => c.key === key)
      ? prev.map(c => c.key === key ? { ...c, qty: c.qty + form.qty } : c)
      : [...prev, { key, name, price, qty: form.qty }])
    setForm({ name: '', price: '', qty: 1 })
  }

  const changeQty = (key, delta) => setCart(prev =>
    prev.flatMap(c => c.key !== key ? [c] : (c.qty + delta <= 0 ? [] : [{ ...c, qty: c.qty + delta }])))

  const resetBill = () => {
    setStep('start'); setCustomerName(''); setBillingDate(todayIST())
    setCart([]); setDiscountPct(0); setForm({ name: '', price: '', qty: 1 })
  }

  // ── Save (draft or final) ──
  // Returns the saved bill row, or null on failure.
  const saveBill = async (status) => {
    if (cart.length === 0) { toast('Add at least one item', 'error'); return null }
    if (!billingDate) { toast('Pick a billing date', 'error'); return null }
    if (billingDate > todayIST()) { toast('Billing date cannot be in the future', 'error'); return null }

    const fields = {
      customer_name: customerName.trim(), total_amount: total,
      discount_percent: discountPct, discount_amount: discountAmt,
      status, billing_date: billingDate,
    }
    let bill
    if (draftId) {
      const { data, error } = await supabase.from('bills').update(fields).eq('id', draftId).select().single()
      if (error) { toast('Failed to save bill', 'error'); return null }
      bill = data
      const { error: delErr } = await supabase.from('bill_items').delete().eq('bill_id', draftId)
      if (delErr) { toast('Failed to update items', 'error'); return null }
    } else {
      const { data, error } = await supabase.from('bills')
        .insert({ ...fields, created_by: user?.email ?? '' }).select().single()
      if (error) { toast('Failed to save bill', 'error'); return null }
      bill = data
    }

    const lines = cart.map(c => ({
      bill_id: bill.id, item_id: null,
      item_name: c.name, item_price: c.price, quantity: c.qty,
    }))
    const { error: itemsErr } = await supabase.from('bill_items').insert(lines)
    if (itemsErr) {
      if (!draftId) await supabase.from('bills').delete().eq('id', bill.id) // no half-saved bills
      toast('Failed to save items — nothing was saved', 'error')
      return null
    }
    return bill
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    const bill = await saveBill('draft')
    setSaving(false)
    if (!bill) return
    unsavedRef.current = false
    toast(`Draft saved for ${customerName.trim()}`)
    if (draftId) navigate('/bill', { replace: true }); else resetBill()
  }

  const handlePrint = async () => {
    setSaving(true)
    const bill = await saveBill('final')
    setSaving(false)
    if (!bill) return
    unsavedRef.current = false
    bluetoothPrint(bill)
    if (draftId) navigate('/bill', { replace: true }); else resetBill()
  }

  // ─── Step: Start ───────────────────────────────────
  if (step === 'start') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🧾</div>
          <h1 style={{ color: 'var(--white)', fontSize: '1.75rem', fontWeight: 700 }}>New Bill</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 6, fontSize: '0.9rem' }}>Enter customer name to start billing</p>
        </div>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div className="form-group">
            <label className="form-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Customer Name</label>
            <input className="form-input" style={darkInput} placeholder="e.g. Ravi Kumar"
              value={customerName} autoFocus onChange={e => setCustomerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && customerName.trim() && setStep('bill')} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Billing Date</label>
            <input type="date" className="form-input" style={{ ...darkInput, colorScheme: 'dark' }}
              value={billingDate} max={todayIST()} onChange={e => setBillingDate(e.target.value)} />
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: 4 }}>
              Defaults to today — pick a past date to backdate this bill.
            </div>
          </div>
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }}
            disabled={!customerName.trim() || !billingDate} onClick={() => setStep('bill')}>
            Start Billing →
          </button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: 10, color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (loadingDraft) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading draft…</div>
  }

  // ─── Step: Bill ────────────────────────────────────
  const canSave = !saving && cart.length > 0 && !!billingDate && billingDate <= todayIST()
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
      <div style={{ background: 'var(--ink)', padding: 'calc(20px + var(--sat, 0px)) 20px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {draftId ? 'Draft · Customer' : 'Customer'}
        </div>
        <div style={{ color: 'var(--white)', fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>{customerName}</div>
        <div style={{ color: 'var(--teal)', fontSize: '2.2rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>₹{total.toFixed(2)}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.825rem', marginTop: 4 }}>
          {cartCount} item{cartCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
        {/* Billing date */}
        <div className="card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>🗓️ Billing Date</label>
          <input type="date" value={billingDate} max={todayIST()} onChange={e => setBillingDate(e.target.value)}
            style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
        </div>

        {/* Add item */}
        <div className="card" style={{ padding: 14, marginBottom: 12 }}>
          <label className="form-label">Item Name</label>
          <input className="form-input" placeholder="Type or pick an item" value={form.name} autoFocus
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && priceRef.current?.focus()} />
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {suggestions.map(n => (
                <button key={n} className="btn btn-secondary btn-sm"
                  onClick={() => { setForm(f => ({ ...f, name: n })); priceRef.current?.focus() }}>{n}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Price (₹)</label>
              <input ref={priceRef} className="form-input" type="number" inputMode="decimal" min="0" step="0.50" placeholder="0.00"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addItem()} />
            </div>
            <div style={{ width: 96, flexShrink: 0 }}>
              <label className="form-label">Qty</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <button className="btn btn-secondary btn-sm" style={{ width: 26, padding: 0 }} onClick={() => setForm(f => ({ ...f, qty: Math.max(1, f.qty - 1) }))}>−</button>
                <input className="form-input" type="number" min="1" value={form.qty} style={{ padding: '8px 2px', textAlign: 'center' }}
                  onChange={e => setForm(f => ({ ...f, qty: Math.max(1, parseInt(e.target.value) || 1) }))} />
                <button className="btn btn-secondary btn-sm" style={{ width: 26, padding: 0 }} onClick={() => setForm(f => ({ ...f, qty: f.qty + 1 }))}>+</button>
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={addItem}>+ Add to Bill</button>
        </div>

        {/* Cart */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-state-icon">🛒</div>
              <div className="empty-state-title">No items yet</div>
              <div className="empty-state-text">Add items above</div>
            </div>
          ) : cart.map((c, i) => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>₹{c.price.toFixed(2)} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button style={roundBtn} onClick={() => changeQty(c.key, -1)}>−</button>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{c.qty}</span>
                <button style={roundBtn} onClick={() => changeQty(c.key, 1)}>+</button>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem', minWidth: 72, textAlign: 'right' }}>₹{(c.price * c.qty).toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Discount + totals */}
        {cart.length > 0 && (
          <div className="card" style={{ padding: '12px 14px', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '10px 0' }}>
              <label className="form-label" style={{ margin: 0 }}>Discount %</label>
              <input className="form-input" type="number" inputMode="decimal" min="0" max="100" step="0.5"
                value={discountPct || ''} placeholder="0" style={{ width: 90, textAlign: 'center' }}
                onChange={e => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
            </div>
            {discountPct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--danger)', marginBottom: 8 }}>
                <span>Discount ({discountPct}%)</span><span className="font-mono">− ₹{discountAmt.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <span>Total</span><span className="font-mono" style={{ color: 'var(--teal-dark)' }}>₹{total.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* The two actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingBottom: 'calc(16px + var(--sab, 0px))' }}>
          <button className="btn btn-secondary btn-full btn-lg" disabled={!canSave} onClick={handleSaveDraft}>
            {saving ? '⏳ Saving…' : '💾 Save Draft'}
          </button>
          <button className="btn btn-primary btn-full btn-lg" disabled={!canSave} onClick={handlePrint}>
            🖨️ Print Bill
          </button>
        </div>
      </div>
    </div>
  )
}
