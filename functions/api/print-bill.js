// ── /functions/api/print-bill.js ────────────────────────────────────
// Cloudflare Pages Function (converted from Vercel's api/print-bill.js).
// Runs at the same URL path: /api/print-bill?id=...
import { createClient } from '@supabase/supabase-js'

const SHOP = {
  name:    'Mayur Masala',
  sub:     '& Pooja Bhandar',
  address: 'Shagun Chowk, Pimpri',
  phone:   '+919359117213',
  tagline: 'Quality Masala & Pooja Items',
}

const billNo = (id) => 'MM-' + id.slice(-6).toUpperCase()

const pad = (str, len, right = false) => {
  const s = String(str).substring(0, len)
  return right ? s.padStart(len) : s.padEnd(len)
}

const text = (content, { bold = 0, align = 0, format = 0 } = {}) =>
  ({ type: 0, content, bold, align, format })

const SOLID  = '================================'
const BLANK  = { type: 0, content: ' ', bold: 0, align: 0, format: 0 }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return json({ error: 'Missing ?id= parameter' }, 400)
  }

  // Cloudflare Pages env vars come from context.env, not process.env.
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    return json({ error: 'Server misconfiguration' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: bill, error: billErr } = await supabase
    .from('bills').select('*').eq('id', id).single()

  if (billErr || !bill) {
    return json({ error: 'Bill not found' }, 404)
  }

  const { data: items = [] } = await supabase
    .from('bill_items').select('*').eq('bill_id', id).order('created_at')

  const rows = []

  // Header
  rows.push(text(SHOP.name,    { bold: 1, align: 1, format: 2 }))
  rows.push(text(SHOP.sub,     { bold: 1, align: 1, format: 3 }))
  rows.push(text(SHOP.address, { align: 1, format: 0 }))
  rows.push(text(`Ph: ${SHOP.phone}`, { align: 1, format: 0 }))
  rows.push(text(SOLID))

  // Bill meta — IST timezone explicitly set
  const IST = { timeZone: 'Asia/Kolkata' }
  const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...IST })
  const timeStr = new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', ...IST })

  rows.push(text(`Bill: ${billNo(bill.id)}`, {  format: 0 }))
  rows.push(text(`Date: ${dateStr} ${timeStr}`, { format: 0 }))
  rows.push(text(`Cust: ${bill.customer_name}`, { format: 0 }))
  if (bill.created_by) {
    rows.push(text(`By  : ${bill.created_by.split('@')[0]}`, { format: 0 }))
  }
  rows.push(text(SOLID))

  rows.push(text('# Item       Qty  Rate    Amt', { bold: 1, format: 0 }))
  rows.push(text('------------------------------', { format: 0 }))

  let subtotal = 0
  ;(items || []).forEach((item, i) => {
    const rate = Number(item.item_price)
    const amt  = rate * Number(item.quantity)
    subtotal  += amt
    const num   = pad(i + 1, 1)
    const name  = pad(item.item_name, 10)
    const qty   = pad(item.quantity,   3, true)
    const rateS = pad(rate.toFixed(2), 6, true)
    const amtS  = pad(amt.toFixed(2),  7, true)
    rows.push(text(`${num} ${name} ${qty} ${rateS} ${amtS}`, { format: 0 }))
  })

  rows.push(text(SOLID))

  const discPct = Number(bill.discount_percent || 0)
  const discAmt = Number(bill.discount_amount  || 0)
  const total   = Number(bill.total_amount)

  rows.push(text(`Subtotal: Rs.${subtotal.toFixed(2)}`, { align: 2, format: 0 }))
  if (discPct > 0) {
    rows.push(text(`Disc(${discPct}%): -Rs.${discAmt.toFixed(2)}`, { align: 2, format: 0 }))
  }
  rows.push(text(SOLID))
  rows.push(text(`TOTAL Rs.${total.toFixed(2)}`, { bold: 1, align: 1, format: 3 }))
  rows.push(text(SOLID))

  if (bill.status === 'paid') {
    rows.push(BLANK)
    rows.push(text('** PAID **', { bold: 1, align: 1, format: 3 }))
  }

  rows.push(BLANK)
  rows.push(text('Thank you!', { bold: 1, align: 1, format: 3 }))
  rows.push(text('Shopping with us', { align: 1, format: 4 }))
  rows.push(text(SHOP.tagline, { align: 1, format: 0 }))
  rows.push(BLANK)
  rows.push(BLANK)

  const payload = {}
  rows.forEach((row, i) => { payload[i] = row })

  return json(payload, 200)
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
