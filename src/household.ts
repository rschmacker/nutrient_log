import { supabase } from './supabase'

// Both parents share one household; all foods, entries and targets belong to it.
// After login the app asks the database once for the household: on the very first
// login it joins the household that invited this email, or creates a new one.
// New rows get the household automatically (see supabase/schema.sql).
let pending: Promise<void> | null = null

export function ensureHousehold(): Promise<void> {
  pending ??= (async () => {
    const { error } = await supabase.rpc('ensure_household')
    if (error) {
      pending = null // try again next time
      throw error
    }
  })()
  return pending
}

// After logging out, so the next login asks again
export function forgetHousehold() {
  pending = null
}
