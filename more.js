// MRCNK – Więcej: waga, dieta, suplementy, zadania, wizja, notatki, dekalog, ustawienia, synchronizacja, powiadomienia
import { html, useState, useEffect, useDB, nav, toast, Icon, Check, Bar, Head, Field, Empty, NumIn, registerScreen, LineChart, confirmSheet } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';
import * as sync from './sync.js';
import { deviceId } from './focus.js';

const { fmt1, fmt0 } = L;
export const APP_VERSION = '4';
export const VAPID_PUBLIC_DEFAULT = 'BGU7QEoTnv3OuK2L6q7h-OIr1oCrUyNH0vJPp2U6IIx_co5tbJRHMxmnYJan7n_Rl6Q2KC9f_7XSYM3IYKxvqV0';

export function MoreTab() {
  useDB();
  const items = [
    ['weight', 'scale', 'Waga i sylwetka', 'var(--acc)'],
    ['diet', 'fork', 'Dieta i posiłki', 'var(--green)'],
    ['supplements', 'pill', 'Suplementy', 'var(--green)'],
    ['tasks', 'list', 'Zadania', 'var(--blue)'],
    ['focusHistory', 'clock', 'Deep Work – historia', 'var(--blue)'],
    ['vision', 'target', 'Wizja i cele', 'var(--gold)'],
    ['notes', 'note', 'Notatki', 'var(--gold)'],
    ['dekalog', 'star', 'Dekalog', 'var(--gold)'],
    ['settings', 'gear', 'Ustawienia i cele', 'var(--mut)'],
    ['notify', 'bell', 'Powiadomienia', 'var(--mut)'],
    ['syncScreen', 'sync', 'Konto, synchronizacja, kopia', 'var(--mut)'],
  ];
  return html`<div class="page">
    <div class="top"><div class="col" style="gap:2px"><div class="brand">MRCNK</div><div class="title">Więcej</div></div></div>
    <div class="card" style="gap:0;padding:4px 16px">
      ${items.map(([k, ic, l, c]) => html`<button type="button" class="li" style="width:100%;text-align:left;min-height:56px" onClick=${() => nav.push(k)}>
        <span style=${'color:' + c}><${Icon} n=${ic} /></span><span class="grow" style="font-weight:500">${l}</span><${Icon} n="next" s=${18} /></button>`)}
    </div>
    <${SyncBadge} />
    <div class="xs mut3" style="text-align:center">wersja ${APP_VERSION}</div>
  </div>`;
}

function SyncBadge() {
  const [st, setSt] = useState({ ...sync.status, user: sync.getUser() });
  useEffect(() => sync.onStatus(setSt), []);
  const txt = { off: 'Dane tylko na tym urządzeniu – połącz konto, żeby synchronizować', login: 'Zaloguj się, żeby synchronizować', syncing: 'Synchronizacja…', ok: 'Zsynchronizowano' + (st.last ? ' ' + L.hm(st.last) : ''), error: 'Błąd synchronizacji: ' + (st.error || ''), offline: 'Offline – zmiany wyślą się po połączeniu' }[st.state];
  return html`<button type="button" class="small mut" style="text-align:center" onClick=${() => nav.push('syncScreen')}>${txt}</button>`;
}

