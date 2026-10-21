import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import BackLink from '../components/BackLink'
import FoodRowContent from '../components/FoodRowContent'
import { fetchFoods, type Food } from '../foods'

// "Lebensmittel": own dishes and foods (tap to edit) and the built-in ones (tap to see
// their values or to make an own version with different values)
export default function FoodList() {
  const [foods, setFoods] = useState<Food[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFoods().then(setFoods, (e: Error) => setError(e.message))
  }, [])

  const all = foods ?? []
  const sections = [
    {
      title: 'Meine Gerichte',
      foods: all.filter((f) => f.household_id !== null && f.kind === 'dish'),
      empty:
        'Noch keine Gerichte. Gekochtes oder Gebackenes mit den Nährwerten pro Portion ' +
        'aus einer anderen App kannst du hier speichern.',
    },
    {
      title: 'Eigene Lebensmittel',
      foods: all.filter((f) => f.household_id !== null && f.kind === 'food'),
      empty: 'Noch keine eigenen Lebensmittel.',
    },
    {
      title: 'Mitgeliefert',
      foods: all.filter((f) => f.household_id === null),
      empty: '',
    },
  ]

  return (
    <main className="page">
      <BackLink parent="/" />
      <h1>Lebensmittel</h1>

      <div className="two-buttons">
        <Link className="button" to="/lebensmittel/neu">
          + Lebensmittel
        </Link>
        <Link className="button" to="/lebensmittel/neu?art=gericht">
          + Gericht
        </Link>
      </div>

      {error && <p className="error">Laden hat nicht geklappt: {error}</p>}
      {foods === null
        ? !error && <p className="muted">Lädt …</p>
        : sections.map((section) => (
            <section key={section.title} className="section">
              <h2>{section.title}</h2>
              {section.foods.length === 0 ? (
                <p className="muted">{section.empty}</p>
              ) : (
                <ul className="food-list">
                  {section.foods.map((food) => (
                    <li key={food.id}>
                      <Link className="food-row" to={`/lebensmittel/${food.id}`}>
                        <FoodRowContent food={food} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

      <p className="muted list-note">
        Nährwerte pro Portion sind gerundete Richtwerte. Mitgelieferte Lebensmittel lassen sich
        nicht ändern; tippe darauf, um eine eigene Version mit anderen Werten anzulegen.
      </p>
    </main>
  )
}
