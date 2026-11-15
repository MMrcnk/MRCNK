// MRCNK – raporty tygodniowe/miesięczne, porównanie okresów, przegląd tygodnia
import { html, useState, useDB, nav, toast, Icon, Bar, Head, Field, Empty, registerScreen, LineChart } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';
import * as sync from './sync.js';

const { fmt1, fmt0, fmtHM, fmtMin } = L;

function periodOf(kind, anchor) {
  if (kind === 'week') { const f = L.weekStart(anchor); return { from: f, to: L.addDays(f, 6), label: `${L.fmtShort(f)} – ${L.fmtShort(L.addDays(f, 6))}` }; }
  const f = L.monthStart(anchor); const d = L.parse(f);
  return { from: f, to: L.monthEnd(f), label: `${L.MONTHS_N[d.getMonth()]} ${d.getFullYear()}` };
}
function shift(kind, anchor, n) {
  if (kind === 'week') return L.addDays(anchor, 7 * n);
  const d = L.parse(L.monthStart(anchor)); d.setMonth(d.getMonth() + n); return L.ymd(d);
}

export function ReportsTab() {
  useDB();
  const t = L.todayKey();
  const [kind, setKind] = useState('week');
  const [anchor, setAnchor] = useState(t);
  const p = periodOf(kind, anchor);
  const pp = periodOf(kind, shift(kind, anchor, -1));
  const cur = L.periodStats(p.from, p.to);
  const prev = L.periodStats(pp.from, pp.to);
  const s = L.settings();
  return html`<div class="page">
    <div class="top"><div class="col" style="gap:2px"><div class="brand">MRCNK</div><div class="title">Raporty</div></div></div>
    <div class="g3">
      ${[['week', 'Tydzień'], ['month', 'Miesiąc'], ['compare', 'Porównaj']].map(([k, l]) => html`<button type="button" class=${'btn sm ' + (kind === k ? 'b-acc' : 'b-ghost')} onClick=${() => setKind(k)}>${l}</button>`)}
    </div>
    ${kind === 'compare' ? html`<${Compare} />` : html`
      <div class="row between">
        <button type="button" class="icon-btn" aria-label="Wcześniej" onClick=${() => setAnchor(shift(kind, anchor, -1))}><${Icon} n="back" /></button>
        <div class="h" style="font-size:20px">${p.label}</div>
        <button type="button" class="icon-btn" aria-label="Później" disabled=${p.to >= t} onClick=${() => setAnchor(shift(kind, anchor, 1))}><${Icon} n="next" /></button>
      </div>
      ${kind === 'week' ? html`<button type="button" class="btn full b-gold" onClick=${() => nav.push('weekReview', { week: p.from })}><${Icon} n="star" s=${18} />Przegląd tygodnia i priorytety</button>` : null}
      <${Report} cur=${cur} prev=${prev} kind=${kind} p=${p} />`}
  </div>`;
}