// ================= WAGA I SYLWETKA =================
function WeightScreen() {
  useDB();
  const s = L.settings();
  const t = L.todayKey();
  const [days, setDays] = useState(90);
  const tr = L.weightTrend(t);
  const ws = db.all('weight').sort((a, b) => (a.date < b.date ? 1 : -1));
  const from = L.addDays(t, -days + 1);
  const pts = L.range(from, t).map((d) => ({ x: L.fmtShort(d), y: L.weightAvg7(d) })).filter((p) => p.y != null);
  const raw = ws.filter((w) => w.date >= from).reverse().map((w) => ({ x: L.fmtShort(w.date), y: w.kg }));
  const wa = L.weightAvg7(t), wb = L.weightAvg7(L.addDays(t, -7));
  const meas = db.all('measure').sort((a, b) => (a.date < b.date ? 1 : -1));
  const photos = db.all('bodyphoto').sort((a, b) => (a.date < b.date ? 1 : -1));
  const [cmp, setCmp] = useState([]);
  const addPhoto = async (e) => { const f = e.target.files[0]; if (!f) return; const url = await L.compressImage(f, 1100, 0.75); db.patch('bodyphoto', null, { date: t, photo: url }); e.target.value = ''; toast('Dodano zdjęcie'); };
  return html`<div class="page">
    <${Head} title="Waga i sylwetka" />
    <div class="g3">
      <div class="card tight"><div class="lbl mut">Śr. 7 dni</div><div class="n" style="font-size:26px">${fmt1(wa)}</div></div>
      <div class="card tight"><div class="lbl mut">vs tydz. temu</div><div class=${'n ' + (wa != null && wb != null ? (wa >= wb ? 'up' : 'down') : '')} style="font-size:26px">${wa != null && wb != null ? (wa - wb >= 0 ? '+' : '') + fmt1(wa - wb) : '–'}</div></div>
      <div class="card tight gold"><div class="lbl c-gold">Do celu</div><div class="n" style="font-size:26px">${wa != null ? fmt1(s.weightTarget - wa) : '–'}</div></div>
    </div>
    <div class="card">
      <div class="row between"><div class="lbl mut">Średnia 7-dniowa · cel ${fmt1(s.weightTarget)} kg</div>
        <div class="row" style="gap:4px">${[30, 90, 365].map((d) => html`<button type="button" class=${'chip'} style=${days === d ? 'color:var(--acc);border-color:var(--acc-line)' : ''} onClick=${() => setDays(d)}>${d} d</button>`)}</div></div>
      <${LineChart} data=${pts} color="var(--acc)" fmtY=${fmt1} labels />
      ${raw.length >= 2 ? html`<div class="lbl mut">Pomiary</div><${LineChart} data=${raw} color="#8E8E97" h=${90} fmtY=${fmt1} />` : null}
    </div>
    <div class="card acc">
      <div class="lbl c-acc">Trend</div>
      ${tr.rate != null ? html`<div style="font-size:15px;line-height:1.45">Masa <b>${tr.dir}</b>: ${tr.rate >= 0 ? '+' : ''}${fmt1(tr.rate)} kg/tydz. (z ${tr.n} pomiarów, 4 tyg.). Potrzebne tempo do celu: ${tr.need != null ? fmt1(tr.need) + ' kg/tydz.' : '–'}.</div>` : html`<div class="small mut">Trend pojawi się po min. 6 pomiarach w ciągu 4 tygodni.</div>`}
      ${tr.hint ? html`<div class="small" style="line-height:1.45"><b class="c-amb">Sugestia:</b> ${tr.hint} <span class="mut">Cel zmieniasz sam w ustawieniach.</span></div>` : null}
    </div>
    <div class="card">
      <div class="lbl mut">Cel</div>
      <div class="g2">
        <${Field} label="Waga docelowa (kg)"><${NumIn} value=${s.weightTarget} onCommit=${(v) => v && L.setSettings({ weightTarget: v })} /></${Field}>
        <${Field} label="Termin"><input type="date" value=${s.weightDeadline} onInput=${(e) => L.setSettings({ weightDeadline: e.target.value })} /></${Field}>
      </div>
    </div>
    <div class="card" style="gap:0">
      <div class="lbl mut" style="padding-bottom:6px">Historia</div>
      ${ws.slice(0, 60).map((w) => html`<div class="li"><div class="grow">${L.DOW_S[L.isoDow(w.date)]} ${L.fmtShort(w.date)}.${w.date.slice(0, 4)}</div>
        <div style="width:96px"><${NumIn} value=${w.kg} onCommit=${(v) => (v ? db.patch('weight', w.id, { kg: v }) : db.remove(w.id))} style="text-align:right;padding:8px" /></div>
        <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(w.id)}><${Icon} n="trash" s=${18} /></button></div>`)}
      ${!ws.length ? html`<div class="small mut">Brak pomiarów.</div>` : null}
      <${AddPastWeight} />
    </div>
    <${Measurements} meas=${meas} />
    <div class="card">
      <div class="row between"><div class="lbl mut">Zdjęcia sylwetki</div><label class="btn sm b-ghost"><${Icon} n="img" s=${16} />Dodaj<input type="file" accept="image/*" style="display:none" onChange=${addPhoto} /></label></div>
      ${cmp.length === 2 ? html`<div class="g2">${cmp.map((id) => { const p = db.get(id); return p ? html`<div class="col" style="gap:4px"><img src=${p.photo} style="width:100%;border-radius:12px" alt="" /><div class="xs mut" style="text-align:center">${L.fmtShort(p.date)}.${p.date.slice(0, 4)}</div></div>` : null; })}</div>
        <button type="button" class="small mut" onClick=${() => setCmp([])}>Zamknij porównanie</button>` : null}
      ${photos.length ? html`<div class="photo-grid">${photos.map((p) => html`<button type="button" style=${'position:relative;border-radius:10px;outline:' + (cmp.includes(p.id) ? '2px solid var(--acc)' : 'none')} onClick=${() => setCmp(cmp.includes(p.id) ? cmp.filter((x) => x !== p.id) : [...cmp, p.id].slice(-2))}>
        <img src=${p.photo} alt="" /><span class="xs" style="position:absolute;left:6px;bottom:4px;background:rgba(0,0,0,.6);padding:2px 6px;border-radius:6px">${L.fmtShort(p.date)}</span></button>`)}</div>
        <div class="xs mut2">Zaznacz dwa zdjęcia, żeby porównać.</div>` : html`<div class="small mut">Brak zdjęć.</div>`}
      ${cmp.length === 1 ? html`<button type="button" class="btn xs b-danger" onClick=${() => confirmSheet('Usunąć zaznaczone zdjęcie?', () => { db.remove(cmp[0]); setCmp([]); }, 'Usuń')}>Usuń zaznaczone</button>` : null}
    </div>
  </div>`;
}
registerScreen('weight', WeightScreen);

function AddPastWeight() {
  const [d, setD] = useState(L.addDays(L.todayKey(), -1));
  const [v, setV] = useState(null);
  return html`<div class="row" style="gap:6px;padding-top:10px">
    <input type="date" value=${d} onInput=${(e) => setD(e.target.value)} style="width:auto;flex:1" />
    <div style="width:90px"><${NumIn} value=${v} placeholder="kg" onCommit=${setV} /></div>
    <button type="button" class="btn b-ghost" disabled=${!v} onClick=${() => { db.patch('weight', 'w:' + d, { date: d, kg: v }); setV(null); toast('Dodano'); }}>Dodaj</button>
  </div>`;
}

function Measurements({ meas }) {
  const parts = [['chest', 'Klatka'], ['waist', 'Talia'], ['arm', 'Ramię'], ['thigh', 'Udo'], ['hips', 'Biodra'], ['neck', 'Szyja']];
  const [f, setF] = useState({});
  const t = L.todayKey();
  return html`<div class="card">
    <div class="lbl mut">Obwody (cm)</div>
    <div class="g3">${parts.map(([k, l]) => html`<${Field} label=${l}><${NumIn} value=${f[k]} onCommit=${(v) => setF({ ...f, [k]: v })} /></${Field}>`)}</div>
    <button type="button" class="btn b-ghost" disabled=${!Object.values(f).some((x) => x)} onClick=${() => { db.patch('measure', null, { date: t, ...f }); setF({}); toast('Zapisano obwody'); }}>Zapisz pomiar z dziś</button>
    ${meas.length ? html`<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Data</th>${parts.map(([, l]) => html`<th class="r">${l}</th>`)}<th></th></tr></thead>
      <tbody>${meas.map((m) => html`<tr><td>${L.fmtShort(m.date)}</td>${parts.map(([k]) => html`<td class="r">${m[k] != null ? fmt1(m[k]) : '–'}</td>`)}<td><button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(m.id)}><${Icon} n="trash" s=${16} /></button></td></tr>`)}</tbody></table></div>` : null}
  </div>`;
}

