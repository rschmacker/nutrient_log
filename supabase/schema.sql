-- Kleinkind-Essen database schema
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run again (it skips things that already exist and updates the built-in foods).
-- It runs in the same Supabase project as the workout log; the table names don't overlap.

-- ---------------------------------------------------------------------------
-- Households: both parents belong to one household and share all its data
-- ---------------------------------------------------------------------------

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Who belongs to which household. Each user is in exactly one household.
create table if not exists public.household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Invitations: whoever logs in for the first time with this email joins the household
create table if not exists public.household_invites (
  email text primary key check (email = lower(trim(email)) and email like '%_@_%'),
  household_id uuid not null references public.households (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- The household of the logged-in user (null if not logged in or not in one yet).
-- Used by the access rules below and as the default for new rows, so the app
-- never has to send the household id itself.
-- "security definer" lets it read household_members without that table's own access rules.
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members where user_id = (select auth.uid())
$$;

-- Called by the app right after login. Returns the user's household; on the very
-- first login it joins the household that invited this email, or creates a new one.
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
begin
  if uid is null then
    raise exception 'Not logged in';
  end if;

  -- If the app calls this twice at the same moment, the second call waits for the first
  perform pg_advisory_xact_lock(hashtext('ensure_household ' || uid::text));

  select household_id into hid from public.household_members where user_id = uid;
  if hid is not null then
    return hid;
  end if;

  delete from public.household_invites where email = my_email returning household_id into hid;
  if hid is null then
    insert into public.households default values returning id into hid;
  end if;

  insert into public.household_members (user_id, household_id) values (uid, hid);
  return hid;
end;
$$;

revoke execute on function public.my_household_id() from public, anon;
revoke execute on function public.ensure_household() from public, anon;
grant execute on function public.my_household_id() to authenticated;
grant execute on function public.ensure_household() to authenticated;

-- ---------------------------------------------------------------------------
-- Foods, logged entries and daily targets
-- ---------------------------------------------------------------------------

-- Foods and dishes with nutrient values per portion.
-- Built-in foods have household_id = null and are the same for everyone.
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid default public.my_household_id()
    references public.households (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  portion text not null check (length(trim(portion)) between 1 and 60), -- e.g. "1 Scheibe (40 g)"
  kind text not null default 'food' check (kind in ('food', 'dish')), -- dish = home-cooked meal
  kcal numeric not null default 0 check (kcal >= 0),
  protein numeric not null default 0 check (protein >= 0), -- g
  carbs numeric not null default 0 check (carbs >= 0), -- g
  fat numeric not null default 0 check (fat >= 0), -- g
  fiber numeric not null default 0 check (fiber >= 0), -- g
  iron numeric not null default 0 check (iron >= 0), -- mg
  calcium numeric not null default 0 check (calcium >= 0), -- mg
  omega3 numeric not null default 0 check (omega3 >= 0), -- g (ALA + EPA + DHA)
  created_at timestamptz not null default now(),
  -- No duplicate names per household (and none among the built-in foods)
  unique nulls not distinct (household_id, name)
);

-- One row per logged food. The nutrient values are for the whole amount
-- (portion x portions) and are copied when logging, so later changes to a food
-- don't change past days.
create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.my_household_id()
    references public.households (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 80),
  portion text not null check (length(trim(portion)) between 1 and 60),
  portions numeric not null check (portions > 0),
  kcal numeric not null default 0 check (kcal >= 0),
  protein numeric not null default 0 check (protein >= 0),
  carbs numeric not null default 0 check (carbs >= 0),
  fat numeric not null default 0 check (fat >= 0),
  fiber numeric not null default 0 check (fiber >= 0),
  iron numeric not null default 0 check (iron >= 0),
  calcium numeric not null default 0 check (calcium >= 0),
  omega3 numeric not null default 0 check (omega3 >= 0),
  -- The phone's local date (set by the app, never the server's UTC date)
  eaten_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists food_entries_household_day
  on public.food_entries (household_id, eaten_on);

-- Daily targets per household. No row = the app uses the DGE defaults.
create table if not exists public.nutrient_targets (
  household_id uuid primary key default public.my_household_id()
    references public.households (id) on delete cascade,
  kcal numeric not null check (kcal > 0),
  protein numeric not null check (protein > 0),
  carbs numeric not null check (carbs > 0),
  fat numeric not null check (fat > 0),
  fiber numeric not null check (fiber > 0),
  iron numeric not null check (iron > 0),
  calcium numeric not null check (calcium > 0),
  omega3 numeric not null check (omega3 > 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Access: only logged-in users, never anonymous visitors.
-- Households and members are only changed through ensure_household() above.
-- ---------------------------------------------------------------------------

revoke all on public.households, public.household_members, public.household_invites,
  public.foods, public.food_entries, public.nutrient_targets from anon;
revoke all on public.households, public.household_members, public.household_invites
  from authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, insert, delete on public.household_invites to authenticated;
grant select, insert, update, delete on public.foods, public.food_entries,
  public.nutrient_targets to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: every user only sees and changes the rows of their own household
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.foods enable row level security;
alter table public.food_entries enable row level security;
alter table public.nutrient_targets enable row level security;

drop policy if exists "Read own household" on public.households;
create policy "Read own household" on public.households
  for select to authenticated
  using (id = (select public.my_household_id()));

drop policy if exists "Read members of own household" on public.household_members;
create policy "Read members of own household" on public.household_members
  for select to authenticated
  using (household_id = (select public.my_household_id()));

drop policy if exists "Manage invites of own household" on public.household_invites;
create policy "Manage invites of own household" on public.household_invites
  for all to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

-- foods: built-in ones are readable by everyone, own ones can be changed
drop policy if exists "Read built-in and own foods" on public.foods;
create policy "Read built-in and own foods" on public.foods
  for select to authenticated
  using (household_id is null or household_id = (select public.my_household_id()));

drop policy if exists "Manage own foods" on public.foods;
create policy "Manage own foods" on public.foods
  for all to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

-- food_entries may only point to a built-in food or one of the household's own
drop policy if exists "Manage own entries" on public.food_entries;
create policy "Manage own entries" on public.food_entries
  for all to authenticated
  using (household_id = (select public.my_household_id()))
  with check (
    household_id = (select public.my_household_id())
    and (
      food_id is null
      or exists (
        select 1 from public.foods f
        where f.id = food_id
          and (f.household_id is null or f.household_id = (select public.my_household_id()))
      )
    )
  );

drop policy if exists "Manage own targets" on public.nutrient_targets;
create policy "Manage own targets" on public.nutrient_targets
  for all to authenticated
  using (household_id = (select public.my_household_id()))
  with check (household_id = (select public.my_household_id()));

-- ---------------------------------------------------------------------------
-- Built-in foods (household_id = null). Values per portion, rounded; check the
-- package if in doubt. omega3 = all omega-3 fatty acids in g (EPA + DHA for fish,
-- otherwise mostly ALA), rough estimates.
-- Running the file again updates these values without touching logged entries.
-- ---------------------------------------------------------------------------

insert into public.foods
  (household_id, name, portion, kcal, protein, carbs, fat, fiber, iron, calcium, omega3)
values
  (null, 'Vollkornbrot', '1 Scheibe (40 g)', 90, 3.2, 16.5, 0.7, 3.2, 0.9, 12, 0.05),
  (null, 'Butter', '1 TL (5 g)', 37, 0, 0, 4.1, 0, 0, 1, 0.03),
  (null, 'Frischkäse', '1 EL (15 g)', 35, 1.0, 0.5, 3.2, 0, 0, 12, 0.02),
  (null, 'Aufschnitt: Hähnchenbrust', '1 Scheibe (15 g)', 15, 3.2, 0.2, 0.2, 0, 0.1, 2, 0.01),
  (null, 'Aufschnitt: Lyoner', '1 Scheibe (20 g)', 55, 2.4, 0.4, 4.8, 0, 0.3, 5, 0.03),
  (null, 'Nussmus Haselnuss', '1 TL (8 g)', 52, 1.1, 0.8, 5.0, 0.6, 0.3, 11, 0.01),
  (null, 'Nussmus Cashew', '1 TL (8 g)', 48, 1.4, 2.4, 3.9, 0.3, 0.5, 3, 0.01),
  (null, 'Nussmus Erdnuss', '1 TL (8 g)', 48, 2.0, 0.9, 3.9, 0.7, 0.2, 5, 0),
  (null, 'Nussmus Mandel', '1 TL (8 g)', 50, 1.7, 0.8, 4.4, 0.9, 0.4, 20, 0),
  (null, 'Ei', '1 Stück (Gr. M)', 80, 7.0, 0.4, 5.5, 0, 1.0, 28, 0.05),
  (null, 'Nudeln mit Butter und Parmesan', '1 Kinderportion (150 g gekocht)', 232, 7.8, 35, 6.5, 1.5, 0.8, 62, 0.05),
  (null, 'Cashew (gemahlen)', '1 EL (10 g)', 57, 1.8, 3.0, 4.5, 0.3, 0.6, 3, 0.01),
  (null, 'Erdnuss (gemahlen)', '1 EL (10 g)', 57, 2.5, 0.8, 4.9, 0.8, 0.2, 6, 0),
  (null, 'Mandel (gemahlen)', '1 EL (10 g)', 58, 2.1, 0.5, 5.0, 1.2, 0.4, 24, 0.01),
  (null, 'Bratwurst', '1 kleine (60 g)', 170, 7.0, 0.8, 15, 0, 0.6, 8, 0.08),
  (null, 'Porridge mit Milch und gemahlenen Nüssen', '1 Schüssel (ca. 190 g)', 260, 10.7, 26, 11.7, 3.9, 1.8, 216, 0.08),
  (null, 'Kartoffelbrei', '1 Portion (120 g)', 100, 2.4, 15.5, 3.2, 1.7, 0.5, 30, 0.03),
  (null, 'Spinat', '1 Portion (80 g)', 18, 2.2, 0.6, 0.4, 1.7, 1.7, 80, 0.10),
  (null, 'Kiwi', '1 Stück (70 g)', 42, 0.8, 8.5, 0.4, 2.1, 0.2, 24, 0.03),
  (null, 'Apfel', '1 kleiner (100 g)', 54, 0.3, 11.4, 0.4, 2.0, 0.2, 6, 0.01),
  (null, 'Joghurt (3,5 %)', '1 Becher (150 g)', 98, 5.0, 7.0, 5.3, 0, 0.1, 170, 0.03),
  (null, 'Banane', '1 kleine (80 g ohne Schale)', 74, 0.9, 16, 0.2, 1.4, 0.3, 6, 0.02),
  (null, 'Himbeeren', '1 Handvoll (50 g)', 18, 0.7, 2.4, 0.2, 2.4, 0.5, 20, 0.05),
  (null, 'Milch (3,5 %)', '100 ml', 64, 3.4, 4.8, 3.6, 0, 0, 120, 0.02),
  (null, 'Karottensaft', '100 ml', 33, 0.7, 7.0, 0.2, 0.5, 0.4, 20, 0),
  -- Extra omega-3 sources
  (null, 'Walnuss (gemahlen)', '1 EL (10 g)', 65, 1.5, 0.7, 6.5, 0.7, 0.3, 9, 0.9),
  (null, 'Rapsöl', '1 TL (5 g)', 44, 0, 0, 5.0, 0, 0, 0, 0.45),
  (null, 'Lachs (gegart)', '1 Portion (50 g)', 100, 11, 0, 6.5, 0, 0.3, 8, 0.9),
  -- Added 2026-10-21 (also in migrations/2026-10-21_more_foods.sql, with the values per 100 g)
  (null, 'Weißbrot', '1 Scheibe (30 g)', 75, 2.4, 14.4, 0.6, 0.9, 0.2, 9, 0.01),
  (null, 'Marmelade', '1 TL (10 g)', 25, 0, 6.2, 0, 0.1, 0, 1, 0),
  (null, 'Rindfleisch', '1 Portion (40 g gegart)', 80, 11.6, 0, 3.6, 0, 1.1, 3, 0.02),
  (null, 'Pommes', '1 Kinderportion (80 g)', 176, 2.7, 24, 7.2, 2.4, 0.6, 10, 0.05),
  (null, 'Parmesan', '1 EL gerieben (5 g)', 20, 1.8, 0, 1.5, 0, 0, 59, 0.01),
  (null, 'Sahnesoße (Nudelsoße)', '1 Kinderportion (50 g)', 75, 1.3, 3, 6.5, 0, 0.1, 38, 0.05)
on conflict (household_id, name) do update set
  portion = excluded.portion,
  kcal = excluded.kcal,
  protein = excluded.protein,
  carbs = excluded.carbs,
  fat = excluded.fat,
  fiber = excluded.fiber,
  iron = excluded.iron,
  calcium = excluded.calcium,
  omega3 = excluded.omega3;
