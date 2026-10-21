import { useState } from 'react'
import { dayLabel } from '../dates'
import { addEntry } from '../entries'
import type { Food } from '../foods'
import { formatNumber, scaleNutrients } from '../nutrients'
import Sheet from './Sheet'

const STEP = 0.25 // portions

type Props = {
  food: Food
  day: string
  onClose: () => void
  onSaved: () => void
}

// Choose how many portions of a food, then log them
export default function AmountSheet({ food, day, onClose, onSaved }: Props) {
  const [portions, setPortions] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const total = scaleNutrients(food, portions)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await addEntry(food, portions, day)
      onSaved()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <Sheet labelledBy="amount-title" onClose={onClose}>
      <h2 id="amount-title">{food.name}</h2>
      <p className="muted">{food.portion}</p>

      <div className="stepper">
        <button
          className="step-button"
          aria-label="Weniger"
          disabled={portions <= STEP}
          onClick={() => setPortions((p) => Math.max(STEP, p - STEP))}
        >
          −
        </button>
        <div className="stepper-value" aria-live="polite">
          {formatNumber(portions, 2)} ×
        </div>
        <button
          className="step-button"
          aria-label="Mehr"
          onClick={() => setPortions((p) => p + STEP)}
        >
          +
        </button>
      </div>

      <p className="muted sheet-summary">
        {formatNumber(total.kcal, 0)} kcal · {formatNumber(total.protein, 1)} g Eiweiß ·{' '}
        {formatNumber(total.iron, 1)} mg Eisen · {formatNumber(total.omega3, 2)} g Omega-3
      </p>

      <div className="stack">
        <button className="button" disabled={busy} onClick={save}>
          Eintragen ({dayLabel(day)})
        </button>
        <button className="button secondary" onClick={onClose}>
          Abbrechen
        </button>
        {error && <p className="error">Speichern hat nicht geklappt: {error}</p>}
      </div>
    </Sheet>
  )
}
