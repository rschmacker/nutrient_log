import { DGE_TARGETS, NUTRIENT_COLUMNS, type Nutrients } from './nutrients'
import { supabase } from './supabase'

// The household's daily targets, or the DGE defaults if none are saved yet
export async function fetchTargets(): Promise<Nutrients> {
  const { data, error } = await supabase
    .from('nutrient_targets')
    .select(NUTRIENT_COLUMNS)
    .maybeSingle()
  if (error) throw error
  return data ? (data as unknown as Nutrients) : DGE_TARGETS
}

// Saves the targets for the whole household (one row per household; the database
// fills in the household, so a second save updates the same row)
export async function saveTargets(targets: Nutrients) {
  const { error } = await supabase
    .from('nutrient_targets')
    .upsert({ ...targets, updated_at: new Date().toISOString() }, { onConflict: 'household_id' })
  if (error) throw error
}
