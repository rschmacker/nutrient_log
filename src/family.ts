import { supabase } from './supabase'

// Everyone in the household (the family) sees the same entries, foods and targets.
// Joining happens in the database on login (ensure_household, see household.ts).

export type Member = {
  user_id: string
  email: string | null
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, email')
    .order('created_at')
  if (error) throw error
  return data as Member[]
}

// Emails that were invited but haven't logged in yet
export async function fetchInvites(): Promise<string[]> {
  const { data, error } = await supabase.from('household_invites').select('email').order('created_at')
  if (error) throw error
  return (data as { email: string }[]).map((row) => row.email)
}

// Whoever logs in with this email next joins the family (the database adds the household)
export async function inviteEmail(email: string) {
  const { error } = await supabase.from('household_invites').insert({ email })
  if (error) {
    // 23505 = this email already has an invite
    if (error.code === '23505') throw new Error('Diese E-Mail-Adresse ist schon eingeladen.')
    throw error
  }
}

export async function cancelInvite(email: string) {
  const { error } = await supabase.from('household_invites').delete().eq('email', email)
  if (error) throw error
}
