// Display helpers. Status values stay 'POSITIF'/'NEGATIF' in the data (matches
// the DB) — these helpers render them in English ("Positive"/"Negative").
// Dates are formatted in Asia/Jakarta so the hours match the user's local time
// in Indonesia regardless of the browser's timezone.

const TZ = 'Asia/Jakarta'

export function statusLabel(status) {
  return status === 'POSITIF' ? 'Positive' : 'Negative'
}

export function statusClass(status) {
  return status === 'POSITIF' ? 'pos' : 'neg'
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ })
}

export function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

export function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: TZ })
}
