import { useEffect, useState, type FormEvent } from 'react'
import { cancelInvite, fetchInvites, fetchMembers, inviteEmail, type Member } from '../family'

// Einstellungen: who is in the family, and inviting the other parent
export default function FamilySection({ userId }: { userId: string }) {
  const [members, setMembers] = useState<Member[] | null>(null)
  const [invites, setInvites] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([fetchMembers(), fetchInvites()]).then(
      ([m, i]) => {
        setMembers(m)
        setInvites(i)
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  async function invite(e: FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    if (members?.some((m) => m.email === address)) {
      setError('Diese Person ist schon in der Familie.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await inviteEmail(address)
      setInvites((list) => [...list, address])
      setEmail('')
    } catch (err) {
      setError((err as Error).message)
    }
    setBusy(false)
  }

  async function cancel(address: string) {
    setError(null)
    try {
      await cancelInvite(address)
      setInvites((list) => list.filter((a) => a !== address))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="section">
      <h2>Familie</h2>
      <p className="muted section-intro">
        Alle in der Familie sehen dieselben Einträge, Lebensmittel und Richtwerte.
      </p>

      {members && (
        <ul className="entry-list">
          {members.map((m) => (
            <li key={m.user_id} className="entry-row">
              <div className="entry-text">
                <span className="entry-name">{m.email ?? 'Ohne E-Mail-Adresse'}</span>
                {m.user_id === userId && <span className="entry-detail">Das bist du</span>}
              </div>
            </li>
          ))}
          {invites.map((address) => (
            <li key={address} className="entry-row">
              <div className="entry-text">
                <span className="entry-name">{address}</span>
                <span className="entry-detail">Eingeladen, noch nicht angemeldet</span>
              </div>
              <button className="link-button row-action" onClick={() => cancel(address)}>
                Zurücknehmen
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="stack" onSubmit={invite}>
        <label className="field">
          Jemanden einladen (E-Mail-Adresse)
          <input
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button secondary" disabled={busy}>
          Einladen
        </button>
      </form>
      <p className="muted small">
        Wer sich danach mit dieser Adresse anmeldet, kommt automatisch in eure Familie: mit
        E-Mail und Passwort oder mit GitHub (gleiche Adresse). Das Konto mit Passwort legst du
        in Supabase an (siehe README).
      </p>
    </section>
  )
}