// ================= DIETA =================
function DietScreen({ date: d0 }) {
  useDB();
  const s = L.settings();
  const [date, setDate] = useState(d0 || L.todayKey());
  const list = L.foodOn(date).sort((a, b) => (a.at || 0) - (b.at || 0));
  const k = L.kcalOn(date), m = L.macrosOn(date);
  const meals = db.all('meal').sort((a, b) => a.name.localeCompare(b.name));
  const week = L.range(L.addDays(date, -6), date).map((d) => ({ d, k: L.kcalOn(d) }));
  return html`<div class="page">
    <${Head} title="Dieta" />
    <div class="row between">
      <button type="button" class="icon-btn" aria-label="Poprzedni dzień" onClick=${() => setDate(L.addDays(date, -1))}><${Icon} n="back" /></button>
      <div class="h" style="font-size:20px">${L.DOW_S[L.isoDow(date)]} ${L.fmtShort(date)}</div>
      <button type="button" class="icon-btn" aria-label="Następny dzień" onClick=${() => setDate(L.addDays(date, 1))}><${Icon} n="next" /></button>
    </div>
    <div class="card green">
      <div class="n" style="font-size:40px;line-height:1">${fmt0(k)}<span style="font-size:18px;color:var(--green-mut)"> / ${s.kcalTarget} kcal</span></div>
      <${Bar} pct=${k / s.kcalTarget} color="var(--green)" bg="#1C2E26" />
      <div class="g3 small">
        <div>Białko <b>${fmt0(m.p)}</b>${s.proteinTarget ? ' / ' + s.proteinTarget : ''} g</div>
        <div>Tłuszcz <b>${fmt0(m.f)}</b>${s.fatTarget ? ' / ' + s.fatTarget : ''} g</div>
        <div>Węgle <b>${fmt0(m.c)}</b>${s.carbsTarget ? ' / ' + s.carbsTarget : ''} g</div>
      </div>
    </div>
    <div class="card" style="gap:0">
      ${list.length ? list.map((e) => html`<div class="li"><div class="grow col" style="gap:2px"><div>${e.name || 'Kalorie'}</div><div class="xs mut">${L.hm(e.at || 0)}${e.p || e.f || e.c ? ` · B ${fmt0(e.p)} T ${fmt0(e.f)} W ${fmt0(e.c)}` : ''}</div></div>
        <div style="width:90px"><${NumIn} value=${e.kcal} onCommit=${(v) => v ? db.patch('food', e.id, { kcal: Math.round(v) }) : null} style="text-align:right;padding:8px" /></div>
        <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(e.id)}><${Icon} n="trash" s=${18} /></button></div>`) : html`<div class="small mut" style="padding:8px 0">Brak wpisów.</div>`}
      <button type="button" class="btn b-green" style="margin-top:10px" onClick=${() => import('./today.js').then((m) => nav.sheet(m.KcalSheet, { date }))}><${Icon} n="plus" s=${18} />Dodaj</button>
    </div>
    <div class="card"><div class="lbl mut">Ostatnie 7 dni</div>
      ${week.map((w) => html`<div class="row" style="gap:10px"><span class="xs mut2" style="width:52px">${L.DOW_S[L.isoDow(w.d)]} ${L.fmtShort(w.d)}</span><div class="grow"><${Bar} pct=${w.k / s.kcalTarget} color=${w.k >= s.kcalTarget * 0.95 ? 'var(--green)' : 'var(--acc)'} /></div><span class="xs" style="width:44px;text-align:right">${w.k || '–'}</span></div>`)}
    </div>
    <div class="card" style="gap:0">
      <div class="lbl mut" style="padding-bottom:6px">Zapisane posiłki</div>
      ${meals.length ? meals.map((ml) => html`<div class="li"><div class="grow col" style="gap:2px"><input value=${ml.name} onBlur=${(e) => e.target.value.trim() && db.patch('meal', ml.id, { name: e.target.value.trim() })} style="padding:8px 10px" /></div>
        <div style="width:84px"><${NumIn} value=${ml.kcal} onCommit=${(v) => v && db.patch('meal', ml.id, { kcal: Math.round(v) })} style="padding:8px;text-align:right" /></div>
        <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(ml.id)}><${Icon} n="trash" s=${18} /></button></div>`) : html`<div class="small mut">Przy dodawaniu kalorii wpisz nazwę i wybierz „zapisz jako stały posiłek”.</div>`}
    </div>
  </div>`;
}
registerScreen('diet', DietScreen);

