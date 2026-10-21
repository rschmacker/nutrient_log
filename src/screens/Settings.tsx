import BackLink from '../components/BackLink'
import FamilySection from '../components/FamilySection'
import TargetsForm from '../components/TargetsForm'
import { supabase } from '../supabase'

type Props = {
  userId: string
  email: string | undefined
}

export default function Settings({ userId, email }: Props) {
  return (
    <main className="page">
      <BackLink parent="/" />
      <h1>Einstellungen</h1>

      <TargetsForm />
      <FamilySection userId={userId} />

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
