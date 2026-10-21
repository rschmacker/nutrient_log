# Kleinkind-Essen (toddler nutrition log)

Personal web app (PWA) to log what a toddler eats and compare the day's nutrients with the DGE reference values for children aged 1 to under 4. Used mainly on an iPhone in Safari, added to the Home Screen. Both parents log, each with their own login, and see the same data.

Built the same way as the workout log (`../workout-log`): it is the reference for stack, file structure, look and working style. When in doubt, do it the way the workout log does.

The first version was plain JavaScript without a build step (commit `ce8cca8`). It is the reference for screens, calculations, nutrient data and German texts: `git show ce8cca8:app.js`, `git show ce8cca8:style.css`, `git show ce8cca8:supabase/schema.sql`.

## Stack (same as the workout log)
- Vite + React + TypeScript
- Supabase (Postgres + Auth) for online storage; login via "Sign in with GitHub" or email + password (accounts created in the Supabase dashboard)
- Same Supabase project as the workout log (same URL and anon key, same users); the table names don't overlap with the workout tables
- Hosting: GitHub Pages, deployed with a GitHub Actions workflow
- HashRouter (not BrowserRouter) so GitHub Pages does not 404 on reload
- Vite `base` is `/nutrient_log/` (must match the GitHub repo name)
- PWA: web manifest, PNG icons, `display: standalone`, iPhone meta tags, safe-area insets; no service worker
- Supabase URL and anon key come from env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); store them as GitHub Actions secrets, never hardcode service-role keys

## Language
- All UI text in German (dates with `de-DE`, decimal comma)
- Code, comments and this file in English, like the workout log

## Nutrients and targets
Eight nutrients, each with a unit, number of decimals and a ring color:
Energie (kcal), Eiweiß (g), Kohlenhydrate (g), Fett (g), Ballaststoffe (g), Eisen (mg), Calcium (mg), Omega-3 (g, sum of ALA + EPA + DHA).

Default daily targets (DGE, 1 to under 4 years), editable per user:
- Energie 1200 kcal (boys PAL 1.4 / girls PAL 1.6)
- Eiweiß 14 g
- Kohlenhydrate 150 g (> 50 % of energy)
- Fett 47 g (30–40 % of energy, middle of the range)
- Ballaststoffe 17.5 g (14.6 g per 1000 kcal)
- Eisen 7 mg
- Calcium 600 mg
- Omega-3 0.7 g (α-linolenic acid 0.5 % of energy; no DGE value for EPA/DHA at this age)

These are guidance values for an average over several days, not goals for a single day. The app says so.

## Screens
1. **Heute (Home, `/`, earlier days `/?tag=YYYY-MM-DD`)**: date bar with previous / next day (no future days); toggle "Ø 3 Tage" (the default) / "Tageswerte" (remembered on the device); 8 progress rings showing % of target, with value and target below; list of the day's entries (name, amount × portion, kcal) with delete (asks first); "+ Essen eintragen" button fixed at the bottom. Apple icon ("Lebensmittel") and gear icon ("Einstellungen") in the top bar.
   - Rings: all in the app's green (the name below identifies each ring, so color doesn't need to). At 100 % and above the ring is simply full and the percentage shows how much; no warning colors or symbols for values over the target (see Decisions). Ring colors are checked for at least 3:1 contrast in light and dark mode (`--ring` in `index.css`)
   - Tapping a ring opens a panel: which foods the value comes from (same name added up, largest first), each with value, share in % and a bar compared with the largest. In Ø mode the values are per day, so the rows add up to the ring
2. **Hinzufügen (`/hinzufuegen`, same `?tag=`)**: search field, filter chips Alle / Lebensmittel / Gerichte / Eigene, list of foods (name, portion, kcal). Tapping a food opens a panel from the bottom: stepper in steps of 0.25 portions (start 1, min 0.25) with a live preview of kcal, Eiweiß, Eisen and Omega-3; "Eintragen" saves it for the selected day and returns to Heute.
3. **Lebensmittel (`/lebensmittel`)**: sections "Meine Gerichte", "Eigene Lebensmittel", "Mitgeliefert"; buttons "+ Lebensmittel" and "+ Gericht". Own foods and dishes can be edited and deleted (deleting keeps already logged entries). Built-in foods are read-only: tapping one shows its values and offers "Eigene Version anlegen" (a new own food prefilled with its values).
   - Form (`/lebensmittel/neu`, `/lebensmittel/<id>`): Lebensmittel / Gericht, name, portion text (e.g. "1 Scheibe (40 g)"), 8 nutrient values per portion (comma or dot, empty counts as 0). Dishes are home-cooked meals whose values per portion come from another app. Names are unique per household (friendly message if not)
   - Hinzufügen links to the form at the end of its list ("+ „…“ neu anlegen", name prefilled from the search)
