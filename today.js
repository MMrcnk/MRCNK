// MRCNK – ekran Dziś, poranek, medytacja, wieczór, karta dnia, szybkie dodawanie
import { html, useState, useEffect, useRef, useDB, useTick, nav, toast, Icon, Check, Rating, Bar, Head, Field, Empty, Seg, NumIn, registerScreen, confirmSheet } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';

const { fmt1, fmt0, fmtMin, fmtHM } = L;

// ================= EKRAN DZIŚ =================
export function TodayTab({ date: forced }) {
  useDB();
  const tick = useTick(30000);
  const today = L.todayKey();
  const date = forced || today;
  const isToday = date === today;
  const s = L.settings();
  useEffect(() => { L.ensureRecurring(date); }, [date]);
  const d = L.parse(date);
  const hour = new Date().getHours();
  const d1 = L.day(date);
  const evening = isToday && hour >= s.eveningHour && !d1.eveningDone;
  const streak = L.streakFull(today);

  return html`<div class="page">
    <div class="top">
      <div class="col" style="gap:2px">
        <div class="brand">MRCNK</div>
        <div class="title">${L.DOW[L.isoDow(date)]}, ${L.fmtShort(date)}</div>
      </div>
      <div class="streak" title="Dni z rzędu z pełnym dekalogiem"><${Icon} n="flame" s=${16} /><span class="n" style="font-size:17px">${streak} ${streak === 1 ? 'DZIEŃ' : 'DNI'} 10/10</span></div>
    </div>
    ${!isToday ? html`<button type="button" class="chip" style="align-self:flex-start" onClick=${() => nav.pop()}><${Icon} n="back" s=${14} />${date < today ? 'Edytujesz przeszły dzień' : 'Planujesz przyszły dzień'} · wróć</button>` : null}
    ${evening ? html`<${EveningCTA} date=${date} />` : null}
    <${DekalogCard} date=${date} />
    ${isToday && hour < s.eveningHour ? html`<${YesterdayRule6} date=${date} />` : null}
    <${ResolutionCard} date=${date} />
    <${WeekPriorities} date=${date} />
    <${MorningCard} date=${date} />
    <${FocusCard} date=${date} />
    <${TasksCard} date=${date} />
    <${TrainingCard} date=${date} />
    <${HealthGrid} date=${date} />
    ${!evening ? (d1.eveningDone
      ? html`<button type="button" class="card gold" style="text-align:left" onClick=${() => nav.push('dayCard', { date })}>
          <div class="row between"><div class="ctitle c-gold">Dzień podsumowany</div><${Icon} n="next" /></div>
          <div class="small mut">Zobacz kartę dnia</div></button>`
      : html`<button type="button" class="btn lg full b-acc" style="height:64px;justify-content:space-between;padding:0 20px;border-radius:18px" onClick=${() => nav.push('evening', { date })}>
          <span class="h" style="font-size:24px;letter-spacing:1px">Podsumuj dzień</span><${Icon} n="arrow" w=${2.5} /></button>`) : null}
  </div>`;
}

function EveningCTA({ date }) {
  return html`<button type="button" class="card acc" style="text-align:left" onClick=${() => nav.push('evening', { date })}>
    <div class="row between"><div class="lbl c-acc">Wieczór</div><${Icon} n="moon" s=${18} /></div>
    <div class="h" style="font-size:28px">Podsumuj dzień</div>
    <div class="small mut">Dekalog · samopoczucie · Top G / Bottom G · zadania na jutro</div>
  </button>`;
}

// ---------- dekalog ----------
function DekalogCard({ date }) {
  const [open, setOpen] = useState(false);
  const sc = L.dekalogScore(date);
  const left = sc.rules.filter((r, i) => sc.states[i].ok !== true).map((r) => r.short);
  return html`<div class="card">
    <button type="button" class="row between" style="width:100%" onClick=${() => setOpen(!open)} aria-expanded=${open}>
      <div class="ctitle c-gold">Dekalog</div>
      <div class="row" style="gap:8px"><div class="n" style="font-size:26px;line-height:1"><span class="c-gold">${sc.done}</span><span class="mut2">/${sc.total}</span></div><${Icon} n=${open ? 'up' : 'down'} s=${18} /></div>
    </button>
    <${Seg} states=${sc.states.map((x) => x.ok === true)} />
    ${!open ? (left.length ? html`<div class="small mut">Zostało ${left.length}: ${left.slice(0, 3).join(' · ')}${left.length > 3 ? ` · +${left.length - 3}` : ''}</div>` : html`<div class="small c-gold">Pełny dekalog. Tak trzymaj jutro.</div>`) : html`
      <div class="col" style="gap:0">
        ${sc.rules.map((r, i) => html`<${RuleRow} date=${date} rule=${r} st=${sc.states[i]} idx=${i} />`)}
      </div>
      <div class="xs mut2">AUTO = aplikacja sprawdza z Twoich danych. Tapnij status, żeby poprawić ręcznie.</div>`}
  </div>`;
}

export function RuleRow({ date, rule, st, idx, showText = true }) {
  const cycle = () => {
    const man = (L.day(date).dek || {})[rule.id];
    let next;
    if (rule.auto) next = man === undefined || man === null ? !st.ok : null; // auto → przeciwny → auto
    else next = man === true ? false : man === false ? null : true;
    L.setRule(date, rule.id, next);
  };
  return html`<div class="li" style="align-items:flex-start;padding:10px 0">
    <div class="n mut3" style="width:22px;font-size:18px;padding-top:2px">${idx + 1}</div>
    <div class="grow col" style="gap:4px">
      <div style="font-size:15px;line-height:1.35">${showText ? rule.short : rule.text}</div>
      <div class="row" style="gap:6px">
        ${rule.auto ? html`<span class="chip" style="height:22px;font-size:10px;letter-spacing:1px">${st.manual ? 'RĘCZNIE' : 'AUTO · ' + (L.AUTO_LABEL[rule.auto] || '')}</span>` : null}
        ${rule.nextMorning ? html`<span class="chip" style="height:22px;font-size:10px">odhaczasz rano następnego dnia</span>` : null}
      </div>
    </div>
    <${Check} on=${st.ok === true} x=${st.ok === false} color="gold" onClick=${cycle} label=${'Zasada ' + (idx + 1)} />
  </div>`;
}

function YesterdayRule6({ date }) {
  const s = L.settings();
  const y = L.addDays(date, -1);
  const rules = (s.dekalog || []).filter((r) => r.nextMorning);
  const pending = rules.filter((r) => { const v = (L.day(y).dek || {})[r.id]; return v !== true && v !== false; });
  if (!pending.length) return null;
  const r = pending[0];
  return html`<div class="card gold">
    <div class="lbl c-gold">Wczoraj wieczorem</div>
    <div style="font-size:17px;font-weight:500;line-height:1.35">${r.text}</div>
    <div class="g2">
      <button type="button" class="btn b-gold" onClick=${() => L.setRule(y, r.id, true)}>Tak</button>
      <button type="button" class="btn b-ghost" onClick=${() => L.setRule(y, r.id, false)}>Nie</button>
    </div>
  </div>`;
}

