-- Family settings (2026-10-21), also in schema.sql.
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run again.

-- 1. Members remember their email, so Einstellungen -> Familie can show who is in it
alter table public.household_members add column if not exists email text;
update public.household_members m set email = lower(u.email)
from auth.users u
where u.id = m.user_id and m.email is null;

-- 2. An invite gets the inviting person's household automatically
alter table public.household_invites alter column household_id set default public.my_household_id();

-- 3. ensure_household() also stores the email, and moves someone who logged in
--    before being invited (only if their own household is still empty)
create or replace function public.ensure_household()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  my_email text := lower(auth.jwt() ->> 'email');
  hid uuid;
  invited uuid;
begin
  if uid is null then
    raise exception 'Not logged in';
  end if;

  -- If the app calls this twice at the same moment, the second call waits for the first
  perform pg_advisory_xact_lock(hashtext('ensure_household ' || uid::text));

  select household_id into hid from public.household_members where user_id = uid;
  select household_id into invited from public.household_invites where email = my_email;

  -- Keep the stored email up to date
  update public.household_members set email = my_email
  where user_id = uid and email is distinct from my_email;

  if invited is not null then
    if invited = hid then
      -- Already in that household: the invite isn't needed any more
      delete from public.household_invites where email = my_email;
    elsif hid is null or (
      -- Logged in before being invited: move over, but only if the own household is
      -- still empty (nobody else, no own foods, entries or targets), so nothing is lost
      not exists (select 1 from public.household_members where household_id = hid and user_id <> uid)
      and not exists (select 1 from public.foods where household_id = hid)
      and not exists (select 1 from public.food_entries where household_id = hid)
      and not exists (select 1 from public.nutrient_targets where household_id = hid)
    ) then
      delete from public.household_invites where email = my_email;
      delete from public.households where id = hid; -- also removes the old membership
      insert into public.household_members (user_id, household_id, email)
      values (uid, invited, my_email);
      return invited;
    end if;
  end if;

  if hid is not null then
    return hid;
  end if;

  insert into public.households default values returning id into hid;
  insert into public.household_members (user_id, household_id, email) values (uid, hid, my_email);
  return hid;
end;
$$;

revoke execute on function public.ensure_household() from public, anon;
grant execute on function public.ensure_household() to authenticated;