4. **Einstellungen (`/einstellungen`, gear icon)**:
   - Richtwerte: the 8 daily targets (shared by the family, numbers > 0), "DGE-Werte einsetzen" fills in the defaults (saved with "Speichern"), short explanation of the reference values
   - Familie: members (with email, "Das bist du"), pending invites with "Zurücknehmen", invite by email
   - Konto: signed in as …, sign out
5. **Login**: "Mit GitHub anmelden", or email + password (both work in the Home Screen app). No login links or codes by email: links only log in the browser they open in, and codes would need edited email templates, which this Supabase project doesn't allow with the built-in email sending (2026-10-21)

Navigation like the workout log: separate screens with a "‹ Zurück" link that goes one level up; no bottom tab bar.

## Calculations
- Day total: sum of the day's entries
- Ø 3 Tage (`src/average.ts`): what was eaten in 72 hours, divided by the days covered
  - Today, once something is logged: the 72 hours end now (rolling), so the average doesn't drop in the morning when today only has breakfast. Nothing logged today yet: the 3 days before today. Earlier day: that day and the two before
  - When something was eaten: the time it was logged (`created_at`) if that was on the same day, otherwise noon of its day (logged later)
  - Hours on days without any entries don't count; divide by at least 1 day, so with only today logged it shows today's total
- Ring percentage: value / target

## Data model (Supabase)
All data belongs to a **household** (both parents), not to a single user.
- `households`: id, created_at
- `household_members`: user_id (primary key, one household per user), household_id, email (shown in Einstellungen)
- `household_invites`: email (primary key, lowercase), household_id (defaults to the inviting person's household). Whoever logs in with this email joins that household
- `foods`: id (uuid), household_id (null for built-in foods), name, portion (text), kind (`food` | `dish`), kcal, protein, carbs, fat, fiber (g), iron (mg), calcium (mg), omega3 (g), created_at. Nutrient values are per portion. Unique (household_id, name)
- `food_entries`: id, household_id, food_id (fk, set null when the food is deleted), name, portion, portions (numeric), the 8 nutrient values for the whole amount, eaten_on (date, the phone's local date), created_at. Entries copy the values at logging time, so later changes to a food don't change past days
- `nutrient_targets`: household_id (primary key) and the 8 target values; no row = DGE defaults
- Built-in foods: the 28 foods from the first version plus 6 added on 2026-10-21 (seeded in `supabase/schema.sql`, updated in place when the file is run again). New built-in foods go into `schema.sql` and into a migration file with the values per 100 g in a comment
- `my_household_id()`: the logged-in user's household; used in the access rules and as the column default, so the app never sends household_id
- `ensure_household()`: the app calls it once after login (`src/household.ts`); joins an invited household or creates one on the first login, and stores the email. Someone who logged in before being invited is moved to the inviting household, but only if their own household is still empty (no other member, no own foods, entries or targets), so nothing is lost

## Security (important, the app is publicly reachable)
- Enable Row Level Security on every table; no access for anonymous visitors
- Users can select/insert/update/delete only the rows of their own household; built-in foods (household_id is null) are readable by all logged-in users
- Households and memberships are only created through `ensure_household()`, never directly by the app
- SQL (tables, RLS policies, seed data) in `supabase/schema.sql`, safe to run again; later changes as migration files in `supabase/migrations/`
- Sign-ups: only me and my partner. Other users of the shared Supabase project only get their own empty household

## Working style
- Build in small steps and stop after each so I can test:
  1. Project scaffold + PWA setup
  2. Supabase schema + login
  3. Heute screen: date bar, rings, entry list, delete
  4. Hinzufügen: search, filters, amount, save
  5. Lebensmittel: own foods and dishes
  6. Einstellungen: targets, Familie (invite my partner) and account. My partner probably has no GitHub account, so they log in with email + password
  7. GitHub Pages deployment
- Mobile-first: large touch targets (at least 44 px), numeric keypad for numbers (`inputMode="decimal"`), light and dark mode following the phone setting
- Keep dependencies minimal; explain any new package before adding it
- Keep code simple and readable; I am not a professional web developer
- After each step, tell me exactly what to run or click to test it, and what manual setup (Supabase, GitHub settings) I need to do myself

## Decisions
- No warning colors, arrows or other alarm signals when a value is over the target, anywhere in the app (2026-10-21: it causes stress). Rings stay green, the percentage alone shows how much
