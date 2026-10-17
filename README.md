# Kleinkind-Essen

Private Web-App (PWA), um zu loggen, was ein Kleinkind isst, und die Tageswerte (Energie, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Eisen, Calcium, Omega-3) gegen die DGE-Referenzwerte für 1 bis unter 4 Jahre zu sehen, wahlweise als Tageswert oder als Ø über 3 Tage. Eigene Lebensmittel und Gerichte (Nährwerte pro Portion aus einer anderen App) lassen sich speichern. Frontend ohne Build-Schritt, Daten in Supabase, Hosting über GitHub Pages.

## Einrichtung

1. **Supabase**: Neues Projekt anlegen, im SQL Editor den Inhalt von `supabase/schema.sql` ausführen (Tabellen, Row-Level-Security, 28 Startlebensmittel). Das Skript ist wiederholbar: Wenn du schon eine ältere Version eingerichtet hast, einfach noch einmal ausführen, es ergänzt Omega-3 und Gerichte, ohne eigene Daten zu löschen.
2. **Auth**: Authentication → Providers → Email aktiv lassen. Wenn nur du die App nutzt, kannst du danach unter Sign In / Providers neue Registrierungen ausschalten.
3. **Config**: In `config.js` `SUPABASE_URL` und `SUPABASE_ANON_KEY` eintragen (Project Settings → API). Der anon-Key ist öffentlich gedacht; geschützt sind die Daten durch die RLS-Policies.
4. **GitHub Pages**: Repo → Settings → Pages → Branch `main`, Ordner `/ (root)`.
5. **Supabase URL-Konfiguration**: Authentication → URL Configuration → Site URL auf die Pages-Adresse setzen (nötig für den Bestätigungslink).
6. Auf dem iPhone in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Hinweise

- Nährwerte und Tagesrichtwerte sind gerundete Orientierungswerte und unter „Lebensmittel“ bzw. „Ziele“ anpassbar.
- Richtwerte (DGE, 1 bis unter 4 Jahre): Eiweiß 14 g, Eisen 7 mg, Calcium 600 mg, Energie 1.200 kcal, Fett 30–40 % und Kohlenhydrate > 50 % der Energie, Ballaststoffe 14,6 g pro 1.000 kcal, α-Linolensäure 0,5 % der Energie. Quellen: dge.de/wissenschaft/referenzwerte (Energie, Protein, Eisen, Calcium, Fett/essenzielle Fettsäuren) und die DGE-FAQ zu Ballaststoffen.
- Omega-3 in der App = Summe aller Omega-3-Fettsäuren in g (bei Fisch EPA + DHA, sonst überwiegend ALA). Die Werte der Startlebensmittel sind grobe Schätzungen.
- Ø 3 Tage: Für „heute“ zählen die drei letzten abgeschlossenen Tage, für frühere Tage dieser Tag und die zwei davor. Tage ohne Einträge werden nicht mitgezählt.
- Einträge speichern die Nährwerte zum Zeitpunkt des Loggens, spätere Änderungen an einem Lebensmittel verändern alte Tage nicht.