export function Report({ cur, prev, kind, p }) {
  const s = L.settings();
  const facts = L.factInsights(cur, prev);
  const aiKey = `ai:${kind}:${p.from}`;
  const ai = db.get(aiKey);
  const [busy, setBusy] = useState(false);
  const [showEv, setShowEv] = useState(false);
  const runAI = async () => {
    setBusy(true);
    try {
      const notes = db.all('note').filter((n) => n.date >= p.from && n.date <= p.to).map((n) => n.text).slice(0, 40);
      const strip = (st) => ({ ...st, ruleRate: st.ruleRate.map((r) => ({ rule: r.rule.short, done: r.done, of: r.of })), moved: st.moved.map((m) => ({ title: m.title, moved: m.moved })), evenings: undefined });
      const res = await sync.invoke('ai', { mode: 'report', kind, period: p, stats: strip(cur), prevStats: strip(prev), evenings: cur.evenings.map((e) => ({ date: e.d, top: e.top, bottom: e.bottom, tomorrow: e.tomorrow })), notes, facts: facts.map((f) => f.text), goals: { weightTarget: s.weightTarget, kcalTarget: s.kcalTarget, waterTarget: s.waterTarget, focusDailyMin: s.focusDailyMin }, longGoals: db.all('goal').map((g) => g.title) });
      db.patch('ai', aiKey, { text: res.text, at: Date.now() });
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  const B = (label, a, b, fmt = fmt0, inv) => {
    let dl = null;
    if (a != null && b != null && isFinite(a) && isFinite(b) && Math.abs(a - b) > 0.001) { const good = inv ? a < b : a > b; dl = html`<span class=${'xs ' + (good ? 'up' : 'down')}>${a > b ? '▲' : '▼'} ${fmt(Math.abs(a - b))}</span>`; }
    return html`<div class="card tight"><div class="lbl mut">${label}</div><div class="row" style="gap:8px;align-items:baseline"><div class="n" style="font-size:26px">${a == null ? '–' : fmt(a)}</div>${dl}</div></div>`;
  };
  const icon = { plus: ['check', 'var(--green)'], minus: ['down', 'var(--red)'], problem: ['info', 'var(--amb)'] };
  const reasons = Object.entries(cur.reasons).sort((a, b) => b[1] - a[1]);
  const weightPts = L.range(p.from, p.to).map((d) => ({ x: L.fmtShort(d), y: L.weightOn(d) })).filter((x) => x.y != null);
  return html`<div class="col" style="gap:14px">
    <div class="g2">
      ${B('Dekalog śr.', cur.dekalogAvg, prev.dekalogAvg, fmt1)}
      ${B('Dni 10/10', cur.dekalogFull, prev.dekalogFull)}
      ${B('Deep Work (h)', cur.focusMin / 60, prev.focusMin / 60, fmt1)}
      ${B('Zadania %', cur.tasksPlanned ? (cur.tasksDone / cur.tasksPlanned) * 100 : null, prev.tasksPlanned ? (prev.tasksDone / prev.tasksPlanned) * 100 : null)}
      ${B('Treningi', cur.slotsDone, prev.slotsDone)}
      ${B('Waga śr.', cur.weightAvg, prev.weightAvg, fmt1)}
    </div>

    <div class="card">
      <div class="ctitle">Wnioski z danych</div>
      ${facts.length ? facts.map((f) => html`<div class="row" style="gap:10px;align-items:flex-start"><span style=${'color:' + icon[f.kind][1] + ';padding-top:2px'}><${Icon} n=${icon[f.kind][0]} s=${18} /></span><div style="font-size:15px;line-height:1.4">${f.text}</div></div>`) : html`<div class="small mut">Za mało danych w tym okresie.</div>`}
      <div class="xs mut2">Fakty liczone wprost z Twoich wpisów.</div>
    </div>

    <div class="card acc">
      <div class="row between"><div class="ctitle c-acc">Analiza AI</div>
        <button type="button" class="btn sm b-acc" disabled=${busy} onClick=${runAI}>${busy ? 'Analizuję…' : ai ? 'Odśwież' : 'Analizuj'}</button></div>
      ${ai ? html`<div style="white-space:pre-wrap;font-size:15px;line-height:1.5">${ai.text}</div><div class="xs mut2">Wygenerowano ${new Date(ai.at).toLocaleString('pl-PL')}. AI interpretuje liczby wyliczone przez aplikację, sama nic nie liczy.</div>`
        : html`<div class="small mut">Opis tygodnia, powtarzające się błędy z wieczornych analiz i maks. 3 rzeczy do zmiany. Wymaga połączenia z Supabase i funkcji AI.</div>`}
    </div>

    <div class="card">
      <div class="ctitle c-gold">Dekalog</div>
      ${cur.ruleRate.map((r, i) => html`<div class="col" style="gap:4px">
        <div class="row between small"><span>${i + 1}. ${r.rule.short}</span><span class="mut">${r.done}/${r.of}</span></div>
        <${Bar} pct=${r.pct} color=${r.pct >= 0.8 ? 'var(--gold)' : r.pct >= 0.5 ? 'var(--acc)' : 'var(--red)'} /></div>`)}
    </div>

    <div class="card blue">
      <div class="ctitle c-blue">Deep Work</div>
      <div class="g3 small">
        <div><div class="mut xs">Łącznie</div><b>${fmtHM(cur.focusMin)} h</b></div>
        <div><div class="mut xs">Sesje pełne</div><b>${cur.focusDone}/${cur.focusSessions}</b></div>
        <div><div class="mut xs">Przerwane</div><b>${cur.interrupted}</b></div>
      </div>
      ${reasons.length ? html`<div class="col" style="gap:4px"><div class="lbl" style="color:var(--blue-mut)">Powody przerwań</div>${reasons.map(([r, n]) => html`<div class="row between small"><span>${r}</span><span>${n}×</span></div>`)}</div>` : null}
      ${Object.keys(cur.byProject).length > 1 || (Object.keys(cur.byProject)[0] && Object.keys(cur.byProject)[0] !== 'Bez projektu') ? html`<div class="col" style="gap:4px"><div class="lbl" style="color:var(--blue-mut)">Projekty</div>${Object.entries(cur.byProject).sort((a, b) => b[1] - a[1]).map(([n, m]) => html`<div class="row between small"><span>${n}</span><span>${fmtHM(m)} h</span></div>`)}</div>` : null}
      ${cur.moved.length ? html`<div class="col" style="gap:4px"><div class="lbl" style="color:var(--blue-mut)">Najczęściej odkładane zadania</div>${[...cur.moved].sort((a, b) => b.moved - a.moved).slice(0, 5).map((m) => html`<div class="row between small"><span>${m.title}</span><span>${m.moved}×</span></div>`)}</div>` : null}
    </div>

    <div class="card red">
      <div class="ctitle c-red">Trening</div>
      <div class="g3 small">
        <div><div class="mut xs">Wykonane</div><b>${cur.slotsDone}/${cur.slotsPlanned}</b></div>
        <div><div class="mut xs">Pominięte</div><b>${cur.slotsSkipped}</b></div>
        <div><div class="mut xs">Obciążenie</div><b>${fmt0(cur.load)}</b></div>
      </div>
      ${cur.prs.length ? html`<div class="col" style="gap:4px"><div class="lbl c-gold">Rekordy</div>${cur.prs.map((r) => html`<div class="row between small"><span>${r.name}</span><span>e1RM ${fmt1(r.e1rm)} · ${L.fmtShort(r.date)}</span></div>`)}</div>` : null}
    </div>

    <div class="card green">
      <div class="ctitle c-green">Ciało i regeneracja</div>
      ${weightPts.length >= 2 ? html`<${LineChart} data=${weightPts} color="var(--green)" h=${110} target=${null} fmtY=${fmt1} labels />` : null}
      <div class="g2 small">
        <div><span class="mut">Waga śr.:</span> ${cur.weightAvg != null ? fmt1(cur.weightAvg) + ' kg' : '–'}</div>
        <div><span class="mut">Kalorie śr.:</span> ${cur.kcalAvg != null ? fmt0(cur.kcalAvg) + ' / ' + s.kcalTarget : '–'}</div>
        <div><span class="mut">Woda ≥ cel:</span> ${cur.waterOkDays}/${cur.days} dni</div>
        <div><span class="mut">Energia:</span> ${fmt1(cur.energy)}/5</div>
        <div><span class="mut">Nastrój:</span> ${fmt1(cur.mood)}/5</div>
        <div><span class="mut">Zmęczenie:</span> ${fmt1(cur.fatigue)}/5</div>
        <div><span class="mut">Obolałość:</span> ${fmt1(cur.soreness)}/5</div>
      </div>
    </div>

    <div class="card">
      <div class="ctitle">Postanowienia i wieczory</div>
      <div class="g3 small">
        <div><div class="mut xs">Zrobione</div><b class="up">${cur.resDone}</b></div>
        <div><div class="mut xs">Częściowo</div><b class="c-gold">${cur.resPartial}</b></div>
        <div><div class="mut xs">Nie</div><b class="down">${cur.resNo}</b></div>
      </div>
      <button type="button" class="small mut" style="align-self:flex-start" onClick=${() => setShowEv(!showEv)}>${showEv ? 'Ukryj' : 'Pokaż'} wpisy Top G / Bottom G (${cur.evenings.length})</button>
      ${showEv ? cur.evenings.map((e) => html`<div class="col" style="gap:3px;border-top:1px solid var(--line2);padding-top:8px">
        <div class="xs mut2">${L.DOW_S[L.isoDow(e.d)]} ${L.fmtShort(e.d)}</div>
        ${e.top ? html`<div class="small"><span class="c-green">+</span> ${e.top}</div>` : null}
        ${e.bottom ? html`<div class="small"><span class="c-red">−</span> ${e.bottom}</div>` : null}
        ${e.tomorrow ? html`<div class="small"><span class="c-acc">→</span> ${e.tomorrow}</div>` : null}
      </div>`) : null}
    </div>
  </div>`;
}

function Compare() {
  const t = L.todayKey();
  const [kind, setKind] = useState('month');
  const a = periodOf(kind, t), b = periodOf(kind, shift(kind, t, -1));
  const A = L.periodStats(a.from, a.to), B = L.periodStats(b.from, b.to);
  const rows = [
    ['Dekalog śr. /10', A.dekalogAvg, B.dekalogAvg, fmt1],
    ['Dni 10/10', A.dekalogFull, B.dekalogFull, fmt0],
    ['Deep Work h', A.focusMin / 60, B.focusMin / 60, fmt1],
    ['Sesje przerwane', A.interrupted, B.interrupted, fmt0, true],
    ['Zadania zrobione', A.tasksDone, B.tasksDone, fmt0],
    ['Treningi', A.slotsDone, B.slotsDone, fmt0],
    ['Rekordy', A.prs.length, B.prs.length, fmt0],
    ['Waga śr. kg', A.weightAvg, B.weightAvg, fmt1],
    ['Kalorie śr.', A.kcalAvg, B.kcalAvg, fmt0],
    ['Energia /5', A.energy, B.energy, fmt1],
    ['Pobudki 1 budzik', A.wakeOk, B.wakeOk, fmt0],
  ];
  return html`<div class="col">
    <div class="g2">${[['week', 'Tydzień vs poprzedni'], ['month', 'Miesiąc vs poprzedni']].map(([k, l]) => html`<button type="button" class=${'btn sm ' + (kind === k ? 'b-gold' : 'b-ghost')} onClick=${() => setKind(k)}>${l}</button>`)}</div>
    <div class="card" style="padding:6px 14px"><table class="tbl">
      <thead><tr><th></th><th class="r">${a.label}</th><th class="r">${b.label}</th></tr></thead>
      <tbody>${rows.map(([l, x, y, f, inv]) => { const better = x != null && y != null && (inv ? x < y : x > y); const worse = x != null && y != null && (inv ? x > y : x < y);
        return html`<tr><td>${l}</td><td class=${'r ' + (better ? 'up' : worse ? 'down' : '')} style="font-weight:600">${x == null ? '–' : f(x)}</td><td class="r mut">${y == null ? '–' : f(y)}</td></tr>`; })}</tbody>
    </table></div>
    <div class="xs mut2">Bieżący okres liczony do dziś.</div>
  </div>`;
}

// ---------- przegląd tygodnia ----------
function WeekReview({ week }) {
  useDB();
  const next = L.addDays(week, 7);
  const r = db.get('wr:' + week) || {};
  const rn = db.get('wr:' + next) || {};
  const st = L.periodStats(week, L.addDays(week, 6));
  const prev = L.periodStats(L.addDays(week, -7), L.addDays(week, -1));
  const facts = L.factInsights(st, prev);
  const [improved, setImproved] = useState(r.improved || '');
  const [problem, setProblem] = useState(r.problem || '');
  const [change, setChange] = useState(r.change || '');
  const [pr, setPr] = useState([...(rn.priorities || []), '', '', ''].slice(0, 3));
  const [task, setTask] = useState('');
  const [tday, setTday] = useState(next);
  const save = () => {
    db.patch('review', 'wr:' + week, { week, improved, problem, change, doneAt: Date.now() });
    db.patch('review', 'wr:' + next, { week: next, priorities: pr.map((x) => x.trim()).filter(Boolean) });
    toast('Przegląd zapisany'); nav.pop();
  };
  const plan = L.range(next, L.addDays(next, 6)).map((d) => ({ d, t: L.tasksOn(d) }));
  return html`<div class="page">
    <${Head} title="Przegląd tygodnia" sub=${`${L.fmtShort(week)} – ${L.fmtShort(L.addDays(week, 6))} · ok. 5 minut`} />
    <div class="g3">
      <div class="card tight gold"><div class="lbl c-gold">Dekalog</div><div class="n" style="font-size:24px">${fmt1(st.dekalogAvg)}</div></div>
      <div class="card tight blue"><div class="lbl c-blue">Deep Work</div><div class="n" style="font-size:24px">${fmtHM(st.focusMin)}</div></div>
      <div class="card tight red"><div class="lbl c-red">Treningi</div><div class="n" style="font-size:24px">${st.slotsDone}/${st.slotsPlanned}</div></div>
    </div>
    <div class="card">${facts.length ? facts.map((f) => html`<div class="small" style="line-height:1.4">${f.kind === 'plus' ? '✓' : f.kind === 'minus' ? '▼' : '!'} ${f.text}</div>`) : html`<div class="small mut">Mało danych z tego tygodnia.</div>`}
      <div class="small mut">Postanowienia: ${st.resDone} zrobione · ${st.resPartial} częściowo · ${st.resNo} nie</div></div>
    <div class="card green"><div class="lbl c-green">1. Co poprawiłem?</div><textarea value=${improved} onInput=${(e) => setImproved(e.target.value)}></textarea></div>
    <div class="card red"><div class="lbl c-red">2. Największy problem tygodnia</div><textarea value=${problem} onInput=${(e) => setProblem(e.target.value)}></textarea></div>
    <div class="card acc"><div class="lbl c-acc">3. Co zmieniam?</div><textarea value=${change} onInput=${(e) => setChange(e.target.value)}></textarea></div>
    <div class="card gold"><div class="lbl c-gold">4. Maks. 3 priorytety na kolejny tydzień</div>
      ${pr.map((x, i) => html`<div class="row" style="gap:10px"><span class="n c-gold" style="font-size:20px;width:16px">${i + 1}</span><input value=${x} onInput=${(e) => setPr(pr.map((y, j) => (j === i ? e.target.value : y)))} /></div>`)}</div>
    <div class="card blue" style="gap:8px"><div class="lbl c-blue">5. Najważniejsze zadania na przyszły tydzień</div>
      ${plan.filter((x) => x.t.length).map((x) => html`<div class="small"><b>${L.DOW_S[L.isoDow(x.d)]}</b> · ${x.t.map((y) => y.title).join(', ')}</div>`)}
      <div class="row" style="gap:6px"><select style="width:110px" value=${tday} onChange=${(e) => setTday(e.target.value)}>${L.range(next, L.addDays(next, 6)).map((d) => html`<option value=${d}>${L.DOW_S[L.isoDow(d)]} ${L.fmtShort(d)}</option>`)}</select>
        <input placeholder="Zadanie" value=${task} onInput=${(e) => setTask(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && task.trim()) { db.patch('task', null, { title: task.trim(), date: tday, order: 999, done: false, createdAt: Date.now() }); setTask(''); } }} />
        <button type="button" class="btn b-blue" style="width:48px;padding:0" aria-label="Dodaj" onClick=${() => { if (task.trim()) { db.patch('task', null, { title: task.trim(), date: tday, order: 999, done: false, createdAt: Date.now() }); setTask(''); } }}><${Icon} n="plus" /></button></div>
    </div>
    <button type="button" class="btn lg full b-acc" onClick=${save}>Zapisz przegląd</button>
  </div>`;
}
registerScreen('weekReview', WeekReview);