function Supplements() {
  useDB();
  const [n, setN] = useState('');
  const list = db.all('supplement').sort((a, b) => (a.order || 0) - (b.order || 0));
  return html`<div class="page">
    <${Head} title="Suplementy" sub="Odhaczasz je na ekranie Dziś" />
    <div class="card" style="gap:0">
      ${list.map((sp) => html`<div class="li">
        <input value=${sp.name} onBlur=${(e) => e.target.value.trim() && db.patch('supplement', sp.id, { name: e.target.value.trim() })} style="padding:8px 10px" class=${sp.active === false ? 'mut2' : ''} />
        <button type="button" class="btn xs b-ghost" onClick=${() => db.patch('supplement', sp.id, { active: sp.active === false })}>${sp.active === false ? 'Włącz' : 'Wyłącz'}</button>
        <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(sp.id)}><${Icon} n="trash" s=${18} /></button></div>`)}
    </div>
    <div class="row" style="gap:8px"><input placeholder="Nowy suplement…" value=${n} onInput=${(e) => setN(e.target.value)} />
      <button type="button" class="btn b-green" onClick=${() => { if (n.trim()) { db.patch('supplement', null, { name: n.trim(), order: list.length + 1, active: true }); setN(''); } }}>Dodaj</button></div>
    <div class="xs mut2">Zasada 8 dekalogu („Kreatyna”) odhacza się sama, gdy zaznaczysz suplement z „kreatyn” w nazwie.</div>
  </div>`;
}
registerScreen('supplements', Supplements);

// ================= ZADANIA =================
function TasksScreen() {
  useDB();
  const t = L.todayKey();
  const [tab, setTab] = useState('late');
  const all = db.all('task');
  const late = all.filter((x) => !x.done && x.date < t).sort((a, b) => (a.date < b.date ? -1 : 1));
  const upcoming = all.filter((x) => !x.done && x.date > t).sort((a, b) => (a.date < b.date ? -1 : 1));
  const done = all.filter((x) => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 100);
  const rules = db.all('taskrule');
  const [rt, setRt] = useState(''); const [rd, setRd] = useState([0, 1, 2, 3, 4]);
  const Row = (x) => html`<div class="li"><${Check} on=${x.done} color="blue" onClick=${() => db.patch('task', x.id, { done: !x.done, doneAt: !x.done ? Date.now() : null })} />
    <div class="grow col" style="gap:2px"><div class=${x.done ? 'strike' : ''}>${x.title}</div><div class="xs mut">${L.DOW_S[L.isoDow(x.date)]} ${L.fmtShort(x.date)}${x.moved ? ' · przenoszone ' + x.moved + '×' : ''}</div></div>
    ${tab === 'late' ? html`<button type="button" class="btn xs b-ghost" onClick=${() => db.patch('task', x.id, { date: t, moved: (x.moved || 0) + 1 })}>Na dziś</button>` : null}
    <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(x.id)}><${Icon} n="trash" s=${16} /></button></div>`;
  return html`<div class="page">
    <${Head} title="Zadania" />
    <div class="row wrap" style="gap:6px">${[['late', `Zaległe (${late.length})`], ['up', 'Nadchodzące'], ['rules', 'Powtarzalne'], ['done', 'Zrobione']].map(([k, l]) => html`<button type="button" class=${'btn sm ' + (tab === k ? 'b-blue' : 'b-ghost')} onClick=${() => setTab(k)}>${l}</button>`)}</div>
    ${tab === 'late' ? html`<div class="card" style="gap:0">${late.length ? late.map(Row) : html`<div class="small mut">Brak zaległych zadań.</div>`}</div>` : null}
    ${tab === 'up' ? html`<div class="card" style="gap:0">${upcoming.length ? upcoming.map(Row) : html`<div class="small mut">Brak zaplanowanych zadań. Przyszłe dni zaplanujesz w Kalendarzu.</div>`}</div>` : null}
    ${tab === 'done' ? html`<div class="card" style="gap:0">${done.length ? done.map(Row) : html`<div class="small mut">Jeszcze nic.</div>`}</div>` : null}
    ${tab === 'rules' ? html`
      <div class="card" style="gap:0">${rules.length ? rules.map((r) => html`<div class="li"><div class="grow col" style="gap:2px"><div class=${r.active ? '' : 'mut2'}>${r.title}</div><div class="xs mut">${r.days.map((d) => L.DOW_S[d]).join(', ')}</div></div>
        <button type="button" class="btn xs b-ghost" onClick=${() => db.patch('taskrule', r.id, { active: !r.active })}>${r.active ? 'Wstrzymaj' : 'Włącz'}</button>
        <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => db.remove(r.id)}><${Icon} n="trash" s=${16} /></button></div>`) : html`<div class="small mut">Zadania, które same pojawiają się w wybrane dni.</div>`}</div>
      <div class="card"><input placeholder="np. Raport dla klientów" value=${rt} onInput=${(e) => setRt(e.target.value)} />
        <div class="row wrap" style="gap:6px">${L.DOW_S.map((n, i) => html`<button type="button" class=${'pill' + (rd.includes(i) ? ' on' : '')} style=${'height:38px;' + (rd.includes(i) ? 'background:var(--blue);color:var(--blue-ink)' : '')} onClick=${() => setRd(rd.includes(i) ? rd.filter((x) => x !== i) : [...rd, i].sort())}>${n}</button>`)}</div>
        <button type="button" class="btn b-blue" disabled=${!rt.trim() || !rd.length} onClick=${() => { db.patch('taskrule', null, { title: rt.trim(), days: rd, active: true, from: t }); setRt(''); toast('Dodano zadanie powtarzalne'); }}>Dodaj</button></div>` : null}
  </div>`;
}
registerScreen('tasks', TasksScreen);

