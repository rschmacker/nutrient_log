# Kleinkind-Essen

Private Web-App (PWA), um zu loggen, was ein Kleinkind isst, und die Tageswerte (Energie, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Eisen, Calcium) gegen Richtwerte für ca. 3-Jährige zu sehen. Frontend ohne Build-Schritt, Daten in Supabase, Hosting über GitHub Pages.

## Einrichtung

1. **Supabase**: Neues Projekt anlegen, im SQL Editor den Inhalt von `supabase/schema.sql` ausführen (Tabellen, Row-Level-Security, 21 Startlebensmittel).
2. **Auth**: Authentication → Providers → Email aktiv lassen. Wenn nur du die App nutzt, kannst du danach unter Sign In / Providers neue Registrierungen ausschalten.
3. **Config**: In `config.js` `SUPABASE_URL` und `SUPABASE_ANON_KEY` eintragen (Project Settings → API). Der anon-Key ist öffentlich gedacht; geschützt sind die Daten durch die RLS-Policies.
4. **GitHub Pages**: Repo → Settings → Pages → Branch `main`, Ordner `/ (root)`.
5. **Supabase URL-Konfiguration**: Authentication → URL Configuration → Site URL auf die Pages-Adresse setzen (nötig für den Bestätigungslink).
6. Auf dem iPhone in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Hinweise

- Nährwerte und Tagesrichtwerte sind gerundete Orientierungswerte und unter „Lebensmittel“ bzw. „Ziele“ anpassbar.
- Einträge speichern die Nährwerte zum Zeitpunkt des Loggens, spätere Änderungen an einem Lebensmittel verändern alte Tage nicht.
