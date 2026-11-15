# MRCNK

Prywatna aplikacja do codziennego rozwoju: dekalog, poranna rutyna, Deep Work z blokadą wyjścia, plan i dziennik treningowy z progresją, Muay Thai, waga, kalorie, suplementy, woda, sen, wieczorna analiza Top G / Bottom G, raporty tygodniowe i miesięczne, wizja i cele, chat AI.

PWA, czyli działa na iPhonie (dodana do ekranu głównego) i na komputerze. Działa offline, dane są zapisywane lokalnie i synchronizowane przez Supabase.

## 1. Hosting (GitHub Pages)

Repo → **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.
Adres: `https://mmrcnk.github.io/mrcnk/`

Na iPhonie: otwórz adres w Safari → Udostępnij → **Do ekranu początkowego**.

## 2. Konto i synchronizacja (Supabase, darmowe)

1. supabase.com → New project (region: Frankfurt).
2. **SQL Editor → New query** → wklej `supabase-schema.sql` → Run.
3. **Authentication → Sign In / Providers → Email**: możesz wyłączyć „Confirm email”, żeby od razu się logować.
4. **Project Settings → API**: skopiuj *Project URL* i klucz *anon / publishable*.
5. W aplikacji: **Więcej → Konto, synchronizacja, kopia** → wklej URL i klucz → Połącz → **Załóż konto** (e-mail + hasło). Na drugim urządzeniu: to samo i **Zaloguj**.

## 3. AI (raporty i chat): opcjonalne

1. console.anthropic.com → API key (płatne za użycie).
2. Supabase → **Edge Functions → Secrets** → `ANTHROPIC_API_KEY` = klucz.
3. **Edge Functions → Deploy a new function → Via editor** → nazwa `ai` → wklej `supabase-function-ai.ts` → Deploy.

## 4. Powiadomienia: opcjonalne

1. Supabase → Edge Functions → Secrets:
   - `VAPID_PUBLIC` = klucz publiczny (jest już wpisany w aplikacji, Więcej → Powiadomienia)
   - `VAPID_PRIVATE` = klucz prywatny (podany osobno, nie trzymaj go w repo)
   - `VAPID_SUBJECT` = `mailto:twoj@email`
   - `CRON_SECRET` = dowolny długi ciąg znaków
2. Deploy funkcji `push` z pliku `supabase-function-push.ts`, a w jej ustawieniach **wyłącz „Verify JWT”**.
3. **Integrations → Cron → Create job**: co 5 minut (`*/5 * * * *`), typ Supabase Edge Function → `push`, metoda POST, nagłówek `x-cron-secret: <CRON_SECRET>`.
4. W aplikacji: Więcej → Powiadomienia → zaznacz, które chcesz, i ustaw godziny → **Włącz na tym urządzeniu** → **Test**.

Na iPhonie powiadomienia działają tylko w aplikacji dodanej do ekranu głównego (iOS 16.4+).

## Pliki

| Plik | Co robi |
|---|---|
| `index.html`, `styles.css`, `manifest.json`, `sw.js` | szkielet PWA, wygląd, tryb offline, push |
| `app.js`, `ui.js` | start, nawigacja, wspólne komponenty |
| `db.js`, `sync.js` | lokalna baza (IndexedDB) i synchronizacja z Supabase |
| `logic.js` | daty, dekalog, progresja, trend wagi, statystyki (bez AI) |
| `today.js` | ekran Dziś, poranek, medytacja, wieczór, karta dnia |
| `focus.js` | Deep Work |
| `training.js` | plan tygodnia, szablony, tryb treningu, podsumowania |
| `calendar.js`, `reports.js`, `more.js`, `chat.js` | pozostałe moduły |
| `supabase-*.sql/ts` | baza i funkcje serwerowe |

Biblioteki: Preact + htm, supabase-js (pliki lokalne). Fonty: Anton, Inter (lokalne, SIL OFL). Brak etapu budowania: pliki działają bezpośrednio.

Po każdej aktualizacji podbij `CACHE` w `sw.js` (np. `mrcnk-v2`), żeby telefon pobrał nową wersję.
