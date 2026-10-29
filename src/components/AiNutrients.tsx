import { useState } from 'react'
import { buildNutrientPrompt, parseNutrientAnswer } from '../aiPrompt'
import type { Food } from '../foods'
import { NUTRIENTS, type Nutrients } from '../nutrients'

type Props = {
  name: string
  portion: string
  kind: Food['kind']
  // Fills the form: the values found, and the portion if the answer has one
  onApply: (values: Partial<Nutrients>, portion: string | null) => void
}

type Status = { ok: boolean; text: string }

// In the food form: copy a question for an AI chat app, paste its answer, and the
// nutrient fields are filled in (see aiPrompt.ts)
export default function AiNutrients({ name, portion, kind, onApply }: Props) {
  const [answer, setAnswer] = useState('')
  const [showPrompt, setShowPrompt] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)
  const prompt = buildNutrientPrompt(name.trim(), portion.trim(), kind)
  const hasName = name.trim() !== ''
  const canShare = typeof navigator.share === 'function'

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setStatus({ ok: true, text: 'Frage kopiert. Füge sie in deiner KI-App ein und kopiere die Antwort zurück.' })
    } catch {
      // No clipboard access (e.g. not https): show the text to copy by hand
      setShowPrompt(true)
      setStatus({ ok: false, text: 'Kopieren hat nicht geklappt. Markiere die Frage unten und kopiere sie.' })
    }
  }

  async function share() {
    try {
      await navigator.share({ text: prompt })
    } catch {
      // Share sheet closed: nothing to do
    }
  }

  function readAnswer(text: string) {
    setAnswer(text)
    if (!text.trim()) {
      setStatus(null)
      return
    }
    const result = parseNutrientAnswer(text)
    if (result.missing.length === NUTRIENTS.length) {
      setStatus({
        ok: false,
        text: 'In der Antwort habe ich keine Nährwerte gefunden. Kopiere bitte die ganze Antwortzeile.',
      })
      return
    }
    onApply(result.values, result.portion)
    const missing = NUTRIENTS.filter((n) => result.missing.includes(n.key)).map((n) => n.label)
    setStatus({
      ok: true,
      text:
        missing.length === 0
          ? 'Werte eingetragen. Bitte kurz prüfen und dann speichern.'
          : `Eingetragen, außer: ${missing.join(', ')}. Diese bitte selbst ergänzen.`,
    })
  }

  return (
    <div className="ai-panel">
      <h2>Nährwerte von einer KI</h2>
      <p className="muted small">
        Frage kopieren, in ChatGPT, Claude o. Ä. einfügen und die Antwort hier einfügen. Die
        Felder unten werden dann ausgefüllt.
      </p>

      <div className="ai-actions">
        <button type="button" className="button secondary" disabled={!hasName} onClick={copy}>
          Frage kopieren
        </button>
        {canShare && (
          <button type="button" className="button secondary" disabled={!hasName} onClick={share}>
            Teilen …
          </button>
        )}
      </div>
      {hasName ? (
        <button type="button" className="link-button" onClick={() => setShowPrompt((s) => !s)}>
          {showPrompt ? 'Frage ausblenden' : 'Frage anzeigen'}
        </button>
      ) : (
        <p className="muted small">Erst oben den Namen eingeben.</p>
      )}
      {showPrompt && hasName && (
        <textarea className="prompt-text" readOnly rows={9} value={prompt} aria-label="Frage an die KI" />
      )}

      <label className="field">
        Antwort der KI einfügen
        <textarea
          rows={3}
          placeholder="Portion: …; Energie: …; Eiweiß: …"
          value={answer}
          onChange={(e) => readAnswer(e.target.value)}
        />
      </label>
      {status && <p className={status.ok ? 'success' : 'error'}>{status.text}</p>}
      <p className="muted small">
        KI-Werte können danebenliegen. Bei Packungsware lieber kurz mit der Packung vergleichen.
      </p>
    </div>
  )
}
