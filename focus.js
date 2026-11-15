// MRCNK – Deep Work: sesje z wykrywaniem wyjścia z aplikacji
import { html, useState, useEffect, useDB, useTick, nav, toast, Icon, Check, Bar, Head, Field, Empty, NumIn, registerScreen, Bars } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';

const { fmtHM, fmtMin, fmt0 } = L;

export function deviceId() {
  let d = localStorage.getItem('mrcnk_device');
  if (!d) { d = db.uid(); localStorage.setItem('mrcnk_device', d); }
  return d;
}
const mine = (f) => f && f.device === deviceId();
export const runningFocus = () => db.all('focus').find((f) => f.status === 'running');

// ---------- strażnik sesji ----------
function interrupt(f, at, by) {
  db.patch('focus', f.id, { status: 'interrupted', end: at, interruptedBy: by, needReason: true, exits: [...(f.exits || []), { at, ms: Date.now() - at }] });
  L.keepAwake(false);
}
function onHide() {
  const f = runningFocus();
  if (!mine(f) || f.pausedAt) return;
  localStorage.setItem('mrcnk_hidden', JSON.stringify({ id: f.id, at: Date.now() }));
}
function onShow() {
  let h = null;
  try { h = JSON.parse(localStorage.getItem('mrcnk_hidden') || 'null'); } catch {}
  localStorage.removeItem('mrcnk_hidden');
  if (!h) return;
  const f = db.get(h.id);
  if (!f || f.status !== 'running' || f.pausedAt) return;
  const gap = Date.now() - h.at;
  const grace = (L.settings().graceSec || 15) * 1000;
  if (gap <= grace) {
    db.patch('focus', f.id, { exits: [...(f.exits || []), { at: h.at, ms: gap }] });
    toast(`Wróciłeś po ${Math.round(gap / 1000)} s – sesja trwa.`);
  } else interrupt(f, h.at, 'exit');
}
function beat() {
  const f = runningFocus();
  if (mine(f) && !document.hidden) localStorage.setItem('mrcnk_beat', JSON.stringify({ id: f.id, at: Date.now() }));
}
export function initFocusGuard() {
  // po ponownym uruchomieniu aplikacji
  const f = runningFocus();
  if (mine(f) && !f.pausedAt) {
    if (localStorage.getItem('mrcnk_hidden')) onShow();
    else {
      let b = null; try { b = JSON.parse(localStorage.getItem('mrcnk_beat') || 'null'); } catch {}
      const grace = (L.settings().graceSec || 15) * 1000;
      if (b && b.id === f.id && Date.now() - b.at > grace) interrupt(f, b.at, 'exit');
    }
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
  window.addEventListener('pagehide', onHide);
  setInterval(beat, 4000);
}

// ---------- start sesji ----------
function FocusSetup({ date }) {
  useDB();
  const s = L.settings();
  const run = runningFocus();
  useEffect(() => { if (run) nav.replace('focusRun', { id: run.id }); }, []);
  const tasks = L.tasksOn(date).filter((t) => !t.done);
  const [sel, setSel] = useState(tasks.map((t) => t.id));
  const [min, setMin] = useState(s.focusDefaultMin || 90);
  const [proj, setProj] = useState(localStorage.getItem('mrcnk_lastproj') || '');
  const [newTask, setNewTask] = useState('');
  const projects = db.all('project').filter((p) => !p.archived);
  const ordered = sel.map((id) => db.get(id)).filter(Boolean);
  const toggle = (id) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= sel.length) return; const a = [...sel]; [a[i], a[j]] = [a[j], a[i]]; setSel(a); };
  const addTask = () => {
    const t = newTask.trim(); if (!t) return;
    const id = db.patch('task', null, { title: t, date, order: 999, done: false, createdAt: Date.now() });
    setSel([...sel, id]); setNewTask('');
  };
  const start = () => {
    L.unlockAudio();
    sel.forEach((id, i) => db.patch('task', id, { order: i + 1 }));
    localStorage.setItem('mrcnk_lastproj', proj);
    const id = db.patch('focus', null, { date, start: Date.now(), plannedMin: min, status: 'running', taskIds: sel, doneIds: [], pausedMs: 0, pauses: 0, exits: [], projectId: proj || null, device: deviceId() });
    localStorage.setItem('mrcnk_beat', JSON.stringify({ id, at: Date.now() }));
    L.keepAwake(true);
    nav.replace('focusRun', { id });
  };
  return html`<div class="page">
    <${Head} title="Sesja Deep Work" sub="Rozpisz zadania od najważniejszego" />
    <div class="card blue" style="gap:4px">
      <div class="lbl c-blue" style="padding-bottom:6px">Zadania w tej sesji (kolejność = priorytet)</div>
      ${ordered.map((t, i) => html`<div class="li">
        <div class="n c-blue" style="width:18px;font-size:18px">${i + 1}</div>
        <div class="grow">${t.title}</div>
        <button type="button" class="icon-btn" aria-label="Wyżej" onClick=${() => move(i, -1)}><${Icon} n="up" s=${18} /></button>
        <button type="button" class="icon-btn" aria-label="Niżej" onClick=${() => move(i, 1)}><${Icon} n="down" s=${18} /></button>
        <button type="button" class="icon-btn" aria-label="Usuń z sesji" onClick=${() => toggle(t.id)}><${Icon} n="x" s=${18} /></button>
      </div>`)}
      ${tasks.filter((t) => !sel.includes(t.id)).map((t) => html`<button type="button" class="li btn" style="justify-content:flex-start;height:auto;padding:0;border-radius:0;font-weight:400" onClick=${() => toggle(t.id)}>
        <span class="chk"></span><span class="grow mut" style="text-align:left">${t.title}</span></button>`)}
      <div class="row" style="gap:8px;padding-top:8px">
        <input placeholder="Dodaj zadanie do sesji…" value=${newTask} onInput=${(e) => setNewTask(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter') addTask(); }} />
        <button type="button" class="btn b-blue" style="width:48px;padding:0" aria-label="Dodaj" onClick=${addTask}><${Icon} n="plus" /></button>
      </div>
    </div>
    <div class="card">
      <div class="lbl mut">Czas sesji</div>
      <div class="row wrap" style="gap:6px">
        ${[25, 50, 90, 120].map((m) => html`<button type="button" class=${'pill' + (min === m ? ' on' : '')} style=${min === m ? 'background:var(--blue);color:var(--blue-ink)' : ''} onClick=${() => setMin(m)}>${m} min</button>`)}
        <div style="width:90px"><${NumIn} value=${min} onCommit=${(v) => v && setMin(Math.round(v))} style="text-align:center;padding:10px" /></div>
      </div>
      ${projects.length ? html`<${Field} label="Projekt (opcjonalnie)"><select value=${proj} onChange=${(e) => setProj(e.target.value)}><option value="">— bez projektu —</option>${projects.map((p) => html`<option value=${p.id}>${p.name}</option>`)}</select></${Field}>` : null}
      <button type="button" class="xs mut2" style="align-self:flex-start" onClick=${() => nav.push('projects')}>Zarządzaj projektami →</button>
    </div>
    <div class="card acc"><div class="small" style="line-height:1.45"><b class="c-acc">Zasada sesji:</b> wyjście z aplikacji na dłużej niż ${s.graceSec} s przerywa sesję. Przerwanie wymaga wpisania powodu i zostaje zapisane.</div></div>
    <button type="button" class="btn lg full b-blue" style="height:60px" disabled=${!sel.length} onClick=${start}><${Icon} n="play" s=${18} />Start · ${min} min</button>
    ${!sel.length ? html`<div class="xs mut2" style="text-align:center">Dodaj co najmniej jedno zadanie – zasada 2 dekalogu.</div>` : null}
  </div>`;
}
registerScreen('focusSetup', FocusSetup);

