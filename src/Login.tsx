import { useState, type FormEvent } from 'react'
import { appUrl, loginErrorFromUrl, supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
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

  // Fallback: Supabase emails a login link. The link only works when opened in the
  // same browser that requested it (on iPhone it opens in Safari, not the Home Screen app).
  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: appUrl },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setLinkSent(true)
  }

  return (
    <main className="page">
      <h1>Kleinkind-Essen</h1>
      <p className="muted">Melde dich an, um Mahlzeiten einzutragen und anzusehen.</p>

      <div className="stack">
        <button className="button" onClick={signInWithGitHub} disabled={busy}>
          Mit GitHub anmelden
        </button>

        <p className="divider">oder per E-Mail</p>

        {!linkSent ? (
          <form className="stack" onSubmit={sendLink}>
            <label className="field">
              E-Mail
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="button secondary" disabled={busy}>
              Anmeldelink schicken
            </button>
          </form>
        ) : (
          <div className="stack">
            <p>
              Wir haben einen Anmeldelink an <strong>{email.trim()}</strong> geschickt. Öffne ihn
              in diesem Browser, um dich anzumelden.
            </p>
            <button
              type="button"
              className="link-button"
              onClick={() => setLinkSent(false)}
            >
              Andere E-Mail verwenden
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </main>
  )
}
