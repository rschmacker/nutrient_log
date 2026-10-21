import { NUTRIENT_COLUMNS, type Nutrients } from './nutrients'
import { supabase } from './supabase'

// A food or dish with its nutrient values per portion
export type Food = Nutrients & {
  id: string
  household_id: string | null // null = built-in food
  name: string
  portion: string // e.g. "1 Scheibe (40 g)"
  kind: 'food' | 'dish' // dish = home-cooked meal
}

// Loads the built-in foods and the household's own foods and dishes, sorted by name
export async function fetchFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select(`id, household_id, name, portion, kind, ${NUTRIENT_COLUMNS}`)
  if (error) throw error
  return (data as unknown as Food[]).sort((a, b) => a.name.localeCompare(b.name, 'de'))
}