// ---------- trwająca sesja ----------
function FocusRun({ id }) {
  useDB();
  const f = db.get(id);
  const now = useTick(1000, f && f.status === 'running');
  const [hit, setHit] = useState(false);
  useEffect(() => { if (f && f.status === 'running') L.keepAwake(true); return () => L.keepAwake(false); }, []);
  const el = f ? L.focusMin(f, now) : 0;
  const left = f ? f.plannedMin - el : 1;
  useEffect(() => { if (f && f.status === 'running' && left <= 0 && !hit) { setHit(true); L.beep(3, 880); toast('Cel sesji osiągnięty.'); } }, [left <= 0]);
  if (!f) return html`<div class="page"><${Head} title="Sesja" /><${Empty}>Nie znaleziono sesji.</${Empty}></div>`;
  const tasks = (f.taskIds || []).map((x) => db.get(x)).filter(Boolean);
  const cur = tasks.find((t) => !t.done);
  const toggleTask = (t) => {
    db.patch('task', t.id, { done: !t.done, doneAt: !t.done ? Date.now() : null });
    const dn = new Set(f.doneIds || []); t.done ? dn.delete(t.id) : dn.add(t.id);
    db.patch('focus', f.id, { doneIds: [...dn] });
  };
  const pause = () => {
    if (f.pausedAt) db.patch('focus', f.id, { pausedMs: (f.pausedMs || 0) + Date.now() - f.pausedAt, pausedAt: null });
    else db.patch('focus', f.id, { pausedAt: Date.now(), pauses: (f.pauses || 0) + 1 });
  };
  const finish = () => {
    if (f.pausedAt) db.patch('focus', f.id, { pausedMs: (f.pausedMs || 0) + Date.now() - f.pausedAt, pausedAt: null });
    if (left > 0.05) { nav.sheet(EndEarlySheet, { id: f.id }); return; }
    db.patch('focus', f.id, { status: 'done', end: Date.now() });
    L.keepAwake(false); L.beep(1);
    nav.replace('focusDone', { id: f.id });
  };
  if (f.status !== 'running') return html`<${FocusDone} id=${id} />`;
  const pct = el / f.plannedMin;
  return html`<div class="page" style="min-height:100vh">
    <${Head} title="Deep Work" sub=${f.pausedAt ? 'PAUZA' : 'Sesja trwa · nie wychodź z aplikacji'} />
    <div class="card blue" style="align-items:center;text-align:center;padding:28px 16px">
      <div class="big" style=${left <= 0 ? 'color:var(--green)' : ''}>${left > 0 ? fmtClock(left) : '+' + fmtClock(-left)}</div>
      <div class="small" style="color:var(--blue-mut)">${left > 0 ? 'zostało' : 'ponad plan'} · upłynęło ${fmtClock(el)} z ${f.plannedMin} min</div>
      <div style="width:100%"><${Bar} pct=${pct} color=${left <= 0 ? 'var(--green)' : 'var(--blue)'} bg="#1D2A3D" /></div>
    </div>
    ${cur ? html`<div class="card acc"><div class="lbl c-acc">Teraz</div><div class="h" style="font-size:26px;text-transform:none;line-height:1.2">${cur.title}</div>
      <button type="button" class="btn lg b-acc" onClick=${() => toggleTask(cur)}><${Icon} n="check" w=${3} />Zrobione – następne</button></div>`
      : html`<div class="card green"><div class="lbl c-green">Wszystkie zadania sesji zrobione</div><div class="small mut">Dokończ czas sesji albo dodaj kolejne zadanie na ekranie Dziś.</div></div>`}
    <div class="card" style="gap:0">
      ${tasks.map((t, i) => html`<div class="li"><${Check} on=${t.done} color="blue" onClick=${() => toggleTask(t)} label=${t.title} /><div class="n mut3" style="width:16px">${i + 1}</div><div class=${'grow ' + (t.done ? 'strike' : '')}>${t.title}</div></div>`)}
    </div>
    <div class="g2">
      <button type="button" class="btn lg b-ghost" onClick=${pause}><${Icon} n=${f.pausedAt ? 'play' : 'pause'} s=${18} />${f.pausedAt ? 'Wznów' : 'Pauza'}</button>
      <button type="button" class=${'btn lg ' + (left <= 0 ? 'b-green' : 'b-danger')} onClick=${finish}>${left <= 0 ? 'Zakończ ✓' : 'Przerwij'}</button>
    </div>
    <div class="xs mut2" style="text-align:center">Wyjścia: ${(f.exits || []).length} · pauzy: ${f.pauses || 0}</div>
  </div>`;
}
registerScreen('focusRun', FocusRun);
const fmtClock = (min) => { const s = Math.max(0, Math.round(min * 60)); return `${Math.floor(s / 60)}:${L.pad(s % 60)}`; };

