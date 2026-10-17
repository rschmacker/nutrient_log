-- Kleinkind-Ernährungstracker: Schema + Startdaten
-- Im Supabase-Dashboard unter SQL Editor einfügen und ausführen.

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = mitgelieferte Lebensmittel
  name text not null,
  portion text not null,            -- z. B. "1 Scheibe (40 g)"
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  iron numeric not null default 0,     -- mg
  calcium numeric not null default 0,  -- mg
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null,
  portion text not null,
  portions numeric not null default 1,
  -- Nährwerte der gesamten Menge (Portion x Anzahl), damit spätere Änderungen am Lebensmittel alte Tage nicht verfälschen
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  iron numeric not null default 0,
  calcium numeric not null default 0,
  eaten_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists entries_user_day on public.entries (user_id, eaten_on);

create table if not exists public.targets (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  kcal numeric not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  fiber numeric not null,
  iron numeric not null,
  calcium numeric not null
);

alter table public.foods   enable row level security;
alter table public.entries enable row level security;
alter table public.targets enable row level security;

drop policy if exists foods_read   on public.foods;
drop policy if exists foods_write  on public.foods;
drop policy if exists entries_all  on public.entries;
drop policy if exists targets_all  on public.targets;

create policy foods_read  on public.foods for select using (user_id is null or user_id = auth.uid());
create policy foods_write on public.foods for all    using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy entries_all on public.entries for all  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy targets_all on public.targets for all  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Startdaten (Richtwerte pro Portion, gerundet; bitte bei Bedarf mit der Packung abgleichen)
delete from public.foods where user_id is null;
insert into public.foods (user_id, name, portion, kcal, protein, carbs, fat, fiber, iron, calcium) values
 (null,'Vollkornbrot','1 Scheibe (40 g)',90,3.2,16.5,0.7,3.2,0.9,12),
 (null,'Butter','1 TL (5 g)',37,0,0,4.1,0,0,1),
 (null,'Frischkäse','1 EL (15 g)',35,1.0,0.5,3.2,0,0,12),
 (null,'Aufschnitt: Hähnchenbrust','1 Scheibe (15 g)',15,3.2,0.2,0.2,0,0.1,2),
 (null,'Aufschnitt: Lyoner','1 Scheibe (20 g)',55,2.4,0.4,4.8,0,0.3,5),
 (null,'Nussmus Haselnuss','1 TL (8 g)',52,1.1,0.8,5.0,0.6,0.3,11),
 (null,'Nussmus Cashew','1 TL (8 g)',48,1.4,2.4,3.9,0.3,0.5,3),
 (null,'Nussmus Erdnuss','1 TL (8 g)',48,2.0,0.9,3.9,0.7,0.2,5),
 (null,'Nussmus Mandel','1 TL (8 g)',50,1.7,0.8,4.4,0.9,0.4,20),
 (null,'Ei','1 Stück (Gr. M)',80,7.0,0.4,5.5,0,1.0,28),
 (null,'Nudeln mit Butter und Parmesan','1 Kinderportion (150 g gekocht)',232,7.8,35,6.5,1.5,0.8,62),
 (null,'Cashew (gemahlen)','1 EL (10 g)',57,1.8,3.0,4.5,0.3,0.6,3),
 (null,'Erdnuss (gemahlen)','1 EL (10 g)',57,2.5,0.8,4.9,0.8,0.2,6),
 (null,'Mandel (gemahlen)','1 EL (10 g)',58,2.1,0.5,5.0,1.2,0.4,24),
 (null,'Bratwurst','1 kleine (60 g)',170,7.0,0.8,15,0,0.6,8),
 (null,'Porridge mit Milch und gemahlenen Nüssen','1 Schüssel (ca. 190 g)',260,10.7,26,11.7,3.9,1.8,216),
 (null,'Kartoffelbrei','1 Portion (120 g)',100,2.4,15.5,3.2,1.7,0.5,30),
 (null,'Spinat','1 Portion (80 g)',18,2.2,0.6,0.4,1.7,1.7,80),
 (null,'Kiwi','1 Stück (70 g)',42,0.8,8.5,0.4,2.1,0.2,24),
 (null,'Apfel','1 kleiner (100 g)',54,0.3,11.4,0.4,2.0,0.2,6),
 (null,'Joghurt (3,5 %)','1 Becher (150 g)',98,5.0,7.0,5.3,0,0.1,170);