// ---------- postanowienie ----------
function ResolutionCard({ date }) {
  const y = L.day(L.addDays(date, -1));
  if (!y.tomorrow) return null;
  const st = L.day(date).resolution;
  const B = (v, label, cls) => html`<button type="button" class=${'btn ' + (st === v ? cls : 'b-ghost')} onClick=${() => L.setDay(date, { resolution: st === v ? null : v })}>${label}</button>`;
  return html`<div class="card acc">
    <div class="lbl c-acc">Postanowienie z wczoraj</div>
    <div style="font-size:17px;font-weight:500;line-height:1.35">${y.tomorrow}</div>
    <div class="g3">${B('done', 'Zrobione', 'b-green')}${B('partial', 'Częściowo', 'b-gold')}${B('no', 'Nie', 'b-red')}</div>
  </div>`;
}

function WeekPriorities({ date }) {
  const wr = db.get('wr:' + L.weekStart(date));
  const pr = (wr && wr.priorities || []).filter(Boolean);
  if (!pr.length) return null;
  return html`<div class="card tight">
    <div class="lbl mut">Priorytety tygodnia</div>
    ${pr.map((p, i) => html`<div class="row" style="gap:10px"><span class="n c-acc" style="font-size:18px">${i + 1}</span><span style="font-size:15px">${p}</span></div>`)}
  </div>`;
}

// ---------- poranek ----------
function MorningCard({ date }) {
  const s = L.settings();
  const d = L.day(date);
  const m = d.morning || {};
  const items = s.morning || [];
  const isDone = (it) => (it.kind === 'wake' ? !!(d.wake && d.wake.done) : it.kind === 'weight' ? L.weightOn(date) != null : !!m[it.id]);
  const done = items.filter(isDone).length;
  const toggle = (it) => L.setDayDeep(date, 'morning', it.id, !m[it.id]);
  return html`<div class="card" style="gap:4px">
    <div class="row between" style="padding-bottom:6px"><div class="ctitle">Poranek</div><div class="small mut">${done}/${items.length}</div></div>
    ${items.map((it) => {
      if (it.kind === 'wake') {
        const w = d.wake || {};
        const ws = L.wakeStreak(L.todayKey());
        return html`<div class="li">
          <${Check} on=${w.done} onClick=${() => nav.sheet(WakeSheet, { date })} label=${it.label} />
          <button type="button" class="grow col" style="gap:2px;text-align:left" onClick=${() => nav.sheet(WakeSheet, { date })}>
            <div>${it.label}</div>
            ${w.done ? html`<div class="xs mut">${w.oneAlarm ? '1 budzik' : 'więcej niż 1 budzik'} · seria 1 budzika: ${ws} ${ws === 1 ? 'dzień' : 'dni'}</div>` : html`<div class="xs mut2">cel: ${s.wakeTarget}</div>`}
          </button>
          ${w.done ? html`<div class="n mut" style="font-size:18px">${w.time}</div>` : null}
        </div>`;
      }
      if (it.kind === 'weight') return html`<${WeightRow} date=${date} label=${it.label} />`;
      if (it.kind === 'water') {
        const on = !!m[it.id];
        return html`<div class="li">
          <${Check} on=${on} label=${it.label} onClick=${() => { L.setDay(date, { waterMl: Math.max(0, L.waterOn(date) + (on ? -1 : 1) * (it.ml || 250)), morning: { ...m, [it.id]: !on } }); }} />
          <div class="grow">${it.label}</div><div class="n mut" style="font-size:18px">+${it.ml || 250} ml</div>
        </div>`;
      }
      if (it.kind === 'meditation') {
        return html`<div class="li" style="min-height:56px">
          <${Check} on=${!!m[it.id]} onClick=${() => toggle(it)} label=${it.label} />
          <div class="grow">${it.label}</div>
          <button type="button" class="pill" style="border-color:var(--acc-line);background:#241A10;color:var(--acc);height:40px" onClick=${() => nav.push('meditation', { date, itemId: it.id })}><${Icon} n="play" s=${14} />${s.meditationMin}:00</button>
        </div>`;
      }
      return html`<div class="li"><${Check} on=${!!m[it.id]} onClick=${() => toggle(it)} label=${it.label} /><div class="grow">${it.label}</div></div>`;
    })}
  </div>`;
}

function WeightRow({ date, label }) {
  const s = L.settings();
  const kg = L.weightOn(date);
  const last = L.lastWeight(date);
  const a7 = L.weightAvg7(date);
  const save = (v) => { if (v == null) { if (kg != null) db.remove('w:' + date); return; } if (v < 30 || v > 250) { toast('Sprawdź wartość wagi'); return; } db.patch('weight', 'w:' + date, { date, kg: v }); };
  return html`<div class="li" style="min-height:64px">
    <${Check} on=${kg != null} onClick=${() => { if (kg == null && last) save(last.kg); }} label=${label} />
    <div class="grow col" style="gap:2px">
      <div>${label}</div>
      <div class="xs mut">${a7 != null ? `śr. 7 dni ${fmt1(a7)} kg · do celu ${fmt1(s.weightTarget - (a7 ?? 0))} kg` : 'wpisz poranny pomiar'}</div>
    </div>
    <div style="width:104px"><${NumIn} value=${kg} big placeholder=${last ? fmt1(last.kg) : '70,5'} onCommit=${save} style="text-align:right" /></div>
  </div>`;
}

