import type { FoodEntry } from '../entries'
import { formatNumber, OVER_TARGET, type Nutrient } from '../nutrients'
import Sheet from './Sheet'

type Props = {
  nutrient: Nutrient
  value: number // what the ring shows
  target: number
  entries: FoodEntry[] // the entries behind the ring
  days: number // the ring divides the sums by this (1 for Tageswerte)
  perDayText: string // e.g. "pro Tag, Ø 72 Stunden" or "Heute"
  onClose: () => void
}

// How much each food contributed: entries with the same name are added up,
// divided like the ring (so the rows add up to the ring's value), largest first
function contributions(entries: FoodEntry[], nutrient: Nutrient, days: number) {
  const byName = new Map<string, number>()
  for (const e of entries) {
    byName.set(e.name, (byName.get(e.name) ?? 0) + (Number(e[nutrient.key]) || 0) / days)
  }
  return [...byName]
    .map(([name, value]) => ({ name, value }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
}

function shareText(share: number): string {
  const percent = Math.round(share * 100)
  return percent === 0 ? '< 1 %' : `${percent} %`
}

// Opens when tapping a ring: which foods the value comes from
export default function NutrientSheet(props: Props) {
  const { nutrient, value, target, entries, days, perDayText, onClose } = props
  const rows = contributions(entries, nutrient, days)
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const largest = rows[0]?.value ?? 0
  const over = target > 0 && value / target > OVER_TARGET
  const unit = nutrient.unit

  return (
    <Sheet labelledBy="nutrient-title" onClose={onClose}>
      <h2 id="nutrient-title">{nutrient.label}</h2>
      {/* "nowrap" keeps each number on one line with its unit */}
      <p className="muted">
        <span className="nowrap">
          {formatNumber(value, nutrient.decimals)} {unit}
        </span>{' '}
        {perDayText} · Richtwert{' '}
        <span className="nowrap">
          {formatNumber(target, nutrient.decimals)} {unit}
        </span>{' '}
        ·{' '}
        <span className={over ? 'over-text nowrap' : 'nowrap'}>
          {over && '▲ '}
          {Math.round((value / target) * 100)} %
        </span>
      </p>

      {rows.length === 0 ? (
        <p className="contrib-empty">Noch nichts eingetragen, das {nutrient.label} enthält.</p>
      ) : (
        <ul className="contrib-list">
          {rows.map((row) => (
            <li key={row.name} className="contrib-row">
              <div className="contrib-head">
                <span className="contrib-name">{row.name}</span>
                <span className="contrib-value">
                  {formatNumber(row.value, nutrient.decimals)} {unit} · {shareText(row.value / total)}
                </span>
              </div>
              {/* Bar length compared with the largest contribution */}
              <div className="contrib-bar" style={{ width: `${(row.value / largest) * 100}%` }} />
            </li>
          ))}
        </ul>
      )}

      <div className="stack">
        <button className="button secondary" onClick={onClose}>
          Schließen
        </button>
      </div>
    </Sheet>
  )
}
