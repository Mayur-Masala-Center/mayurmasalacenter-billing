import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { isOwner } from '../lib/roles'

// ── Logo (from ItemsPage) ─────────────────────────────────────────
const LOGO_B64 = 'data:image/png;base64,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'

// ── Shop config ───────────────────────────────────────────────────
const SHOP = {
  name:    'Mayur Masala Center',
  sub:     'and Pooja Bhandar',
  address: 'Shagun Chowk, Pimpri',
  address2: 'Pimpri-Chinchwad, Maharashtra 411017',
  phone:   '+919359117213',
  tagline: 'Quality Masala & Pooja Items',
}

function billNo(id) { return 'MM-' + id.slice(-6).toUpperCase() }
// ── Print receipt ─────────────────────────────────────────────────
// Builds a 58mm-optimised HTML receipt, opens it in a new tab, and
// calls window.print() automatically — Android then shows the native
// print dialog where the paired Bluetooth printer appears directly.
function printBill(bill, items) {
  const dateStr  = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  const timeStr  = new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  const subtotal = Number(bill.total_amount) + Number(bill.discount_amount || 0)
  const discPct  = Number(bill.discount_percent || 0)
  const discAmt  = Number(bill.discount_amount  || 0)
  const total    = Number(bill.total_amount)

  const itemRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.item_name}</td>
      <td class="c">${item.quantity}</td>
      <td class="r">${Number(item.item_price).toFixed(2)}</td>
      <td class="r">${(item.item_price * item.quantity).toFixed(2)}</td>
    </tr>`).join('')

  const discRow = discPct > 0 ? `
    <tr class="disc">
      <td colspan="4" class="r">Discount (${discPct}%)</td>
      <td class="r">- ${discAmt.toFixed(2)}</td>
    </tr>` : ''

  const paidStamp = bill.status === 'paid' ? `<div class="paid">** PAID **</div>` : ''
  const staffLine = bill.created_by ? `<div>Staff: ${bill.created_by.split('@')[0]}</div>` : ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bill ${billNo(bill.id)}</title>
  <style>
    @page { size: 58mm auto; margin: 2mm 1px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 16px;
      width: 56mm;
      color: #000;
      background: #fff;
    }
    .hdr  { text-align: center; margin-bottom: 4px; }
    .s1   { font-size: 22px; font-weight: bold; }
    .s2   { font-size: 16px; font-weight: bold; }
    .s3   { font-size: 13px; color: #333; }
    hr.dl { border: none; border-top: 1.5px solid #000; margin: 4px 0; }
    hr.dd { border: none; border-top: 1px dashed #888; margin: 4px 0; }
    .meta { font-size: 15px; margin-bottom: 3px; line-height: 1.5; }
    .row  { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; }
    th  { font-size: 15px; font-weight: bold; padding: 3px 0; border-bottom: 1px dashed #888; text-align: left; }
    td  { font-size: 16px; padding: 2px 0; vertical-align: top; line-height: 1.4; }
    td.c { text-align: center; width: 18px; }
    td.r { text-align: right; }
    td:nth-child(1) { width: 14px; font-size: 14px; color: #555; }
    td:nth-child(4) { width: 34px; }
    td:nth-child(5) { width: 36px; }
    .sub td  { font-size: 15px; color: #333; padding-top: 4px; }
    .disc td { color: #c00; font-size: 15px; }
    .tot     { border-top: 2px solid #000; }
    .tot td  { font-size: 22px; font-weight: bold; padding-top: 4px; }
    .paid { text-align: center; font-size: 22px; font-weight: bold; color: #007a60; margin: 6px 0 3px; }
    .ftr  { text-align: center; font-size: 16px; color: #333; margin-top: 8px; line-height: 1.6; font-weight: bold; }
    .ftr small { font-size: 14px; font-weight: normal; color: #555; }
    @media print {
      body { width: auto !important; zoom: 1 !important; transform: none !important; }
    }
  </style>
</head>
<body>
  <div class="hdr">
    <div class="s1">${SHOP.name}</div>
    <div class="s2">${SHOP.sub}</div>
    <div class="s3">${SHOP.address}</div>
    <div class="s3">${SHOP.address2}</div>
    ${SHOP.phone ? `<div class="s3">Ph: ${SHOP.phone}</div>` : ''}
  </div>
  <hr class="dl">
  <div class="meta">
    <div class="row"><span><b>Bill:</b> ${billNo(bill.id)}</span><span>${dateStr} ${timeStr}</span></div>
    <div><b>Customer:</b> ${bill.customer_name}</div>
    ${staffLine}
  </div>
  <hr class="dd">
  <table>
    <thead>
      <tr><th>#</th><th>Item</th><th class="c">Qty</th><th class="r">Rate</th><th class="r">Amt</th></tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="sub">
        <td colspan="4" class="r"><b>Subtotal</b></td>
        <td class="r"><b>${subtotal.toFixed(2)}</b></td>
      </tr>
      ${discRow}
    </tbody>
  </table>
  <hr class="dl">
  <table class="tot">
    <tr>
      <td><b>TOTAL</b></td>
      <td colspan="4" class="r"><b>Rs. ${total.toFixed(2)}</b></td>
    </tr>
  </table>
  ${paidStamp}
  <div class="ftr">
    Thank you for shopping with us!<br>
    <small>${SHOP.tagline}</small>
  </div>
</body>
<script>
  // Auto-trigger Android native print dialog on load.
  // Receipt Printer Driver intercepts this and routes to
  // the paired Bluetooth printer — no extra taps needed.
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  if (!win) {
    // Fallback if popup blocked — open in same tab
    window.location.href = url
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

// ── Bluetooth thermal printer (via "Bluetooth Print" Android app) ─
// Tapping the BT Print button fires a my.bluetoothprint.scheme:// deep-link.
// The Android app intercepts it, fetches the JSON from /api/print-bill,
// and sends it straight to the paired Bluetooth thermal printer.
//
// App: https://play.google.com/store/apps/details?id=mate.bluetoothprint
// Setup: open the app → Menu → Browser Print → enable toggle.
function bluetoothPrint(bill) {
  // Build absolute URL to our Vercel serverless function
  const apiUrl = `${window.location.origin}/api/print-bill?id=${bill.id}`
  // Deep-link scheme that launches the Bluetooth Print app on Android
  const btUrl  = `my.bluetoothprint.scheme://${apiUrl}`
  window.location.href = btUrl
}


