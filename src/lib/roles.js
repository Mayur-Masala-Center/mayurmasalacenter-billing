// ── Access control ────────────────────────────────────────────────
// Add email addresses here to grant dashboard + mark-as-paid access
export const OWNER_EMAILS = [
  'wanisanjay619@gmail.com',
  'prasadbhavsar7777@gmail.com',
]

export const isOwner = (email) => OWNER_EMAILS.includes(email?.toLowerCase())
