// ── Bluetooth thermal printer (via "Bluetooth Print" Android app) ──
// Tapping Print fires a my.bluetoothprint.scheme:// deep-link.
// The Android app intercepts it, fetches the JSON from /api/print-bill,
// and sends it straight to the paired Bluetooth thermal printer.
//
// App: https://play.google.com/store/apps/details?id=mate.bluetoothprint
// Setup: open the app -> Menu -> Browser Print -> enable toggle.
export function bluetoothPrint(bill) {
  // Build absolute URL to our Vercel serverless function
  const apiUrl = `${window.location.origin}/api/print-bill?id=${bill.id}`
  // Deep-link scheme that launches the Bluetooth Print app on Android
  const btUrl  = `my.bluetoothprint.scheme://${apiUrl}`
  window.location.href = btUrl
}