// ── Generate professional A4 invoice PDF ─────────────────────────
// Matches the invoice template — logo, shop details, itemised table,
// totals. No GST/transporter fields. Uploaded to Supabase Storage.
async function generateInvoicePDF(bill, items) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = 210, H = 297
  let y = 0

  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
  })
  const subtotal = Number(bill.total_amount) + Number(bill.discount_amount || 0)
  const discPct  = Number(bill.discount_percent || 0)
  const discAmt  = Number(bill.discount_amount  || 0)
  const total    = Number(bill.total_amount)

  // ── helpers ──
  const solidLine = (yy, lw = 0.4) => {
    doc.setDrawColor(0); doc.setLineWidth(lw)
    doc.line(10, yy, W - 10, yy)
  }
  const thinLine = (yy) => {
    doc.setDrawColor(180); doc.setLineWidth(0.2)
    doc.line(10, yy, W - 10, yy)
  }
  const txt = (str, x, yy, opts = {}) => {
    doc.setFontSize(opts.size || 9)
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(...(opts.color || [0,0,0]))
    doc.text(String(str), x, yy, { align: opts.align || 'left', ...opts.extra })
  }

  // ── OUTER BORDER ──
  doc.setDrawColor(0); doc.setLineWidth(0.5)
  doc.rect(10, 10, W - 20, H - 20)

  // ── TOP BAR: Page / TAX INVOICE / Original Copy ──
  y = 14
  txt('Page No. 1 of 1', 12, y, { size: 8 })
  txt('BILL', W / 2, y, { size: 13, bold: true, align: 'center' })
  txt('Original Copy', W - 12, y, { size: 8, align: 'right' })
  y += 2; thinLine(y); y += 5

  // ── LOGO + COMPANY HEADER ──
  // Logo left box
  doc.setDrawColor(180); doc.setLineWidth(0.3)
  doc.rect(12, y, 22, 22)
  try { doc.addImage(LOGO_B64, 'PNG', 13, y + 1, 20, 20) } catch(e) {}

  // Company name centred
  txt(SHOP.name, W / 2, y + 5, { size: 16, bold: true, align: 'center' })
  txt(SHOP.sub, W / 2, y + 10, { size: 10, bold: true, align: 'center', color: [80, 80, 80] })
  txt(SHOP.address + ', ' + SHOP.address2, W / 2, y + 15, { size: 8, align: 'center', color: [100,100,100] })
  txt('Mobile: ' + SHOP.phone, W / 2, y + 20, { size: 8, align: 'center', color: [100,100,100] })
  y += 26; thinLine(y); y += 2

  // ── INVOICE META ──
  const col1x = 12, col2x = W / 2 + 5
  txt('Invoice Number', col1x, y + 4, { size: 8, bold: true })
  txt(': ' + billNo(bill.id), col1x + 32, y + 4, { size: 8 })
  txt('Invoice Date', col1x, y + 9, { size: 8, bold: true })
  txt(': ' + dateStr, col1x + 32, y + 9, { size: 8 })

  // vertical separator
  doc.setDrawColor(180); doc.setLineWidth(0.2)
  doc.line(W / 2, y, W / 2, y + 14)

  txt('Customer Name', col2x, y + 4, { size: 8, bold: true })
  txt(': ' + bill.customer_name, col2x + 32, y + 4, { size: 8 })
  if (bill.created_by) {
    txt('Staff', col2x, y + 9, { size: 8, bold: true })
    txt(': ' + bill.created_by.split('@')[0], col2x + 32, y + 9, { size: 8 })
  }
  y += 16; thinLine(y); y += 2

  // ── ITEMS TABLE HEADER ──
  doc.setFillColor(240, 240, 240)
  doc.rect(10, y, W - 20, 7, 'F')
  const cols = { sr: 12, item: 20, qty: 120, rate: 145, disc: 165, amt: 180 }
  txt('Sr.', cols.sr, y + 5, { size: 8, bold: true })
  txt('Item Description', cols.item, y + 5, { size: 8, bold: true })
  txt('Qty', cols.qty, y + 5, { size: 8, bold: true, align: 'right' })
  txt('Rate', cols.rate, y + 5, { size: 8, bold: true, align: 'right' })
  txt('Disc.', cols.disc, y + 5, { size: 8, bold: true, align: 'right' })
  txt('Amount (₹)', W - 12, y + 5, { size: 8, bold: true, align: 'right' })
  y += 7; thinLine(y)

  // ── ITEM ROWS ──
  items.forEach((item, i) => {
    y += 7
    const lineTotal = (Number(item.item_price) * Number(item.quantity)).toFixed(2)
    txt(String(i + 1), cols.sr, y, { size: 8 })
    // Wrap long names
    const nameLines = doc.splitTextToSize(item.item_name, 90)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(0,0,0)
    doc.text(nameLines, cols.item, y)
    txt(item.quantity, cols.qty, y, { size: 8, align: 'right' })
    txt(Number(item.item_price).toFixed(2), cols.rate, y, { size: 8, align: 'right' })
    txt('', cols.disc, y, { size: 8, align: 'right' })
    txt(lineTotal, W - 12, y, { size: 8, align: 'right' })
    if (nameLines.length > 1) y += (nameLines.length - 1) * 4.5
    thinLine(y + 2)
  })

  y += 8

  // ── SUBTOTAL / DISCOUNT / TOTAL ──
  thinLine(y); y += 5
  txt('Subtotal', cols.item, y, { size: 8 })
  txt(subtotal.toFixed(2), W - 12, y, { size: 8, align: 'right' })

  if (discPct > 0) {
    y += 5
    txt(`Discount (${discPct}%)`, cols.item, y, { size: 8, color: [180, 0, 0] })
    txt('- ' + discAmt.toFixed(2), W - 12, y, { size: 8, align: 'right', color: [180,0,0] })
  }

  y += 4; solidLine(y, 0.8); y += 6
  txt('TOTAL', cols.item, y, { size: 12, bold: true })
  txt('Rs. ' + total.toFixed(2), W - 12, y, { size: 12, bold: true, align: 'right', color: [0, 130, 60] })

  // ── PAID STAMP ──
  if (bill.status === 'paid') {
    y += 8
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 130, 60)
    doc.text('✓ PAID', W / 2, y, { align: 'center' })
  }

  // ── FOOTER ──
  y = H - 22; thinLine(y); y += 5
  txt(SHOP.tagline, W / 2, y, { size: 8, align: 'center', color: [100,100,100] })
  txt('Thank you for shopping with us!', W / 2, y + 5, { size: 8, align: 'center', color: [100,100,100] })
  txt('Mayur Masala Center · ' + SHOP.phone, W / 2, y + 10, { size: 7, align: 'center', color: [150,150,150] })

  return doc
}

