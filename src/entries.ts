import type { Food } from './foods'
import { formatNumber, NUTRIENT_COLUMNS, scaleNutrients, type Nutrients } from './nutrients'
import { supabase } from './supabase'

// One logged food. The nutrient values are for the whole amount (portion x portions).
export type FoodEntry = Nutrients & {
  id: string
  name: string
  portion: string
  portions: number
  eaten_on: string // "YYYY-MM-DD"
  created_at: string // when it was logged (ISO timestamp)
}

// Loads the entries from `from` to `to` (both included), in the order they were logged
export async function fetchEntries(from: string, to: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from('food_entries')
    .select(`id, name, portion, portions, eaten_on, created_at, ${NUTRIENT_COLUMNS}`)
    .gte('eaten_on', from)
    .lte('eaten_on', to)
    .order('created_at')
  if (error) throw error
  return data as unknown as FoodEntry[]
}

// Logs `portions` x one portion of `food` for `day`. The values are copied,
// so later changes to the food don't change this entry.
export async function addEntry(food: Food, portions: number, day: string) {
  const { error } = await supabase.from('food_entries').insert({
    food_id: food.id,
    name: food.name,
    portion: food.portion,
    portions,
    eaten_on: day,
    ...scaleNutrients(food, portions),
  })
  if (error) throw error
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from('food_entries').delete().eq('id', id)
  if (error) throw error
}

// Short summary of an entry for the list, e.g. "1,5 × 1 Scheibe (40 g) · 135 kcal"
export function entrySummary(entry: FoodEntry): string {
  return `${formatNumber(entry.portions, 2)} × ${entry.portion} · ${formatNumber(entry.kcal, 0)} kcal`
}