// ================= WIZJA =================
function VisionScreen() {
  useDB();
  const goals = db.all('goal').sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const photos = db.all('vision');
  const [title, setTitle] = useState(''); const [why, setWhy] = useState('');
  const addPhoto = async (e) => { for (const f of e.target.files) { const url = await L.compressImage(f, 1280, 0.78); db.patch('vision', null, { photo: url, caption: '', createdAt: Date.now() }); } e.target.value = ''; toast('Dodano'); };
  const goalPhoto = async (g, e) => { const f = e.target.files[0]; if (!f) return; db.patch('goal', g.id, { photo: await L.compressImage(f, 1280, 0.78) }); };
  return html`<div class="page">
    <${Head} title="Wizja i cele" sub="Wyświetlają się podczas porannej medytacji" />
    <div class="card gold">
      <div class="ctitle c-gold">Cele długoterminowe</div>
      ${goals.map((g) => html`<div class="col" style="gap:8px;background:var(--card2);border-radius:14px;padding:12px">
        <input value=${g.title} onBlur=${(e) => e.target.value.trim() && db.patch('goal', g.id, { title: e.target.value.trim() })} style="font-weight:600" />
        <textarea style="min-height:54px" placeholder="Dlaczego to dla mnie ważne?" value=${g.why || ''} onBlur=${(e) => db.patch('goal', g.id, { why: e.target.value })}></textarea>
        <div class="row" style="gap:8px">
          <input type="date" value=${g.deadline || ''} onInput=${(e) => db.patch('goal', g.id, { deadline: e.target.value })} style="flex:1" />
          <label class="btn sm b-ghost"><${Icon} n="img" s=${16} />${g.photo ? 'Zmień' : 'Zdjęcie'}<input type="file" accept="image/*" style="display:none" onChange=${(e) => goalPhoto(g, e)} /></label>
        </div>
        ${g.photo ? html`<img src=${g.photo} alt="" style="width:100%;max-height:200px;object-fit:cover;border-radius:10px" />` : null}
        <div class="row" style="gap:8px">
          <button type="button" class=${'btn xs ' + (g.done ? 'b-gold' : 'b-ghost')} onClick=${() => db.patch('goal', g.id, { done: !g.done, doneAt: !g.done ? Date.now() : null })}>${g.done ? 'Osiągnięty ✓' : 'Oznacz jako osiągnięty'}</button>
          <button type="button" class="btn xs b-danger" onClick=${() => confirmSheet('Usunąć cel?', () => db.remove(g.id), 'Usuń')}>Usuń</button>
        </div>
      </div>`)}
      <input placeholder="Nowy cel…" value=${title} onInput=${(e) => setTitle(e.target.value)} />
      <textarea style="min-height:54px" placeholder="Dlaczego? (opcjonalnie)" value=${why} onInput=${(e) => setWhy(e.target.value)}></textarea>
      <button type="button" class="btn b-gold" disabled=${!title.trim()} onClick=${() => { db.patch('goal', null, { title: title.trim(), why: why.trim(), createdAt: Date.now() }); setTitle(''); setWhy(''); }}>Dodaj cel</button>
    </div>
    <div class="card">
      <div class="row between"><div class="ctitle">Tablica marzeń</div><label class="btn sm b-ghost"><${Icon} n="img" s=${16} />Dodaj zdjęcia<input type="file" accept="image/*" multiple style="display:none" onChange=${addPhoto} /></label></div>
      ${photos.length ? html`<div class="col" style="gap:10px">${photos.map((p) => html`<div class="col" style="gap:6px">
        <img src=${p.photo} alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px" />
        <div class="row" style="gap:6px"><input placeholder="Podpis (wyświetla się podczas medytacji)" value=${p.caption || ''} onBlur=${(e) => db.patch('vision', p.id, { caption: e.target.value })} />
          <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => confirmSheet('Usunąć zdjęcie?', () => db.remove(p.id), 'Usuń')}><${Icon} n="trash" s=${18} /></button></div>
      </div>`)}</div>` : html`<div class="small mut">Dodaj zdjęcia rzeczy, do których dążysz.</div>`}
    </div>
  </div>`;
}
registerScreen('vision', VisionScreen);