function WakeSheet({ close, date }) {
  const w = L.day(date).wake || {};
  const [time, setTime] = useState(w.time || L.nowHM());
  const [one, setOne] = useState(w.oneAlarm ?? true);
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Pobudka</div>
    <${Field} label="O której wstałeś?"><input type="time" value=${time} onInput=${(e) => setTime(e.target.value)} /></${Field}>
    <div class="lbl mut">Za pierwszym budzikiem?</div>
    <div class="g2">
      <button type="button" class=${'btn ' + (one ? 'b-acc' : 'b-ghost')} onClick=${() => setOne(true)}>Tak, 1 budzik</button>
      <button type="button" class=${'btn ' + (!one ? 'b-red' : 'b-ghost')} onClick=${() => setOne(false)}>Nie</button>
    </div>
    <button type="button" class="btn lg full b-acc" onClick=${() => { L.setDay(date, { wake: { done: true, time, oneAlarm: one } }); close(); }}>Zapisz</button>
    ${w.done ? html`<button type="button" class="btn b-line" onClick=${() => { L.setDay(date, { wake: null }); close(); }}>Cofnij</button>` : null}
  </div>`;
}

// ---------- deep work ----------
function FocusCard({ date }) {
  const s = L.settings();
  const list = L.focusOn(date);
  const running = list.find((f) => f.status === 'running');
  useTick(1000, !!running);
  const total = L.sum(list.map((f) => L.focusMin(f)));
  const goal = s.focusDailyMin || 180;
  const inter = list.filter((f) => f.status === 'interrupted').length;
  return html`<div class="card blue">
    <div class="row between"><div class="ctitle c-blue">Deep Work</div><div class="small" style="color:var(--blue-mut)">cel ${fmtHM(goal)} h · ${list.length} ${list.length === 1 ? 'sesja' : 'sesje'} · ${inter} przerw.</div></div>
    <div class="mid">${fmtHM(total)}<span style="font-size:22px;color:#7F93AE"> / ${fmtHM(goal)} h</span></div>
    <${Bar} pct=${total / goal} color="var(--blue)" bg="#1D2A3D" />
    ${running
      ? html`<button type="button" class="btn lg full b-blue" onClick=${() => nav.push('focusRun', { id: running.id })}><${Icon} n="clock" s=${18} />Sesja trwa · ${fmtHM(L.focusMin(running))} · otwórz</button>`
      : html`<button type="button" class="btn lg full b-blue" onClick=${() => nav.push('focusSetup', { date })}><${Icon} n="play" s=${16} />Start sesji ${s.focusDefaultMin} min</button>`}
    ${list.length ? html`<button type="button" class="xs" style="color:var(--blue-mut);align-self:flex-start" onClick=${() => nav.push('focusHistory')}>Historia sesji →</button>` : null}
  </div>`;
}

// ---------- zadania ----------
function TasksCard({ date }) {
  const tasks = L.tasksOn(date);
  const done = tasks.filter((t) => t.done).length;
  const [txt, setTxt] = useState('');
  const add = () => {
    const t = txt.trim(); if (!t) return;
    const max = Math.max(0, ...tasks.map((x) => x.order || 0));
    db.patch('task', null, { title: t, date, order: max + 1, done: false, createdAt: Date.now() });
    setTxt('');
  };
  return html`<div class="card" style="gap:4px">
    <div class="row between" style="padding-bottom:6px"><div class="ctitle">Zadania biznes</div><div class="n" style="font-size:20px"><span class="c-blue">${done}</span><span class="mut2">/${tasks.length}</span></div></div>
    ${tasks.length ? tasks.map((t, i) => html`<div class="li">
      <${Check} on=${t.done} color="blue" onClick=${() => db.patch('task', t.id, { done: !t.done, doneAt: !t.done ? Date.now() : null })} label=${t.title} />
      <div class="n mut3" style="font-size:16px;width:16px">${i + 1}</div>
      <button type="button" class=${'grow ' + (t.done ? 'strike' : '')} style="text-align:left;font-size:16px;line-height:1.3;padding:8px 0" onClick=${() => nav.sheet(TaskSheet, { id: t.id })}>${t.title}${t.ruleId ? html` <span class="xs mut2">↻</span>` : null}</button>
    </div>`) : html`<div class="small mut" style="padding:6px 0 8px">Brak zadań na ten dzień. Wieczorem wpisujesz plan na jutro (dekalog, zasada 3).</div>`}
    <div class="row" style="gap:8px;padding-top:8px">
      <input placeholder="Dodaj zadanie…" value=${txt} onInput=${(e) => setTxt(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') add(); }} />
      <button type="button" class="btn b-blue" style="width:48px;padding:0" aria-label="Dodaj" onClick=${add}><${Icon} n="plus" /></button>
    </div>
  </div>`;
}

export function TaskSheet({ close, id }) {
  const t = db.get(id);
  const [title, setTitle] = useState(t ? t.title : '');
  const [date, setDate] = useState(t ? t.date : L.todayKey());
  if (!t) return null;
  const list = L.tasksOn(t.date);
  const idx = list.findIndex((x) => x.id === id);
  const move = (dir) => {
    const j = idx + dir; if (j < 0 || j >= list.length) return;
    const a = list[idx], b = list[j];
    const oa = a.order ?? idx, ob = b.order ?? j;
    db.patch('task', a.id, { order: ob === oa ? oa + dir : ob });
    db.patch('task', b.id, { order: oa });
  };
  const save = () => {
    const f = { title: title.trim() || t.title };
    if (date !== t.date) { f.date = date; f.moved = (t.moved || 0) + 1; f.order = 999; }
    db.patch('task', id, f); close();
  };
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Zadanie</div>
    <textarea style="min-height:64px" value=${title} onInput=${(e) => setTitle(e.target.value)}></textarea>
    <${Field} label="Dzień"><input type="date" value=${date} onInput=${(e) => setDate(e.target.value)} /></${Field}>
    <div class="g3">
      <button type="button" class="btn b-ghost" onClick=${() => move(-1)} disabled=${idx <= 0}><${Icon} n="up" s=${18} />Wyżej</button>
      <button type="button" class="btn b-ghost" onClick=${() => move(1)} disabled=${idx >= list.length - 1}><${Icon} n="down" s=${18} />Niżej</button>
      <button type="button" class="btn b-ghost" onClick=${() => setDate(L.addDays(t.date, 1))}>Jutro</button>
    </div>
    ${t.moved ? html`<div class="xs mut2">Przenoszone ${t.moved}×</div>` : null}
    <button type="button" class="btn lg full b-acc" onClick=${save}>Zapisz</button>
    <button type="button" class="btn b-danger" onClick=${() => { db.remove(id); close(); }}><${Icon} n="trash" s=${18} />Usuń</button>
  </div>`;
}

// ---------- treningi ----------
function TrainingCard({ date }) {
  const slots = L.slotsOn(date);
  const done = slots.filter((sl) => { const s = L.sessionFor(date, sl.key); return s && s.status === 'done'; }).length;
  return html`<div class="card red" style="gap:10px">
    <div class="row between"><div class="ctitle c-red">Treningi</div>
      <div class="row" style="gap:10px"><span class="small" style="color:var(--red-mut)">${done}/${slots.length}</span>
      <button type="button" class="xs" style="color:var(--red-mut)" onClick=${() => nav.sheet(DaySlotsSheet, { date })}>Zmień dziś</button></div></div>
    ${slots.length ? slots.map((sl) => html`<${SlotRow} date=${date} sl=${sl} />`) : html`<div class="small" style="color:var(--red-mut)">Dzień bez treningu w planie.</div>`}
  </div>`;
}

function SlotRow({ date, sl }) {
  const ses = L.sessionFor(date, sl.key);
  const st = ses ? ses.status : null;
  const sub = sl.label + ' · ' + (sl.kind === 'strength' ? 'siłowy' : 'trening');
  let right;
  if (st === 'done') right = html`<button type="button" class="pill on" style="background:#143322;color:var(--green);height:36px;font-size:13px" onClick=${() => sl.kind === 'strength' ? nav.push('workoutSummary', { id: ses.id }) : nav.sheet(SimpleSheet, { date, sl })}><${Icon} n="check" s=${14} w=${3} />Wykonany</button>`;
  else if (st === 'skipped') right = html`<button type="button" class="pill" style="height:36px;font-size:13px;color:var(--red-mut)" onClick=${() => db.remove(ses.id)}>Pominięty · cofnij</button>`;
  else if (st === 'running') right = html`<button type="button" class="btn sm b-red" onClick=${() => nav.push('workout', { id: ses.id })}>W trakcie →</button>`;
  else if (sl.kind === 'strength') right = html`<div class="row" style="gap:6px">
      <button type="button" class="btn sm b-red" onClick=${() => nav.push('workout', { date, slotKey: sl.key })}><${Icon} n="play" s=${14} />Start</button>
      <button type="button" class="btn sm b-line" style="border-color:var(--red-line);color:#E5C4C6" onClick=${() => nav.sheet(SkipSheet, { date, sl })}>Pomiń</button></div>`;
  else right = html`<div class="row" style="gap:6px">
      <button type="button" class="btn sm b-red" onClick=${() => nav.sheet(SimpleSheet, { date, sl })}>Byłem</button>
      <button type="button" class="btn sm b-line" style="border-color:var(--red-line);color:#E5C4C6" onClick=${() => nav.sheet(SkipSheet, { date, sl })}>Nie</button></div>`;
  let info = null;
  if (st === 'done' && sl.kind === 'strength') info = `${fmt0(ses.durationMin)} min${ses.prs && ses.prs.length ? ' · ' + ses.prs.length + ' rekord' + (ses.prs.length > 1 ? 'y' : '') : ''}`;
  if (st === 'done' && sl.kind !== 'strength') info = `${fmt0(ses.durationMin)} min${ses.intensity ? ' · intensywność ' + ses.intensity + '/10' : ''}`;
  if (st === 'skipped' && ses.reason) info = ses.reason;
  return html`<div class="row" style="background:var(--red-card);border-radius:14px;padding:12px;gap:10px">
    <div class="grow col" style="gap:2px">
      <div class="lbl" style="font-size:11px;color:var(--red-mut)">${sub}${sl.time ? ' · ' + sl.time : ''}</div>
      <div class="h" style="font-size:22px;line-height:1.1;text-transform:none">${sl.name}</div>
      ${info ? html`<div class="xs" style="color:var(--red-mut)">${info}</div>` : null}
    </div>
    ${right}
  </div>`;
}

function SkipSheet({ close, date, sl }) {
  const [reason, setReason] = useState('');
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Pomijasz: ${sl.name}</div>
    <div class="small mut">Zasada 7: „Trzymam się planu treningowego w 100%”. Zapisz, dlaczego – zobaczysz to w raporcie.</div>
    <textarea placeholder="Powód…" value=${reason} onInput=${(e) => setReason(e.target.value)}></textarea>
    <button type="button" class="btn lg full b-red" disabled=${!reason.trim()} onClick=${() => { db.patch('session', null, { date, slotKey: sl.key, name: sl.name, kind: sl.kind, workoutId: sl.workoutId, status: 'skipped', reason: reason.trim(), at: Date.now() }); close(); }}>Zapisz pominięcie</button>
  </div>`;
}

export function SimpleSheet({ close, date, sl }) {
  const ses = L.sessionFor(date, sl.key);
  const wk = sl.workoutId ? db.get(sl.workoutId) : null;
  const [min, setMin] = useState(ses ? ses.durationMin : (wk && wk.defaultMin) || 60);
  const [type, setType] = useState(ses ? ses.type || '' : '');
  const [int, setInt] = useState(ses ? ses.intensity : 7);
  const [feel, setFeel] = useState(ses ? ses.feeling : null);
  const [note, setNote] = useState(ses ? ses.note || '' : '');
  const types = ['Technika', 'Tarcze', 'Sparingi', 'Kondycja', 'Worek'];
  const save = () => {
    const f = { date, slotKey: sl.key, name: sl.name, kind: 'simple', workoutId: sl.workoutId || null, status: 'done', durationMin: L.num(min) || 0, type, intensity: int, feeling: feel, note, at: Date.now() };
    db.patch('session', ses ? ses.id : null, f); close(); toast('Zapisano: ' + sl.name);
  };
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">${sl.name}</div>
    <${Field} label="Czas (min)"><${NumIn} value=${min} onCommit=${setMin} /></${Field}>
    <div class="col" style="gap:6px"><div class="lbl mut">Rodzaj</div>
      <div class="row wrap" style="gap:6px">${types.map((t) => html`<button type="button" class=${'pill' + (type === t ? ' on' : '')} style=${type === t ? 'background:var(--red);color:var(--red-ink)' : ''} onClick=${() => setType(type === t ? '' : t)}>${t}</button>`)}</div></div>
    <div class="col" style="gap:6px"><div class="lbl mut">Intensywność 1–10</div><${Rating} max=${10} value=${int} onChange=${setInt} color="var(--red)" ink="var(--red-ink)" /></div>
    <div class="col" style="gap:6px"><div class="lbl mut">Samopoczucie po treningu</div><${Rating} value=${feel} onChange=${setFeel} color="var(--red)" ink="var(--red-ink)" /></div>
    <textarea placeholder="Notatka (opcjonalnie)" style="min-height:60px" value=${note} onInput=${(e) => setNote(e.target.value)}></textarea>
    <button type="button" class="btn lg full b-red" onClick=${save}>Zapisz trening</button>
    ${ses ? html`<button type="button" class="btn b-danger" onClick=${() => { db.remove(ses.id); close(); }}>Usuń wpis</button>` : null}
  </div>`;
}

function DaySlotsSheet({ close, date }) {
  const [slots, setSlots] = useState(JSON.parse(JSON.stringify(L.slotsOn(date))));
  const wks = db.all('workout').sort((a, b) => (a.order || 0) - (b.order || 0));
  const upd = (i, f) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...f } : s)));
  const hasOv = !!db.get('ov:' + date);
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Treningi: ${L.fmtShort(date)}</div>
    <div class="small mut">Zmiana tylko dla tego dnia. Plan tygodnia zostaje bez zmian.</div>
    ${slots.map((sl, i) => html`<div class="card tight" style="background:var(--card2)">
      <div class="g2">
        <input value=${sl.label} placeholder="Pora (np. Rano)" onInput=${(e) => upd(i, { label: e.target.value })} />
        <input type="time" value=${sl.time || ''} onInput=${(e) => upd(i, { time: e.target.value })} />
      </div>
      <select value=${sl.workoutId || ''} onChange=${(e) => { const w = db.get(e.target.value); upd(i, w ? { workoutId: w.id, name: w.name, kind: w.kind } : { workoutId: null }); }}>
        <option value="">— własny trening (bez szablonu) —</option>
        ${wks.map((w) => html`<option value=${w.id}>${w.name} (${w.kind === 'strength' ? 'siłowy' : 'prosty'})</option>`)}
      </select>
      ${!sl.workoutId ? html`<input value=${sl.name} placeholder="Nazwa treningu" onInput=${(e) => upd(i, { name: e.target.value, kind: 'simple' })} />` : null}
      <button type="button" class="btn xs b-danger" style="align-self:flex-end" onClick=${() => setSlots(slots.filter((_, j) => j !== i))}>Usuń</button>
    </div>`)}
    <button type="button" class="btn b-ghost" onClick=${() => setSlots([...slots, { key: db.uid().slice(0, 6), label: 'Dodatkowy', name: 'Trening', kind: 'simple', workoutId: null }])}><${Icon} n="plus" s=${18} />Dodaj trening</button>
    <button type="button" class="btn lg full b-red" onClick=${() => { db.patch('override', 'ov:' + date, { date, slots: slots.filter((s) => s.name) }); close(); }}>Zapisz dla tego dnia</button>
    ${hasOv ? html`<button type="button" class="btn b-line" onClick=${() => { db.remove('ov:' + date); close(); }}>Przywróć plan tygodnia</button>` : null}
  </div>`;
}

// ---------- zdrowie ----------
function HealthGrid({ date }) {
  const s = L.settings();
  const d = L.day(date);
  const water = L.waterOn(date);
  const kcal = L.kcalOn(date);
  const mac = L.macrosOn(date);
  const sups = L.supplements();
  const addW = (ml) => L.setDay(date, { waterMl: Math.max(0, water + ml) });
  return html`<div class="g2">
    <div class="card green tight">
      <div class="row between"><div class="lbl c-green">Woda</div><button type="button" class="xs" style="color:var(--green-mut)" onClick=${() => addW(-250)} aria-label="Odejmij 250 ml">−250</button></div>
      <div class="n" style="font-size:30px;line-height:1">${fmt1(water / 1000)}<span style="font-size:16px;color:var(--green-mut)"> / ${fmt1(s.waterTarget / 1000)} l</span></div>
      <${Bar} pct=${water / s.waterTarget} color="var(--green)" bg="#1C2E26" />
      <div class="g2" style="gap:6px">
        <button type="button" class="btn sm" style="background:var(--green-card);border:1px solid var(--green-line);color:var(--green)" onClick=${() => addW(250)}>+250</button>
        <button type="button" class="btn sm" style="background:var(--green-card);border:1px solid var(--green-line);color:var(--green)" onClick=${() => addW(500)}>+500</button>
      </div>
    </div>
    <div class="card green tight">
      <div class="row between"><div class="lbl c-green">Kalorie</div><button type="button" class="xs" style="color:var(--green-mut)" onClick=${() => nav.push('diet', { date })}>lista</button></div>
      <div class="n" style="font-size:30px;line-height:1">${fmt0(kcal)}<span style="font-size:16px;color:var(--green-mut)"> / ${s.kcalTarget}</span></div>
      <${Bar} pct=${kcal / s.kcalTarget} color="var(--green)" bg="#1C2E26" />
      ${mac.p || mac.f || mac.c ? html`<div class="xs" style="color:var(--green-mut)">B ${fmt0(mac.p)} · T ${fmt0(mac.f)} · W ${fmt0(mac.c)} g</div>` : null}
      <button type="button" class="btn sm" style="background:var(--green-card);border:1px solid var(--green-line);color:var(--green)" onClick=${() => nav.sheet(KcalSheet, { date })}>+ kcal</button>
    </div>
    <div class="card green tight span2">
      <div class="lbl c-green">Suplementy</div>
      <div class="row wrap" style="gap:8px">
        ${sups.length ? sups.map((sp) => { const on = !!(d.supps || {})[sp.id]; return html`<button type="button" class=${'pill' + (on ? ' on' : '')} style=${on ? 'background:var(--green);color:var(--green-ink)' : 'border-color:#2A4A3C;color:#CFE3D8'} onClick=${() => L.setDayDeep(date, 'supps', sp.id, !on)} aria-pressed=${on}>${on ? html`<${Icon} n="check" s=${14} w=${3} />` : null}${sp.name}</button>`; }) : html`<button type="button" class="small mut" onClick=${() => nav.push('supplements')}>Dodaj suplementy w Więcej → Dieta</button>`}
      </div>
    </div>
    <div class="card green tight span2">
      <div class="row between">
        <div class="lbl c-green">Sen</div>
        <div class="row" style="gap:6px"><div style="width:78px"><${NumIn} value=${d.sleepH} placeholder="h" onCommit=${(v) => L.setDay(date, { sleepH: v })} style="text-align:center;padding:8px" /></div><span class="small mut">h</span></div>
      </div>
      <div class="xs mut">Jakość snu</div>
      <${Rating} value=${d.sleepQ} onChange=${(v) => L.setDay(date, { sleepQ: v })} />
    </div>
  </div>`;
}

export function KcalSheet({ close, date }) {
  const [k, setK] = useState(null);
  const [name, setName] = useState('');
  const [p, setP] = useState(null); const [f, setF] = useState(null); const [c, setC] = useState(null);
  const [more, setMore] = useState(false);
  const meals = db.all('meal').sort((a, b) => (b.used || 0) - (a.used || 0));
  const entries = L.foodOn(date).sort((a, b) => (b.at || 0) - (a.at || 0));
  const add = (o) => { db.patch('food', null, { date, at: Date.now(), ...o }); toast(`+${o.kcal} kcal`); close(); };
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Dodaj kalorie</div>
    ${meals.length ? html`<div class="row wrap" style="gap:6px">${meals.slice(0, 12).map((m) => html`<button type="button" class="pill" style="border-color:#2A4A3C;color:#CFE3D8" onClick=${() => { db.patch('meal', m.id, { used: (m.used || 0) + 1 }); add({ kcal: m.kcal, p: m.p, f: m.f, c: m.c, name: m.name, mealId: m.id }); }}>${m.name} · ${m.kcal}</button>`)}</div>` : null}
    <div class="row" style="gap:8px"><div class="grow"><${NumIn} value=${k} big placeholder="kcal" onCommit=${setK} autoFocus /></div>
      <button type="button" class="btn lg b-green" disabled=${!k} onClick=${() => add({ kcal: Math.round(k), name: name.trim(), p, f, c })}>Dodaj</button></div>
    <input placeholder="Nazwa (opcjonalnie)" value=${name} onInput=${(e) => setName(e.target.value)} />
    ${more ? html`<div class="g3">
      <${Field} label="Białko g"><${NumIn} value=${p} onCommit=${setP} /></${Field}>
      <${Field} label="Tłuszcz g"><${NumIn} value=${f} onCommit=${setF} /></${Field}>
      <${Field} label="Węgle g"><${NumIn} value=${c} onCommit=${setC} /></${Field}>
    </div>` : html`<button type="button" class="small mut" style="align-self:flex-start" onClick=${() => setMore(true)}>+ makroskładniki</button>`}
    ${k && name.trim() ? html`<button type="button" class="btn b-ghost" onClick=${() => { db.patch('meal', null, { name: name.trim(), kcal: Math.round(k), p, f, c, used: 1 }); add({ kcal: Math.round(k), name: name.trim(), p, f, c }); }}>Dodaj i zapisz jako stały posiłek</button>` : null}
    ${entries.length ? html`<div class="col" style="gap:0"><div class="lbl mut" style="padding:6px 0">Dziś</div>
      ${entries.map((e) => html`<div class="li"><div class="grow">${e.name || 'Kalorie'} <span class="xs mut2">${L.hm(e.at || 0)}</span></div><div class="n" style="font-size:18px">${e.kcal}</div><button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(e.id)}><${Icon} n="trash" s=${18} /></button></div>`)}
    </div>` : null}
  </div>`;
}

