import { addDays, parseISODate, toISODate } from './dates'
import type { FoodEntry } from './entries'
import { scaleNutrients, sumNutrients, type Nutrients } from './nutrients'

const DAY_MS = 24 * 60 * 60 * 1000

export type Average = {
  values: Nutrients // per day
  days: number // the sums were divided by this (at least 1)
  entries: FoodEntry[] // the entries inside the 72 hours
  rolling: boolean // true: the 72 hours end now; false: they are 3 whole days
  start: Date // beginning of the 72 hours
  from: string // first and last day of the 72 hours ("YYYY-MM-DD")
  to: string
  skipsTime: boolean // some of the 72 hours were on days without any entries
}

// When a food was eaten: the time it was logged, if that was on the same day.
// Logged on a later day (e.g. yesterday's dinner the next morning): noon of its day.
function eatenAt(entry: FoodEntry): number {
  const logged = new Date(entry.created_at)
  if (toISODate(logged) === entry.eaten_on) return logged.getTime()
  const noon = parseISODate(entry.eaten_on)
  noon.setHours(12)
  return noon.getTime()
}

// Ø 3 Tage: what was eaten in 72 hours, per day.
// - Today, once something is logged, the 72 hours end now, so the average doesn't
//   drop in the morning when today only has breakfast. With nothing logged today yet
//   they are the 3 days before today. For an earlier day they are that day and the
//   two before.
// - Hours on days without any entries don't count, so after one or two logged days it
//   is the average of those. It divides by at least one day, so with only today
//   logged it shows today's total.
// `entries` must cover the day and the 3 days before it.
export function threeDayAverage(entries: FoodEntry[], day: string, now = new Date()): Average {
  const isToday = day === toISODate(now)
  const rolling = isToday && entries.some((e) => e.eaten_on === day)
  let end: number
  if (rolling) end = now.getTime()
  else if (isToday) end = parseISODate(day).getTime() // midnight before today
  else end = parseISODate(addDays(day, 1)).getTime() // midnight after the day
  const start = end - 3 * DAY_MS

  let countedMs = 0
  let skipsTime = false
  for (let d = addDays(day, -3); d <= day; d = addDays(d, 1)) {
    const from = Math.max(start, parseISODate(d).getTime())
    const to = Math.min(end, parseISODate(addDays(d, 1)).getTime())
    if (to <= from) continue // this day isn't part of the 72 hours
    if (entries.some((e) => e.eaten_on === d)) countedMs += to - from
    else skipsTime = true
  }

  // No upper limit needed: entries only go up to `day`, and none can be eaten after now
  const inside = entries.filter((e) => e.eaten_on <= day && eatenAt(e) >= start)
  const days = Math.max(countedMs / DAY_MS, 1)
  return {
    values: scaleNutrients(sumNutrients(inside), 1 / days),
    days,
    entries: inside,
    rolling,
    start: new Date(start),
    from: toISODate(new Date(start)),
    to: toISODate(new Date(end - 1)),
    skipsTime,
  }
}