function EndEarlySheet({ close, id }) {
  const f = db.get(id);
  const [reason, setReason] = useState('');
  return html`<div class="col">
    <div class="grab"></div>
    <div class="h" style="font-size:24px">Przerywasz sesję</div>
    <div class="small mut">Po ${fmt0(L.focusMin(f))} z ${f.plannedMin} min. Dlaczego? Bez powodu sesja się nie zakończy.</div>
    <textarea autoFocus value=${reason} onInput=${(e) => setReason(e.target.value)} placeholder="Powód przerwania…"></textarea>
    <div class="row wrap" style="gap:6px">${['telefon', 'klient dzwoni', 'głód', 'zmęczenie', 'social media', 'ktoś przeszkodził'].map((r) => html`<button type="button" class="chip" onClick=${() => setReason(r)}>${r}</button>`)}</div>
    <div class="g2">
      <button type="button" class="btn lg b-ghost" onClick=${close}>Wracam do pracy</button>
      <button type="button" class="btn lg b-danger" disabled=${!reason.trim()} onClick=${() => { db.patch('focus', id, { status: 'interrupted', end: Date.now(), interruptedBy: 'manual', reason: reason.trim(), needReason: false }); L.keepAwake(false); close(); nav.replace('focusDone', { id }); }}>Przerwij</button>
    </div>
  </div>`;
}

