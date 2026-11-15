// MRCNK – logika: daty, ustawienia, dekalog, harmonogram, progresja, statystyki (bez AI)
import * as db from './db.js';

// ---------- daty ----------
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const isoDow = (s) => (parse(s).getDay() + 6) % 7; // 0 = pon
export const weekStart = (s) => addDays(s, -isoDow(s));
export const monthStart = (s) => s.slice(0, 8) + '01';
export const monthEnd = (s) => { const d = parse(monthStart(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return ymd(d); };
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export function range(from, to) { const out = []; for (let d = from; d <= to; d = addDays(d, 1)) out.push(d); return out; }
export const hm = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const nowHM = () => hm(Date.now());

export const DOW = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
export const DOW_S = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
export const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
export const MONTHS_N = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
export const fmtDate = (s) => { const d = parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtShort = (s) => { const d = parse(s); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`; };

export function todayKey() {
  const b = settings().dayBoundaryHour ?? 4;
  const d = new Date(Date.now() - b * 3600000);
  return ymd(d);
}

// ---------- liczby ----------
export const num = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
export const fmt1 = (n) => (n == null || !isFinite(n) ? '–' : (Math.round(n * 10) / 10).toString().replace('.', ','));
export const fmt0 = (n) => (n == null || !isFinite(n) ? '–' : Math.round(n).toString());
export const fmtMin = (m) => { if (m == null) return '–'; m = Math.round(m); const h = Math.floor(m / 60); return h ? `${h} h ${pad(m % 60)} min` : `${m} min`; };
export const fmtHM = (m) => { m = Math.max(0, Math.round(m || 0)); return `${Math.floor(m / 60)}:${pad(m % 60)}`; };
export const avg = (a) => { const v = a.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
export const sum = (a) => a.reduce((s, x) => s + (x || 0), 0);

// ---------- ustawienia domyślne ----------
export const DEKALOG_DEFAULT = [
  { id: 'd1', short: 'Pobudka 7:00 za 1 budzikiem', text: 'Wstaję codziennie o 7:00 za 1 budzikiem', auto: 'wake' },
  { id: 'd2', short: 'Deep Work 90 min bez rozproszeń', text: 'Rozpisuję zadania które zrobię w trakcie sesji pracy głębokiej, od najważniejszego do najmniej ważnego, ustawiam timer na 90 minut i bez żadnych rozproszeń wykonuję zadanie jedno po drugim.', auto: 'focus' },
  { id: 'd3', short: 'Każde zadanie z wieczornego planu', text: 'Codziennie wieczorem wypisuję zadania które zrobię, i następnego dnia wykonuję KAŻDE z nich.', auto: 'tasks' },
  { id: 'd4', short: 'Nie odpuszczam żadnej okazji', text: 'Nie odpuszczam ani jednej okazji, każdą wykorzystuję ze 100% zaangażowaniem', auto: null },
  { id: 'd5', short: '100% zaangażowania w każde działanie', text: 'Angażuję się w 100% w każde działanie które robię, nawet pomimo małych szans na efekty, długotrwałego braku efektów i braku chęci.', auto: null },
  { id: 'd6', short: '22:30 ekrany off, 23:00 światło', text: '22:30 odkładam telefon i wyłączam wszystkie ekrany, biorę melatoninę. 23:00 gaszę światło', auto: null, nextMorning: true },
  { id: 'd7', short: '100% planu treningowego', text: 'Trzymam się planu treningowego w 100%, nie odpuszczam ani jednego zaplanowanego treningu', auto: 'training' },
  { id: 'd8', short: 'Kreatyna', text: 'Codziennie biorę kreatynę', auto: 'creatine' },
  { id: 'd9', short: 'Zero scrollowania social mediów', text: 'Nie siedzę i nie sprawdzam social mediów, nie obserwuję życia innych. Wyjątek: Dziewczyny lub biznes.', auto: null },
  { id: 'd10', short: '3 l wody', text: 'Piję 3L wody dziennie', auto: 'water' },
];

export const AUTO_LABEL = { wake: 'poranek', focus: 'Deep Work', tasks: 'zadania', training: 'treningi', creatine: 'suplementy', water: 'woda' };

export const SETTINGS_DEFAULT = {
  dayBoundaryHour: 4,
  wakeTarget: '07:00',
  wakeTolerance: 0,
  eveningHour: 18,
  meditationMin: 5,
  focusDefaultMin: 90,
  graceSec: 15,
  weightTarget: 90,
  weightStart: 70.5,
  heightCm: 179,
  weightDeadline: '2028-05-15',
  kcalTarget: 3200,
  proteinTarget: null,
  fatTarget: null,
  carbsTarget: null,
  waterTarget: 3000,
  focusDailyMin: 180,
  focusWeeklyMin: null,
  dekalog: DEKALOG_DEFAULT,
  morning: [
    { id: 'wake', label: 'Wstałem za 1 budzikiem', kind: 'wake' },
    { id: 'glass', label: 'Szklanka wody', kind: 'water', ml: 250 },
    { id: 'weight', label: 'Waga', kind: 'weight' },
    { id: 'med', label: 'Medytacja · Wizja', kind: 'meditation' },
  ],
  notify: {
    morning: { on: false, time: '07:05', text: 'Waga, woda, medytacja.' },
    creatine: { on: false, time: '09:00', text: 'Kreatyna.' },
    focus: { on: false, time: '08:30', text: 'Start pierwszej sesji Deep Work.' },
    evening: { on: false, time: '21:30', text: 'Podsumowanie dnia i zadania na jutro.' },
    screens: { on: false, time: '22:25', text: '22:30 – telefon odkładasz. Melatonina.' },
    weekly: { on: false, time: '20:00', text: 'Przegląd tygodnia.' },
  },
};

export function settings() {
  const s = db.get('settings') || {};
  return { ...SETTINGS_DEFAULT, ...s, notify: { ...SETTINGS_DEFAULT.notify, ...(s.notify || {}) } };
}
export const setSettings = (fields) => db.patch('settings', 'settings', fields);

export function seedDefaults() {
  const T = { ts: 1 };
  db.patch('settings', 'settings', { startedOn: ymd(new Date(Date.now() - 4 * 3600000)) }, T);
  db.patch('supplement', 'sup:kreatyna', { name: 'Kreatyna', order: 1, active: true }, T);
  db.patch('supplement', 'sup:melatonina', { name: 'Melatonina', order: 2, active: true }, T);
  const wk = [['wk:gora-a', 'Góra A'], ['wk:gora-b', 'Góra B'], ['wk:nogi', 'Nogi'], ['wk:gora-c', 'Góra C']];
  wk.forEach(([id, name], i) => db.patch('workout', id, { name, kind: 'strength', exercises: [], order: i }, T));
  db.patch('workout', 'wk:muay-thai', { name: 'Muay Thai', kind: 'simple', defaultMin: 90, order: 10 }, T);
  const mt = (k) => ({ key: k, label: 'Wieczór', name: 'Muay Thai', kind: 'simple', workoutId: 'wk:muay-thai' });
  const st = (id, name) => ({ key: 'r', label: 'Rano', name, kind: 'strength', workoutId: id });
  db.patch('schedule', 'schedule', {
    versions: [{
      from: '2000-01-01',
      days: [[mt('w')], [st('wk:gora-a', 'Góra A'), mt('w')], [mt('w')], [st('wk:gora-b', 'Góra B'), mt('w')], [mt('w')], [st('wk:nogi', 'Nogi')], [st('wk:gora-c', 'Góra C')]],
    }],
  }, T);
}

// ---------- dzień ----------
export const dayId = (d) => 'day:' + d;
export const day = (d) => db.get(dayId(d)) || {};
export const setDay = (d, fields) => db.patch('day', dayId(d), { date: d, ...fields });
export const setDayDeep = (d, key, sub, val) => { const cur = day(d)[key] || {}; setDay(d, { [key]: { ...cur, [sub]: val } }); };

export const weightOn = (d) => { const w = db.get('w:' + d); return w ? w.kg : null; };
export function lastWeight(before) {
  const ws = db.all('weight').filter((w) => !before || w.date <= before).sort((a, b) => (a.date < b.date ? 1 : -1));
  return ws[0] || null;
}
export function weightAvg7(d) {
  const vals = range(addDays(d, -6), d).map(weightOn).filter((x) => x != null);
  return avg(vals);
}

export const foodOn = (d) => db.all('food').filter((f) => f.date === d);
export const kcalOn = (d) => sum(foodOn(d).map((f) => f.kcal));
export const macrosOn = (d) => { const f = foodOn(d); return { p: sum(f.map((x) => x.p)), f: sum(f.map((x) => x.f)), c: sum(f.map((x) => x.c)) }; };
export const waterOn = (d) => day(d).waterMl || 0;

export const supplements = () => db.all('supplement').filter((s) => s.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));

export const tasksOn = (d) => db.all('task').filter((t) => t.date === d).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || 0) - (b.createdAt || 0));
export function ensureRecurring(d) {
  const dow = isoDow(d);
  db.all('taskrule').forEach((r) => {
    if (!r.active || !(r.days || []).includes(dow)) return;
    if (r.from && d < r.from) return;
    const id = 'tr:' + r.id + ':' + d;
    if (!db.get(id) && !(db.all('task').some((t) => t.ruleId === r.id && t.date === d))) {
      db.patch('task', id, { title: r.title, date: d, ruleId: r.id, order: -1 + (r.order || 0) / 100, done: false, createdAt: Date.now() });
    }
  });
}

export const focusOn = (d) => db.all('focus').filter((f) => f.date === d).sort((a, b) => a.start - b.start);
export function focusMin(f, now = Date.now()) {
  const end = f.status === 'running' ? (f.pausedAt || now) : (f.end || f.start);
  return Math.max(0, (end - f.start - (f.pausedMs || 0)) / 60000);
}
export const focusTotal = (d) => sum(focusOn(d).map((f) => focusMin(f)));

// ---------- harmonogram ----------
export function scheduleVersion(d) {
  const s = db.get('schedule');
  if (!s || !s.versions) return null;
  const vs = s.versions.filter((v) => v.from <= d).sort((a, b) => (a.from < b.from ? 1 : -1));
  return vs[0] || null;
}
export function slotsOn(d) {
  const ov = db.get('ov:' + d);
  if (ov && ov.slots) return ov.slots;
  const v = scheduleVersion(d);
  return v ? (v.days[isoDow(d)] || []) : [];
}
export const sessionsOn = (d) => db.all('session').filter((s) => s.date === d);
export const sessionFor = (d, key) => sessionsOn(d).find((s) => s.slotKey === key);

// ---------- dekalog ----------
export function wakeOk(d, s = settings()) {
  const w = day(d).wake;
  if (!w || !w.oneAlarm || !w.time) return false;
  const [th, tm] = s.wakeTarget.split(':').map(Number);
  const [h, m] = w.time.split(':').map(Number);
  return h * 60 + m <= th * 60 + tm + (s.wakeTolerance || 0);
}
export function focusOk(d) {
  return focusOn(d).some((f) => f.status === 'done' && focusMin(f) >= 89.5 && (f.taskIds || []).length > 0);
}
export function tasksOk(d) {
  const t = tasksOn(d);
  return t.length > 0 && t.every((x) => x.done);
}
export function trainingOk(d) {
  const slots = slotsOn(d);
  if (!slots.length) return true;
  return slots.every((sl) => { const s = sessionFor(d, sl.key); return s && s.status === 'done'; });
}
export function creatineOk(d) {
  const sup = supplements().find((s) => /kreatyn/i.test(s.name));
  if (!sup) return false;
  return !!(day(d).supps || {})[sup.id];
}
export const waterOk = (d, s = settings()) => waterOn(d) >= s.waterTarget;

const AUTO = { wake: wakeOk, focus: focusOk, tasks: tasksOk, training: trainingOk, creatine: creatineOk, water: waterOk };

export function ruleState(d, rule, s = settings()) {
  const man = (day(d).dek || {})[rule.id];
  if (man === true || man === false) return { ok: man, manual: true, auto: !!rule.auto };
  if (rule.auto && AUTO[rule.auto]) return { ok: AUTO[rule.auto](d, s), manual: false, auto: true };
  return { ok: null, manual: false, auto: false };
}
export function dekalogScore(d, s = settings()) {
  const rules = s.dekalog || DEKALOG_DEFAULT;
  const states = rules.map((r) => ruleState(d, r, s));
  return { done: states.filter((x) => x.ok === true).length, total: rules.length, states, rules };
}
export function setRule(d, ruleId, val) { const cur = day(d).dek || {}; setDay(d, { dek: { ...cur, [ruleId]: val } }); }

export function streakFull(today) {
  let n = 0;
  let d = dekalogScore(today).done === dekalogScore(today).total ? today : addDays(today, -1);
  for (let i = 0; i < 3650; i++) {
    const sc = dekalogScore(d);
    if (sc.done === sc.total && sc.total > 0) { n++; d = addDays(d, -1); } else break;
  }
  return n;
}
export function streakRule(today, rule) {
  let n = 0;
  let d = ruleState(today, rule).ok ? today : addDays(today, -1);
  for (let i = 0; i < 3650; i++) {
    if (ruleState(d, rule).ok) { n++; d = addDays(d, -1); } else break;
  }
  return n;
}
export function wakeStreak(today) {
  let n = 0;
  let d = day(today).wake?.oneAlarm ? today : addDays(today, -1);
  for (let i = 0; i < 3650; i++) { if (day(d).wake?.oneAlarm) { n++; d = addDays(d, -1); } else break; }
  return n;
}

// ---------- trening: progresja ----------
export const e1rm = (w, reps, rir) => (w && reps ? w * (1 + (reps + (rir || 0)) / 30) : 0);

export function exerciseHistory(exId, beforeDate) {
  const out = [];
  db.all('session').forEach((s) => {
    if (s.status !== 'done' || !s.exercises) return;
    if (beforeDate && s.date > beforeDate) return;
    s.exercises.forEach((e) => {
      if (e.exerciseId !== exId) return;
      const sets = (e.sets || []).filter((x) => x.done && x.reps > 0);
      if (!sets.length) return;
      const best = Math.max(...sets.map((x) => e1rm(x.w, x.reps, x.rir)));
      const vol = sum(sets.map((x) => (x.w || 0) * x.reps));
      out.push({ date: s.date, sessionId: s.id, at: s.startedAt || 0, sets, best, vol, note: e.note });
    });
  });
  return out.sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1));
}

export function suggestFor(plan, ex, history) {
  // plan: {sets, repMin, repMax, rir}; ex: {increment, perHand}
  const inc = ex && ex.increment ? ex.increment : (ex && ex.perHand ? 2 : 2.5);
  const last = history[history.length - 1];
  const sets = plan.sets || 3;
  if (!last) {
    return { w: null, reps: Array(sets).fill(plan.repMax || 10), text: `Pierwszy raz: dobierz ciężar na ${plan.repMin || 8}–${plan.repMax || 12} powt. z zapasem ${plan.rir ?? 2} RIR.`, why: 'Brak historii – punkt startowy wyznacza pierwszy trening.' };
  }
  const w = Math.max(...last.sets.map((x) => x.w || 0));
  const top = last.sets.filter((x) => (x.w || 0) === w);
  const allTop = top.length >= sets && top.every((x) => x.reps >= (plan.repMax || 99));
  const rirOk = top.every((x) => x.rir == null || plan.rir == null || x.rir >= plan.rir);
  const prev = history[history.length - 2];
  const prev2 = history[history.length - 3];
  const dropping = prev && prev2 && last.best < prev.best * 0.98 && prev.best < prev2.best * 0.98;
  const belowMin = top.every((x) => x.reps < (plan.repMin || 0));

  if (dropping) {
    return { w, reps: top.map((x) => x.reps), flag: 'fatigue', text: `Wynik spada 2 treningi z rzędu. Zostań przy ${fmt1(w)} kg, bez dokładania. Sprawdź sen i obciążenie z innych treningów.`, why: 'Dwa kolejne spadki szacowanej siły (e1RM) to typowy sygnał zmęczenia, nie braku siły. Dokładanie ciężaru w takiej sytuacji zwykle pogłębia spadek.' };
  }
  if (belowMin && prev) {
    const pw = Math.max(...prev.sets.map((x) => x.w || 0));
    if (pw < w) return { w: pw, reps: Array(sets).fill(plan.repMin || 8), flag: 'tooFast', text: `Po zwiększeniu ciężaru wypadłeś poniżej zakresu. Wróć do ${fmt1(pw)} kg i dobij górny zakres.`, why: 'Progresja ma sens, gdy utrzymujesz zakres powtórzeń. Poniżej dolnej granicy bodziec przesuwa się z hipertrofii w stronę samej siły i rośnie ryzyko stagnacji.' };
  }
  if (allTop && rirOk) {
    return { w: Math.round((w + inc) * 4) / 4, reps: Array(sets).fill(plan.repMin || 8), flag: 'up', text: `Górny zakres zrobiony we wszystkich seriach. Dołóż: ${fmt1(w + inc)} kg, celuj w ${plan.repMin || 8}+ powt.`, why: 'Podwójna progresja: najpierw powtórzenia do górnej granicy zakresu we wszystkich seriach, dopiero potem ciężar. Zapas powtórzeń (RIR) mówi, czy to było przy dobrej technice.' };
  }
  const reps = last.sets.slice(0, sets).map((x) => x.reps);
  while (reps.length < sets) reps.push(reps[reps.length - 1] || plan.repMin || 8);
  let iMin = 0; reps.forEach((r, i) => { if (r < reps[iMin]) iMin = i; });
  const target = reps.map((r, i) => (i === iMin ? Math.min(r + 1, plan.repMax || r + 1) : r));
  return { w, reps: target, flag: 'reps', text: `Zostań przy ${fmt1(w)} kg i dobij powtórzenia: ${target.join(' / ')}.`, why: 'Ciężar rośnie dopiero, gdy wszystkie serie dojdą do górnej granicy zakresu. Do tego czasu progres to +1 powtórzenie w najsłabszej serii.' };
}

export function stagnation(exId, today) {
  const h = exerciseHistory(exId, today);
  if (h.length < 3) return false;
  const cut = addDays(today, -21);
  const before = h.filter((x) => x.date < cut);
  const recent = h.filter((x) => x.date >= cut);
  if (!before.length || recent.length < 2) return false;
  return Math.max(...recent.map((x) => x.best)) <= Math.max(...before.map((x) => x.best));
}

// ---------- waga: trend ----------
export function weightTrend(today, s = settings()) {
  const pts = db.all('weight').filter((w) => w.date >= addDays(today, -27) && w.date <= today).map((w) => ({ x: daysBetween(addDays(today, -27), w.date), y: w.kg }));
  let rate = null;
  if (pts.length >= 6) {
    const mx = avg(pts.map((p) => p.x)), my = avg(pts.map((p) => p.y));
    const num_ = sum(pts.map((p) => (p.x - mx) * (p.y - my)));
    const den = sum(pts.map((p) => (p.x - mx) ** 2));
    rate = den ? (num_ / den) * 7 : null; // kg/tydz
  }
  const cur = weightAvg7(today);
  const weeksLeft = s.weightDeadline ? Math.max(1, daysBetween(today, s.weightDeadline) / 7) : null;
  const need = cur != null && s.weightTarget && weeksLeft ? (s.weightTarget - cur) / weeksLeft : null;
  let dir = null;
  if (rate != null) dir = Math.abs(rate) < 0.05 ? 'stabilna' : rate > 0 ? 'rośnie' : 'spada';
  let hint = null;
  if (rate != null && need != null && pts.length >= 10) {
    if (need > 0 && rate < need * 0.5) hint = `Tempo ${fmt1(rate)} kg/tydz. jest wolniejsze niż potrzebne (${fmt1(need)} kg/tydz.). Sprawdź, czy realnie dowozisz ${s.kcalTarget} kcal – jeśli tak, rozważ +150–200 kcal.`;
    else if (need > 0 && rate > need * 1.8 && rate > 0.4) hint = `Tempo ${fmt1(rate)} kg/tydz. jest wyraźnie szybsze niż potrzebne (${fmt1(need)} kg/tydz.). Rozważ lekkie obniżenie kalorii, żeby ograniczyć przyrost tłuszczu.`;
  }
  return { rate, cur, need, dir, hint, n: pts.length };
}

// ---------- obciążenie treningowe (sRPE) ----------
export function sessionLoad(s) {
  if (s.status !== 'done') return 0;
  const min = s.durationMin || (s.endedAt && s.startedAt ? (s.endedAt - s.startedAt) / 60000 : 0);
  return min * (s.rpe || s.intensity || 6);
}

// ---------- statystyki okresu ----------
export function periodStats(from, to) {
  const s = settings();
  const start = s.startedOn || '2000-01-01';
  const days = range(from, to).filter((d) => d <= todayKey() && d >= start);
  const n = days.length || 1;
  const rules = s.dekalog || DEKALOG_DEFAULT;
  const ruleRate = rules.map((r) => {
    const st = days.map((d) => ruleState(d, r, s).ok);
    const known = st.filter((x) => x !== null);
    return { rule: r, done: st.filter((x) => x === true).length, of: days.length, pct: days.length ? st.filter((x) => x === true).length / days.length : 0, known: known.length };
  });
  const scores = days.map((d) => dekalogScore(d, s).done);
  const focus = days.flatMap(focusOn);
  const focusMinTotal = sum(focus.map((f) => focusMin(f)));
  const interrupted = focus.filter((f) => f.status === 'interrupted');
  const reasons = {};
  interrupted.forEach((f) => { const r = (f.reason || 'bez powodu').trim().toLowerCase(); reasons[r] = (reasons[r] || 0) + 1; });
  const byProject = {};
  focus.forEach((f) => { const p = f.projectId ? (db.get(f.projectId)?.name || 'Projekt') : 'Bez projektu'; byProject[p] = (byProject[p] || 0) + focusMin(f); });
  const tasks = days.flatMap(tasksOn);
  const moved = db.all('task').filter((t) => (t.moved || 0) > 0 && t.date >= from && t.date <= addDays(to, 14));
  const slots = days.flatMap((d) => slotsOn(d).map((sl) => ({ d, sl, s: sessionFor(d, sl.key) })));
  const sessions = days.flatMap(sessionsOn).filter((x) => x.status === 'done');
  const load = sum(sessions.map(sessionLoad));
  const prs = [];
  sessions.forEach((ses) => (ses.prs || []).forEach((p) => prs.push({ ...p, date: ses.date })));
  const dayRecs = days.map(day);
  const wAvg = avg(days.map(weightOn));
  const kcal = days.map(kcalOn).filter((x) => x > 0);
  const water = days.map(waterOn).filter((x) => x > 0);
  const res = dayRecs.map((x) => x.resolution).filter(Boolean);
  const evenings = days.map((d) => ({ d, ...day(d) })).filter((x) => x.top || x.bottom || x.tomorrow);
  return {
    from, to, days: days.length,
    dekalogAvg: avg(scores), dekalogFull: scores.filter((x) => x === rules.length).length, ruleRate,
    focusMin: focusMinTotal, focusSessions: focus.length, focusDone: focus.filter((f) => f.status === 'done').length, interrupted: interrupted.length, reasons, byProject,
    tasksPlanned: tasks.length, tasksDone: tasks.filter((t) => t.done).length, moved,
    slotsPlanned: slots.length, slotsDone: slots.filter((x) => x.s && x.s.status === 'done').length, slotsSkipped: slots.filter((x) => x.s && x.s.status === 'skipped').length,
    sessions: sessions.length, load, prs,
    weightAvg: wAvg, kcalAvg: avg(kcal), kcalDays: kcal.length, waterAvg: avg(water), waterOkDays: days.filter((d) => waterOn(d) >= s.waterTarget).length,
    sleepAvg: avg(dayRecs.map((x) => x.sleepH)), sleepQ: avg(dayRecs.map((x) => x.sleepQ)),
    energy: avg(dayRecs.map((x) => x.energy)), mood: avg(dayRecs.map((x) => x.mood)), fatigue: avg(dayRecs.map((x) => x.fatigue)), soreness: avg(dayRecs.map((x) => x.soreness)),
    resDone: res.filter((r) => r === 'done').length, resPartial: res.filter((r) => r === 'partial').length, resNo: res.filter((r) => r === 'no').length,
    evenings,
    wakeOk: days.filter((d) => wakeOk(d, s)).length,
  };
}

// wnioski oparte wyłącznie na liczbach (fakty)
export function factInsights(cur, prev) {
  const out = [];
  const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : null);
  if (prev && prev.days) {
    if (cur.focusMin > prev.focusMin * 1.1) out.push({ kind: 'plus', text: `Deep Work: ${fmtMin(cur.focusMin)} (+${pct(cur.focusMin, prev.focusMin) ?? '∞'}% vs poprzedni okres).` });
    if (cur.focusMin < prev.focusMin * 0.9) out.push({ kind: 'minus', text: `Deep Work: ${fmtMin(cur.focusMin)} (${pct(cur.focusMin, prev.focusMin)}% vs poprzedni okres).` });
    if (cur.dekalogAvg != null && prev.dekalogAvg != null && cur.dekalogAvg - prev.dekalogAvg >= 0.5) out.push({ kind: 'plus', text: `Średni dekalog wzrósł z ${fmt1(prev.dekalogAvg)} do ${fmt1(cur.dekalogAvg)}/10.` });
    if (cur.dekalogAvg != null && prev.dekalogAvg != null && prev.dekalogAvg - cur.dekalogAvg >= 0.5) out.push({ kind: 'minus', text: `Średni dekalog spadł z ${fmt1(prev.dekalogAvg)} do ${fmt1(cur.dekalogAvg)}/10.` });
    if (cur.sleepAvg != null && prev.sleepAvg != null && Math.abs(cur.sleepAvg - prev.sleepAvg) >= 0.5) out.push({ kind: cur.sleepAvg > prev.sleepAvg ? 'plus' : 'minus', text: `Sen: średnio ${fmt1(cur.sleepAvg)} h (poprzednio ${fmt1(prev.sleepAvg)} h).` });
  }
  if (cur.prs.length) out.push({ kind: 'plus', text: `Rekordy: ${cur.prs.length} (${[...new Set(cur.prs.map((p) => p.name))].slice(0, 3).join(', ')}).` });
  const worst = [...cur.ruleRate].filter((r) => r.of > 0).sort((a, b) => a.pct - b.pct)[0];
  if (worst && worst.pct < 1) out.push({ kind: 'problem', text: `Najsłabsza zasada dekalogu: „${worst.rule.short}” – ${worst.done}/${worst.of} dni.` });
  const topReason = Object.entries(cur.reasons).sort((a, b) => b[1] - a[1])[0];
  if (topReason && topReason[1] >= 2) out.push({ kind: 'problem', text: `Najczęstszy powód przerwania Deep Work: „${topReason[0]}” (${topReason[1]}×).` });
  if (cur.slotsPlanned && cur.slotsDone < cur.slotsPlanned) out.push({ kind: 'minus', text: `Treningi: ${cur.slotsDone}/${cur.slotsPlanned} wykonanych.` });
  if (cur.tasksPlanned && cur.tasksDone / cur.tasksPlanned < 0.8) out.push({ kind: 'minus', text: `Zadania biznes: ${cur.tasksDone}/${cur.tasksPlanned} (${Math.round((cur.tasksDone / cur.tasksPlanned) * 100)}%).` });
  if (cur.resNo + cur.resPartial > cur.resDone && cur.resNo + cur.resPartial >= 2) out.push({ kind: 'problem', text: `Postanowienia: wykonane ${cur.resDone}, częściowo ${cur.resPartial}, niewykonane ${cur.resNo}.` });
  if (cur.fatigue != null && cur.fatigue >= 4 && cur.load) out.push({ kind: 'problem', text: `Średnie zmęczenie ${fmt1(cur.fatigue)}/5 przy obciążeniu ${fmt0(cur.load)} j. – obserwuj regenerację.` });
  return out;
}

// ---------- zdjęcia ----------
export function compressImage(file, maxSide = 1280, q = 0.78) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = rej;
    img.src = url;
  });
}

// ---------- dźwięk ----------
let actx = null;
export function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch {} }
export function beep(times = 1, freq = 660) {
  try {
    unlockAudio();
    for (let i = 0; i < times; i++) {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      const t = actx.currentTime + i * 0.45;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 0.42);
    }
    if (navigator.vibrate) navigator.vibrate(200 * times);
  } catch {}
}
export function gong() {
  try {
    unlockAudio();
    [220, 330, 440].forEach((f, i) => {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.frequency.value = f; const t = actx.currentTime;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 / (i + 1), t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + 4);
    });
  } catch {}
}

// wake lock
let wl = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) { wl = await navigator.wakeLock.request('screen'); }
    else if (!on && wl) { await wl.release(); wl = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && wl && wl.released) keepAwake(true); });
