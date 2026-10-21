// Dates are stored as "YYYY-MM-DD" strings (like the Postgres "date" type).
// We always use the phone's local date, never UTC, so a late dinner
// doesn't end up on the next day.

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, days: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

// The day from the "?tag=..." part of the address: today if it is missing,
// not a real date, or in the future
export function dayFromParam(param: string | null): string {
  const today = todayISO()
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return today
  if (toISODate(parseISODate(param)) !== param) return today // e.g. "2026-02-31"
  return param < today ? param : today
}

// A screen's address for a day: "/hinzufuegen" for today, "/hinzufuegen?tag=2026-10-19" otherwise
export function dayPath(path: string, day: string): string {
  return day === todayISO() ? path : `${path}?tag=${day}`
}

// "Heute", "Gestern" or "Mo., 19. Okt."
export function dayLabel(s: string): string {
  const today = todayISO()
  if (s === today) return 'Heute'
  if (s === addDays(today, -1)) return 'Gestern'
  return parseISODate(s).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// "Sa., 08:30"
export function weekdayAndTime(d: Date): string {
  return d.toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

// "19.10."
export function shortDate(s: string): string {
  return parseISODate(s).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' })
}
