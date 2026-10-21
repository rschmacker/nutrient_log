import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Placeholder Home for step 2: shows who is logged in and checks the database.
// Step 3 turns this into the "Heute" screen with the rings.
export default function Home({ email }: { email: string | undefined }) {
  const [dbStatus, setDbStatus] = useState('Datenbank wird geprüft …')

  useEffect(() => {
    Promise.all([
      supabase.from('foods').select('id', { count: 'exact', head: true }),
      supabase.from('household_members').select('user_id', { count: 'exact', head: true }),
    ]).then(([foods, members]) => {
      const error = foods.error ?? members.error
      setDbStatus(
        error
          ? `Datenbankfehler: ${error.message}`
          : `Datenbank OK: ${foods.count} Lebensmittel sichtbar, ` +
              `${members.count} ${members.count === 1 ? 'Person' : 'Personen'} in der Familie.`,
      )
    })
  }, [])

  return (
    <main className="page">
      <h1>Kleinkind-Essen</h1>
      <p>
        Angemeldet als <strong>{email}</strong>
      </p>
      <p className="muted">{dbStatus}</p>
      <button className="button secondary" onClick={() => supabase.auth.signOut()}>
        Abmelden
      </button>
    </main>
  )
}
