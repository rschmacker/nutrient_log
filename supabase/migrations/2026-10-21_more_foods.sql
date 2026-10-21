-- Six more built-in foods (2026-10-21), also in schema.sql.
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run again.
-- Values per portion, rounded from typical values per 100 g:
--   Weißbrot 250 kcal, 8 g protein, 48 g carbs, 2 g fat, 3 g fiber
--   Marmelade 250 kcal, 62 g carbs, 1 g fiber
--   Rindfleisch (lean, cooked) 200 kcal, 29 g protein, 9 g fat, 2.8 mg iron
--   Pommes (between oven and deep-fried) 220 kcal, 3.4 g protein, 30 g carbs, 9 g fat, 3 g fiber
--   Parmesan 400 kcal, 35 g protein, 29 g fat, 1180 mg calcium
--   Sahnesoße (cream, milk, a little flour) 150 kcal, 2.5 g protein, 6 g carbs, 13 g fat, 75 mg calcium

insert into public.foods
  (household_id, name, portion, kcal, protein, carbs, fat, fiber, iron, calcium, omega3)
values
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