// ================= NOTATKI =================
function NotesScreen() {
  useDB();
  const [q, setQ] = useState(''); const [txt, setTxt] = useState('');
  const notes = db.all('note').filter((n) => !q || n.text.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.at || 0) - (a.at || 0));
  return html`<div class="page">
    <${Head} title="Notatki" sub="Przemyślenia – trafiają do analizy tygodnia" />
    <div class="card"><textarea placeholder="Nowa notatka… (mikrofon w klawiaturze = dyktowanie)" value=${txt} onInput=${(e) => setTxt(e.target.value)}></textarea>
      <button type="button" class="btn b-gold" disabled=${!txt.trim()} onClick=${() => { db.patch('note', null, { text: txt.trim(), at: Date.now(), date: L.todayKey() }); setTxt(''); }}>Zapisz</button></div>
    <input placeholder="Szukaj…" value=${q} onInput=${(e) => setQ(e.target.value)} />
    ${notes.map((n) => html`<div class="card tight"><div class="row between"><div class="xs mut2">${new Date(n.at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${n.source === 'chat' ? ' · z chatu' : ''}</div>
      <button type="button" class="icon-btn" style="width:32px;height:32px" aria-label="Usuń" onClick=${() => confirmSheet('Usunąć notatkę?', () => db.remove(n.id), 'Usuń')}><${Icon} n="trash" s=${16} /></button></div>
      <div style="white-space:pre-wrap;line-height:1.45">${n.text}</div></div>`)}
    ${!notes.length ? html`<${Empty}>Brak notatek.</${Empty}>` : null}
  </div>`;
}
registerScreen('notes', NotesScreen);

// ================= DEKALOG =================
function DekalogScreen() {
  useDB();
  const s = L.settings();
  const t = L.todayKey();
  const rules = s.dekalog || [];
  const set = (list) => L.setSettings({ dekalog: list });
  const upd = (i, f) => set(rules.map((r, j) => (j === i ? { ...r, ...f } : r)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= rules.length) return; const a = [...rules]; [a[i], a[j]] = [a[j], a[i]]; set(a); };
  const autos = [['', 'ręcznie (wieczorem)'], ['wake', 'auto: pobudka'], ['focus', 'auto: Deep Work ≥ 90 min'], ['tasks', 'auto: 100% zadań'], ['training', 'auto: treningi'], ['creatine', 'auto: kreatyna'], ['water', 'auto: woda ≥ cel']];
  const st30 = L.periodStats(L.addDays(t, -29), t);
  return html`<div class="page">
    <${Head} title="Dekalog" sub="10 zasad, które dadzą mi wszystko, czego chcę" />
    ${rules.map((r, i) => { const rr = st30.ruleRate[i]; return html`<div class="card gold" style="gap:8px">
      <div class="row between"><div class="n c-gold" style="font-size:28px">${i + 1}</div>
        <div class="row" style="gap:0"><span class="xs mut" style="margin-right:6px">seria ${L.streakRule(t, r)} · 30 dni ${rr ? rr.done : 0}/${rr ? rr.of : 0}</span>
          <button type="button" class="icon-btn" aria-label="Wyżej" onClick=${() => move(i, -1)}><${Icon} n="up" s=${18} /></button>
          <button type="button" class="icon-btn" aria-label="Niżej" onClick=${() => move(i, 1)}><${Icon} n="down" s=${18} /></button></div></div>
      <textarea style="min-height:60px" value=${r.text} onBlur=${(e) => upd(i, { text: e.target.value })}></textarea>
      <input value=${r.short} placeholder="Skrót na ekran Dziś" onBlur=${(e) => upd(i, { short: e.target.value })} />
      <div class="g2">
        <select value=${r.auto || ''} onChange=${(e) => upd(i, { auto: e.target.value || null })}>${autos.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
        <button type="button" class=${'btn sm ' + (r.nextMorning ? 'b-gold' : 'b-ghost')} onClick=${() => upd(i, { nextMorning: !r.nextMorning })}>Odhaczam rano</button>
      </div>
      <button type="button" class="xs mut2" style="align-self:flex-end" onClick=${() => confirmSheet('Usunąć zasadę?', () => set(rules.filter((_, j) => j !== i)), 'Usuń')}>usuń zasadę</button>
    </div>`; })}
    <button type="button" class="btn b-ghost" onClick=${() => set([...rules, { id: 'd' + Date.now(), short: 'Nowa zasada', text: 'Nowa zasada', auto: null }])}><${Icon} n="plus" s=${18} />Dodaj zasadę</button>
    <button type="button" class="small mut" onClick=${() => confirmSheet('Przywrócić oryginalny dekalog?', () => set(L.DEKALOG_DEFAULT), 'Przywróć', false)}>Przywróć oryginalny dekalog</button>
  </div>`;
}
registerScreen('dekalog', DekalogScreen);

// ================= USTAWIENIA =================
function SettingsScreen() {
  useDB();
  const s = L.settings();
  const set = (k) => (v) => v != null && L.setSettings({ [k]: v });
  const morning = s.morning || [];
  const updM = (list) => L.setSettings({ morning: list });
  const kinds = [['wake', 'pobudka'], ['water', 'woda (+ml)'], ['weight', 'waga'], ['meditation', 'medytacja'], ['check', 'zwykły punkt']];
  return html`<div class="page">
    <${Head} title="Ustawienia" />
    <div class="card"><div class="ctitle">Cele</div>
      <div class="g2">
        <${Field} label="Kalorie / dzień"><${NumIn} value=${s.kcalTarget} onCommit=${set('kcalTarget')} /></${Field}>
        <${Field} label="Woda (ml)"><${NumIn} value=${s.waterTarget} onCommit=${set('waterTarget')} /></${Field}>
        <${Field} label="Białko g (opcj.)"><${NumIn} value=${s.proteinTarget} onCommit=${(v) => L.setSettings({ proteinTarget: v })} /></${Field}>
        <${Field} label="Tłuszcz g (opcj.)"><${NumIn} value=${s.fatTarget} onCommit=${(v) => L.setSettings({ fatTarget: v })} /></${Field}>
        <${Field} label="Węgle g (opcj.)"><${NumIn} value=${s.carbsTarget} onCommit=${(v) => L.setSettings({ carbsTarget: v })} /></${Field}>
        <${Field} label="Deep Work / dzień (min)"><${NumIn} value=${s.focusDailyMin} onCommit=${set('focusDailyMin')} /></${Field}>
        <${Field} label="Waga docelowa"><${NumIn} value=${s.weightTarget} onCommit=${set('weightTarget')} /></${Field}>
        <${Field} label="Termin celu"><input type="date" value=${s.weightDeadline} onInput=${(e) => L.setSettings({ weightDeadline: e.target.value })} /></${Field}>
        <${Field} label="Wzrost (cm)"><${NumIn} value=${s.heightCm} onCommit=${set('heightCm')} /></${Field}>
      </div></div>
    <div class="card"><div class="ctitle">Rytm dnia</div>
      <div class="g2">
        <${Field} label="Pobudka (cel)"><input type="time" value=${s.wakeTarget} onInput=${(e) => L.setSettings({ wakeTarget: e.target.value })} /></${Field}>
        <${Field} label="Tolerancja (min)"><${NumIn} value=${s.wakeTolerance} onCommit=${(v) => L.setSettings({ wakeTolerance: v || 0 })} /></${Field}>
        <${Field} label="Wieczór od godziny"><${NumIn} value=${s.eveningHour} onCommit=${set('eveningHour')} /></${Field}>
        <${Field} label="Koniec dnia o (h)" hint="Analiza po północy trafia do właściwego dnia"><${NumIn} value=${s.dayBoundaryHour} onCommit=${set('dayBoundaryHour')} /></${Field}>
        <${Field} label="Medytacja (min)"><${NumIn} value=${s.meditationMin} onCommit=${set('meditationMin')} /></${Field}>
        <${Field} label="Sesja Deep Work (min)"><${NumIn} value=${s.focusDefaultMin} onCommit=${set('focusDefaultMin')} /></${Field}>
        <${Field} label="Łaska przy wyjściu (s)"><${NumIn} value=${s.graceSec} onCommit=${set('graceSec')} /></${Field}>
      </div></div>
    <div class="card"><div class="ctitle">Poranna rutyna</div>
      ${morning.map((m, i) => html`<div class="row" style="gap:6px">
        <input value=${m.label} onBlur=${(e) => updM(morning.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
        <select style="width:130px" value=${m.kind} onChange=${(e) => updM(morning.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>${kinds.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select>
        <button type="button" class="icon-btn" aria-label="Wyżej" onClick=${() => { if (!i) return; const a = [...morning]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; updM(a); }}><${Icon} n="up" s=${16} /></button>
        <button type="button" class="icon-btn" aria-label="Usuń" onClick=${() => updM(morning.filter((_, j) => j !== i))}><${Icon} n="trash" s=${16} /></button></div>`)}
      <button type="button" class="btn sm b-ghost" onClick=${() => updM([...morning, { id: 'm' + Date.now(), label: 'Nowy punkt', kind: 'check' }])}><${Icon} n="plus" s=${16} />Dodaj punkt</button>
    </div>
  </div>`;
}
registerScreen('settings', SettingsScreen);

// ================= SYNCHRONIZACJA I KOPIA =================
function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const csv = (rows) => rows.map((r) => r.map((v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');

function SyncScreen() {
  const cfg = sync.getCfg();
  const [st, setSt] = useState({ ...sync.status, user: sync.getUser() });
  useEffect(() => sync.onStatus(setSt), []);
  const [url, setUrl] = useState(cfg ? cfg.url : '');
  const [key, setKey] = useState(cfg ? cfg.key : '');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const user = st.user;
  const go = async (fn) => { setBusy(true); try { await fn(); } catch (e) { toast(e.message || String(e)); } setBusy(false); };
  const exportJson = () => download(`mrcnk-kopia-${L.todayKey()}.json`, JSON.stringify(db.exportAll()));
  const importJson = async (e) => { const f = e.target.files[0]; if (!f) return; try { await db.importAll(JSON.parse(await f.text())); toast('Zaimportowano kopię'); } catch (err) { toast(err.message); } e.target.value = ''; };
  const exportCsv = () => {
    const days = db.all('day').sort((a, b) => (a.date < b.date ? -1 : 1));
    download('mrcnk-dni.csv', csv([['data', 'dekalog', 'waga', 'kcal', 'woda_ml', 'sen_h', 'jakosc_snu', 'energia', 'nastroj', 'zmeczenie', 'deep_work_min', 'top_g', 'bottom_g', 'jutro'],
      ...days.map((d) => [d.date, L.dekalogScore(d.date).done, L.weightOn(d.date), L.kcalOn(d.date), d.waterMl, d.sleepH, d.sleepQ, d.energy, d.mood, d.fatigue, Math.round(L.focusTotal(d.date)), d.top, d.bottom, d.tomorrow])]), 'text/csv');
    const sets = db.all('session').filter((s) => s.status === 'done' && s.exercises).flatMap((s) => s.exercises.flatMap((e) => e.sets.map((x, i) => [s.date, s.name, e.name, i + 1, x.w, x.reps, x.rir])));
    setTimeout(() => download('mrcnk-serie.csv', csv([['data', 'trening', 'cwiczenie', 'seria', 'kg', 'powt', 'rir'], ...sets]), 'text/csv'), 400);
    const fo = db.all('focus').map((f) => [f.date, L.hm(f.start), Math.round(L.focusMin(f)), f.plannedMin, f.status, f.reason || '', f.projectId ? db.get(f.projectId)?.name : '']);
    setTimeout(() => download('mrcnk-deep-work.csv', csv([['data', 'start', 'min', 'plan_min', 'status', 'powod', 'projekt'], ...fo]), 'text/csv'), 800);
  };
  const stTxt = { off: 'Nie połączono', login: 'Połączono z Supabase – zaloguj się', syncing: 'Synchronizacja…', ok: 'Zsynchronizowano' + (st.last ? ' o ' + L.hm(st.last) : ''), error: 'Błąd: ' + (st.error || ''), offline: 'Offline' }[st.state];
  return html`<div class="page">
    <${Head} title="Konto i kopia" />
    <div class="card"><div class="ctitle">Status</div><div class="small">${stTxt}</div>${user ? html`<div class="small mut">${user.email}</div>` : null}
      ${user ? html`<div class="g2"><button type="button" class="btn sm b-acc" onClick=${() => sync.syncNow()}>Synchronizuj teraz</button><button type="button" class="btn sm b-ghost" onClick=${() => go(sync.signOut)}>Wyloguj</button></div>` : null}
    </div>
    ${cfg && !user ? html`<div class="card"><div class="ctitle">Logowanie</div>
      <input type="email" autocomplete="username" placeholder="e-mail" value=${email} onInput=${(e) => setEmail(e.target.value)} />
      <input type="password" autocomplete="current-password" placeholder="hasło" value=${pw} onInput=${(e) => setPw(e.target.value)} />
      <div class="g2"><button type="button" class="btn b-acc" disabled=${busy} onClick=${() => go(() => sync.signIn(email.trim(), pw))}>Zaloguj</button>
        <button type="button" class="btn b-ghost" disabled=${busy} onClick=${() => go(async () => { const r = await sync.signUp(email.trim(), pw); toast(r.session ? 'Konto utworzone' : 'Konto utworzone – potwierdź e-mail i zaloguj się'); })}>Załóż konto</button></div>
      <div class="xs mut2">Jedno konto na telefonie i komputerze. Dane lokalne zostaną wysłane do chmury po zalogowaniu.</div></div>` : null}
    <div class="card"><div class="ctitle">Supabase</div>
      <${Field} label="Project URL"><input placeholder="https://xxxx.supabase.co" value=${url} onInput=${(e) => setUrl(e.target.value)} /></${Field}>
      <${Field} label="Klucz anon / publishable"><input placeholder="eyJ… lub sb_publishable_…" value=${key} onInput=${(e) => setKey(e.target.value)} /></${Field}>
      <button type="button" class="btn b-acc" onClick=${() => sync.setCfg(url, key)}>${cfg ? 'Zapisz i przeładuj' : 'Połącz'}</button>
      ${cfg ? html`<button type="button" class="small mut" onClick=${() => confirmSheet('Odłączyć Supabase na tym urządzeniu? Dane lokalne zostają.', () => sync.setCfg('', ''), 'Odłącz')}>Odłącz</button>` : null}
      <div class="xs mut2">Supabase → Project Settings → API. Klucz anon jest publiczny z założenia – Twoje dane chroni logowanie i RLS.</div>
    </div>
    <div class="card"><div class="ctitle">Kopia zapasowa</div>
      <button type="button" class="btn b-ghost" onClick=${exportJson}>Eksportuj pełną kopię (JSON)</button>
      <label class="btn b-ghost">Przywróć z kopii (JSON)<input type="file" accept="application/json,.json" style="display:none" onChange=${importJson} /></label>
      <button type="button" class="btn b-ghost" onClick=${exportCsv}>Eksportuj CSV (dni, serie, Deep Work)</button>
      <div class="xs mut2">Wszystkie dane są też zapisane lokalnie na urządzeniu i działają offline.</div>
    </div>
  </div>`;
}
registerScreen('syncScreen', SyncScreen);

// ================= POWIADOMIENIA =================
function b64ToUint8(b64) { const pad = '='.repeat((4 - (b64.length % 4)) % 4); const s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...s].map((c) => c.charCodeAt(0))); }

function NotifyScreen() {
  useDB();
  const s = L.settings();
  const n = s.notify;
  const [vapid, setVapid] = useState(localStorage.getItem('mrcnk_vapid') || VAPID_PUBLIC_DEFAULT);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const subId = 'pushsub:' + deviceId();
  const sub = db.get(subId);
  const labels = { morning: 'Poranek (waga, woda, medytacja)', creatine: 'Kreatyna', focus: 'Pierwsza sesja Deep Work', evening: 'Wieczorne podsumowanie', screens: 'Ekrany off / melatonina', weekly: 'Przegląd tygodnia (niedziela)' };
  const upd = (k, f) => L.setSettings({ notify: { ...n, [k]: { ...n[k], ...f } } });
  const enable = async () => {
    try {
      if (!sync.getUser()) throw new Error('Najpierw zaloguj się (Konto i kopia).');
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Ta przeglądarka nie obsługuje powiadomień. Na iPhonie dodaj MRCNK do ekranu głównego i otwórz z ikony.');
      if (!vapid) throw new Error('Wpisz klucz publiczny VAPID.');
      localStorage.setItem('mrcnk_vapid', vapid);
      const p = await Notification.requestPermission(); setPerm(p);
      if (p !== 'granted') throw new Error('Brak zgody na powiadomienia.');
      const reg = await navigator.serviceWorker.ready;
      let ps = await reg.pushManager.getSubscription();
      if (!ps) ps = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(vapid) });
      db.patch('pushsub', subId, { sub: JSON.parse(JSON.stringify(ps)), device: navigator.userAgent.slice(0, 80), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, at: Date.now() });
      toast('Powiadomienia włączone na tym urządzeniu');
    } catch (e) { toast(e.message); }
  };
  const test = async () => { try { await sync.invoke('push', { test: true }); toast('Wysłano testowe powiadomienie'); } catch (e) { toast(e.message); } };
  return html`<div class="page">
    <${Head} title="Powiadomienia" sub="Tylko te, które sam włączysz" />
    <div class="card" style="gap:0">
      ${Object.keys(labels).map((k) => html`<div class="li" style="flex-wrap:wrap;padding:8px 0">
        <${Check} on=${n[k] && n[k].on} onClick=${() => upd(k, { on: !(n[k] && n[k].on) })} label=${labels[k]} />
        <div class="grow" style="min-width:150px">${labels[k]}</div>
        <input type="time" style="width:110px" value=${(n[k] && n[k].time) || ''} onInput=${(e) => upd(k, { time: e.target.value })} />
      </div>`)}
    </div>
    <div class="card">
      <div class="ctitle">To urządzenie</div>
      <div class="small mut">Zgoda: ${{ granted: 'tak', denied: 'odmówiona', default: 'nie pytano', unsupported: 'nieobsługiwane' }[perm]} · subskrypcja: ${sub ? 'aktywna' : 'brak'}</div>
      <${Field} label="Klucz publiczny VAPID"><input value=${vapid} onInput=${(e) => setVapid(e.target.value.trim())} placeholder="B…" /></${Field}>
      <div class="g2"><button type="button" class="btn b-acc" onClick=${enable}>Włącz na tym urządzeniu</button>
        <button type="button" class="btn b-ghost" disabled=${!sub} onClick=${test}>Test</button></div>
      ${sub ? html`<button type="button" class="small mut" onClick=${() => db.remove(subId)}>Wyłącz na tym urządzeniu</button>` : null}
      <div class="xs mut2">Na iPhonie działa po dodaniu aplikacji do ekranu głównego (iOS 16.4+). Wysyłkę obsługuje funkcja „push” w Supabase – instrukcja w README.</div>
    </div>
  </div>`;
}
registerScreen('notify', NotifyScreen);
