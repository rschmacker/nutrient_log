# Kleinkind-Essen

Private Web-App (PWA), um zu loggen, was ein Kleinkind isst, und die Tageswerte (Energie, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Eisen, Calcium, Omega-3) gegen die DGE-Referenzwerte für 1 bis unter 4 Jahre zu sehen, wahlweise als Tageswert oder als Ø über 3 Tage. Eigene Lebensmittel und Gerichte (Nährwerte pro Portion aus einer anderen App) lassen sich speichern.

Aufgebaut wie das Workout Log: Vite + React + TypeScript, Daten in Supabase, Hosting über GitHub Pages. Die Bauanleitung und den Stand der Schritte beschreibt `CLAUDE.md`. Die erste Version ohne Build-Schritt liegt in der Git-Historie (Commit `ce8cca8`).

## Supabase

Die App nutzt dasselbe Supabase-Projekt wie das Workout Log.

1. SQL Editor → New query → Inhalt von `supabase/schema.sql` einfügen → Run. Das Skript ist wiederholbar.
2. Authentication → URL Configuration → Redirect URLs: `http://localhost:5173/nutrient_log/` und `https://rschmacker.github.io/nutrient_log/` hinzufügen.
3. `.env.example` nach `.env.local` kopieren und URL und anon-Key eintragen (dieselben Werte wie im Workout Log).

## Lokal starten

```
npm install
npm run dev
```

Dann die angezeigte Adresse öffnen (`http://localhost:5173/nutrient_log/`). Auf dem iPhone im selben WLAN die „Network“-Adresse öffnen.

Die Veröffentlichung auf GitHub Pages folgt in Schritt 7.

## Hinweise

- Nährwerte und Tagesrichtwerte sind gerundete Orientierungswerte und unter „Lebensmittel“ bzw. „Einstellungen“ anpassbar.
- Richtwerte (DGE, 1 bis unter 4 Jahre): Eiweiß 14 g, Eisen 7 mg, Calcium 600 mg, Energie 1.200 kcal, Fett 30–40 % und Kohlenhydrate > 50 % der Energie, Ballaststoffe 14,6 g pro 1.000 kcal, α-Linolensäure 0,5 % der Energie. Quellen: dge.de/wissenschaft/referenzwerte (Energie, Protein, Eisen, Calcium, Fett/essenzielle Fettsäuren) und die DGE-FAQ zu Ballaststoffen.
- Omega-3 in der App = Summe aller Omega-3-Fettsäuren in g (bei Fisch EPA + DHA, sonst überwiegend ALA). Die Werte der Startlebensmittel sind grobe Schätzungen.
- Ø 3 Tage (Standardansicht): der gewählte Tag (auch heute) und die zwei Tage davor. Tage ohne Einträge werden nicht mitgezählt; wer erst einen Tag eingetragen hat, sieht also den Durchschnitt dieses einen Tages.
- Einträge speichern die Nährwerte zum Zeitpunkt des Loggens, spätere Änderungen an einem Lebensmittel verändern alte Tage nicht.
