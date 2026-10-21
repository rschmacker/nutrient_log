import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import NutrientRing from '../components/NutrientRing'
import { addDays, dayFromParam, dayLabel, dayPath, shortDate, todayISO } from '../dates'
import {
  deleteEntry,
  entrySummary,
  fetchEntries,
  threeDayAverage,
  type FoodEntry,
} from '../entries'
import { DGE_TARGETS, NUTRIENTS, sumNutrients, type Nutrients } from '../nutrients'
import { fetchTargets } from '../targets'

// Remembers "Ø 3 Tage" (the default) or "Tageswerte" on this device
const VIEW_KEY = 'nutrient_log.view'

function loadAverageChoice(): boolean {
  try {
    return localStorage.getItem(VIEW_KEY) !== 'day'
  } catch {
    return true
  }
}

function saveAverageChoice(on: boolean) {
  try {
    localStorage.setItem(VIEW_KEY, on ? 'average' : 'day')
  } catch {
    // Storage blocked (e.g. private browsing): the choice is just not remembered
  }
}

// Simple gear: a ring with eight teeth (a thick dashed circle)
function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="8.5" strokeWidth="4" strokeDasharray="3.34 3.34" />
      <circle cx="12" cy="12" r="6.25" strokeWidth="3" />
    </svg>
  )
}

// "Heute": rings for the selected day (or the 3-day average) and what was eaten
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const day = dayFromParam(searchParams.get('tag'))
  const today = todayISO()
  const [showAverage, setShowAverage] = useState(loadAverageChoice)
  const [targets, setTargets] = useState<Nutrients | null>(null)
  // Entries of the day and the 2 days before it (for Ø 3 Tage), and which day they are for
  const [loaded, setLoaded] = useState<{ day: string; entries: FoodEntry[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTargets().then(setTargets, (e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    let current = true // ignore the answer if the day changed in the meantime
    fetchEntries(addDays(day, -2), day).then(
      (entries) => {
        if (current) setLoaded({ day, entries })
      },
      (e: Error) => {
        if (current) setError(e.message)
      },
    )
    return () => {
      current = false
    }
  }, [day])

  function goToDay(newDay: string) {
    // "replace": switching days doesn't fill up the back history
    setSearchParams(newDay === today ? {} : { tag: newDay }, { replace: true })
  }

  function chooseAverage(on: boolean) {
    setShowAverage(on)
    saveAverageChoice(on)
  }

  async function remove(entry: FoodEntry) {
    if (!window.confirm(`„${entry.name}“ löschen?`)) return
    try {
      await deleteEntry(entry.id)
      setLoaded((prev) => prev && { ...prev, entries: prev.entries.filter((e) => e.id !== entry.id) })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // While another day loads, the old numbers stay visible but faded
  const ready = loaded?.day === day && targets !== null
  const entries = loaded?.entries ?? []
  const dayEntries = entries.filter((e) => e.eaten_on === day)

  let values: Nutrients
  let caption: string
  if (showAverage) {
    const average = threeDayAverage(entries, day)
    const n = average.countedDays.length
    values = average.values
    caption =
      n > 0
        ? `Ø pro Tag über ${n} ${n === 1 ? 'Tag' : 'Tage'} mit Einträgen ` +
          `(${average.countedDays.map(shortDate).join(', ')}), Anteil am Tagesrichtwert.`
        : `Vom ${shortDate(average.from)} bis ${shortDate(average.to)} gibt es noch keine Einträge.`
  } else {
    values = sumNutrients(dayEntries)
    caption =
      'Anteil am Tagesrichtwert (DGE, 1 bis unter 4 Jahre). Die Richtwerte gelten für den ' +
      'Durchschnitt über mehrere Tage.'
  }

  return (
    <main className="page has-add-bar">
      <header className="topbar">
        <h1>Kleinkind-Essen</h1>
        <Link className="icon-button" to="/einstellungen" aria-label="Einstellungen">
          <GearIcon />
        </Link>
      </header>

      <div className="date-bar">
        <button
          className="step-button"
          aria-label="Vorheriger Tag"
          onClick={() => goToDay(addDays(day, -1))}
        >
          ‹
        </button>
        <div className="date-label">{dayLabel(day)}</div>
        <button
          className="step-button"
          aria-label="Nächster Tag"
          disabled={day >= today}
          onClick={() => goToDay(addDays(day, 1))}
        >
          ›
        </button>
      </div>

      <div className="segmented" role="group" aria-label="Anzeige">
        <button className="choice" aria-pressed={showAverage} onClick={() => chooseAverage(true)}>
          Ø 3 Tage
        </button>
        <button className="choice" aria-pressed={!showAverage} onClick={() => chooseAverage(false)}>
          Tageswerte
        </button>
      </div>

      {error && <p className="error">Laden hat nicht geklappt: {error}</p>}

      <section className={ready ? 'panel' : 'panel loading'} aria-busy={!ready}>
        <div className="ring-grid">
          {NUTRIENTS.map((n) => (
            <NutrientRing
              key={n.key}
              nutrient={n}
              value={values[n.key]}
              target={(targets ?? DGE_TARGETS)[n.key]}
            />
          ))}
        </div>
        <p className="muted ring-caption">{caption}</p>
      </section>

      <section className="section">
        <h2>Gegessen</h2>
        {dayEntries.length === 0 ? (
          <p className="muted">{ready ? 'Noch nichts eingetragen.' : 'Lädt …'}</p>
        ) : (
          <ul className="entry-list">
            {dayEntries.map((entry) => (
              <li key={entry.id} className="entry-row">
                <div className="entry-text">
                  <span className="entry-name">{entry.name}</span>
                  <span className="entry-detail">{entrySummary(entry)}</span>
                </div>
                <button
                  className="delete-button"
                  aria-label={`„${entry.name}“ löschen`}
                  onClick={() => remove(entry)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="add-bar">
        <Link className="button" to={dayPath('/hinzufuegen', day)}>
          + Essen eintragen
        </Link>
      </div>
    </main>
  )
}
