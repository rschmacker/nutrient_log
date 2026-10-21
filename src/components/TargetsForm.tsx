import { useEffect, useState, type FormEvent } from 'react'
import { DGE_TARGETS, NUTRIENTS, parseAmount, type NutrientKey, type Nutrients } from '../nutrients'
import { fetchTargets, saveTargets } from '../targets'

type Fields = Record<NutrientKey, string>

// 1200 -> "1200", 17.5 -> "17,5" (no thousands separator, so it can be read back)
function toFields(targets: Nutrients): Fields {
  const fields = {} as Fields
  for (const n of NUTRIENTS) fields[n.key] = String(targets[n.key]).replace('.', ',')
  return fields
}

// Einstellungen: the daily targets the rings compare with (shared by the family)
export default function TargetsForm() {
  const [fields, setFields] = useState<Fields | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchTargets().then(
      (targets) => setFields(toFields(targets)),
      (e: Error) => setError(e.message),
    )
  }, [])

  function change(key: NutrientKey, text: string) {
    setFields((f) => f && { ...f, [key]: text })
    setMessage(null)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!fields) return
    const targets = {} as Nutrients
    const invalid: string[] = []
    for (const n of NUTRIENTS) {
      const value = parseAmount(fields[n.key])
      if (value === null || value <= 0) invalid.push(n.label)
      else targets[n.key] = value
    }
    if (invalid.length > 0) {
      setError(`Bitte eine Zahl größer als 0 eingeben bei: ${invalid.join(', ')}.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveTargets(targets)
      setMessage('Gespeichert. Die Richtwerte gelten für die ganze Familie.')
    } catch (err) {
      setError((err as Error).message)
    }
    setBusy(false)
  }

  function fillDgeValues() {
    setFields(toFields(DGE_TARGETS))
    setError(null)
    setMessage('DGE-Werte eingesetzt. Tippe auf „Speichern“, um sie zu übernehmen.')
  }

  return (
    <section className="section">
      <h2>Richtwerte pro Tag</h2>
      {!fields ? (
        error ? <p className="error">{error}</p> : <p className="muted">Lädt …</p>
      ) : (
        <form className="stack" onSubmit={save}>
          <div className="form-grid">
            {NUTRIENTS.map((n) => (
              <label key={n.key} className="field">
                {n.label} ({n.unit})
                <input
                  type="text"
                  inputMode="decimal"
                  value={fields[n.key]}
                  onChange={(e) => change(n.key, e.target.value)}
                />
              </label>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button className="button" disabled={busy}>
            Speichern
          </button>
          <button type="button" className="button secondary" onClick={fillDgeValues}>
            DGE-Werte einsetzen
          </button>
        </form>
      )}
      <p className="muted small">
        Die DGE-Werte für 1 bis unter 4 Jahre: Eiweiß 14 g, Eisen 7 mg, Calcium 600 mg, Energie
        1.200 kcal (Jungen bei PAL 1,4 bzw. Mädchen bei PAL 1,6), Fett 30–40 % und Kohlenhydrate
        über 50 % der Energie, Ballaststoffe 14,6 g pro 1.000 kcal, α-Linolensäure 0,5 % der
        Energie. Für EPA/DHA gibt es in diesem Alter keinen DGE-Wert. Das sind Orientierungswerte
        für den Durchschnitt über mehrere Tage, keine Ziele für jeden einzelnen Tag.
      </p>
    </section>
  )
}
