import BackLink from '../components/BackLink'
import { supabase } from '../supabase'

// Step 6 adds the targets and the family (inviting the other parent) here
export default function Settings({ email }: { email: string | undefined }) {
  return (
    <main className="page">
      <BackLink parent="/" />
      <h1>Einstellungen</h1>

      <section className="section">
        <h2>Konto</h2>
        <p>
          Angemeldet als <strong>{email}</strong>
        </p>
        <button className="button secondary" onClick={() => supabase.auth.signOut()}>
          Abmelden
        </button>
      </section>
    </main>
  )
}
