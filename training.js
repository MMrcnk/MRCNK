// MRCNK – treningi: plan tygodnia, szablony, tryb treningu, progresja, historia
import { html, useState, useEffect, useRef, useDB, useTick, nav, toast, Icon, Check, Rating, Bar, Head, Field, Empty, NumIn, registerScreen, LineChart, Bars, confirmSheet } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';
import { SimpleSheet } from './today.js';

const { fmt1, fmt0, fmtMin } = L;
const workouts = () => db.all('workout').sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
const exercises = () => db.all('exercise').sort((a, b) => a.name.localeCompare(b.name));
const fmtRest = (s) => (s ? `${Math.floor(s / 60)}:${L.pad(s % 60)}` : '–');

function findOrCreateExercise(name) {
  const n = name.trim();
  const ex = exercises().find((e) => e.name.toLowerCase() === n.toLowerCase());
  if (ex) return ex.id;
  const perHand = /hantl|hantel/i.test(n);
  return db.patch('exercise', null, { name: n, perHand, increment: perHand ? 2 : 2.5 });
}


// ================= JEDNORAZOWE ZMIANY PLANU =================
const GORA = [
  ['Wyciskanie hantli na skosie', 4, 6, 10, 1, 2, 180],
  ['Podciąganie', 2, 6, 10, 1, 2, 180],
  ['Wiosłowanie', 2, 8, 12, 1, 2, 180],
  ['Wznosy bokiem', 2, 12, 20, 1, 1, 120],
  ['OHP', 2, 6, 10, 1, 2, 180],
  ['Triceps — prostowanie na wyciągu, ramiona przy tułowiu', 2, 10, 15, 1, 1, 120],
  ['Triceps — wyprost zza głowy, ramiona uniesione', 2, 10, 15, 1, 1, 120],
  ['Biceps — uginanie na wyciągu', 2, 10, 15, 1, 1, 120],
  ['Biceps — uginanie hantlami', 2, 8, 12, 1, 1, 120],
];
export function migrate() {
  migrateRest();
  if (db.get('mig:gora-3x')) return;
  const exercisesList = GORA.map(([name, sets, repMin, repMax, rir, rirMax, restSec]) => ({ exerciseId: findOrCreateExercise(name), sets, repMin, repMax, rir, rirMax, restSec }));
  db.patch('workout', 'wk:gora', { name: 'Góra', kind: 'strength', exercises: exercisesList, order: 0 });
  const old = ['wk:gora-a', 'wk:gora-b', 'wk:gora-c'];
  const t = L.todayKey();
  const sched = db.get('schedule');
  const cur = L.scheduleVersion(t);
  let replaced = 0;
  if (sched && cur) {
    const days = cur.days.map((d) => d.map((sl) => (old.includes(sl.workoutId) ? (replaced++, { ...sl, workoutId: 'wk:gora', name: 'Góra', kind: 'strength' }) : sl)));
    if (replaced) {
      const versions = (sched.versions || []).filter((v) => v.from < t);
      versions.push({ from: t, days, savedAt: Date.now() });
      db.patch('schedule', 'schedule', { versions });
    }
  }
  old.forEach((id) => { const w = db.get(id); if (w && !(w.exercises || []).length) db.remove(id); });
  db.patch('meta', 'mig:gora-3x', { at: Date.now(), replaced });
}

function migrateRest() {
  if (db.get('mig:gora-rest')) return;
  const w = db.get('wk:gora');
  if (w && w.exercises) {
    const map = Object.fromEntries(GORA.map((g) => [g[0].toLowerCase(), g[6]]));
    db.patch('workout', 'wk:gora', { exercises: w.exercises.map((e) => { const ex = db.get(e.exerciseId); const r = ex && map[ex.name.toLowerCase()]; return r ? { ...e, restSec: r } : e; }) });
  }
  db.patch('meta', 'mig:gora-rest', { at: Date.now() });
}

