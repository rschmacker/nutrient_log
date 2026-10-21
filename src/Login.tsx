import { useState, type FormEvent } from 'react'
import { appUrl, loginErrorFromUrl, supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(loginErrorFromUrl)

  async function signInWithGitHub() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: appUrl },
    })
    // On success the browser goes to GitHub, so we only handle errors here
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  // Email + password works everywhere, also in the Home Screen app, and needs no email.
  // Accounts are created in Supabase (Authentication -> Users -> Add user), see README.
  // (Login links or codes by email would need editable email templates, which this
  // Supabase project doesn't allow with its built-in email sending.)
  async function signInWithPassword(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    // On success the session changes and the app shows the Heute screen
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'E-Mail-Adresse oder Passwort stimmt nicht.'
          : error.message,
      )
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>Kleinkind-Essen</h1>
      <p className="muted">Melde dich an, um Mahlzeiten einzutragen und anzusehen.</p>

      <div className="stack">
        <button className="button" onClick={signInWithGitHub} disabled={busy}>
          Mit GitHub anmelden
        </button>

        <p className="divider">oder mit E-Mail und Passwort</p>

        <form className="stack" onSubmit={signInWithPassword}>
          <label className="field">
            E-Mail
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            Passwort
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Anmelden
          </button>
        </form>

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  )
}