// ================= SZYBKIE DODAWANIE =================
export function QuickAdd({ close }) {
  const date = L.todayKey();
  const [mode, setMode] = useState(null);
  const [v, setV] = useState('');
  if (mode === 'weight') return html`<div class="col"><div class="grab"></div><div class="h" style="font-size:24px">Waga</div>
    <${NumIn} value=${L.weightOn(date)} big autoFocus placeholder=${L.lastWeight(date) ? fmt1(L.lastWeight(date).kg) : 'kg'} onCommit=${(n) => { if (n) { db.patch('weight', 'w:' + date, { date, kg: n }); toast('Waga: ' + fmt1(n) + ' kg'); close(); } }} />
    <div class="xs mut2">Wpisz i naciśnij Enter.</div></div>`;
  if (mode === 'task') return html`<div class="col"><div class="grab"></div><div class="h" style="font-size:24px">Zadanie na dziś</div>
    <input autoFocus value=${v} onInput=${(e) => setV(e.target.value)} placeholder="Co do zrobienia?" onKeyDown=${(e) => { if (e.key === 'Enter' && v.trim()) { db.patch('task', null, { title: v.trim(), date, order: 999, done: false, createdAt: Date.now() }); toast('Dodano zadanie'); close(); } }} />
    <button type="button" class="btn lg full b-blue" disabled=${!v.trim()} onClick=${() => { db.patch('task', null, { title: v.trim(), date, order: 999, done: false, createdAt: Date.now() }); toast('Dodano zadanie'); close(); }}>Dodaj</button></div>`;
  if (mode === 'note') return html`<div class="col"><div class="grab"></div><div class="h" style="font-size:24px">Notatka</div>
    <textarea autoFocus value=${v} onInput=${(e) => setV(e.target.value)} placeholder="Przemyślenie, pomysł, obserwacja…"></textarea>
    <button type="button" class="btn lg full b-acc" disabled=${!v.trim()} onClick=${() => { db.patch('note', null, { text: v.trim(), at: Date.now(), date }); toast('Zapisano notatkę'); close(); }}>Zapisz</button></div>`;
  if (mode === 'kcal') return html`<${KcalSheet} close=${close} date=${date} />`;
  const T = (m, icon, label, color, fn) => html`<button type="button" class="card tight" style="align-items:flex-start;text-align:left" onClick=${fn || (() => setMode(m))}><span style=${'color:' + color}><${Icon} n=${icon} /></span><span style="font-weight:600">${label}</span></button>`;
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Szybko dodaj</div>
    <div class="g2">
      ${T('weight', 'scale', 'Waga', 'var(--acc)')}
      ${T('kcal', 'fork', 'Kalorie', 'var(--green)')}
      ${T('task', 'list', 'Zadanie', 'var(--blue)')}
      ${T('water', 'drop', 'Woda +250 ml', 'var(--green)', () => { L.setDay(date, { waterMl: L.waterOn(date) + 250 }); toast('+250 ml'); close(); })}
      ${T('note', 'note', 'Notatka', 'var(--gold)')}
      ${T('focus', 'clock', 'Deep Work', 'var(--blue)', () => { close(); nav.push('focusSetup', { date }); })}
    </div>
  </div>`;
}

// ================= MEDYTACJA =================
function Meditation({ date, itemId }) {
  const s = L.settings();
  const [min, setMin] = useState(s.meditationMin || 5);
  const [startAt, setStartAt] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [pausedAt, setPausedAt] = useState(null);
  const [finished, setFinished] = useState(false);
  const now = useTick(500, !!startAt && !finished);
  const photos = db.all('vision').filter((v) => v.photo);
  const goals = db.all('goal').filter((g) => !g.done);
  const slides = [...photos.map((p) => ({ img: p.photo, text: p.caption })), ...goals.map((g) => ({ img: g.photo, text: g.title, sub: g.why }))];
  const total = min * 60000;
  const elapsed = startAt ? (pausedAt || now) - startAt - pausedMs : 0;
  const left = Math.max(0, total - elapsed);
  const slideIdx = slides.length ? Math.floor(elapsed / 12000) % slides.length : 0;
  useEffect(() => { if (startAt && !finished && left <= 0) { setFinished(true); L.gong(); L.keepAwake(false); if (itemId) L.setDayDeep(date, 'morning', itemId, true); } }, [left, startAt]);
  useEffect(() => () => L.keepAwake(false), []);
  const start = () => { L.unlockAudio(); setStartAt(Date.now()); L.keepAwake(true); };
  const cur = slides[slideIdx];
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  return html`<div class="med">
    ${slides.map((sl, i) => sl.img ? html`<div class=${'med-img' + (startAt && i === slideIdx ? ' on' : '')} style=${`background-image:url(${sl.img})`}></div>` : null)}
    <div class="med-shade"></div>
    <button type="button" class="icon-btn" style="position:absolute;top:calc(14px + var(--safe-t));left:10px;color:#fff" aria-label="Zamknij" onClick=${() => nav.pop()}><${Icon} n="x" /></button>
    <div class="med-txt col" style="align-items:center;gap:18px">
      ${!startAt ? html`
        <div class="lbl" style="color:var(--acc)">Medytacja · Wizja</div>
        <div class="big">${min}:00</div>
        <div class="row" style="gap:8px">
          <button type="button" class="btn b-ghost" onClick=${() => setMin(Math.max(1, min - 1))} aria-label="Krócej"><${Icon} n="minus" /></button>
          <button type="button" class="btn b-ghost" onClick=${() => setMin(min + 1)} aria-label="Dłużej"><${Icon} n="plus" /></button>
        </div>
        <div class="small mut" style="max-width:340px">Wyobraź sobie, że już osiągnąłeś swoje cele. Potem ustaw cały dzień tak, żeby się do nich zbliżyć.</div>
        ${!slides.length ? html`<button type="button" class="small" style="color:var(--acc)" onClick=${() => nav.replace('vision')}>Dodaj cele i zdjęcia marzeń →</button>` : null}
        <button type="button" class="btn lg b-acc" style="min-width:200px" onClick=${start}><${Icon} n="play" s=${18} />Start</button>
      ` : finished ? html`
        <div class="h" style="font-size:40px">Gotowe</div>
        <div class="small mut">Medytacja odhaczona.</div>
        <button type="button" class="btn lg b-acc" style="min-width:200px" onClick=${() => nav.pop()}>Do dzieła</button>
      ` : html`
        ${cur ? html`<div class="h" style="font-size:34px;line-height:1.15;text-transform:none;max-width:560px">${cur.text || ''}</div>${cur.sub ? html`<div class="mut" style="font-size:16px">${cur.sub}</div>` : null}` : null}
        <div class="n" style="font-size:44px;opacity:.85">${mm}:${L.pad(ss)}</div>
        <button type="button" class="btn b-ghost" onClick=${() => { if (pausedAt) { setPausedMs(pausedMs + Date.now() - pausedAt); setPausedAt(null); } else setPausedAt(Date.now()); }}>${pausedAt ? 'Wznów' : 'Pauza'}</button>
      `}
    </div>
  </div>`;
}
registerScreen('meditation', Meditation);

// ================= KARTA DNIA =================
export function dayStats(d) {
  const sc = L.dekalogScore(d);
  const f = L.focusOn(d);
  const t = L.tasksOn(d);
  const slots = L.slotsOn(d);
  const ses = L.sessionsOn(d).filter((x) => x.status === 'done');
  const prs = L.sum(ses.map((x) => (x.prs || []).length));
  return {
    dek: sc.done, dekT: sc.total,
    focus: L.sum(f.map((x) => L.focusMin(x))), sessions: f.length, inter: f.filter((x) => x.status === 'interrupted').length,
    tasks: t.filter((x) => x.done).length, tasksT: t.length,
    tr: slots.filter((sl) => { const s = L.sessionFor(d, sl.key); return s && s.status === 'done'; }).length, trT: slots.length,
    prs, water: L.waterOn(d), kcal: L.kcalOn(d), weight: L.weightOn(d), sleep: L.day(d).sleepH,
  };
}

export function DayCard({ date }) {
  useDB();
  const s = L.settings();
  const a = dayStats(date), b = dayStats(L.addDays(date, -1));
  const d = L.day(date);
  const tm = L.tasksOn(L.addDays(date, 1));
  const delta = (x, y, unit = '', fmt = fmt0, inv) => {
    if (x == null || y == null) return html`<span class="mut2">–</span>`;
    const df = x - y;
    if (Math.abs(df) < 0.001) return html`<span class="mut2">=</span>`;
    const good = inv ? df < 0 : df > 0;
    return html`<span class=${good ? 'up' : 'down'}>${df > 0 ? '▲ +' : '▼ '}${fmt(df)}${unit}</span>`;
  };
  const R = (label, val, dl) => html`<tr><td>${label}</td><td class="r" style="font-weight:600">${val}</td><td class="r">${dl}</td></tr>`;
  return html`<div class="col">
    <div class="card gold">
      <div class="row between"><div class="lbl c-gold">Karta dnia · ${L.fmtShort(date)}</div><div class="n c-gold" style="font-size:40px;line-height:1">${a.dek}/${a.dekT}</div></div>
      <${Seg} states=${L.dekalogScore(date).states.map((x) => x.ok === true)} />
    </div>
    <div class="card" style="padding:6px 14px">
      <table class="tbl">
        <thead><tr><th></th><th class="r">Dziś</th><th class="r">vs wczoraj</th></tr></thead>
        <tbody>
          ${R('Dekalog', `${a.dek}/${a.dekT}`, delta(a.dek, b.dek))}
          ${R('Deep Work', fmtHM(a.focus) + ' h', delta(a.focus, b.focus, ' min'))}
          ${R('Sesje / przerwania', `${a.sessions} / ${a.inter}`, delta(a.inter, b.inter, '', fmt0, true))}
          ${R('Zadania biznes', `${a.tasks}/${a.tasksT}`, delta(a.tasks, b.tasks))}
          ${R('Treningi', `${a.tr}/${a.trT}`, delta(a.tr, b.tr))}
          ${a.prs ? R('Rekordy', a.prs, '') : null}
          ${R('Woda', fmt1(a.water / 1000) + ' l', delta(a.water, b.water, ' ml'))}
          ${R('Kalorie', `${fmt0(a.kcal)} / ${s.kcalTarget}`, delta(a.kcal, b.kcal))}
          ${a.weight != null ? R('Waga', fmt1(a.weight) + ' kg', delta(a.weight, b.weight, ' kg', fmt1)) : null}
          ${a.sleep != null ? R('Sen', fmt1(a.sleep) + ' h', delta(a.sleep, b.sleep, ' h', fmt1)) : null}
        </tbody>
      </table>
    </div>
    ${d.top || d.bottom ? html`<div class="card">
      ${d.top ? html`<div class="col" style="gap:4px"><div class="lbl c-green">Top G</div><div>${d.top}</div></div>` : null}
      ${d.bottom ? html`<div class="col" style="gap:4px"><div class="lbl c-red">Bottom G</div><div>${d.bottom}</div></div>` : null}
    </div>` : null}
    <div class="card acc">
      <div class="lbl c-acc">Jutro</div>
      ${d.tomorrow ? html`<div style="font-size:17px;font-weight:500">${d.tomorrow}</div>` : html`<div class="small mut">Brak postanowienia.</div>`}
      <div class="small mut">${tm.length} ${tm.length === 1 ? 'zadanie biznesowe zaplanowane' : tm.length % 10 >= 2 && tm.length % 10 <= 4 && (tm.length % 100 < 10 || tm.length % 100 >= 20) ? 'zadania biznesowe zaplanowane' : 'zadań biznesowych zaplanowanych'}</div>
    </div>
  </div>`;
}
registerScreen('dayCard', ({ date }) => html`<div class="page"><${Head} title="Karta dnia" sub=${L.DOW[L.isoDow(date)] + ', ' + L.fmtDate(date)} /><${DayCard} date=${date} /></div>`);

// ================= WIECZÓR =================
function Evening({ date }) {
  useDB();
  const [step, setStep] = useState(0);
  const s = L.settings();
  const d = L.day(date);
  const sc = L.dekalogScore(date);
  const tmr = L.addDays(date, 1);
  const steps = ['Dekalog', 'Samopoczucie', 'Top G / Bottom G', 'Jutro', 'Karta dnia'];
  const [top, setTop] = useState(d.top || '');
  const [bottom, setBottom] = useState(d.bottom || '');
  const [tom, setTom] = useState(d.tomorrow || '');
  const [txt, setTxt] = useState('');
  const saveTexts = () => L.setDay(date, { top: top.trim(), bottom: bottom.trim(), tomorrow: tom.trim() });
  const next = () => { if (step === 2) saveTexts(); setStep(Math.min(steps.length - 1, step + 1)); window.scrollTo(0, 0); };
  const prev = () => { if (step === 2) saveTexts(); setStep(Math.max(0, step - 1)); };
  const todayTasks = L.tasksOn(date).filter((t) => !t.done);
  const tTasks = L.tasksOn(tmr);
  const addT = () => { const t = txt.trim(); if (!t) return; db.patch('task', null, { title: t, date: tmr, order: tTasks.length + 1, done: false, createdAt: Date.now() }); setTxt(''); };
  const finish = () => { L.setDay(date, { eveningDone: true, eveningAt: Date.now() }); nav.pop(); toast('Dzień zamknięty. Jutro lepiej.'); };
  const isSunday = L.isoDow(date) === 6;

  return html`<div class="page">
    <${Head} title=${steps[step]} sub=${`Krok ${step + 1}/${steps.length} · ${L.fmtDate(date)}`} />
    <${Seg} states=${steps.map((_, i) => i <= step)} color="var(--acc)" />

    ${step === 0 ? html`<div class="card" style="gap:0">
      ${sc.rules.map((r, i) => html`<${RuleRow} date=${date} rule=${r} st=${sc.states[i]} idx=${i} />`)}
    </div><div class="xs mut2">Zasady z AUTO są wypełnione z Twoich danych. Tapnij, żeby poprawić.</div>` : null}

    ${step === 1 ? html`<div class="card green">
      ${[['energy', 'Energia'], ['mood', 'Nastrój'], ['fatigue', 'Zmęczenie'], ['soreness', 'Zakwasy / obolałość mięśni']].map(([k, label]) => html`<div class="col" style="gap:6px">
        <div class="row between"><div class="lbl c-green">${label}</div><div class="xs mut2">${k === 'fatigue' || k === 'soreness' ? '1 = brak · 5 = mocne' : '1 = źle · 5 = świetnie'}</div></div>
        <${Rating} value=${d[k]} onChange=${(v) => L.setDay(date, { [k]: v })} /></div>`)}
      <textarea placeholder="Notatka (opcjonalnie)" style="min-height:60px" value=${d.wellNote || ''} onBlur=${(e) => L.setDay(date, { wellNote: e.target.value })}></textarea>
    </div>` : null}

    ${step === 2 ? html`<div class="col">
      <div class="card green"><div class="lbl c-green">Co zrobiłem dziś dobrze? (jedna rzecz)</div>
        <textarea value=${top} onInput=${(e) => setTop(e.target.value)} placeholder="Top G wygrał, kiedy…"></textarea></div>
      <div class="card red"><div class="lbl c-red">Co zrobiłem dziś źle? (jedna rzecz)</div>
        <textarea value=${bottom} onInput=${(e) => setBottom(e.target.value)} placeholder="Bottom G wygrał, kiedy…"></textarea></div>
      <div class="card acc"><div class="lbl c-acc">Co jutro zrobię, żeby to poprawić? (jedna rzecz)</div>
        <textarea value=${tom} onInput=${(e) => setTom(e.target.value)} placeholder="Jedno konkretne działanie"></textarea>
        <div class="xs mut2">Rano zobaczysz to na ekranie Dziś.</div></div>
    </div>` : null}

    ${step === 3 ? html`<div class="col">
      ${todayTasks.length ? html`<div class="card red" style="gap:4px"><div class="lbl c-red" style="padding-bottom:6px">Niewykonane dziś</div>
        ${todayTasks.map((t) => html`<div class="li"><div class="grow">${t.title}</div>
          <button type="button" class="btn xs b-ghost" onClick=${() => db.patch('task', t.id, { date: tmr, moved: (t.moved || 0) + 1, order: 0 })}>→ Jutro</button>
          <button type="button" class="btn xs b-green" onClick=${() => db.patch('task', t.id, { done: true, doneAt: Date.now() })}>Zrobione</button>
          <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(t.id)}><${Icon} n="trash" s=${18} /></button></div>`)}
      </div>` : null}
      <div class="card blue" style="gap:4px">
        <div class="row between" style="padding-bottom:6px"><div class="lbl c-blue">Zadania biznes na jutro</div><div class="xs" style="color:var(--blue-mut)">od najważniejszego</div></div>
        ${tTasks.map((t, i) => html`<div class="li"><div class="n mut3" style="width:18px;font-size:16px">${i + 1}</div><button type="button" class="grow" style="text-align:left" onClick=${() => nav.sheet(TaskSheet, { id: t.id })}>${t.title}</button></div>`)}
        <div class="row" style="gap:8px;padding-top:8px">
          <input placeholder="Dodaj zadanie na jutro…" value=${txt} onInput=${(e) => setTxt(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') addT(); }} />
          <button type="button" class="btn b-blue" style="width:48px;padding:0" aria-label="Dodaj" onClick=${addT}><${Icon} n="plus" /></button>
        </div>
      </div>
      <div class="xs mut2">Treningi, suplementy i woda wchodzą automatycznie z planu tygodnia.</div>
    </div>` : null}

    ${step === 4 ? html`<${DayCard} date=${date} />
      ${isSunday ? html`<button type="button" class="btn lg full b-gold" onClick=${() => { L.setDay(date, { eveningDone: true, eveningAt: Date.now() }); nav.replace('weekReview', { week: L.weekStart(date) }); }}>Przegląd tygodnia →</button>` : null}
      <button type="button" class="btn lg full b-acc" onClick=${finish}>Zakończ dzień</button>` : null}

    ${step < 4 ? html`<div class="g2" style="margin-top:6px">
      <button type="button" class="btn lg b-ghost" disabled=${step === 0} onClick=${prev}>Wstecz</button>
      <button type="button" class="btn lg b-acc" onClick=${next}>Dalej</button>
    </div>` : null}
  </div>`;
}
registerScreen('evening', Evening);
registerScreen('day', ({ date }) => html`<${TodayTab} date=${date} />`);