// ================= ZAKŁADKA TRENING =================
export function TrainingTab() {
  useDB();
  const t = L.todayKey();
  const v = L.scheduleVersion(t);
  const recent = db.all('session').filter((s) => s.status === 'done').sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.startedAt || b.at || 0) - (a.startedAt || a.at || 0))).slice(0, 8);
  const wk = L.weekStart(t);
  const loadOf = (from, to) => L.sum(db.all('session').filter((s) => s.date >= from && s.date <= to).map(L.sessionLoad));
  const cur = loadOf(wk, L.addDays(wk, 6));
  const prev4 = L.avg([1, 2, 3, 4].map((i) => loadOf(L.addDays(wk, -7 * i), L.addDays(wk, -7 * i + 6))).filter((x) => x > 0));
  const weekSessions = L.range(wk, L.addDays(wk, 6)).map((d) => ({ d, slots: L.slotsOn(d) }));
  const exList = exercises();
  return html`<div class="page">
    <div class="top"><div class="col" style="gap:2px"><div class="brand">MRCNK</div><div class="title">Trening</div></div></div>

    <div class="card red">
      <div class="row between"><div class="ctitle c-red">Ten tydzień</div><button type="button" class="btn sm b-ghost" onClick=${() => nav.push('weekPlan')}><${Icon} n="edit" s=${16} />Plan tygodnia</button></div>
      <div class="col" style="gap:6px">
        ${weekSessions.map(({ d, slots }) => html`<div class="row" style="gap:10px;align-items:flex-start">
          <div class=${'n ' + (d === t ? 'c-acc' : 'mut2')} style="width:34px;font-size:16px;padding-top:2px">${L.DOW_S[L.isoDow(d)]}</div>
          <div class="row wrap grow" style="gap:6px">
            ${slots.length ? slots.map((sl) => { const s = L.sessionFor(d, sl.key); const st = s ? s.status : d < t && d >= (L.settings().startedOn || '') ? 'miss' : null;
              const col = st === 'done' ? 'var(--green)' : st === 'skipped' || st === 'miss' ? 'var(--red)' : 'var(--mut)';
              return html`<span class="chip" style=${'color:' + col}>${st === 'done' ? '✓ ' : st === 'skipped' || st === 'miss' ? '✗ ' : ''}${sl.name}</span>`; }) : html`<span class="xs mut3" style="padding-top:6px">wolne</span>`}
          </div>
        </div>`)}
      </div>
      <div class="hr"></div>
      <div class="row between small"><span class="mut">Obciążenie (min × intensywność)</span><span><b>${fmt0(cur)}</b>${prev4 ? html` <span class="mut2">· śr. 4 tyg. ${fmt0(prev4)}</span>` : null}</span></div>
      ${prev4 && cur > prev4 * 1.3 ? html`<div class="xs c-amb">Obciążenie wyraźnie powyżej Twojej średniej – obserwuj sen i zmęczenie.</div>` : null}
    </div>

    <div class="card">
      <div class="row between"><div class="ctitle">Szablony treningów</div><button type="button" class="btn sm b-ghost" onClick=${() => nav.push('workoutEdit', {})}><${Icon} n="plus" s=${16} />Nowy</button></div>
      <div class="col" style="gap:0">
        ${workouts().map((w) => html`<button type="button" class="li" style="width:100%;text-align:left" onClick=${() => nav.push('workoutEdit', { id: w.id })}>
          <div class="grow col" style="gap:2px"><div style="font-weight:600">${w.name}</div>
            <div class="xs mut">${w.kind === 'strength' ? `${(w.exercises || []).length} ćwiczeń` : `prosty · ${w.defaultMin || 60} min`}</div></div>
          <${Icon} n="next" s=${18} /></button>`)}
      </div>
    </div>

    <div class="card">
      <div class="ctitle">Ćwiczenia i progres</div>
      ${exList.length ? html`<div class="col" style="gap:0">${exList.map((e) => { const h = L.exerciseHistory(e.id); const last = h[h.length - 1]; const stg = L.stagnation(e.id, t);
        return html`<button type="button" class="li" style="width:100%;text-align:left" onClick=${() => nav.push('exercise', { id: e.id })}>
          <div class="grow col" style="gap:2px"><div style="font-weight:600">${e.name}</div>
          <div class="xs mut">${last ? `${L.fmtShort(last.date)} · ${last.sets.map((s) => s.reps).join('/')} @ ${fmt1(Math.max(...last.sets.map((s) => s.w || 0)))} kg · e1RM ${fmt1(last.best)}` : 'brak wyników'}${stg ? ' · ' : ''}${stg ? html`<span class="c-amb">zastój 3 tyg.</span>` : null}</div></div>
          <${Icon} n="next" s=${18} /></button>`; })}</div>` : html`<${Empty}>Ćwiczenia pojawią się, gdy dodasz je do szablonu treningu.</${Empty}>`}
    </div>

    <div class="card">
      <div class="ctitle">Ostatnie treningi</div>
      ${recent.length ? html`<div class="col" style="gap:0">${recent.map((s) => html`<button type="button" class="li" style="width:100%;text-align:left" onClick=${() => s.kind === 'strength' ? nav.push('workoutSummary', { id: s.id }) : nav.sheet(SimpleSheet, { date: s.date, sl: { key: s.slotKey, name: s.name, workoutId: s.workoutId } })}>
        <div class="grow col" style="gap:2px"><div style="font-weight:600">${s.name}</div><div class="xs mut">${L.fmtShort(s.date)} · ${fmt0(s.durationMin)} min${s.rpe ? ' · RPE ' + s.rpe : s.intensity ? ' · int. ' + s.intensity + '/10' : ''}${s.prs && s.prs.length ? ' · rekordy: ' + s.prs.length : ''}</div></div>
        <${Icon} n="next" s=${18} /></button>`)}</div>` : html`<${Empty}>Brak zapisanych treningów.</${Empty}>`}
    </div>
  </div>`;
}

