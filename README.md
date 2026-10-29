# Kleinkind-Essen

Private Web-App (PWA), um zu loggen, was ein Kleinkind isst, und die Tageswerte (Energie, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Eisen, Calcium, Omega-3) gegen die DGE-Referenzwerte für 1 bis unter 4 Jahre zu sehen, wahlweise als Tageswert oder als Ø über 3 Tage. Eigene Lebensmittel und Gerichte (Nährwerte pro Portion aus einer anderen App) lassen sich speichern.

Aufgebaut wie das Workout Log: Vite + React + TypeScript, Daten in Supabase, Hosting über GitHub Pages. Die Bauanleitung und den Stand der Schritte beschreibt `CLAUDE.md`. Die erste Version ohne Build-Schritt liegt in der Git-Historie (Commit `ce8cca8`).

## Supabase

Die App nutzt dasselbe Supabase-Projekt wie das Workout Log.

1. SQL Editor → New query → Inhalt von `supabase/schema.sql` einfügen → Run. Das Skript ist wiederholbar.
2. Authentication → URL Configuration → Redirect URLs: `http://localhost:5173/nutrient_log/` und `https://rschmacker.github.io/nutrient_log/` hinzufügen.
3. `.env.example` nach `.env.local` kopieren und URL und anon-Key eintragen (dieselben Werte wie im Workout Log).
4. Änderungen danach: die Dateien in `supabase/migrations/` der Reihe nach im SQL Editor ausführen (jede ist wiederholbar).

## Anmelden

Mit GitHub oder mit E-Mail und Passwort. Beides funktioniert auch in der App auf dem Home-Bildschirm. Anmeldelinks oder Codes per E-Mail gibt es nicht: Dafür müsste man die E-Mail-Vorlagen in Supabase ändern, und das geht bei diesem Projekt mit dem eingebauten E-Mail-Versand nicht.

## Familie

Alle in einer Familie sehen dieselben Einträge, Lebensmittel und Richtwerte.

1. In der App unter Einstellungen → Familie die E-Mail-Adresse der anderen Person einladen.
2. In Supabase das Konto anlegen: Authentication → Users → Add user → Create new user. E-Mail-Adresse und ein Passwort eingeben, „Auto Confirm User“ anhaken.
3. Die andere Person meldet sich in der App mit dieser E-Mail-Adresse und dem Passwort an und ist automatisch in der Familie.

Passwort vergessen: In Supabase unter Authentication → Users das Konto löschen, in der App neu einladen und das Konto mit neuem Passwort wieder anlegen. Die Einträge gehören der Familie und bleiben erhalten.

## Lokal starten

```
npm install
npm run dev
```

Dann die angezeigte Adresse öffnen (`http://localhost:5173/nutrient_log/`). Auf dem iPhone im selben WLAN die „Network“-Adresse öffnen.

## Veröffentlichen (GitHub Pages)

Die App läuft unter https://rschmacker.github.io/nutrient_log/. Jeder Push auf `main` baut sie neu und veröffentlicht sie (GitHub → Actions → „Deploy to GitHub Pages“, dauert etwa eine Minute).

Einmalige Einrichtung:

1. Repository `nutrient_log` auf GitHub anlegen (öffentlich, ohne README).
2. Settings → Secrets and variables → Actions: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` mit denselben Werten wie in `.env.local` anlegen.
3. Settings → Pages → Build and deployment → Source: „GitHub Actions“.
4. In Supabase unter Authentication → URL Configuration → Redirect URLs muss `https://rschmacker.github.io/nutrient_log/` stehen (für „Mit GitHub anmelden“).

Auf dem iPhone die Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Hinweise

- Nährwerte und Tagesrichtwerte sind gerundete Orientierungswerte und unter „Lebensmittel“ bzw. „Einstellungen“ anpassbar.
- Richtwerte (DGE, 1 bis unter 4 Jahre): Eiweiß 14 g, Eisen 7 mg, Calcium 600 mg, Energie 1.200 kcal, Fett 30–40 % und Kohlenhydrate > 50 % der Energie, Ballaststoffe 14,6 g pro 1.000 kcal, α-Linolensäure 0,5 % der Energie. Quellen: dge.de/wissenschaft/referenzwerte (Energie, Protein, Eisen, Calcium, Fett/essenzielle Fettsäuren) und die DGE-FAQ zu Ballaststoffen.
- Omega-3 in der App = Summe aller Omega-3-Fettsäuren in g (bei Fisch EPA + DHA, sonst überwiegend ALA). Die Werte der Startlebensmittel sind grobe Schätzungen.
- Ø 3 Tage (Standardansicht): was in 72 Stunden gegessen wurde, pro Tag. Heute zählen die letzten 72 Stunden bis jetzt (so sinkt der Schnitt morgens nicht ab, nur weil heute erst das Frühstück eingetragen ist); ist heute noch nichts eingetragen, die 3 Tage davor; für frühere Tage dieser Tag und die zwei davor. Als Essenszeit gilt die Uhrzeit des Eintragens, bei nachgetragenen Einträgen 12 Uhr. Tage ohne Einträge werden nicht mitgezählt.
- Ein Tipp auf einen Ring zeigt, welche Lebensmittel wie viel dazu beigetragen haben.
- Neues Lebensmittel: „Frage kopieren“ erzeugt eine Frage für eine KI-App (ChatGPT, Claude …). Die Antwort dort kopieren und im Formular einfügen, dann sind die Nährwerte ausgefüllt. KI-Werte sind Schätzungen, bei Packungsware lieber mit der Packung vergleichen.
- Einträge speichern die Nährwerte zum Zeitpunkt des Loggens, spätere Änderungen an einem Lebensmittel verändern alte Tage nicht.
