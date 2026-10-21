import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router'
import { ensureHousehold, forgetHousehold } from './household'
import Login from './Login'
import AddFood from './screens/AddFood'
import FoodForm from './screens/FoodForm'
import FoodList from './screens/FoodList'
import Home from './screens/Home'
import Settings from './screens/Settings'
import { supabase } from './supabase'
import { useSession } from './useSession'

function Loading() {
  return (
    <main className="page">
      <p className="muted">Lädt …</p>
    </main>
  )
}

function NotFound() {
  return (
    <main className="page">
      <h1>Seite nicht gefunden</h1>
      <Link className="button" to="/">
        Zur Startseite
      </Link>
    </main>
  )
}

export default function App() {
  const session = useSession()
  const userId = session?.user.id
  // Whether the logged-in user's household is ready (new rows need it, see household.ts)
  const [household, setHousehold] = useState<{ userId: string; error: string | null } | null>(
    null,
  )

  useEffect(() => {
    if (!userId) {
      forgetHousehold()
      return
    }
    ensureHousehold().then(
      () => setHousehold({ userId, error: null }),
      (e: Error) => setHousehold({ userId, error: e.message }),
    )
  }, [userId])

  if (session === undefined) return <Loading />
  if (session === null) return <Login />
  if (!household || household.userId !== userId) return <Loading />

  if (household.error) {
    return (
      <main className="page">
        <h1>Kleinkind-Essen</h1>
        <p className="error">Die Familie konnte nicht geladen werden: {household.error}</p>
        <div className="stack">
          <button className="button secondary" onClick={() => window.location.reload()}>
            Neu laden
          </button>
          <button className="button secondary" onClick={() => supabase.auth.signOut()}>
            Abmelden
          </button>
        </div>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/hinzufuegen" element={<AddFood />} />
      <Route path="/lebensmittel" element={<FoodList />} />
      {/* Different keys: going from a built-in food to "Eigene Version anlegen" starts a fresh form */}
      <Route path="/lebensmittel/neu" element={<FoodForm key="new" />} />
      <Route path="/lebensmittel/:id" element={<FoodForm key="edit" />} />
      <Route
        path="/einstellungen"
        element={<Settings userId={session.user.id} email={session.user.email} />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
