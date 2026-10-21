export type NutrientKey =
  | 'kcal'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'iron'
  | 'calcium'
  | 'omega3'

// One number per nutrient, e.g. the values of a food, a day total or the targets
export type Nutrients = Record<NutrientKey, number>

export type Nutrient = {
  key: NutrientKey
  label: string
  short: string // fits under a ring
  unit: string
  decimals: number // shown at most
}

// The eight nutrients, in the order the rings show them
export const NUTRIENTS: Nutrient[] = [
  { key: 'kcal', label: 'Energie', short: 'Energie', unit: 'kcal', decimals: 0 },
  { key: 'protein', label: 'Eiweiß', short: 'Eiweiß', unit: 'g', decimals: 1 },
  { key: 'carbs', label: 'Kohlenhydrate', short: 'Kohlenh.', unit: 'g', decimals: 0 },
  { key: 'fat', label: 'Fett', short: 'Fett', unit: 'g', decimals: 0 },
  { key: 'fiber', label: 'Ballaststoffe', short: 'Ballast.', unit: 'g', decimals: 1 },
  { key: 'iron', label: 'Eisen', short: 'Eisen', unit: 'mg', decimals: 1 },
  { key: 'calcium', label: 'Calcium', short: 'Calcium', unit: 'mg', decimals: 0 },
  { key: 'omega3', label: 'Omega-3', short: 'Omega-3', unit: 'g', decimals: 2 },
]

// For Supabase selects: "kcal, protein, carbs, ..."
export const NUTRIENT_COLUMNS = NUTRIENTS.map((n) => n.key).join(', ')

// DGE reference values for 1 to under 4 years, as a daily amount (see CLAUDE.md)
export const DGE_TARGETS: Nutrients = {
  kcal: 1200,
  protein: 14,
  carbs: 150,
  fat: 47,
  fiber: 17.5,
  iron: 7,
  calcium: 600,
  omega3: 0.7,
}

// Above this share of the target a ring is marked as "clearly over"
export const OVER_TARGET = 1.25

export function sumNutrients(rows: Nutrients[]): Nutrients {
  const total = {} as Nutrients
  for (const n of NUTRIENTS) total[n.key] = 0
  for (const row of rows) {
    for (const n of NUTRIENTS) total[n.key] += Number(row[n.key]) || 0
  }
  return total
}

// Multiplies every value, e.g. one portion x 1.5, rounded to 3 decimals
export function scaleNutrients(values: Nutrients, factor: number): Nutrients {
  const result = {} as Nutrients
  for (const n of NUTRIENTS) {
    result[n.key] = Math.round((Number(values[n.key]) || 0) * factor * 1000) / 1000
  }
  return result
}

// Reads a typed amount: "3,5" or "3.5" (the iPhone keypad shows a comma in German).
// Empty counts as 0. Returns null if it isn't a number.
export function parseAmount(text: string): number | null {
  const s = text.trim().replace(',', '.')
  if (s === '') return 0
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

// German number format: "1.200", "3,5"
export function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: decimals })
}
