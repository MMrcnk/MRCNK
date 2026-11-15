// MRCNK – chat AI: notatki, zmiany danych (zawsze po potwierdzeniu), pytania o dane
import { html, useState, useEffect, useRef, useDB, nav, toast, Icon, Head, registerScreen } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';
import * as sync from './sync.js';

const { fmt1, fmt0, fmtHM } = L;

function snapshot() {
  const t = L.todayKey();
  const s = L.settings();
  const w = L.periodStats(L.addDays(t, -6), t);
  const m = L.periodStats(L.monthStart(t), t);
  const dayInfo = (d) => ({
    date: d, dekalog: L.dekalogScore(d).done, focusMin: Math.round(L.focusTotal(d)), weight: L.weightOn(d), kcal: L.kcalOn(d), waterMl: L.waterOn(d),
    tasks: L.tasksOn(d).map((x) => ({ title: x.title, done: !!x.done })), trainings: L.slotsOn(d).map((sl) => ({ name: sl.name, status: (L.sessionFor(d, sl.key) || {}).status || 'zaplanowany' })),
  });
  const ex = db.all('exercise').map((e) => { const h = L.exerciseHistory(e.id); const l = h[h.length - 1]; return { name: e.name, last: l ? { date: l.date, sets: l.sets.map((x) => `${x.w}x${x.reps}`).join(' '), e1rm: Math.round(l.best * 10) / 10 } : null, sessions: h.length }; });
  return {
    today: t, weekday: L.DOW[L.isoDow(t)], now: L.nowHM(),
    goals: { weightTarget: s.weightTarget, weightDeadline: s.weightDeadline, kcal: s.kcalTarget, waterMl: s.waterTarget, focusDailyMin: s.focusDailyMin },
    dekalog: (s.dekalog || []).map((r) => r.short),
    days: [dayInfo(L.addDays(t, -1)), dayInfo(t), dayInfo(L.addDays(t, 1))],
    last7: { dekalogAvg: w.dekalogAvg, focusMin: Math.round(w.focusMin), interrupted: w.interrupted, tasks: `${w.tasksDone}/${w.tasksPlanned}`, trainings: `${w.slotsDone}/${w.slotsPlanned}`, weightAvg: w.weightAvg, sleepAvg: w.sleepAvg, kcalAvg: w.kcalAvg },
    month: { focusMin: Math.round(m.focusMin), dekalogAvg: m.dekalogAvg, trainings: `${m.slotsDone}/${m.slotsPlanned}`, weightAvg: m.weightAvg },
    weightTrend: L.weightTrend(t),
    exercises: ex,
    longGoals: db.all('goal').map((g) => g.title),
  };
}

export function applyAction(a) {
  const t = L.todayKey();
  const d = a.date || t;
  switch (a.type) {
    case 'add_note': db.patch('note', null, { text: a.text, at: Date.now(), date: t, source: 'chat' }); return 'Zapisano notatkę';
    case 'add_task': db.patch('task', null, { title: a.title, date: d, order: 999, done: false, createdAt: Date.now() }); return `Dodano zadanie na ${L.fmtShort(d)}`;
    case 'complete_task': { const x = db.all('task').find((y) => y.date === d && y.title.toLowerCase().includes(String(a.title || '').toLowerCase())); if (!x) return 'Nie znalazłem zadania'; db.patch('task', x.id, { done: true, doneAt: Date.now() }); return 'Odhaczono: ' + x.title; }
    case 'move_task': { const x = db.all('task').find((y) => y.date === (a.from || t) && y.title.toLowerCase().includes(String(a.title || '').toLowerCase())); if (!x) return 'Nie znalazłem zadania'; db.patch('task', x.id, { date: a.to, moved: (x.moved || 0) + 1 }); return `Przeniesiono na ${L.fmtShort(a.to)}`; }
    case 'set_weight': db.patch('weight', 'w:' + d, { date: d, kg: Number(a.kg) }); return `Waga ${fmt1(a.kg)} kg (${L.fmtShort(d)})`;
    case 'add_kcal': db.patch('food', null, { date: d, kcal: Math.round(a.kcal), name: a.name || '', p: a.p ?? null, f: a.f ?? null, c: a.c ?? null, at: Date.now() }); return `+${Math.round(a.kcal)} kcal`;
    case 'add_water': L.setDay(d, { waterMl: L.waterOn(d) + Math.round(a.ml) }); return `+${Math.round(a.ml)} ml wody`;
    case 'set_sleep': L.setDay(d, { sleepH: a.hours ?? L.day(d).sleepH, sleepQ: a.quality ?? L.day(d).sleepQ }); return 'Zapisano sen';
    default: return 'Nieznana akcja';
  }
}
const describe = (a) => ({
  add_note: () => `Notatka: „${a.text}”`,
  add_task: () => `Zadanie na ${L.fmtShort(a.date || L.todayKey())}: „${a.title}”`,
  complete_task: () => `Odhacz zadanie: „${a.title}”`,
  move_task: () => `Przenieś „${a.title}” na ${L.fmtShort(a.to)}`,
  set_weight: () => `Waga ${fmt1(a.kg)} kg (${L.fmtShort(a.date || L.todayKey())})`,
  add_kcal: () => `+${Math.round(a.kcal)} kcal${a.name ? ' – ' + a.name : ''}`,
  add_water: () => `+${Math.round(a.ml)} ml wody`,
  set_sleep: () => `Sen: ${a.hours ?? '–'} h${a.quality ? ', jakość ' + a.quality + '/5' : ''}`,
}[a.type] || (() => a.type))();

