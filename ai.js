// MRCNK – AI: bezpośrednio z kluczem Anthropic (zapisanym tylko na tym urządzeniu) albo przez funkcję Supabase
import * as sync from './sync.js';
import * as db from './db.js';

export const aiKey = () => localStorage.getItem('mrcnk_ai_key') || '';
export const aiProvider = (key = aiKey()) => (key.startsWith('sk-ant-') ? 'anthropic' : key ? 'openai' : null);
export const DEFAULT_MODEL = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-6.1-terra' };
export const aiModel = () => localStorage.getItem('mrcnk_ai_model') || DEFAULT_MODEL[aiProvider()] || '';
export const aiReady = () => !!aiKey() || !!sync.getUser();

const RULES = `Zasady:
- Każdy wniosek musi wynikać z danych, które dostałeś. Przy każdym wniosku napisz krótko, na czym się opiera (np. „5 z 7 wieczorów”, „Deep Work 9 h vs 14 h”).
- Oddzielaj FAKTY (wprost z liczb) od PRZYPUSZCZEŃ (oznacz słowem „Przypuszczenie:”).
- Nie wymyślaj liczb, wyników ani badań naukowych. Nie powołuj się na konkretne publikacje.
- Nie diagnozuj zdrowia. Przy niepokojących sygnałach (sen, zmęczenie) zasugeruj obserwację lub konsultację, bez diagnozy.
- Bez motywacyjnych przemówień, bez oceniania charakteru, bez emoji. Konkretnie, po męsku, krótko.
- Pisz po polsku, zwracaj się na „Ty”. Bez markdown (bez gwiazdek i #).`;

const APP = 'Aplikacja MRCNK: dekalog 10 zasad, Deep Work (sesje pracy głębokiej z zadaniami, pauzy z powodami), trening siłowy i Muay Thai, waga (cel masy), kalorie, woda, suplementy, samopoczucie, wieczorne analizy Top G / Bottom G i postanowienie na jutro.';

export const userPrompt = () => ((db.get('settings') || {}).aiPrompt || '').trim();

function system(body) {
  const up = userPrompt();
  const base = baseSystem(body, !!up);
  if (!up) return base;
  return `INSTRUKCJE UŻYTKOWNIKA (obowiązują zawsze; dane z aplikacji mają pierwszeństwo przed danymi początkowymi z instrukcji):
${up}

========================
ZADANIE W TYM ZAPYTANIU:
${base}`;
}