export function ReasonOverlay() {
  useDB();
  const f = db.all('focus').find((x) => x.needReason);
  const [reason, setReason] = useState('');
  if (!f) return null;
  return html`<div class="sheet-bg" style="z-index:95"><div class="sheet">
    <div class="h c-red" style="font-size:28px">Sesja przerwana</div>
    <div style="font-size:16px;line-height:1.45">Wyszedłeś z aplikacji na dłużej niż ${L.settings().graceSec} s. Sesja zakończyła się po <b>${fmt0(L.focusMin(f))} min</b> z ${f.plannedMin}.</div>
    <div class="lbl mut">Dlaczego wyszedłeś? (wymagane)</div>
    <textarea value=${reason} onInput=${(e) => setReason(e.target.value)} placeholder="Powód…"></textarea>
    <div class="row wrap" style="gap:6px">${['telefon', 'wiadomość', 'social media', 'klient', 'przypadkiem'].map((r) => html`<button type="button" class="chip" onClick=${() => setReason(r)}>${r}</button>`)}</div>
    <button type="button" class="btn lg full b-red" disabled=${!reason.trim()} onClick=${() => { db.patch('focus', f.id, { reason: reason.trim(), needReason: false }); setReason(''); }}>Zapisz powód</button>
  </div></div>`;
}

function FocusDone({ id }) {
  useDB();
  const f = db.get(id);
  if (!f) return null;
  const tasks = (f.taskIds || []).map((x) => db.get(x)).filter(Boolean);
  const ok = f.status === 'done';
  return html`<div class="page">
    <${Head} title=${ok ? 'Sesja zakończona' : 'Sesja przerwana'} back=${false} />
    <div class=${'card ' + (ok ? 'green' : 'red')} style="align-items:center;text-align:center">
      <div class="big" style="font-size:80px">${fmtHM(L.focusMin(f))}</div>
      <div class="small mut">${ok ? 'pełna sesja' : 'przerwana: ' + (f.reason || '—')}</div>
    </div>
    <div class="card" style="gap:0">${tasks.map((t) => html`<div class="li"><${Check} on=${t.done} color="blue" onClick=${() => db.patch('task', t.id, { done: !t.done })} /><div class=${'grow ' + (t.done ? 'strike' : '')}>${t.title}</div></div>`)}</div>
    <div class="small mut" style="text-align:center">Dziś łącznie: ${fmtHM(L.focusTotal(f.date))} h</div>
    <div class="g2">
      <button type="button" class="btn lg b-ghost" onClick=${() => nav.pop()}>Gotowe</button>
      <button type="button" class="btn lg b-blue" onClick=${() => nav.replace('focusSetup', { date: f.date })}>Kolejna sesja</button>
    </div>
  </div>`;
}
registerScreen('focusDone', FocusDone);

