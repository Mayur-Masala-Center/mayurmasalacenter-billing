// Shared helpers for bills: numbering, IST dates, search and CSV export.

const IST = 'Asia/Kolkata'

// YYYY-MM-DD of a Date, in India time (en-CA formats dates as ISO).
export function istDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export const todayIST = () => istDay(new Date())

// Move a YYYY-MM-DD day forwards/backwards by whole days.
export function shiftDay(day, delta) {
  const d = new Date(day + 'T12:00:00+05:30')
  d.setUTCDate(d.getUTCDate() + delta)
  return istDay(d)
}

// The day a bill belongs to: its (possibly backdated) billing_date, else the day it was created.
export const billDay = bill => bill.billing_date || istDay(new Date(bill.created_at))

// MM-000123 for numbered bills. Old bills / drafts without a number fall back to the id suffix.
export function billNo(bill) {
  return bill.bill_no
    ? 'MM-' + String(bill.bill_no).padStart(6, '0')
    : 'MM-' + String(bill.id).slice(-6).toUpperCase()
}
export const billLabel = bill => (bill.status === 'draft' ? 'Draft' : billNo(bill))

// Search box: customer name or bill number ("MM-000123" or just "123").
export function matchesSearch(bill, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (bill.customer_name || '').toLowerCase().includes(q) || billNo(bill).toLowerCase().includes(q)
}

// How a bill's numbers add up:  subtotal - discount (+/- round-off) = total.
// The round-off is not stored: it is whatever is left between the line items and the saved total
// (always under 50 paise). Old percent-discount bills keep showing their percent.
const r2 = n => Math.round(n * 100) / 100
export function billTotals(bill, items) {
  const total = Number(bill.total_amount)
  const discount = Number(bill.discount_amount || 0)
  const pct = Number(bill.discount_percent || 0)
  const fromItems = items && items.length
    ? r2(items.reduce((t, l) => t + Number(l.item_price) * Number(l.quantity), 0))
    : r2(total + discount)
  const diff = r2(total - (fromItems - discount))
  const isRoundOff = Math.abs(diff) >= 0.005 && Math.abs(diff) <= 0.5
  const subtotal = isRoundOff || Math.abs(diff) < 0.005 ? fromItems : r2(total + discount)   // odd legacy data: keep old maths
  return { subtotal, discount, pct, roundOff: isRoundOff ? diff : 0, total,
           discountLabel: pct > 0 ? `Discount (${pct}%)` : 'Discount' }
}

// ── CSV (opens directly in Excel / Google Sheets) ──────────────────
function cell(v) {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s   // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
export const toCsv = rows => '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n')

const round2 = n => Math.round(n * 100) / 100
const STATUS_LABEL = { draft: 'Draft', final: 'Printed', cancelled: 'Cancelled' }

// One row per bill. `linesByBill` maps bill id -> its bill_items rows.
export function billsToCsv(bills, linesByBill = {}) {
  const head = ['Bill No', 'Date', 'Customer', 'Status', 'Items', 'Subtotal', 'Discount %', 'Discount Amount', 'Total', 'Created By']
  const rows = bills.map(b => {
    const items = (linesByBill[b.id] || []).map(l => `${l.item_name} x${l.quantity} @${Number(l.item_price)}`).join('; ')
    const disc = Number(b.discount_amount || 0)
    return [billLabel(b), billDay(b), b.customer_name, STATUS_LABEL[b.status] || b.status, items,
      round2(Number(b.total_amount) + disc), Number(b.discount_percent || 0), disc, Number(b.total_amount), b.created_by || '']
  })
  return toCsv([head, ...rows])
}

// Item-wise sales: how much of each item was sold (before discount), highest amount first.
export function itemsToCsv(lines) {
  const map = new Map()
  for (const l of lines) {
    const key = l.item_name.trim().toLowerCase()
    const cur = map.get(key) || { name: l.item_name.trim(), qty: 0, amount: 0, bills: new Set() }
    cur.qty += Number(l.quantity); cur.amount += Number(l.item_price) * Number(l.quantity); cur.bills.add(l.bill_id)
    map.set(key, cur)
  }
  const rows = [...map.values()].sort((a, b) => b.amount - a.amount)
    .map(x => [x.name, x.qty, round2(x.amount), x.bills.size])
  return toCsv([['Item', 'Total Qty', 'Amount (before discount)', 'In Bills'], ...rows])
}

// Save text as a downloadable file (browser only).
export function downloadFile(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