function baseSystem(body, hasUser) {
  if (body.mode === 'workout') return `${APP}
Jesteś trenerem siłowym. Użytkownik jest na siłowni i zaczyna (lub jest w trakcie) treningu „${body.workout}”.
Na podstawie historii każdego ćwiczenia (ostatnie sesje: ciężar, powtórzenia, RIR), planu (serie, zakres powtórzeń, RIR), serii już zrobionych dziś, zmęczenia i obciążenia z innych treningów (np. Muay Thai) zaproponuj na DZIŚ dla każdego ćwiczenia: ciężar i docelowe powtórzenia w każdej serii.
Zasady: podwójna progresja (najpierw powtórzenia do górnej granicy we wszystkich seriach, potem ciężar o najmniejszy skok – pole increment; przy hantlach ciężar na 1 hantlę), nie zwiększaj ciężaru przy oznakach zmęczenia lub spadku wyników, przy braku historii zaproponuj ostrożny start i napisz to wprost. „appSuggestion” to sugestia algorytmu aplikacji – możesz się z nią zgodzić albo uzasadnić inną.
Odpowiedz WYŁĄCZNIE poprawnym JSON-em:
{"summary":"1–3 zdania o dzisiejszym treningu (np. czy cisnąć, czy uważać na regenerację)","exercises":[{"name":"dokładna nazwa z danych","weight":24,"reps":[10,9,8],"rir":"1–2","note":"krótko dlaczego"}]}
Liczba elementów w reps = liczba serii z planu. ${RULES}`;
  if (body.mode === 'day') return `Jesteś analitykiem osobistych danych. ${APP}
Przeanalizuj JEDEN dzień na tle wczoraj i ostatnich 7 dni. Układ odpowiedzi (nagłówki dużymi literami):
DZIŚ W LICZBACH (2–3 zdania: co wyszło, co nie)
CO ZADZIAŁAŁO
CO NIE ZADZIAŁAŁO (konkretnie, z liczbami; uwzględnij powody pauz i przerwań Deep Work)
JUTRO – 1 DO 3 KONKRETNYCH DZIAŁAŃ
Maksymalnie ok. 150 słów.
${RULES}`;
  if (body.mode === 'report' && hasUser) return `${APP}
Przygotuj ${body.kind === 'week' ? 'podsumowanie tygodniowe według sekcji „Podsumowania tygodniowe”' : 'podsumowanie miesięczne według sekcji „Podsumowania miesięczne”'} z instrukcji użytkownika, na podstawie danych z zapytania.
Nagłówki pisz jako osobne linie dużymi literami, bez gwiazdek i # (aplikacja nie wyświetla markdown).
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

function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim()); }
  catch { const m = raw.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } }
}
function post(body, text) {
  if (body.mode === 'chat') return parseChat(text);
  if (body.mode === 'workout') {
    const j = parseJSON(text);
    if (!j || !Array.isArray(j.exercises)) throw new Error('AI zwróciło nieczytelną odpowiedź – spróbuj ponownie.');
    return { summary: j.summary || '', exercises: j.exercises.map((e) => ({ name: e.name, weight: typeof e.weight === 'number' ? e.weight : parseFloat(String(e.weight || '').replace(',', '.')) || null, reps: (e.reps || []).map(Number).filter((n) => n > 0), rir: e.rir ?? null, note: e.note || '' })) };
  }
  return { text };
}

function parseChat(raw) {
  let out = {};
  try { out = JSON.parse(raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim()); }
  catch { const m = raw.match(/\{[\s\S]*\}/); try { out = m ? JSON.parse(m[0]) : { reply: raw }; } catch { out = { reply: raw }; } }
  return { reply: out.reply || '', actions: Array.isArray(out.actions) ? out.actions : [] };
}

async function directOpenAI(body, key, messages) {
  let r;
  try {
    r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({ model: aiModel(), max_completion_tokens: 6000, messages: [{ role: 'system', content: system(body) }, ...messages] }),
    });
  } catch { throw new Error('Brak połączenia z AI (internet?).'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || 'Błąd AI ' + r.status;
    if (r.status === 401) throw new Error('Nieprawidłowy klucz OpenAI – sprawdź w Więcej → AI.');
    if (r.status === 429 && /quota|billing/i.test(msg)) throw new Error('Brak środków na koncie OpenAI (Billing).');
    if (/model/i.test(msg) && r.status === 404) throw new Error('Model „' + aiModel() + '” niedostępny – zmień nazwę modelu w Więcej → AI.');
    throw new Error(msg);
  }
  const text = ((j.choices || [])[0]?.message?.content || '').trim();
  if (!text) throw new Error('AI zwróciło pustą odpowiedź – spróbuj ponownie.');
  return post(body, text);
}

async function direct(body, key) {
  let messages;
  if (body.mode === 'chat') {
    messages = (body.messages || []).filter((m) => m.content).slice(-16);
    while (messages.length && messages[0].role !== 'user') messages.shift();
  } else messages = [{ role: 'user', content: 'Dane (JSON):\n' + JSON.stringify(body) }];
  if (aiProvider(key) === 'openai') return directOpenAI(body, key, messages);
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
  return post(body, text);
}

export async function askAI(body) {
  const key = aiKey();
  if (key) return direct(body, key);
  if (sync.getUser()) return sync.invoke('ai', body);
  throw new Error('AI nie jest skonfigurowane. Wejdź w Więcej → AI i wklej klucz API.');
}
