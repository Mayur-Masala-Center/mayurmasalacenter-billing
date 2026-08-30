import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// ── Barcode scanner hook ──────────────────────────────────────────
function useBarcodeScanner(videoRef, onDetected, enabled) {
  const rafRef      = useRef(null)
  const detectorRef = useRef(null)
  const zxingRef    = useRef(null)
  const lastCodeRef = useRef(null)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    let stopped = false

    async function init() {
      if ('BarcodeDetector' in window) {
        try {
          const supported = await BarcodeDetector.getSupportedFormats()
          const formats   = supported.includes('code_128') ? ['code_128'] : supported
          detectorRef.current = new BarcodeDetector({ formats })
          const detect = async () => {
            if (stopped) return
            const video = videoRef.current
            if (video && video.readyState === 4) {
              try {
                const codes = await detectorRef.current.detect(video)
                if (codes.length > 0) {
                  const code = codes[0].rawValue
                  const now  = Date.now()
                  if (code !== lastCodeRef.current || now - lastTimeRef.current > 1500) {
                    lastCodeRef.current = code
                    lastTimeRef.current = now
                    onDetected(code)
                  }
                }
              } catch (_) {}
            }
            rafRef.current = requestAnimationFrame(detect)
          }
          rafRef.current = requestAnimationFrame(detect)
          return
        } catch (_) {}
      }
      const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import('@zxing/library')
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])
      hints.set(DecodeHintType.TRY_HARDER, false)
      const reader = new BrowserMultiFormatReader(hints, 150)
      zxingRef.current = reader
      await reader.decodeFromVideoDevice(null, videoRef.current, (result) => {
        if (!result || stopped) return
        const code = result.getText()
        const now  = Date.now()
        if (code !== lastCodeRef.current || now - lastTimeRef.current > 1500) {
          lastCodeRef.current = code
          lastTimeRef.current = now
          onDetected(code)
        }
      })
    }
    init()
    return () => {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (zxingRef.current) { try { zxingRef.current.reset() } catch (_) {} }
    }
  }, [enabled])
}

// ── Camera stream hook ────────────────────────────────────────────
function useCameraStream(videoRef, enabled) {
  const streamRef = useRef(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    }).then(stream => {
      if (!active) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
    }).catch(err => console.error('Camera error:', err))
    return () => {
      active = false
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [enabled])
}

