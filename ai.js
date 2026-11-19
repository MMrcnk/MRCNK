// MRCNK – AI: bezpośrednio z kluczem Anthropic (zapisanym tylko na tym urządzeniu) albo przez funkcję Supabase
import * as sync from './sync.js';

export const aiKey = () => localStorage.getItem('mrcnk_ai_key') || '';
export const aiModel = () => localStorage.getItem('mrcnk_ai_model') || 'claude-sonnet-5-5';
export const aiReady = () => !!aiKey() || !!sync.getUser();

const RULES = `Zasady:
- Każdy wniosek musi wynikać z danych, które dostałeś. Przy każdym wniosku napisz krótko, na czym się opiera (np. „5 z 7 wieczorów”, „Deep Work 9 h vs 14 h”).
- Oddzielaj FAKTY (wprost z liczb) od PRZYPUSZCZEŃ (oznacz słowem „Przypuszczenie:”).
- Nie wymyślaj liczb, wyników ani badań naukowych. Nie powołuj się na konkretne publikacje.
- Nie diagnozuj zdrowia. Przy niepokojących sygnałach (sen, zmęczenie) zasugeruj obserwację lub konsultację, bez diagnozy.
- Bez motywacyjnych przemówień, bez oceniania charakteru, bez emoji. Konkretnie, po męsku, krótko.
- Pisz po polsku, zwracaj się na „Ty”. Bez markdown (bez gwiazdek i #).`;

const APP = 'Aplikacja MRCNK: dekalog 10 zasad, Deep Work (sesje pracy głębokiej z zadaniami, pauzy z powodami), trening siłowy i Muay Thai, waga (cel masy), kalorie, woda, suplementy, samopoczucie, wieczorne analizy Top G / Bottom G i postanowienie na jutro.';

function system(body) {
  if (body.mode === 'day') return `Jesteś analitykiem osobistych danych. ${APP}
Przeanalizuj JEDEN dzień na tle wczoraj i ostatnich 7 dni. Układ odpowiedzi (nagłówki dużymi literami):
DZIŚ W LICZBACH (2–3 zdania: co wyszło, co nie)
CO ZADZIAŁAŁO
CO NIE ZADZIAŁAŁO (konkretnie, z liczbami; uwzględnij powody pauz i przerwań Deep Work)
JUTRO – 1 DO 3 KONKRETNYCH DZIAŁAŃ
Maksymalnie ok. 150 słów.
${RULES}`;
  if (body.mode === 'report') return `Jesteś analitykiem osobistych danych. ${APP}
Przygotuj ${body.kind === 'week' ? 'tygodniowe' : 'miesięczne'} podsumowanie. Układ (nagłówki dużymi literami):
CO POPRAWIŁEŚ
CO ZROBIŁEŚ DOBRZE
NAJWIĘKSZY PROBLEM
POWTARZAJĄCE SIĘ BŁĘDY (z wpisów Bottom G, powodów pauz i przerwań)
POSTANOWIENIA (realizacja)
TRENING I CIAŁO (progres, waga vs cel, regularność)
NA CO UWAŻAĆ
MAKS. 3 RZECZY NA KOLEJNY ${body.kind === 'week' ? 'TYDZIEŃ' : 'MIESIĄC'} (konkretne działania)
Na końcu jedna linia z liczbami: godziny Deep Work, treningi, średni dekalog, zmiana wagi.
${RULES}`;
  return `Jesteś asystentem w osobistej aplikacji MRCNK. Użytkownik pisze lub dyktuje notatki, prosi o zmiany w danych albo pyta o swoje wyniki.
Masz kontekst danych użytkownika (JSON) poniżej. Odpowiadasz WYŁĄCZNIE poprawnym JSON-em, bez żadnego tekstu wokół:
{"reply":"krótka odpowiedź po polsku","actions":[...]}
Dostępne akcje (używaj tylko gdy użytkownik o to prosi lub podaje dane do zapisania; daty RRRR-MM-DD, "dziś" = ${body.context?.today}):
{"type":"add_note","text":"..."}
{"type":"add_task","title":"...","date":"RRRR-MM-DD"}
{"type":"complete_task","title":"fragment nazwy","date":"RRRR-MM-DD"}
{"type":"move_task","title":"fragment nazwy","from":"RRRR-MM-DD","to":"RRRR-MM-DD"}
{"type":"set_weight","kg":70.8,"date":"RRRR-MM-DD"}
{"type":"add_kcal","kcal":800,"name":"...","date":"RRRR-MM-DD"}
{"type":"add_water","ml":500,"date":"RRRR-MM-DD"}
Jeśli użytkownik dzieli się przemyśleniem bez prośby – zaproponuj akcję add_note z jego słowami.
Użytkownik zatwierdza każdą akcję ręcznie, więc w "reply" nie pisz, że już zapisałeś – napisz, co proponujesz.
Na pytania o dane odpowiadaj tylko na podstawie kontekstu; jeśli czegoś nie ma, powiedz to.
${RULES}
KONTEKST:
${JSON.stringify(body.context)}`;
}

function parseChat(raw) {
  let out = {};
  try { out = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim()); }
  catch { const m = raw.match(/\{[\s\S]*\}/); try { out = m ? JSON.parse(m[0]) : { reply: raw }; } catch { out = { reply: raw }; } }
  return { reply: out.reply || '', actions: Array.isArray(out.actions) ? out.actions : [] };
}

async function direct(body, key) {
  let messages;
  if (body.mode === 'chat') {
    messages = (body.messages || []).filter((m) => m.content).slice(-16);
    while (messages.length && messages[0].role !== 'user') messages.shift();
  } else messages = [{ role: 'user', content: 'Dane (JSON):\n' + JSON.stringify(body) }];
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'content-type': 'application/json' },
      body: JSON.stringify({ model: aiModel(), max_tokens: body.mode === 'report' ? 1600 : 900, system: system(body), messages }),
    });
  } catch { throw new Error('Brak połączenia z AI (internet?).'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || 'Błąd AI ' + r.status;
    if (r.status === 401) throw new Error('Nieprawidłowy klucz API – sprawdź w Więcej → AI.');
    if (/credit|billing|balance/i.test(msg)) throw new Error('Brak środków na koncie Anthropic (Billing).');
    throw new Error(msg);
  }
  const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  return body.mode === 'chat' ? parseChat(text) : { text };
}

export async function askAI(body) {
  const key = aiKey();
  if (key) return direct(body, key);
  if (sync.getUser()) return sync.invoke('ai', body);
  throw new Error('AI nie jest skonfigurowane. Wejdź w Więcej → AI i wklej klucz API.');
}
