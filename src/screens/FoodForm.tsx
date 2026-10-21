import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import BackLink from '../components/BackLink'
import { deleteFood, fetchFood, saveFood, type Food } from '../foods'
import { NUTRIENTS, parseAmount, type NutrientKey, type Nutrients } from '../nutrients'
import { useGoBack } from '../useGoBack'

type Kind = Food['kind']

// What is typed in the fields (numbers as text, so "3," can be typed)
type FormState = {
  name: string
  portion: string
  kind: Kind
  values: Record<NutrientKey, string>
}

const LIST = '/lebensmittel'

function formFromFood(food: Food): FormState {
  const values = {} as Record<NutrientKey, string>
  for (const n of NUTRIENTS) values[n.key] = String(Number(food[n.key]) || 0).replace('.', ',')
  return { name: food.name, portion: food.portion, kind: food.kind, values }
}

function emptyForm(kind: Kind, name: string): FormState {
  const values = {} as Record<NutrientKey, string>
  for (const n of NUTRIENTS) values[n.key] = ''
  return { name, portion: '', kind, values }
}

// Three uses:
// - /lebensmittel/neu: new own food or dish ("?art=gericht", "?name=..." from the search,
//   "?kopie=<id>" prefilled with the values of another food)
// - /lebensmittel/<id> of an own food: change or delete it
// - /lebensmittel/<id> of a built-in food: only look at it, or make an own version
export default function FoodForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const copyOf = searchParams.get('kopie')
  const loadId = id ?? copyOf
  const navigate = useNavigate()
  const goBack = useGoBack()
  // The food being changed, viewed or copied
  const [food, setFood] = useState<Food | null>(null)
  const [form, setForm] = useState<FormState | null>(() =>
    loadId
      ? null
      : emptyForm(searchParams.get('art') === 'gericht' ? 'dish' : 'food', searchParams.get('name') ?? ''),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loadId) return
    fetchFood(loadId).then(
      (found) => {
        if (!found) {
          setError('Dieses Lebensmittel gibt es nicht (mehr).')
          return
        }
        setFood(found)
        setForm(formFromFood(found))
      },
      (e: Error) => setError(e.message),
    )
  }, [loadId])

  const readOnly = Boolean(id) && food?.household_id === null
  const kindLabel = form?.kind === 'dish' ? 'Gericht' : 'Lebensmittel'
  let title = id ? `${kindLabel} bearbeiten` : form?.kind === 'dish' ? 'Neues Gericht' : 'Neues Lebensmittel'
  if (readOnly && food) title = food.name

  function update(change: Partial<FormState>) {
    setForm((f) => f && { ...f, ...change })
  }

  function updateValue(key: NutrientKey, text: string) {
    setForm((f) => f && { ...f, values: { ...f.values, [key]: text } })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    const name = form.name.trim()
    if (!name) {
      setError('Bitte einen Namen eingeben.')
      return
    }
    const values = {} as Nutrients
    const invalid: string[] = []
    for (const n of NUTRIENTS) {
      const value = parseAmount(form.values[n.key])
      if (value === null) invalid.push(n.label)
      else values[n.key] = value
    }
    if (invalid.length > 0) {
      setError(`Bitte nur Zahlen eingeben bei: ${invalid.join(', ')}.`)
      return
    }

    setBusy(true)
    setError(null)
    try {
      await saveFood({ name, portion: form.portion.trim() || '1 Portion', kind: form.kind, ...values }, id)
      goBack(LIST)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  async function remove() {
    if (!food) return
    if (!window.confirm(`„${food.name}“ löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)) {
      return
    }
    setBusy(true)
    try {
      await deleteFood(food.id)
      goBack(LIST)
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <BackLink parent={LIST} />
      <h1>{title}</h1>

      {!form ? (
        error ? <p className="error">{error}</p> : <p className="muted">Lädt …</p>
      ) : (
        <form className="stack" onSubmit={save}>
          {readOnly ? (
            <p className="muted">
              Mitgelieferte Lebensmittel lassen sich nicht ändern. Du kannst aber eine eigene
              Version mit anderen Werten anlegen.
            </p>
          ) : (
            <div className="segmented form-kind" role="group" aria-label="Art">
              <button
                type="button"
                className="choice"
                aria-pressed={form.kind === 'food'}
                onClick={() => update({ kind: 'food' })}
              >
                Lebensmittel
              </button>
              <button
                type="button"
                className="choice"
                aria-pressed={form.kind === 'dish'}
                onClick={() => update({ kind: 'dish' })}
              >
                Gericht
              </button>
            </div>
          )}

          <label className="field">
            Name
            <input
              type="text"
              maxLength={80}
              disabled={readOnly}
              placeholder={form.kind === 'dish' ? 'z. B. Gemüselasagne' : 'z. B. Hirsebrei'}
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </label>

          <label className="field">
            Portion
            <input
              type="text"
              maxLength={60}
              disabled={readOnly}
              placeholder={form.kind === 'dish' ? 'z. B. 1 Kinderportion (150 g)' : 'z. B. 1 Scheibe (40 g)'}
              value={form.portion}
              onChange={(e) => update({ portion: e.target.value })}
            />
          </label>

          <fieldset className="nutrient-fields" disabled={readOnly}>
            <legend>Nährwerte pro Portion</legend>
            <div className="form-grid">
              {NUTRIENTS.map((n) => (
                <label key={n.key} className="field">
                  {n.label} ({n.unit})
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.values[n.key]}
                    onChange={(e) => updateValue(n.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          {!readOnly && (
            <p className="muted">
              {form.kind === 'dish'
                ? 'Die Werte pro Portion einfach aus der anderen App übernehmen. Was dort nicht steht, bleibt leer (zählt als 0).'
                : 'Leere Felder zählen als 0.'}
            </p>
          )}

          {error && <p className="error">{error}</p>}

          {readOnly && food ? (
            <button
              type="button"
              className="button"
              onClick={() => navigate(`${LIST}/neu?kopie=${food.id}`, { replace: true })}
            >
              Eigene Version anlegen
            </button>
          ) : (
            <button className="button" disabled={busy}>
              Speichern
            </button>
          )}
          {id && !readOnly && food && (
            <button type="button" className="button danger" disabled={busy} onClick={remove}>
              Löschen
            </button>
          )}
        </form>
      )}
    </main>
  )
}