// ── Upload PDF to Supabase Storage & return public URL ────────────
async function uploadBillPDF(bill, items) {
  const doc      = await generateInvoicePDF(bill, items)
  const pdfBytes = doc.output('arraybuffer')
  const filename = `bills/${billNo(bill.id)}-${Date.now()}.pdf`
  const { error } = await supabase.storage
    .from('bills')
    .upload(filename, pdfBytes, { contentType: 'application/pdf', upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('bills').getPublicUrl(filename)
  return data.publicUrl
}

// ── WhatsApp modal ────────────────────────────────────────────────
function WhatsAppModal({ bill, items, onClose }) {
  const toast = useToast()
  const [phone, setPhone]       = useState(SHOP.phone.replace(/\D/g,'').startsWith('91') ? '' : '')
  const [sending, setSending]   = useState(false)
  const [step, setStep]         = useState('input') // 'input' | 'uploading' | 'done'
  const [pdfUrl, setPdfUrl]     = useState(null)

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) return toast('Enter a valid 10-digit number', 'error')
    const fullNumber = digits.startsWith('91') ? digits : '91' + digits.slice(-10)

    setSending(true)
    setStep('uploading')
    try {
      const url = await uploadBillPDF(bill, items)
      setPdfUrl(url)

      const total    = Number(bill.total_amount).toFixed(2)
      const dateStr  = new Date(bill.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
      const message  = `🧾 *Mayur Masala Center*\n\nDear *${bill.customer_name}*,\n\nYour bill ${billNo(bill.id)} dated ${dateStr}\n💰 Total: *Rs. ${total}*\n\nDownload your invoice:\n${url}\n\nThank you for shopping with us! 🙏\n_Mayur Masala Center & Pooja Bhandar_`

      const waUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`
      window.open(waUrl, '_blank')
      setStep('done')
      toast('WhatsApp opened!')
    } catch (e) {
      toast('Failed: ' + e.message, 'error')
      setStep('input')
    }
    setSending(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: '1.5rem' }}>💬</div>
          <div className="modal-title" style={{ marginBottom: 0 }}>Send Bill on WhatsApp</div>
        </div>
        <div className="modal-subtitle">{bill.customer_name} · {billNo(bill.id)} · Rs.{Number(bill.total_amount).toFixed(2)}</div>

        {step === 'done' && pdfUrl ? (
          <div>
            <div style={{ background: '#d1fae5', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#065f46' }}>
              ✓ WhatsApp opened with bill link! If it didn't open, tap below.
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>PDF link (copy if needed)</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', background: 'var(--paper)', padding: '8px', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all', color: 'var(--text-muted)' }}>
                {pdfUrl}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-full btn-sm" onClick={onClose}>Close</button>
              <button className="btn btn-primary btn-full btn-sm" onClick={() => setStep('input')}>Send Again</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">Customer WhatsApp Number</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ background: 'var(--paper)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 10px', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>+91</div>
                <input
                  className="form-input"
                  type="tel" maxLength={10} placeholder="9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  autoFocus
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: '1.1rem', letterSpacing: '0.1em' }}
                />
              </div>
            </div>

            <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              {step === 'uploading' ? (
                <div style={{ textAlign: 'center', color: 'var(--teal-dark)', fontWeight: 600 }}>⏳ Generating PDF & uploading…</div>
              ) : (
                <>
                  📄 A PDF invoice will be generated & uploaded<br/>
                  💬 WhatsApp opens with the bill link + message<br/>
                  👆 Customer taps to download their invoice
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-full" onClick={onClose} disabled={sending}>Cancel</button>
              <button
                className="btn btn-full"
                style={{ background: '#25D366', color: '#fff', fontWeight: 700 }}
                onClick={handleSend}
                disabled={sending || phone.length < 10}
              >
                {sending ? '⏳ Processing…' : '💬 Send on WhatsApp'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Discount modal ────────────────────────────────────────────────
function DiscountModal({ bill, onClose, onSaved }) {
  const toast = useToast()
  const [pct, setPct]     = useState(Number(bill.discount_percent || 0))
  const [saving, setSaving] = useState(false)
  const subtotal    = Number(bill.total_amount) + Number(bill.discount_amount || 0)
  const discountAmt = (subtotal * pct) / 100
  const newTotal    = subtotal - discountAmt

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('bills').update({
      discount_percent: pct, discount_amount: discountAmt, total_amount: newTotal,
    }).eq('id', bill.id)
    if (error) toast('Failed to apply discount', 'error')
    else { toast(`Discount of ${pct}% (₹${discountAmt.toFixed(2)}) applied!`); onSaved(); onClose() }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Apply Discount</div>
        <div className="modal-subtitle">Discount for {bill.customer_name}</div>
        <div className="form-group">
          <label className="form-label">Discount %</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-secondary" style={{ width: 44, padding: 0 }} onClick={() => setPct(p => Math.max(0, p - 1))}>−</button>
            <input className="form-input" type="number" min="0" max="100" step="0.5" value={pct}
              onChange={e => setPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.2rem' }} />
            <button className="btn btn-secondary" style={{ width: 44, padding: 0 }} onClick={() => setPct(p => Math.min(100, p + 1))}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {[5, 10, 15, 20, 25].map(p => (
            <button key={p} className={`btn btn-sm ${pct === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPct(p)}>{p}%</button>
          ))}
        </div>
        <div style={{ background: 'var(--paper)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
            <span className="font-mono">₹{subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 8 }}>
            <span style={{ color: 'var(--danger)' }}>Discount ({pct}%)</span>
            <span className="font-mono" style={{ color: 'var(--danger)' }}>− ₹{discountAmt.toFixed(2)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
            <span>Total to pay</span>
            <span className="font-mono" style={{ color: 'var(--teal-dark)' }}>₹{newTotal.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>{saving ? '⏳ Saving…' : 'Apply Discount'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Bill detail modal ─────────────────────────────────────────────
function BillDetailModal({ bill: initialBill, onClose, onRefresh, isOwner }) {
  const [bill, setBill]   = useState(initialBill)
  const [items, setItems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [marking, setMarking]   = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const toast = useToast()

  const loadItems = useCallback(async () => {
    const { data } = await supabase.from('bill_items').select('*').eq('bill_id', bill.id)
    setItems(data || [])
    setLoading(false)
  }, [bill.id])

  const reloadBill = useCallback(async () => {
    const { data } = await supabase.from('bills').select('*').eq('id', bill.id).single()
    if (data) setBill(data)
    onRefresh()
  }, [bill.id, onRefresh])

  useEffect(() => { loadItems() }, [loadItems])

  const handleMarkPaid = async () => {
    setMarking(true)
    const { error } = await supabase.from('bills')
      .update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', bill.id)
    if (error) toast('Failed to update', 'error')
    else { toast(`₹${Number(bill.total_amount).toFixed(2)} received from ${bill.customer_name}!`); reloadBill(); onClose() }
    setMarking(false)
  }

  const subtotal = Number(bill.total_amount) + Number(bill.discount_amount || 0)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius)', padding: '18px 16px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Customer</div>
          <div style={{ color: 'var(--white)', fontSize: '0.9rem', fontWeight: 700, marginTop: 3 }}>{bill.customer_name}</div>
          <div style={{ color: 'var(--teal)', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>
            ₹{Number(bill.total_amount).toFixed(2)}
          </div>
          {Number(bill.discount_percent) > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', marginTop: 4 }}>
              After {bill.discount_percent}% discount (saved ₹{Number(bill.discount_amount).toFixed(2)})
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <span className={`badge badge-${bill.status}`}>{bill.status === 'paid' ? '✓ Paid' : '⏳ Pending'}</span>
          </div>
        </div>

            <div style={{ marginBottom: 16 }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>Loading…</div>
              ) : items.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{i + 1}. {item.item_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ₹{Number(item.item_price).toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1rem' }}>
                    ₹{(item.item_price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
          <div style={{ paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Subtotal</span><span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            {Number(bill.discount_percent) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--danger)', marginBottom: 4 }}>
                <span>Discount ({bill.discount_percent}%)</span>
                <span className="font-mono">− ₹{Number(bill.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', paddingTop: 8, borderTop: '1.5px solid var(--ink)' }}>
              <span>Total</span>
              <span className="font-mono" style={{ color: 'var(--teal-dark)' }}>₹{Number(bill.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div>Bill: {billNo(bill.id)} · {new Date(bill.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
          {bill.created_by && <div>Created by: <span style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>{bill.created_by.split('@')[0]}</span></div>}
          {bill.paid_at && <div>Paid: {new Date(bill.paid_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bill.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-full btn-sm" onClick={() => setShowDiscount(true)}>
                🏷️ {Number(bill.discount_percent) > 0 ? `Discount (${bill.discount_percent}%)` : 'Add Discount'}
              </button>
              {isOwner ? (
                <button className="btn btn-full btn-sm" style={{ background: 'var(--success)', color: 'var(--white)' }}
                  onClick={handleMarkPaid} disabled={marking}>
                  {marking ? '⏳…' : '💰 Mark Paid'}
                </button>
              ) : (
                <div title="Only the owner can mark bills as paid"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '6px 8px', textAlign: 'center', cursor: 'not-allowed' }}>
                  🔒 Owner only
                </div>
              )}
            </div>
          )}
          {/* ── Print row ── */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
            <button className="btn btn-dark btn-sm"
              title="Bluetooth thermal printer — requires 'Bluetooth Print' app on Android"
              onClick={() => bluetoothPrint(bill)}>
              📱 Print
            </button>
            <button className="btn btn-sm"
              style={{ background: '#25D366', color: '#fff', fontWeight: 700 }}
              title="Send bill via WhatsApp"
              onClick={() => setShowWhatsApp(true)}
              disabled={loading}>
              💬 WhatsApp
            </button>
          </div>
        </div>
      </div>
      {showDiscount && <DiscountModal bill={bill} onClose={() => setShowDiscount(false)} onSaved={reloadBill} />}
      {showWhatsApp && !loading && <WhatsAppModal bill={bill} items={items} onClose={() => setShowWhatsApp(false)} />}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const toast    = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const owner    = isOwner(user?.email)

  const [bills, setBills]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [selectedBill, setSelectedBill] = useState(null)
  const [printingId, setPrintingId]     = useState(null)

  const fetchBills = useCallback(async () => {
    const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false })
    if (error) toast('Failed to load bills', 'error')
    else setBills(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchBills()
    const channel = supabase.channel('bills-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, fetchBills)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchBills])

  const handleQuickPrint = async (e, bill) => {
    e.stopPropagation()
    setPrintingId(bill.id)
    try {
      const { data: items } = await supabase.from('bill_items').select('*').eq('bill_id', bill.id)
      printBill(bill, items || [])
    } catch { toast('Failed to print', 'error') }
    setPrintingId(null)
  }

  const handleQuickPaid = async (e, bill) => {
    e.stopPropagation()
    const { error } = await supabase.from('bills')
      .update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', bill.id)
    if (error) toast('Failed to update', 'error')
    else { toast(`₹${Number(bill.total_amount).toFixed(2)} received from ${bill.customer_name}!`); fetchBills() }
  }

  const filtered     = bills.filter(b => filter === 'all' ? true : b.status === filter)
  const totalPending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + Number(b.total_amount), 0)
  const totalPaid    = bills.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.total_amount), 0)
  const pendingCount = bills.filter(b => b.status === 'pending').length

  return (
    <div className="page-wide">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Billing Dashboard</h1>
          <p className="page-subtitle">
            Manage bills, discounts and payments
            {owner && <span style={{ marginLeft: 8, background: 'var(--teal-glow)', color: 'var(--teal-dark)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, border: '1px solid var(--teal)' }}>👑 Owner</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/scan')}>+ New Bill</button>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">Total Bills</div><div className="stat-value">{bills.length}</div></div>
        <div className="stat-card"><div className="stat-label">Pending</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{pendingCount}</div></div>
        <div className="stat-card"><div className="stat-label">Pending Amt</div><div className="stat-value" style={{ color: 'var(--warning)', fontSize: '1.2rem' }}>₹{totalPending.toFixed(0)}</div></div>
        <div className="stat-card"><div className="stat-label">Collected</div><div className="stat-value teal" style={{ fontSize: '1.2rem' }}>₹{totalPaid.toFixed(0)}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'pending', 'paid'].map(f => (
          <button key={f} className={`btn btn-sm ${filter === f ? 'btn-dark' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'pending' ? '⏳ Pending' : '✓ Paid'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state"><div className="empty-state-icon">⏳</div><div className="empty-state-title">Loading…</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <div className="empty-state-title">{filter === 'all' ? 'No bills yet' : `No ${filter} bills`}</div>
            {filter === 'all' && <button className="btn btn-primary mt-3" onClick={() => navigate('/scan')}>+ Create First Bill</button>}
          </div>
        ) : filtered.map((bill, idx) => (
          <div key={bill.id} onClick={() => setSelectedBill(bill)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.925rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.customer_name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {billNo(bill.id)} · {new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })} {new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
              </div>
              {bill.created_by && (
                <div style={{ fontSize: '0.68rem', marginTop: 2, color: 'var(--teal-dark)', opacity: 0.85 }}>🧑 {bill.created_by.split('@')[0]}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.85rem' }}>₹{Number(bill.total_amount).toFixed(2)}</div>
              {Number(bill.discount_percent) > 0 && <div style={{ fontSize: '0.68rem', color: 'var(--danger)' }}>-{bill.discount_percent}% off</div>}
            </div>
            <div style={{ flexShrink: 0 }}>
              <span className={`badge badge-${bill.status}`}>{bill.status === 'paid' ? '✓' : '⏳'}</span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <button className="btn btn-sm btn-dark" style={{ padding: '5px 9px', minHeight: 32 }}
                title="Bluetooth Print" onClick={e => { e.stopPropagation(); bluetoothPrint(bill) }}>
                📱
              </button>
              {bill.status === 'pending' && (owner ? (
                <button className="btn btn-sm" style={{ padding: '5px 9px', minHeight: 32, background: 'var(--success)', color: 'var(--white)' }}
                  title="Mark as paid" onClick={e => handleQuickPaid(e, bill)}>💰</button>
              ) : (
                <div title="Only the owner can mark bills as paid"
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--border)', fontSize: '0.85rem', cursor: 'not-allowed' }}>🔒</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedBill && (
        <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} onRefresh={fetchBills} isOwner={owner} />
      )}
    </div>
  )
}