// ================= PLAN TYGODNIA =================
function WeekPlan() {
  useDB();
  const t = L.todayKey();
  const sched = db.get('schedule') || { versions: [] };
  const cur = L.scheduleVersion(t) || { days: [[], [], [], [], [], [], []] };
  const [days, setDays] = useState(JSON.parse(JSON.stringify(cur.days)));
  const [from, setFrom] = useState(t);
  const wks = workouts();
  const upd = (di, si, f) => setDays(days.map((d, i) => (i === di ? d.map((s, j) => (j === si ? { ...s, ...f } : s)) : d)));
  const add = (di) => setDays(days.map((d, i) => (i === di ? [...d, { key: db.uid().slice(0, 6), label: d.length ? 'Wieczór' : 'Rano', name: '', kind: 'simple', workoutId: null }] : d)));
  const del = (di, si) => setDays(days.map((d, i) => (i === di ? d.filter((_, j) => j !== si) : d)));
  const save = () => {
    const clean = days.map((d) => d.filter((s) => s.name || s.workoutId));
    const versions = (sched.versions || []).filter((v) => v.from !== from && v.from < from);
    versions.push({ from, days: clean, savedAt: Date.now() });
    db.patch('schedule', 'schedule', { versions });
    toast('Plan zapisany od ' + L.fmtShort(from)); nav.pop();
  };
  return html`<div class="page">
    <${Head} title="Plan tygodnia" sub="Ustawiasz raz – powtarza się co tydzień" />
    ${days.map((d, di) => html`<div class="card" style="gap:10px">
      <div class="row between"><div class="ctitle">${L.DOW[di]}</div><button type="button" class="btn xs b-ghost" onClick=${() => add(di)}><${Icon} n="plus" s=${14} />Trening</button></div>
      ${d.length ? d.map((sl, si) => html`<div class="col" style="gap:8px;background:var(--card2);border-radius:14px;padding:10px">
        <div class="g2"><input value=${sl.label} placeholder="Pora: Rano / Wieczór" onInput=${(e) => upd(di, si, { label: e.target.value })} />
          <input type="time" value=${sl.time || ''} onInput=${(e) => upd(di, si, { time: e.target.value })} /></div>
        <select value=${sl.workoutId || ''} onChange=${(e) => { const w = db.get(e.target.value); upd(di, si, w ? { workoutId: w.id, name: w.name, kind: w.kind } : { workoutId: null, kind: 'simple' }); }}>
          <option value="">— własna nazwa (trening prosty) —</option>
          ${wks.map((w) => html`<option value=${w.id}>${w.name} · ${w.kind === 'strength' ? 'siłowy' : 'prosty'}</option>`)}
        </select>
        ${!sl.workoutId ? html`<input value=${sl.name} placeholder="Nazwa, np. Bieganie, Mobility, Sparingi" onInput=${(e) => upd(di, si, { name: e.target.value })} />` : null}
        <button type="button" class="btn xs b-danger" style="align-self:flex-end" onClick=${() => del(di, si)}>Usuń</button>
      </div>`) : html`<div class="xs mut2">Wolne</div>`}
    </div>`)}
    <div class="card acc">
      <${Field} label="Obowiązuje od" hint="Poprzednie tygodnie zostają w historii z dawnym planem."><input type="date" value=${from} onInput=${(e) => setFrom(e.target.value)} /></${Field}>
      <button type="button" class="btn lg full b-acc" onClick=${save}>Zapisz plan</button>
      <button type="button" class="small mut" onClick=${() => nav.push('workoutEdit', {})}>+ nowy szablon treningu (siłowy lub prosty)</button>
    </div>
    ${(sched.versions || []).length > 1 ? html`<div class="card"><div class="lbl mut">Historia planu</div>${[...sched.versions].sort((a, b) => (a.from < b.from ? 1 : -1)).map((v) => html`<div class="small mut">od ${v.from === '2000-01-01' ? 'początku' : L.fmtShort(v.from) + '.' + v.from.slice(0, 4)}: ${v.days.map((d) => d.length).reduce((a, b) => a + b, 0)} treningów / tydz.</div>`)}</div>` : null}
  </div>`;
}
registerScreen('weekPlan', WeekPlan);

