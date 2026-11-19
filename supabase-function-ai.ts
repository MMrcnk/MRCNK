// MRCNK – Supabase Edge Function "ai"
// Supabase → Edge Functions → Deploy a new function → nazwa: ai → wklej ten plik → Deploy
// Secrets: ANTHROPIC_API_KEY (wymagany), ANTHROPIC_MODEL (opcjonalny, domyślnie claude-sonnet-5-5)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const RULES = `Zasady:
- Każdy wniosek musi wynikać z danych, które dostałeś. Przy każdym wniosku napisz krótko, na czym się opiera (np. „5 z 7 wieczorów”, „Deep Work 9 h vs 14 h”).
- Oddzielaj FAKTY (wprost z liczb) od PRZYPUSZCZEŃ (oznacz słowem „Przypuszczenie:”).
- Nie wymyślaj liczb, wyników ani badań naukowych. Nie powołuj się na konkretne publikacje.
- Nie diagnozuj zdrowia. Przy niepokojących sygnałach (sen, zmęczenie) zasugeruj obserwację lub konsultację, bez diagnozy.
- Bez motywacyjnych przemówień, bez oceniania charakteru, bez emoji. Konkretnie, po męsku, krótko.
- Pisz po polsku, zwracaj się na „Ty”.`;

async function claude(system: string, messages: { role: string; content: string }[], maxTokens = 1200) {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Brak sekretu ANTHROPIC_API_KEY w Supabase (Edge Functions → Secrets).');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5', max_tokens: maxTokens, system, messages }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Błąd API Anthropic');
  return (j.content || []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json();

    if (body.mode === 'day') {
      const system = `Jesteś analitykiem osobistych danych w aplikacji MRCNK. Przeanalizuj JEDEN dzień na tle wczoraj i ostatnich 7 dni. Układ: DZIŚ W LICZBACH, CO ZADZIAŁAŁO, CO NIE ZADZIAŁAŁO, JUTRO – 1 DO 3 KONKRETNYCH DZIAŁAŃ. Maks. ok. 150 słów.\n${RULES}`;
      const text = await claude(system, [{ role: 'user', content: 'Dane (JSON):\n' + JSON.stringify(body) }], 900);
      return json({ text });
    }

    if (body.mode === 'report') {
      const system = `Jesteś analitykiem osobistych danych w aplikacji MRCNK (dekalog, Deep Work, trening siłowy i Muay Thai, waga, dieta, sen, wieczorne analizy Top G / Bottom G).
Przygotuj ${body.kind === 'week' ? 'tygodniowe' : 'miesięczne'} podsumowanie. Odpowiedz w tym układzie (nagłówki dużymi literami, bez markdown):
CO POPRAWIŁEŚ
CO ZROBIŁEŚ DOBRZE
NAJWIĘKSZY PROBLEM
POWTARZAJĄCE SIĘ BŁĘDY (z wpisów Bottom G i powodów przerwań)
POSTANOWIENIA (realizacja)
NA CO UWAŻAĆ
MAKS. 3 RZECZY NA KOLEJNY ${body.kind === 'week' ? 'TYDZIEŃ' : 'MIESIĄC'} (konkretne działania)
Na końcu jedna linia z liczbami: godziny Deep Work, treningi, średni dekalog, zmiana wagi.
${RULES}`;
      const text = await claude(system, [{ role: 'user', content: 'Dane okresu (JSON):\n' + JSON.stringify(body) }], 1600);
      return json({ text });
    }

    if (body.mode === 'chat') {
      const system = `Jesteś asystentem w osobistej aplikacji MRCNK. Użytkownik pisze lub dyktuje notatki, prosi o zmiany w danych albo pyta o swoje wyniki.
Masz kontekst danych użytkownika (JSON) poniżej. Odpowiadasz WYŁĄCZNIE poprawnym JSON-em, bez żadnego tekstu wokół:
{"reply":"krótka odpowiedź po polsku","actions":[...]}
Dostępne akcje (używaj tylko gdy użytkownik o to prosi lub podaje dane do zapisania; daty w formacie RRRR-MM-DD, "dziś" = ${body.context?.today}):
{"type":"add_note","text":"..."}
{"type":"add_task","title":"...","date":"RRRR-MM-DD"}
{"type":"complete_task","title":"fragment nazwy","date":"RRRR-MM-DD"}
{"type":"move_task","title":"fragment nazwy","from":"RRRR-MM-DD","to":"RRRR-MM-DD"}
{"type":"set_weight","kg":70.8,"date":"RRRR-MM-DD"}
{"type":"add_kcal","kcal":800,"name":"...","date":"RRRR-MM-DD"}
{"type":"add_water","ml":500,"date":"RRRR-MM-DD"}
{"type":"set_sleep","hours":7.5,"quality":4,"date":"RRRR-MM-DD"}
Jeśli użytkownik dzieli się przemyśleniem bez prośby – zaproponuj akcję add_note z jego słowami.
Użytkownik zatwierdza każdą akcję ręcznie, więc w "reply" nie pisz, że już zapisałeś – napisz, co proponujesz.
Na pytania o dane odpowiadaj tylko na podstawie kontekstu; jeśli czegoś nie ma w kontekście, powiedz to.
${RULES}
KONTEKST:
${JSON.stringify(body.context)}`;
      const msgs = (body.messages || []).filter((m: { content: string }) => m.content).slice(-16);
      while (msgs.length && msgs[0].role !== 'user') msgs.shift();
      const raw = await claude(system, msgs, 900);
      let out: { reply?: string; actions?: unknown[] } = {};
      try { out = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim()); }
      catch { const m = raw.match(/\{[\s\S]*\}/); try { out = m ? JSON.parse(m[0]) : { reply: raw }; } catch { out = { reply: raw }; } }
      return json({ reply: out.reply || '', actions: Array.isArray(out.actions) ? out.actions : [] });
    }

    return json({ error: 'Nieznany tryb' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
