import type { Food } from './foods'
import { NUTRIENTS, type NutrientKey, type Nutrients } from './nutrients'

// Getting nutrient values from an AI chat (ChatGPT, Claude, …) without connecting the
// app to it: the app writes the question, the user copies it into their AI app and
// pastes the answer back, and the app reads the numbers from it.

// The answer line the AI is asked for: "Portion: …; Energie: …; Eiweiß: …; …"
function answerFormat(portion: string): string {
  return [`Portion: ${portion || '…'}`, ...NUTRIENTS.map((n) => `${n.label}: …`)].join('; ')
}

export function buildNutrientPrompt(name: string, portion: string, kind: Food['kind']): string {
  const what = kind === 'dish' ? `das Gericht „${name}“ (selbst gekocht, übliches Rezept)` : `„${name}“`
  const perPortion = portion
    ? `pro Portion: ${portion}.`
    : 'pro Portion. Wähle eine übliche Portion für ein Kleinkind (1 bis 3 Jahre) und nenne sie ' +
      'mit Gramm, z. B. „1 Stück (8 g)“.'
  return [
    `Gib mir bitte die Nährwerte für ${what} ${perPortion}`,
    'Nutze, wenn möglich, die Angaben des Herstellers (meist pro 100 g) und rechne sie auf die ' +
      'Portion um. Was dort fehlt (z. B. Eisen, Calcium, Omega-3), schätze anhand ähnlicher Lebensmittel.',
    '',
    'Antworte nur mit genau einer Zeile in diesem Format, Zahlen ohne Einheiten und mit Punkt als ' +
      'Dezimaltrennzeichen:',
    answerFormat(portion),
    '',
    `Einheiten: ${NUTRIENTS.map((n) => `${n.label} in ${n.unit}`).join(', ')}. ` +
      'Omega-3 = ALA, EPA und DHA zusammen.',
  ].join('\n')
}

// Other words an AI might use for the same value
const NAMES: Record<NutrientKey, string[]> = {
  kcal: ['Energie', 'Brennwert', 'Kalorien', 'kcal'],
  protein: ['Eiweiß', 'Eiweiss', 'Protein'],
  carbs: ['Kohlenhydrate', 'Kohlenhydrat'],
  fat: ['Fett'],
  fiber: ['Ballaststoffe'],
  iron: ['Eisen'],
  calcium: ['Calcium', 'Kalzium'],
  omega3: ['Omega-3', 'Omega 3', 'Omega3'],
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export type ParsedAnswer = {
  values: Partial<Nutrients>
  portion: string | null
  missing: NutrientKey[] // not found in the answer
}

// Reads the AI's answer. Understands the requested line ("Energie: 35; Eiweiß: 2.1; …",
// also with units, "ca." or decimal commas) and, as a fallback, exactly 8 plain numbers
// in the order of the format ("35, 2.1, 5, …").
export function parseNutrientAnswer(text: string): ParsedAnswer {
  const values: Partial<Nutrients> = {}
  for (const n of NUTRIENTS) {
    for (const name of NAMES[n.key]) {
      // The name (not inside a longer word like "Fettsäuren"), maybe "(g)", then ":" or "=",
      // then up to a few characters like "ca. " before the number
      const pattern = new RegExp(
        `(?:^|[^\\p{L}])${escape(name)}\\s*(?:\\([^)]*\\))?\\s*[:=][^0-9\\n;]{0,10}?(\\d+(?:[.,]\\d+)?)`,
        'iu',
      )
      const match = text.match(pattern)
      if (match) {
        values[n.key] = Number(match[1].replace(',', '.'))
        break
      }
    }
  }

  const portionMatch = text.match(/Portion\s*[:=]\s*([^;\n]+)/i)
  const portion = portionMatch ? portionMatch[1].trim().replace(/[.,]$/, '').slice(0, 60) : null

  if (Object.keys(values).length === 0) {
    const numbers = text.replace(/Portion\s*[:=][^;\n]*/gi, '').match(/\d+(?:\.\d+)?/g) ?? []
    if (numbers.length === NUTRIENTS.length) {
      NUTRIENTS.forEach((n, i) => (values[n.key] = Number(numbers[i])))
    }
  }

  return {
    values,
    portion: portion && portion !== '…' ? portion : null,
    missing: NUTRIENTS.filter((n) => values[n.key] === undefined).map((n) => n.key),
  }
}