function Chat() {
  useDB();
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef();
  const msgs = db.all('chat').sort((a, b) => a.at - b.at).slice(-80);
  useEffect(() => { end.current && end.current.scrollIntoView({ block: 'end' }); }, [msgs.length, busy]);
  const send = async () => {
    const text = txt.trim(); if (!text || busy) return;
    setTxt('');
    db.patch('chat', null, { role: 'user', text, at: Date.now() });
    if (!sync.getUser()) {
      db.patch('note', null, { text, at: Date.now(), date: L.todayKey(), source: 'chat' });
      db.patch('chat', null, { role: 'ai', text: 'Zapisałem to jako notatkę. Żebym mógł odpowiadać i zmieniać dane, połącz konto i funkcję AI (Więcej → Konto).', at: Date.now() + 1 });
      return;
    }
    setBusy(true);
    try {
      const history = db.all('chat').sort((a, b) => a.at - b.at).slice(-16).map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res = await sync.invoke('ai', { mode: 'chat', messages: history, context: snapshot() });
      db.patch('chat', null, { role: 'ai', text: res.reply || '…', actions: (res.actions || []).map((a) => ({ ...a, state: 'pending' })), at: Date.now() });
    } catch (e) {
      db.patch('chat', null, { role: 'ai', text: 'Nie udało się połączyć z AI: ' + e.message, at: Date.now() });
    }
    setBusy(false);
  };
  const decide = (m, i, ok) => {
    const acts = m.actions.map((a, j) => (j === i ? { ...a, state: ok ? 'done' : 'rejected', result: ok ? applyAction(a) : null } : a));
    db.patch('chat', m.id, { actions: acts });
  };
  return html`<div class="page" style="padding-bottom:calc(120px + var(--safe-b));min-height:100vh">
    <${Head} title="Chat" sub="Notatki, zmiany, pytania o Twoje dane" right=${msgs.length ? html`<button type="button" class="btn xs b-ghost" onClick=${() => msgs.forEach((m) => db.remove(m.id))}>Wyczyść</button>` : null} />
    ${!msgs.length ? html`<div class="card"><div class="small mut" style="line-height:1.5">Przykłady:<br/>„Zapisz notatkę: po dwóch sesjach spada mi koncentracja”<br/>„Dodaj na jutro zadanie: oferta dla klienta”<br/>„Zmień dzisiejszą wagę na 70,8”<br/>„Ile średnio pracowałem w tym miesiącu?”<br/><br/>Głos: tapnij mikrofon na klawiaturze iPhone'a i mów. Każdą zmianę danych zatwierdzasz ręcznie.</div></div>` : null}
    <div class="col" style="gap:10px">
      ${msgs.map((m) => html`<div class=${'chat-msg ' + (m.role === 'user' ? 'chat-me' : 'chat-ai')}>${m.text}
        ${(m.actions || []).map((a, i) => html`<div class="col" style="gap:8px;margin-top:10px;background:var(--bg);border:1px solid var(--line3);border-radius:12px;padding:10px">
          <div class="small" style="font-weight:600">${describe(a)}</div>
          ${a.state === 'pending' ? html`<div class="g2"><button type="button" class="btn xs b-acc" onClick=${() => decide(m, i, true)}>Zatwierdź</button><button type="button" class="btn xs b-ghost" onClick=${() => decide(m, i, false)}>Odrzuć</button></div>`
            : html`<div class=${'xs ' + (a.state === 'done' ? 'up' : 'mut2')}>${a.state === 'done' ? '✓ ' + (a.result || 'Zrobione') : 'Odrzucone'}</div>`}
        </div>`)}
      </div>`)}
      ${busy ? html`<div class="chat-msg chat-ai mut">…</div>` : null}
      <div ref=${end}></div>
    </div>
    <div style="position:fixed;left:0;right:0;bottom:0;z-index:62;background:rgba(14,14,16,.96);border-top:1px solid var(--line2);padding:10px 12px calc(10px + var(--safe-b))">
      <div class="row" style="gap:8px;max-width:720px;margin:0 auto">
        <textarea rows="1" style="min-height:48px;max-height:140px" placeholder="Napisz albo podyktuj…" value=${txt} onInput=${(e) => setTxt(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}></textarea>
        <button type="button" class="btn b-acc" style="width:52px;padding:0;height:48px" aria-label="Wyślij" disabled=${busy || !txt.trim()} onClick=${send}><${Icon} n="send" /></button>
      </div>
    </div>
  </div>`;
}
registerScreen('chat', Chat);
