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

// What the form saves (the household is filled in by the database)
export type FoodInput = Omit<Food, 'id' | 'household_id'>

const FOOD_COLUMNS = `id, household_id, name, portion, kind, ${NUTRIENT_COLUMNS}`

// Loads the built-in foods and the household's own foods and dishes, sorted by name
export async function fetchFoods(): Promise<Food[]> {
  const { data, error } = await supabase.from('foods').select(FOOD_COLUMNS)
  if (error) throw error
  return (data as unknown as Food[]).sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

// One food, or null if it doesn't exist (any more)
export async function fetchFood(id: string): Promise<Food | null> {
  const { data, error } = await supabase.from('foods').select(FOOD_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as Food | null
}

// Creates a new own food, or changes the own food with this id
export async function saveFood(food: FoodInput, id?: string) {
  const { error } = id
    ? await supabase.from('foods').update(food).eq('id', id)
    : await supabase.from('foods').insert(food)
  if (error) {
    // 23505 = unique constraint: the household already has a food with this name
    if (error.code === '23505') {
      throw new Error('Es gibt schon ein eigenes Lebensmittel oder Gericht mit diesem Namen.')
    }
    throw error
  }
}

// Deletes an own food. Logged entries keep their name and values.
export async function deleteFood(id: string) {
  const { error } = await supabase.from('foods').delete().eq('id', id)
  if (error) throw error
}
