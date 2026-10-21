import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import AmountSheet from '../components/AmountSheet'
import BackLink from '../components/BackLink'
import { dayFromParam, dayLabel, dayPath } from '../dates'
import { fetchFoods, type Food } from '../foods'
import { formatNumber } from '../nutrients'
import { useGoBack } from '../useGoBack'

type Filter = 'all' | 'food' | 'dish' | 'own'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'food', label: 'Lebensmittel' },
  { key: 'dish', label: 'Gerichte' },
  { key: 'own', label: 'Eigene' },
]

function matches(food: Food, filter: Filter, search: string): boolean {
  if (filter === 'food' && food.kind !== 'food') return false
  if (filter === 'dish' && food.kind !== 'dish') return false
  if (filter === 'own' && food.household_id === null) return false
  return food.name.toLocaleLowerCase('de').includes(search)
}

// "Hinzufügen": search a food, tap it, choose the amount, log it
export default function AddFood() {
  const [searchParams] = useSearchParams()
  const day = dayFromParam(searchParams.get('tag'))
  const homePath = dayPath('/', day)
  const goBack = useGoBack()
  const [foods, setFoods] = useState<Food[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Food | null>(null)

  useEffect(() => {
    fetchFoods().then(setFoods, (e: Error) => setError(e.message))
  }, [])

  const needle = search.trim().toLocaleLowerCase('de')
  const shown = foods?.filter((f) => matches(f, filter, needle)) ?? []

  return (
    <main className="page">
      <BackLink parent={homePath} />
      <h1>Was hat er gegessen?</h1>
      <p className="muted">Tag: {dayLabel(day)}</p>

      <input
        type="search"
        className="search"
        placeholder="Suchen …"
        aria-label="Lebensmittel suchen"
        enterKeyHint="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="chips" role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className="chip"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="error">Laden hat nicht geklappt: {error}</p>}

      {foods === null ? (
        !error && <p className="muted">Lädt …</p>
      ) : shown.length === 0 ? (
        <p className="muted">Nichts gefunden.</p>
      ) : (
        <ul className="food-list">
          {shown.map((food) => (
            <li key={food.id}>
              <button className="food-row" onClick={() => setSelected(food)}>
                <span className="food-text">
                  <span className="food-name">
                    {food.name}
                    {food.kind === 'dish' && <span className="tag">Gericht</span>}
                  </span>
                  <span className="food-portion">{food.portion}</span>
                </span>
                <span className="food-kcal">{formatNumber(food.kcal, 0)} kcal</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <AmountSheet
          food={selected}
          day={day}
          onClose={() => setSelected(null)}
          onSaved={() => goBack(homePath)}
        />
      )}
    </main>
  )
}
