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