// ── Manual add bottom-sheet modal ────────────────────────────────
function ManualAddModal({ onAdd, onClose }) {
  const [name, setName]   = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty]     = useState(1)
  const toast = useToast()
  const nameRef = useRef(null)

  useEffect(() => {
    // Small delay to let the modal animate in before focusing
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const handleAdd = () => {
    if (!name.trim()) return toast('Enter item name', 'error')
    const p = parseFloat(price)
    if (!price || isNaN(p) || p <= 0) return toast('Enter a valid price', 'error')
    onAdd({ name: name.trim(), price: p, qty })
    toast(`"${name.trim()}" added`)
    onClose()
  }

  const subtotal = name && price && !isNaN(parseFloat(price))
    ? (parseFloat(price) * qty).toFixed(2)
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#1a1f2e',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '18px 18px 0 0',
        padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 24px)',
        zIndex: 201,
        maxWidth: '100vw',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        animation: 'slideUp 0.22s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Handle + header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1rem' }}>✏️</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>
              Add item manually
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 16px' }} />

        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Item Name
            </label>
            <input
              ref={nameRef}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 13px',
                background: 'rgba(255,255,255,0.07)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                borderRadius: 10, color: '#fff',
                fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none',
              }}
              placeholder="e.g. Loose Haldi 100g"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Price + Qty */}
          <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Price (₹)
              </label>
              <input
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 10px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, color: '#fff',
                  fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none',
                }}
                type="number" min="0" step="0.50" placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>

            <div style={{ flex: '0 0 auto', width: 96 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Qty
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, width: '100%' }}>
                <button
                  style={{
                    width: 26, height: 42, flexShrink: 0, padding: 0,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, background: 'rgba(255,255,255,0.07)',
                    color: '#fff', cursor: 'pointer', fontSize: '1.05rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                >−</button>
                <input
                  style={{
                    width: 34, flexShrink: 1, minWidth: 0,
                    padding: '11px 2px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: 8, color: '#fff',
                    fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700, textAlign: 'center', outline: 'none',
                  }}
                  type="number" min="1"
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  onFocus={e => e.target.select()}
                />
                <button
                  style={{
                    width: 26, height: 42, flexShrink: 0, padding: 0,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 8, background: 'rgba(255,255,255,0.07)',
                    color: '#fff', cursor: 'pointer', fontSize: '1.05rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onClick={() => setQty(q => q + 1)}
                >+</button>
              </div>
            </div>
          </div>

          {/* Live preview */}
          {subtotal && (
            <div style={{
              background: 'rgba(0,201,167,0.08)',
              border: '1px solid rgba(0,201,167,0.18)',
              borderRadius: 8, padding: '8px 12px',
              fontSize: '0.82rem', display: 'flex',
              justifyContent: 'space-between',
              color: 'rgba(255,255,255,0.6)',
            }}>
              <span>{name} × {qty}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--teal, #00c9a7)' }}>
                ₹{subtotal}
              </span>
            </div>
          )}

          <button
            style={{
              width: '100%', padding: '13px',
              background: 'var(--teal, #00c9a7)',
              color: 'var(--ink, #0f1117)',
              border: 'none', borderRadius: 10,
              fontFamily: 'inherit', fontWeight: 700,
              fontSize: '0.95rem', cursor: 'pointer',
              marginTop: 2,
            }}
            onClick={handleAdd}
          >
            + Add to Bill
          </button>
        </div>
      </div>
    </>
  )
}

// ── Light-themed manual row for overview screen ───────────────────
function ManualItemRow({ onAdd }) {
  const [name, setName]   = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty]     = useState(1)
  const [open, setOpen]   = useState(false)
  const toast = useToast()

  const handleAdd = () => {
    if (!name.trim()) return toast('Enter item name', 'error')
    const p = parseFloat(price)
    if (!price || isNaN(p) || p <= 0) return toast('Enter a valid price', 'error')
    onAdd({ name: name.trim(), price: p, qty })
    setName(''); setPrice(''); setQty(1); setOpen(false)
    toast(`"${name.trim()}" added manually`)
  }

  return (
    <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>✏️</span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)' }}>Add item manually</span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="form-label">Item Name</label>
              <input className="form-input" placeholder="e.g. Loose Haldi 100g" value={name} autoFocus onChange={e => setName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Price (₹)</label>
                <input className="form-input" type="number" min="0" step="0.50" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              </div>
              <div style={{ width: 84, flexShrink: 0 }}>
                <label className="form-label">Qty</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <button className="btn btn-secondary btn-sm" style={{ width: 26, padding: 0, flexShrink: 0 }} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input className="form-input" type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} onFocus={e => e.target.select()} style={{ width: 30, minWidth: 0, textAlign: 'center', padding: '12px 2px', fontWeight: 700, boxSizing: 'border-box' }} />
                  <button className="btn btn-secondary btn-sm" style={{ width: 26, padding: 0, flexShrink: 0 }} onClick={() => setQty(q => q + 1)}>+</button>
                </div>
              </div>
            </div>
            {name && price && !isNaN(parseFloat(price)) && (
              <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{name} × {qty}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--ink)' }}>₹{(parseFloat(price) * qty).toFixed(2)}</span>
              </div>
            )}
            <button className="btn btn-primary btn-full" onClick={handleAdd}>+ Add to Bill</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Steps: 'start' | 'scanning' | 'result' | 'overview'
export default function ScanPage() {
  const toast    = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep]                 = useState('start')
  const [customerName, setCustomerName] = useState('')
  const [cart, setCart]                 = useState([])
  const [scannedItem, setScannedItem]   = useState(null)
  const [submitting, setSubmitting]     = useState(false)
  const [cameraError, setCameraError]   = useState('')
  const [notFound, setNotFound]         = useState(false)
  const [processing, setProcessing]     = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)

  const itemsCacheRef = useRef(null)
  const [cacheReady, setCacheReady] = useState(false)

  // ── Guard against losing an in-progress bill ──
  // Any step past 'start' with items in the cart (or mid-scan) counts as
  // "work in progress". If the user hits the hardware/browser back button,
  // we intercept it and ask for confirmation instead of silently discarding.
  const hasUnsavedWork = step !== 'start' && (cart.length > 0 || step === 'result')
  const hasUnsavedWorkRef = useRef(hasUnsavedWork)
  useEffect(() => { hasUnsavedWorkRef.current = hasUnsavedWork }, [hasUnsavedWork])

  useEffect(() => {
    // Push a sentinel history entry so the first "back" press is caught by us.
    window.history.pushState({ scanGuard: true }, '')

    const handlePopState = () => {
      if (hasUnsavedWorkRef.current) {
        const confirmLeave = window.confirm(
          'Discard this bill? All scanned items will be lost.'
        )
        if (confirmLeave) {
          navigate('/dashboard')
        } else {
          // Stay put — re-push the sentinel so back is caught again.
          window.history.pushState({ scanGuard: true }, '')
        }
      } else {
        navigate('/dashboard')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [navigate])

  // Also warn on tab close / refresh while work is in progress.
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedWorkRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  useEffect(() => {
    if (step !== 'scanning') return
    setCacheReady(false)
    supabase.from('items').select('*').then(({ data }) => {
      const map = {}
      if (data) data.forEach(item => { map[item.barcode] = item })
      itemsCacheRef.current = map
      setCacheReady(true)
    })
  }, [step])

  const videoRef   = useRef(null)
  const scanActive = step === 'scanning' && cacheReady
  const notFoundRef = useRef(false)

  const handleDetected = useCallback((code) => {
    if (processing || notFoundRef.current) return
    const cache = itemsCacheRef.current
    if (!cache) return
    const item = cache[code]
    if (!item) {
      notFoundRef.current = true
      setNotFound(true)
      toast(`"${code}" not found`, 'error')
      setTimeout(() => { notFoundRef.current = false; setNotFound(false) }, 1500)
      return
    }
    setScannedItem(item)
    setStep('result')
  }, [processing, toast])

  useCameraStream(videoRef, scanActive)
  useBarcodeScanner(videoRef, handleDetected, scanActive && !processing && !showManualModal)

  const handleManualAdd = useCallback((item) => {
    setCart(prev => {
      const key = `manual-${item.name.toLowerCase().trim()}`
      const existing = prev.find(c => c.item.barcode === key)
      if (existing) return prev.map(c => c.item.barcode === key ? { ...c, qty: c.qty + item.qty } : c)
      return [...prev, { item: { ...item, barcode: key, id: key }, qty: item.qty }]
    })
  }, [])

  const handleNext = () => {
    setCart(prev => {
      const existing = prev.find(c => c.item.barcode === scannedItem.barcode)
      if (existing) return prev.map(c => c.item.barcode === scannedItem.barcode ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { item: scannedItem, qty: 1 }]
    })
    setScannedItem(null)
    setStep('scanning')
  }

  const handleRetake = () => { setScannedItem(null); setStep('scanning') }
  const handleDone   = () => setStep('overview')

  const handleRemoveCartItem = (barcode) => {
    setCart(prev => {
      const item = prev.find(c => c.item.barcode === barcode)
      if (!item) return prev
      if (item.qty > 1) return prev.map(c => c.item.barcode === barcode ? { ...c, qty: c.qty - 1 } : c)
      return prev.filter(c => c.item.barcode !== barcode)
    })
  }

  const handleSubmit = async () => {
    if (cart.length === 0) return toast('Cart is empty', 'error')
    setSubmitting(true)
    const total = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)
    const { data: bill, error: billErr } = await supabase
      .from('bills')
      .insert({ customer_name: customerName.trim(), total_amount: total, status: 'pending', created_by: user?.email ?? '' })
      .select().single()
    if (billErr) { toast('Failed to create bill', 'error'); setSubmitting(false); return }
    const billItems = cart.map(c => ({
      bill_id:    bill.id,
      item_id:    String(c.item.id).startsWith('manual-') ? null : c.item.id,
      item_name:  c.item.name,
      item_price: c.item.price,
      quantity:   c.qty,
    }))
    const { error: itemsErr } = await supabase.from('bill_items').insert(billItems)
    if (itemsErr) toast('Bill created but items failed to save', 'error')
    else {
      hasUnsavedWorkRef.current = false // submitted successfully — safe to leave
      toast(`Bill submitted for ${customerName}!`)
      navigate('/dashboard')
    }
    setSubmitting(false)
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0)

  // ─── Step: Start ───────────────────────────────────
  if (step === 'start') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>🧾</div>
          <h1 style={{ color: 'var(--white)', fontSize: '1.75rem', fontWeight: 700 }}>New Bill</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '6px', fontSize: '0.9rem' }}>Enter customer name to start scanning</p>
        </div>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div className="form-group">
            <label className="form-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Customer Name</label>
            <input
              className="form-input"
              style={{ background: 'var(--ink-mid)', border: '1.5px solid rgba(255,255,255,0.1)', color: 'var(--white)', fontSize: '1.05rem' }}
              placeholder="e.g. Ravi Kumar"
              value={customerName}
              autoFocus
              onChange={e => setCustomerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && customerName.trim() && setStep('scanning')}
            />
          </div>
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: '8px' }} disabled={!customerName.trim()} onClick={() => setStep('scanning')}>
            Start Scanning →
          </button>
          <button className="btn btn-ghost btn-full" style={{ marginTop: '10px', color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }} onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    )
  }

  // ─── Step: Scanning ────────────────────────────────
  if (step === 'scanning') {
    return (
      <div className="scanner-shell">
        {/* ── Compact top nav ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          gap: 8,
        }}>
          {/* Left: customer + counter */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {customerName}
            </div>
            <div style={{ color: 'var(--teal, #00c9a7)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: 600 }}>
              {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} · ₹${cartTotal.toFixed(2)}` : 'No items yet'}
            </div>
          </div>

          {/* Right: manual + done */}
          <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
            {/* Manual add button */}
            <button
              onClick={() => setShowManualModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 11px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>✏️</span>
              <span>Manual</span>
            </button>

            {/* Done button */}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDone}
              disabled={cart.length === 0}
              style={{ whiteSpace: 'nowrap' }}
            >
              Done {cartCount > 0 ? `(${cartCount})` : ''}
            </button>
          </div>
        </div>

        {/* ── Camera area — fixed, sufficient height for scanning; cart list gets remaining priority space ── */}
        <div style={{
          flex: '0 0 auto',
          height: '38vh',
          minHeight: 230,
          maxHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: '#000',
        }}>
          {!cacheReady ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--teal, #00c9a7)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Loading items…</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : cameraError ? (
            <div style={{ background: '#3b1a1a', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '20px', color: '#fca5a5', textAlign: 'center', maxWidth: 340, margin: '0 16px' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📵</div>
              <div>{cameraError}</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => { setCameraError(''); setStep('scanning') }}>Try Again</button>
            </div>
          ) : (
            <>
              {/* Video fills the entire space */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Scan frame overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                {/* Corner-bracket frame */}
                <div style={{ position: 'relative', width: '72%', maxWidth: 280, aspectRatio: '3/1.4' }}>
                  {/* Corners */}
                  {[
                    { top: 0, left: 0, borderTop: '3px solid #00c9a7', borderLeft: '3px solid #00c9a7' },
                    { top: 0, right: 0, borderTop: '3px solid #00c9a7', borderRight: '3px solid #00c9a7' },
                    { bottom: 0, left: 0, borderBottom: '3px solid #00c9a7', borderLeft: '3px solid #00c9a7' },
                    { bottom: 0, right: 0, borderBottom: '3px solid #00c9a7', borderRight: '3px solid #00c9a7' },
                  ].map((s, i) => (
                    <div key={i} style={{ position: 'absolute', width: 22, height: 22, borderRadius: 2, ...s }} />
                  ))}
                  {/* Animated scan line */}
                  <div style={{
                    position: 'absolute', left: 4, right: 4,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #00c9a7, transparent)',
                    animation: 'scanline 1.6s ease-in-out infinite',
                    boxShadow: '0 0 8px rgba(0,201,167,0.7)',
                  }} />
                  <style>{`
                    @keyframes scanline {
                      0%   { top: 8px;  opacity: 0; }
                      10%  { opacity: 1; }
                      90%  { opacity: 1; }
                      100% { top: calc(100% - 8px); opacity: 0; }
                    }
                  `}</style>
                </div>
              </div>

              {/* Not-found flash */}
              {notFound && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(239,68,68,0.85)',
                  color: '#fff', textAlign: 'center',
                  padding: '10px', fontSize: '0.82rem', fontWeight: 600,
                }}>
                  ✕ Barcode not in catalog — try again
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Cart summary strip — now the priority area, fills remaining space, shows full list ── */}
        {cart.length > 0 && (
          <div style={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 12px 4px', flexShrink: 0 }}>
              Cart — {cartCount} item{cartCount !== 1 ? 's' : ''}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
              {cart.map(c => (
                <div key={c.item.barcode} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.item.name}{String(c.item.barcode).startsWith('manual-') ? ' ✏️' : ''}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginLeft: 8 }}>×{c.qty}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--teal, #00c9a7)', marginLeft: 10, minWidth: 60, textAlign: 'right' }}>
                    ₹{(c.item.price * c.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual add modal */}
        {showManualModal && (
          <ManualAddModal
            onAdd={(item) => { handleManualAdd(item) }}
            onClose={() => setShowManualModal(false)}
          />
        )}
      </div>
    )
  }

  // ─── Step: Result ──────────────────────────────────
  if (step === 'result') {
    return (
      <div className="scanner-shell">
        <div className="scanner-nav">
          <div>
            <div className="scanner-title">✅ Item Found</div>
            <div className="scanner-subtitle">{customerName} · {cartCount} item{cartCount !== 1 ? 's' : ''} in cart</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleDone} disabled={cart.length === 0}>Done</button>
        </div>
        <div className="scanner-body" style={{ justifyContent: 'center', gap: '16px' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center' }}>Scanned item</div>
          <div className="result-card">
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏷️</div>
            <div className="result-item-name">{scannedItem?.name}</div>
            <div className="result-item-price">₹{Number(scannedItem?.price).toFixed(2)}</div>
            <div className="result-barcode">{scannedItem?.barcode}</div>
          </div>
          <div className="scan-actions">
            <button className="btn btn-ghost btn-full btn-lg" style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleRetake}>🔄 Retake</button>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleNext}>✓ Next →</button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textAlign: 'center' }}>
            <strong>Next</strong> adds item · <strong>Retake</strong> discards · <strong>Done</strong> to review
          </div>
          {cart.length > 0 && (
            <div className="scanner-cart" style={{ marginTop: '8px' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Cart so far</div>
              {cart.slice(-3).map(c => (
                <div key={c.item.barcode} className="cart-item-row">
                  <span className="cart-item-name">{c.item.name}</span>
                  <span className="cart-item-qty">×{c.qty}</span>
                  <span className="cart-item-price">₹{(c.item.price * c.qty).toFixed(2)}</span>
                </div>
              ))}
              {cart.length > 3 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', padding: '4px' }}>+{cart.length - 3} more</div>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Step: Overview ────────────────────────────────
  if (step === 'overview') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--paper)' }}>
        <div style={{ background: 'var(--ink)', padding: `calc(20px + var(--sat, 0px)) 20px 20px`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer</div>
          <div style={{ color: 'var(--white)', fontSize: '1.5rem', fontWeight: 700, marginTop: 4 }}>{customerName}</div>
          <div style={{ color: 'var(--teal)', fontSize: '2.2rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>₹{cartTotal.toFixed(2)}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.825rem', marginTop: 4 }}>
            {cartCount} item{cartCount !== 1 ? 's' : ''} · {cart.length} product{cart.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ padding: '16px', maxWidth: 520, margin: '0 auto' }}>
          <ManualItemRow onAdd={handleManualAdd} />
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div className="empty-state-icon">🛒</div>
                <div className="empty-state-title">Cart is empty</div>
                <div className="empty-state-text">Scan items or add manually above</div>
              </div>
            ) : cart.map((c, i) => (
              <div key={c.item.barcode} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < cart.length - 1 ? '1px solid var(--border)' : 'none', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.item.name}</div>
                    {String(c.item.barcode).startsWith('manual-') && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>MANUAL</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>₹{Number(c.item.price).toFixed(2)} × {c.qty}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleRemoveCartItem(c.item.barcode)}>−</button>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, minWidth: 22, textAlign: 'center', fontSize: '0.95rem' }}>{c.qty}</span>
                  <button style={{ width: 30, height: 30, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCart(prev => prev.map(cc => cc.item.barcode === c.item.barcode ? { ...cc, qty: cc.qty + 1 } : cc))}>+</button>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.9rem', minWidth: 72, textAlign: 'right' }}>₹{(Number(c.item.price) * c.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-secondary btn-full" onClick={() => setStep('scanning')}>📷 Scan More</button>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleSubmit} disabled={submitting || cart.length === 0}>
              {submitting ? '⏳ Submitting…' : '✓ Submit Bill'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Adjust quantities · Add items manually · Submit when ready
          </div>
        </div>
      </div>
    )
  }

  return null
}