// ================= SZABLON TRENINGU =================
function WorkoutEdit({ id }) {
  useDB();
  const w = id ? db.get(id) : null;
  const [name, setName] = useState(w ? w.name : '');
  const [kind, setKind] = useState(w ? w.kind : 'strength');
  const [defMin, setDefMin] = useState(w ? w.defaultMin || 60 : 60);
  const [list, setList] = useState(w ? JSON.parse(JSON.stringify(w.exercises || [])) : []);
  const [exName, setExName] = useState('');
  const upd = (i, f) => setList(list.map((e, j) => (j === i ? { ...e, ...f } : e)));
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= list.length) return; const a = [...list]; [a[i], a[j]] = [a[j], a[i]]; setList(a); };
  const addEx = () => { if (!exName.trim()) return; const eid = findOrCreateExercise(exName); setList([...list, { exerciseId: eid, sets: 3, repMin: 6, repMax: 10, rir: 2, restSec: 120 }]); setExName(''); };
  const save = () => {
    if (!name.trim()) { toast('Podaj nazwę'); return; }
    const f = { name: name.trim(), kind, exercises: list, defaultMin: L.num(defMin) || 60 };
    if (w) {
      const changed = JSON.stringify(w.exercises || []) !== JSON.stringify(list);
      if (changed) f.history = [...(w.history || []), { at: Date.now(), exercises: w.exercises || [] }].slice(-50);
    }
    const nid = db.patch('workout', id || null, { order: w ? w.order : 50, ...f });
    // zaktualizuj nazwę w planie
    if (w && w.name !== f.name) {
      const s = db.get('schedule');
      if (s) db.patch('schedule', 'schedule', { versions: s.versions.map((v) => ({ ...v, days: v.days.map((d) => d.map((sl) => (sl.workoutId === nid ? { ...sl, name: f.name, kind } : sl))) })) });
    }
    toast('Zapisano szablon'); nav.pop();
  };
  return html`<div class="page">
    <${Head} title=${w ? 'Edytuj trening' : 'Nowy trening'} />
    <input value=${name} placeholder="Nazwa, np. Góra A" onInput=${(e) => setName(e.target.value)} style="font-size:20px;font-weight:600" />
    <div class="g2">
      <button type="button" class=${'btn ' + (kind === 'strength' ? 'b-red' : 'b-ghost')} onClick=${() => setKind('strength')}>Siłowy (serie)</button>
      <button type="button" class=${'btn ' + (kind === 'simple' ? 'b-red' : 'b-ghost')} onClick=${() => setKind('simple')}>Prosty (byłem/nie)</button>
    </div>
    ${kind === 'simple' ? html`<div class="card"><${Field} label="Domyślny czas (min)"><${NumIn} value=${defMin} onCommit=${setDefMin} /></${Field}><div class="xs mut2">Np. Muay Thai, bieganie, mobility. Zapisujesz czas, rodzaj, intensywność i samopoczucie.</div></div>` : html`
      ${list.map((e, i) => { const ex = db.get(e.exerciseId) || { name: '?' }; return html`<div class="card" style="gap:10px">
        <div class="row between"><div style="font-weight:600;font-size:17px">${i + 1}. ${ex.name}</div>
          <div class="row" style="gap:0">
            <button type="button" class="icon-btn" aria-label="Wyżej" onClick=${() => move(i, -1)}><${Icon} n="up" s=${18} /></button>
            <button type="button" class="icon-btn" aria-label="Niżej" onClick=${() => move(i, 1)}><${Icon} n="down" s=${18} /></button>
            <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => setList(list.filter((_, j) => j !== i))}><${Icon} n="trash" s=${18} /></button>
          </div></div>
        <div class="g3">
          <${Field} label="Serie"><${NumIn} value=${e.sets} onCommit=${(v) => upd(i, { sets: Math.max(1, Math.round(v || 1)) })} /></${Field}>
          <${Field} label="Powt. od"><${NumIn} value=${e.repMin} onCommit=${(v) => upd(i, { repMin: Math.round(v || 1) })} /></${Field}>
          <${Field} label="Powt. do"><${NumIn} value=${e.repMax} onCommit=${(v) => upd(i, { repMax: Math.round(v || 1) })} /></${Field}>
          <${Field} label="RIR"><${NumIn} value=${e.rir} onCommit=${(v) => upd(i, { rir: v })} /></${Field}>
          <${Field} label="Przerwa (s)"><${NumIn} value=${e.restSec} onCommit=${(v) => upd(i, { restSec: Math.round(v || 0) })} /></${Field}>
          <div class="col" style="gap:6px;justify-content:flex-end"><button type="button" class="btn sm b-ghost" onClick=${() => nav.push('exercise', { id: e.exerciseId })}>Ćwiczenie</button></div>
        </div>
      </div>`; })}
      <div class="card">
        <div class="lbl mut">Dodaj ćwiczenie</div>
        <div class="row" style="gap:8px">
          <input list="exlist" placeholder="np. Wyciskanie hantli na skosie" value=${exName} onInput=${(e) => setExName(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') addEx(); }} />
          <button type="button" class="btn b-red" onClick=${addEx}>Dodaj</button>
        </div>
        <datalist id="exlist">${exercises().map((e) => html`<option value=${e.name}></option>`)}</datalist>
        <div class="xs mut2">Ćwiczenia z „hantl” w nazwie zapisują ciężar na jedną hantlę.</div>
      </div>`}
    <button type="button" class="btn lg full b-acc" onClick=${save}>Zapisz</button>
    ${w ? html`<button type="button" class="btn b-danger" onClick=${() => confirmSheet('Usunąć szablon „' + w.name + '”? Historia treningów zostaje.', () => { db.remove(w.id); nav.pop(); }, 'Usuń')}>Usuń szablon</button>` : null}
    ${w && (w.history || []).length ? html`<div class="xs mut2">Zmiany planu: ${w.history.length} (ostatnia ${new Date(w.history[w.history.length - 1].at).toLocaleDateString('pl-PL')})</div>` : null}
  </div>`;
}
registerScreen('workoutEdit', WorkoutEdit);

// ================= ĆWICZENIE: HISTORIA =================
function ExerciseScreen({ id }) {
  useDB();
  const e = db.get(id);
  if (!e) return html`<div class="page"><${Head} title="Ćwiczenie" /></div>`;
  const h = L.exerciseHistory(id);
  const best = h.length ? Math.max(...h.map((x) => x.best)) : null;
  const maxW = h.length ? Math.max(...h.flatMap((x) => x.sets.map((s) => s.w || 0))) : null;
  const stg = L.stagnation(id, L.todayKey());
  return html`<div class="page">
    <${Head} title=${e.name} sub=${e.perHand ? 'ciężar na 1 hantlę' : 'ciężar całkowity'} />
    <div class="g3">
      <div class="card tight"><div class="lbl mut">e1RM max</div><div class="n" style="font-size:26px">${fmt1(best)}</div></div>
      <div class="card tight"><div class="lbl mut">Max kg</div><div class="n" style="font-size:26px">${fmt1(maxW)}</div></div>
      <div class="card tight"><div class="lbl mut">Treningi</div><div class="n" style="font-size:26px">${h.length}</div></div>
    </div>
    ${stg ? html`<div class="card gold"><div class="small"><b class="c-gold">Zastój:</b> brak poprawy szacowanej siły od 3 tygodni. Sprawdź sen, kalorie i zmęczenie, zanim zwiększysz objętość.</div></div>` : null}
    <div class="card"><div class="lbl mut">Szacowana siła (e1RM)</div><${LineChart} data=${h.map((x) => ({ x: L.fmtShort(x.date), y: x.best }))} color="var(--red)" fmtY=${fmt1} labels /></div>
    <div class="card"><div class="lbl mut">Objętość (kg × powt.)</div><${LineChart} data=${h.map((x) => ({ x: L.fmtShort(x.date), y: x.vol }))} color="var(--acc)" fmtY=${fmt0} labels /></div>
    <div class="card" style="gap:0">
      ${[...h].reverse().map((x) => html`<div class="li" style="padding:8px 0"><div class="grow col" style="gap:2px">
        <div style="font-weight:600">${L.fmtShort(x.date)}.${x.date.slice(2, 4)}</div>
        <div class="small mut">${x.sets.map((s) => `${fmt1(s.w)}×${s.reps}${s.rir != null ? ' @' + s.rir : ''}`).join(' · ')}</div>
        ${x.note ? html`<div class="xs mut2">${x.note}</div>` : null}</div>
        <div class="n" style="font-size:18px">${fmt1(x.best)}${x.best === best ? html` <span class="c-gold">★</span>` : null}</div></div>`)}
    </div>
    <div class="card">
      <div class="lbl mut">Ustawienia ćwiczenia</div>
      <input value=${e.name} onBlur=${(ev) => ev.target.value.trim() && db.patch('exercise', id, { name: ev.target.value.trim() })} />
      <div class="g2">
        <button type="button" class=${'btn sm ' + (e.perHand ? 'b-red' : 'b-ghost')} onClick=${() => db.patch('exercise', id, { perHand: true })}>Na 1 hantlę</button>
        <button type="button" class=${'btn sm ' + (!e.perHand ? 'b-red' : 'b-ghost')} onClick=${() => db.patch('exercise', id, { perHand: false })}>Całkowity</button>
      </div>
      <${Field} label="Skok ciężaru (kg)"><${NumIn} value=${e.increment} onCommit=${(v) => db.patch('exercise', id, { increment: v || 2.5 })} /></${Field}>
    </div>
  </div>`;
}
registerScreen('exercise', ExerciseScreen);

// ================= TRYB TRENINGU =================
function newSession(date, slotKey) {
  const sl = L.slotsOn(date).find((s) => s.key === slotKey) || { key: slotKey, name: 'Trening', kind: 'strength' };
  const w = sl.workoutId ? db.get(sl.workoutId) : null;
  const exs = (w && w.exercises || []).map((pe) => {
    const ex = db.get(pe.exerciseId);
    const hist = L.exerciseHistory(pe.exerciseId, date);
    const sug = L.suggestFor(pe, ex, hist);
    return {
      exerciseId: pe.exerciseId, name: ex ? ex.name : '?', plan: { sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, rir: pe.rir, rirMax: pe.rirMax, restSec: pe.restSec },
      sets: Array.from({ length: pe.sets || 3 }, (_, i) => ({ w: sug.w, reps: null, target: sug.reps[i] ?? null, rir: null, done: false })),
      suggestion: sug.text, why: sug.why, flag: sug.flag || null, note: '',
    };
  });
  return db.patch('session', null, { date, slotKey, name: sl.name, kind: 'strength', workoutId: sl.workoutId || null, status: 'running', startedAt: Date.now(), exercises: exs, at: Date.now() });
}

function Workout({ id, date, slotKey }) {
  useDB();
  const [sid, setSid] = useState(id || null);
  useEffect(() => {
    if (!sid) {
      const ex = L.sessionFor(date, slotKey);
      const nid = ex && ex.status === 'running' ? ex.id : newSession(date, slotKey);
      setSid(nid);
    }
    L.keepAwake(true);
    return () => L.keepAwake(false);
  }, []);
  const s = sid ? db.get(sid) : null;
  const [idx, setIdx] = useState(0);
  const [restEnd, setRestEnd] = useState(null);
  const [showWhy, setShowWhy] = useState(false);
  const [newEx, setNewEx] = useState('');
  const now = useTick(500, !!restEnd);
  useEffect(() => { if (restEnd && now >= restEnd) { L.beep(2, 880); setRestEnd(null); } }, [now]);
  if (!s) return html`<div class="page"><${Head} title="Trening" /></div>`;
  const exs = s.exercises || [];
  const e = exs[idx];
  const save = (list) => db.patch('session', s.id, { exercises: list });
  const updSet = (si, f) => save(exs.map((x, i) => (i === idx ? { ...x, sets: x.sets.map((st, j) => (j === si ? { ...st, ...f } : st)) } : x)));
  const markDone = (si) => {
    const st = e.sets[si];
    const reps = st.reps ?? st.target;
    if (!st.done && (!reps || st.w == null)) { toast('Wpisz ciężar i powtórzenia'); return; }
    updSet(si, { done: !st.done, reps });
    if (!st.done) { L.unlockAudio(); setRestEnd(Date.now() + (e.plan.restSec || 120) * 1000); }
  };
  const addSet = () => { const last = e.sets[e.sets.length - 1] || {}; save(exs.map((x, i) => (i === idx ? { ...x, sets: [...x.sets, { w: last.w ?? null, reps: null, target: last.target ?? null, rir: null, done: false }] } : x))); };
  const delSet = () => save(exs.map((x, i) => (i === idx ? { ...x, sets: x.sets.slice(0, -1) } : x)));
  const addExercise = () => {
    if (!newEx.trim()) return;
    const eid = findOrCreateExercise(newEx);
    const ex = db.get(eid);
    const plan = { sets: 3, repMin: 8, repMax: 12, rir: 2, restSec: 120 };
    const sug = L.suggestFor(plan, ex, L.exerciseHistory(eid, s.date));
    save([...exs, { exerciseId: eid, name: ex.name, plan, sets: Array.from({ length: 3 }, (_, i) => ({ w: sug.w, reps: null, target: sug.reps[i], rir: null, done: false })), suggestion: sug.text, why: sug.why, note: '' }]);
    setIdx(exs.length); setNewEx('');
  };
  const finish = () => nav.sheet(FinishSheet, { id: s.id });
  const prev = e ? L.exerciseHistory(e.exerciseId, s.date).filter((h) => h.sessionId !== s.id) : [];
  const last = prev[prev.length - 1];
  const exInfo = e ? db.get(e.exerciseId) : null;
  const restLeft = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const el = Math.round((Date.now() - (s.startedAt || Date.now())) / 60000);

  return html`<div class="page" style="padding-bottom:calc(150px + var(--safe-b))">
    <${Head} title=${s.name} sub=${`${el} min · ${exs.filter((x) => x.sets.some((y) => y.done)).length}/${exs.length} ćwiczeń`}
      right=${html`<button type="button" class="btn sm b-green" onClick=${finish}>Zakończ</button>`} />
    <div class="row" style="gap:6px;overflow-x:auto;padding-bottom:2px">
      ${exs.map((x, i) => html`<button type="button" class="chip" style=${'flex-shrink:0;height:34px;' + (i === idx ? 'background:var(--red);color:var(--red-ink);border-color:transparent' : x.sets.length && x.sets.every((y) => y.done) ? 'color:var(--green)' : '')} onClick=${() => { setIdx(i); setShowWhy(false); }}>${i + 1}. ${x.name.length > 18 ? x.name.slice(0, 17) + '…' : x.name}</button>`)}
    </div>
    ${!exs.length ? html`<${Empty}>Ten trening nie ma jeszcze ćwiczeń. Dodaj je poniżej albo w szablonie (Trening → Szablony).</${Empty}>` : null}
    ${e ? html`
      <div class="card red">
        <div class="h" style="font-size:26px;text-transform:none;line-height:1.15">${e.name}</div>
        <div class="small" style="color:var(--red-mut)">Plan: ${e.plan.sets} × ${e.plan.repMin}–${e.plan.repMax}${e.plan.rir != null ? ' · RIR ' + e.plan.rir + (e.plan.rirMax && e.plan.rirMax !== e.plan.rir ? '–' + e.plan.rirMax : '') : ''} · przerwa ${fmtRest(e.plan.restSec)}${exInfo && exInfo.perHand ? ' · kg na 1 hantlę' : ''}</div>
        <div class="row" style="gap:8px;background:var(--red-card);border-radius:12px;padding:10px 12px">
          <span class="lbl" style="font-size:11px;color:var(--red-mut)">Poprzednio</span>
          <span style="font-weight:600">${last ? `${fmt1(Math.max(...last.sets.map((x) => x.w || 0)))} kg × ${last.sets.map((x) => x.reps).join(' / ')}` : 'pierwszy raz'}</span>
          ${last ? html`<span class="xs mut2">${L.fmtShort(last.date)}</span>` : null}
        </div>
        ${e.suggestion ? html`<div class="col" style="gap:6px;background:#241A10;border:1px solid var(--acc-line);border-radius:12px;padding:10px 12px">
          <div class="row between"><span class="lbl c-acc" style="font-size:11px">${e.flag === 'fatigue' ? 'Uwaga: zmęczenie' : 'Sugestia'}</span><button type="button" class="xs c-acc" onClick=${() => setShowWhy(!showWhy)}>${showWhy ? 'ukryj' : 'dlaczego?'}</button></div>
          <div style="font-size:15px;line-height:1.35">${e.suggestion}</div>
          ${showWhy ? html`<div class="xs mut" style="line-height:1.45">${e.why}</div>` : null}
        </div>` : null}
      </div>
      <div class="card" style="gap:8px">
        <div class="set-row xs mut2" style="font-weight:600;letter-spacing:1px"><span>#</span><span>KG</span><span>POWT.</span><span>RIR</span><span></span></div>
        ${e.sets.map((st, si) => html`<div class="set-row" style=${st.done ? 'opacity:.75' : ''}>
          <div class="n mut2" style="font-size:18px">${si + 1}</div>
          <${NumIn} value=${st.w} placeholder="kg" onCommit=${(v) => updSet(si, { w: v })} />
          <${NumIn} value=${st.reps} placeholder=${st.target != null ? String(st.target) : 'powt'} onCommit=${(v) => updSet(si, { reps: v == null ? null : Math.round(v) })} />
          <${NumIn} value=${st.rir} placeholder="–" onCommit=${(v) => updSet(si, { rir: v })} />
          <${Check} on=${st.done} color="green" onClick=${() => markDone(si)} label=${'Seria ' + (si + 1)} />
        </div>`)}
        <div class="row" style="gap:8px">
          <button type="button" class="btn sm b-ghost grow" onClick=${addSet}><${Icon} n="plus" s=${16} />Seria</button>
          <button type="button" class="btn sm b-ghost grow" disabled=${!e.sets.length} onClick=${delSet}><${Icon} n="minus" s=${16} />Seria</button>
        </div>
        <textarea placeholder="Notatka do ćwiczenia (technika, ból, ustawienie…)" style="min-height:54px" value=${e.note || ''} onBlur=${(ev) => save(exs.map((x, i) => (i === idx ? { ...x, note: ev.target.value } : x)))}></textarea>
      </div>
      <div class="g2">
        <button type="button" class="btn lg b-ghost" disabled=${idx === 0} onClick=${() => { setIdx(idx - 1); setShowWhy(false); }}><${Icon} n="back" s=${18} />Poprzednie</button>
        ${idx < exs.length - 1 ? html`<button type="button" class="btn lg b-red" onClick=${() => { setIdx(idx + 1); setShowWhy(false); }}>Następne<${Icon} n="next" s=${18} /></button>`
          : html`<button type="button" class="btn lg b-green" onClick=${finish}>Zakończ trening</button>`}
      </div>` : null}
    <div class="card">
      <div class="lbl mut">Dodaj ćwiczenie do tego treningu</div>
      <div class="row" style="gap:8px"><input list="exlist2" value=${newEx} placeholder="Nazwa ćwiczenia" onInput=${(ev) => setNewEx(ev.target.value)} onKeyDown=${(ev) => { if (ev.key === 'Enter') addExercise(); }} />
        <button type="button" class="btn b-ghost" onClick=${addExercise}>Dodaj</button></div>
      <datalist id="exlist2">${exercises().map((x) => html`<option value=${x.name}></option>`)}</datalist>
    </div>
    ${restEnd ? html`<div style="position:fixed;left:12px;right:12px;bottom:calc(14px + var(--safe-b));z-index:65;max-width:560px;margin:0 auto;background:#1F1F24;border:1px solid var(--line3);border-radius:18px;padding:12px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 10px 30px rgba(0,0,0,.6)">
      <div class="col grow" style="gap:0"><span class="lbl mut" style="font-size:11px">Odpoczynek</span><span class="n" style="font-size:36px;line-height:1">${Math.floor(restLeft / 60)}:${L.pad(restLeft % 60)}</span></div>
      <button type="button" class="btn sm b-ghost" onClick=${() => setRestEnd(restEnd + 30000)}>+30 s</button>
      <button type="button" class="btn sm b-acc" onClick=${() => setRestEnd(null)}>Pomiń</button>
    </div>` : null}
  </div>`;
}
registerScreen('workout', Workout);

function FinishSheet({ close, id }) {
  const s = db.get(id);
  const [rpe, setRpe] = useState(7);
  const done = (s.exercises || []).reduce((a, x) => a + x.sets.filter((y) => y.done).length, 0);
  const finish = () => {
    const prs = [];
    (s.exercises || []).forEach((e) => {
      const sets = e.sets.filter((x) => x.done && x.reps > 0);
      if (!sets.length) return;
      const best = Math.max(...sets.map((x) => L.e1rm(x.w, x.reps, x.rir)));
      const hist = L.exerciseHistory(e.exerciseId, s.date).filter((h) => h.sessionId !== s.id);
      if (hist.length && best > Math.max(...hist.map((h) => h.best)) + 0.01) prs.push({ exerciseId: e.exerciseId, name: e.name, e1rm: Math.round(best * 10) / 10 });
    });
    const end = Date.now();
    db.patch('session', id, { status: 'done', endedAt: end, durationMin: Math.max(1, Math.round((end - (s.startedAt || end)) / 60000)), rpe, prs, exercises: s.exercises.map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) })) });
    L.keepAwake(false);
    close(); nav.replace('workoutSummary', { id });
  };
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Koniec treningu</div>
    <div class="small mut">${done} serii wykonanych. Serie nieodhaczone nie zostaną zapisane.</div>
    <div class="lbl mut">Jak ciężki był trening? (RPE 1–10)</div>
    <${Rating} max=${10} value=${rpe} onChange=${(v) => setRpe(v || 7)} color="var(--red)" ink="var(--red-ink)" />
    <button type="button" class="btn lg full b-green" disabled=${!done} onClick=${finish}>Zapisz i pokaż podsumowanie</button>
    <button type="button" class="btn b-danger" onClick=${() => { close(); confirmSheet('Odrzucić ten trening? Nic nie zostanie zapisane.', () => { db.remove(id); L.keepAwake(false); nav.pop(); }, 'Odrzuć'); }}>Odrzuć trening</button>
  </div>`;
}

// ================= PODSUMOWANIE =================
function WorkoutSummary({ id }) {
  useDB();
  const s = db.get(id);
  if (!s) return html`<div class="page"><${Head} title="Podsumowanie" /></div>`;
  const prevSame = db.all('session').filter((x) => x.status === 'done' && x.workoutId && x.workoutId === s.workoutId && x.id !== s.id && (x.date < s.date || (x.date === s.date && (x.startedAt || 0) < (s.startedAt || 0)))).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const vol = (ses) => L.sum((ses.exercises || []).flatMap((e) => e.sets.map((x) => (x.w || 0) * (x.reps || 0))));
  const v = vol(s), pv = prevSame ? vol(prevSame) : null;
  const rows = (s.exercises || []).filter((e) => e.sets.length).map((e) => {
    const hist = L.exerciseHistory(e.exerciseId, s.date).filter((h) => h.sessionId !== s.id && (h.date < s.date || h.at < (s.startedAt || 0)));
    const p = hist[hist.length - 1];
    const best = Math.max(...e.sets.map((x) => L.e1rm(x.w, x.reps, x.rir)));
    const reps = L.sum(e.sets.map((x) => x.reps)), pReps = p ? L.sum(p.sets.map((x) => x.reps)) : null;
    const w = Math.max(...e.sets.map((x) => x.w || 0)), pW = p ? Math.max(...p.sets.map((x) => x.w || 0)) : null;
    const pr = (s.prs || []).some((x) => x.exerciseId === e.exerciseId);
    const ex = db.get(e.exerciseId);
    const plan = e.plan || {};
    const nextSug = L.suggestFor(plan, ex, L.exerciseHistory(e.exerciseId));
    let verdict = 'first';
    if (p) verdict = best > p.best + 0.01 ? 'up' : best < p.best - 0.01 ? 'down' : 'same';
    return { e, p, best, reps, pReps, w, pW, pr, verdict, nextSug };
  });
  const ups = rows.filter((r) => r.verdict === 'up').length;
  return html`<div class="page">
    <${Head} title="Podsumowanie" sub=${s.name + ' · ' + L.fmtDate(s.date)} />
    <div class="g3">
      <div class="card tight red"><div class="lbl c-red">Czas</div><div class="n" style="font-size:26px">${fmt0(s.durationMin)}<span class="small mut"> min</span></div></div>
      <div class="card tight red"><div class="lbl c-red">Progres</div><div class="n" style="font-size:26px">${ups}/${rows.length}</div></div>
      <div class="card tight gold"><div class="lbl c-gold">Rekordy</div><div class="n" style="font-size:26px">${(s.prs || []).length}</div></div>
    </div>
    <div class="card tight"><div class="row between small"><span class="mut">Objętość</span><span><b>${fmt0(v)} kg</b>${pv ? html` <span class=${v >= pv ? 'up' : 'down'}>${v >= pv ? '+' : ''}${Math.round(((v - pv) / pv) * 100)}% vs ostatnio</span>` : null}</span></div>
      <div class="row between small"><span class="mut">RPE</span><span>${s.rpe || '–'}/10</span></div></div>
    ${rows.map((r) => html`<div class="card" style="gap:8px">
      <div class="row between"><div style="font-weight:600;font-size:16px">${r.e.name}</div>
        ${r.pr ? html`<span class="chip" style="color:var(--gold)"><${Icon} n="trophy" s=${14} />rekord</span>` : r.verdict === 'up' ? html`<span class="chip up">progres</span>` : r.verdict === 'down' ? html`<span class="chip down">słabiej</span>` : r.verdict === 'same' ? html`<span class="chip">bez zmian</span>` : html`<span class="chip">pierwszy raz</span>`}</div>
      <div class="small">${fmt1(r.w)} kg × ${r.e.sets.map((x) => x.reps).join(' / ')}
        ${r.p ? html` <span class="mut2">(poprz. ${fmt1(r.pW)} × ${r.p.sets.map((x) => x.reps).join('/')})</span>` : null}</div>
      ${r.p ? html`<div class="xs mut">${r.w > r.pW ? `+${fmt1(r.w - r.pW)} kg` : r.w < r.pW ? `${fmt1(r.w - r.pW)} kg` : 'ten sam ciężar'} · ${r.reps - r.pReps >= 0 ? '+' : ''}${r.reps - r.pReps} powt. · e1RM ${fmt1(r.p.best)} → ${fmt1(r.best)}</div>` : null}
      <div class="xs c-acc">Następnym razem: ${r.nextSug.text}</div>
    </div>`)}
    <button type="button" class="btn lg full b-acc" onClick=${() => nav.pop()}>Gotowe</button>
  </div>`;
}
registerScreen('workoutSummary', WorkoutSummary);