// ---------- historia ----------
function FocusHistory() {
  useDB();
  const t = L.todayKey();
  const all = db.all('focus').filter((f) => f.status !== 'running').sort((a, b) => b.start - a.start);
  const tot = (from, to) => L.sum(db.all('focus').filter((f) => f.date >= from && f.date <= to).map((f) => L.focusMin(f)));
  const wk = L.weekStart(t);
  const days = L.range(L.addDays(t, -13), t);
  const s = L.settings();
  const byProj = {};
  db.all('focus').filter((f) => f.date >= L.monthStart(t)).forEach((f) => { const n = f.projectId ? db.get(f.projectId)?.name || 'Projekt' : 'Bez projektu'; byProj[n] = (byProj[n] || 0) + L.focusMin(f); });
  return html`<div class="page">
    <${Head} title="Deep Work" sub="Historia i statystyki" right=${html`<button type="button" class="btn sm b-ghost" onClick=${() => nav.push('projects')}>Projekty</button>`} />
    <div class="g3">
      ${[['Dziś', tot(t, t)], ['Tydzień', tot(wk, t)], ['Miesiąc', tot(L.monthStart(t), t)]].map(([l, v]) => html`<div class="card tight blue"><div class="lbl c-blue">${l}</div><div class="n" style="font-size:26px">${fmtHM(v)}</div></div>`)}
    </div>
    <div class="card"><div class="lbl mut">Ostatnie 14 dni (h)</div>
      <${Bars} data=${days.map((d) => { const v = L.focusTotal(d); return { x: L.DOW_S[L.isoDow(d)].slice(0, 2), y: Math.round(v / 6) / 10, color: v >= (s.focusDailyMin || 180) ? 'var(--green)' : 'var(--blue)' }; })} fmtY=${(v) => String(v).replace('.', ',')} />
    </div>
    ${Object.keys(byProj).length ? html`<div class="card" style="gap:6px"><div class="lbl mut">Projekty w tym miesiącu</div>
      ${Object.entries(byProj).sort((a, b) => b[1] - a[1]).map(([n, m]) => html`<div class="row between"><span>${n}</span><span class="n" style="font-size:18px">${fmtHM(m)} h</span></div>`)}</div>` : null}
    <div class="card" style="gap:0">
      ${all.length ? all.slice(0, 200).map((f) => html`<div class="li" style="align-items:flex-start;padding:10px 0">
        <div class="col grow" style="gap:2px">
          <div style="font-weight:600">${L.fmtShort(f.date)} · ${L.hm(f.start)} · ${fmt0(L.focusMin(f))} / ${f.plannedMin} min</div>
          <div class="xs mut">${(f.taskIds || []).length} zadań · zrobione ${(f.doneIds || []).length}${f.projectId ? ' · ' + (db.get(f.projectId)?.name || '') : ''}${(f.exits || []).length ? ' · wyjścia ' + f.exits.length : ''}</div>
          ${f.status === 'interrupted' ? html`<div class="xs c-red">Przerwana${f.interruptedBy === 'exit' ? ' (wyjście z aplikacji)' : ''}: ${f.reason || 'brak powodu'}</div>` : null}
        </div>
        <span class="chip" style=${f.status === 'done' ? 'color:var(--green)' : 'color:var(--red)'}>${f.status === 'done' ? 'pełna' : 'przerwana'}</span>
      </div>`) : html`<${Empty}>Jeszcze brak sesji.</${Empty}>`}
    </div>
  </div>`;
}
registerScreen('focusHistory', FocusHistory);

function Projects() {
  useDB();
  const [name, setName] = useState('');
  const list = db.all('project');
  return html`<div class="page">
    <${Head} title="Projekty" sub="Przypisujesz je do sesji Deep Work" />
    <div class="card" style="gap:0">
      ${list.length ? list.map((p) => html`<div class="li"><div class=${'grow ' + (p.archived ? 'mut2' : '')}>${p.name}</div>
        <button type="button" class="btn xs b-ghost" onClick=${() => db.patch('project', p.id, { archived: !p.archived })}>${p.archived ? 'Przywróć' : 'Archiwizuj'}</button></div>`) : html`<div class="small mut" style="padding:8px 0">Brak projektów.</div>`}
    </div>
    <div class="row" style="gap:8px"><input placeholder="Nowy projekt…" value=${name} onInput=${(e) => setName(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && name.trim()) { db.patch('project', null, { name: name.trim() }); setName(''); } }} />
      <button type="button" class="btn b-acc" onClick=${() => { if (name.trim()) { db.patch('project', null, { name: name.trim() }); setName(''); } }}>Dodaj</button></div>
  </div>`;
}
registerScreen('projects', Projects);

export function FocusMiniBar({ hidden }) {
  useDB();
  const f = runningFocus();
  useTick(1000, !!f);
  if (!f || hidden) return null;
  return html`<button type="button" onClick=${() => nav.push('focusRun', { id: f.id })} style="position:fixed;left:12px;right:12px;top:calc(8px + var(--safe-t));z-index:55;background:var(--blue);color:var(--blue-ink);border-radius:14px;height:44px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;max-width:560px;margin:0 auto;box-shadow:0 6px 24px rgba(0,0,0,.5)">
    <${Icon} n="clock" s=${18} />Deep Work · ${fmtClock(L.focusMin(f))}${f.pausedAt ? ' · pauza' : ''} · wróć
  </button>`;
}
