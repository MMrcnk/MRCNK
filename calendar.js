// MRCNK – kalendarz
import { html, useState, useDB, nav, Icon, Head, Seg } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';
import { dayStats } from './today.js';

const { fmt1, fmt0, fmtHM } = L;

export function CalendarTab() {
  useDB();
  const t = L.todayKey();
  const [month, setMonth] = useState(L.monthStart(t));
  const [sel, setSel] = useState(t);
  const s = L.settings();
  const first = L.weekStart(month);
  const last = L.addDays(L.weekStart(L.monthEnd(month)), 6);
  const days = L.range(first, last);
  const mv = (n) => { const d = L.parse(month); d.setMonth(d.getMonth() + n); setMonth(L.ymd(d)); };
  const md = L.parse(month);
  const dots = (d) => {
    if (d > t) {
      const out = [];
      if (L.slotsOn(d).length) out.push('var(--red-line)');
      if (L.tasksOn(d).length) out.push('var(--blue-line)');
      return out;
    }
    const st = dayStats(d);
    const out = [];
    if (st.dek === st.dekT) out.push('var(--gold)');
    if (st.trT && st.tr === st.trT) out.push('var(--red)');
    if (st.focus >= 90) out.push('var(--blue)');
    if (L.day(d).eveningDone) out.push('var(--acc)');
    return out;
  };
  const st = dayStats(sel);
  const d = L.day(sel);
  const slots = L.slotsOn(sel);
  const tasks = L.tasksOn(sel);
  const future = sel > t;
  return html`<div class="page">
    <div class="top"><div class="col" style="gap:2px"><div class="brand">MRCNK</div><div class="title">Kalendarz</div></div></div>
    <div class="row between">
      <button type="button" class="icon-btn" aria-label="Poprzedni miesiąc" onClick=${() => mv(-1)}><${Icon} n="back" /></button>
      <button type="button" class="h" style="font-size:22px" onClick=${() => { setMonth(L.monthStart(t)); setSel(t); }}>${L.MONTHS_N[md.getMonth()]} ${md.getFullYear()}</button>
      <button type="button" class="icon-btn" aria-label="Następny miesiąc" onClick=${() => mv(1)}><${Icon} n="next" /></button>
    </div>
    <div class="cal">
      ${L.DOW_S.map((x) => html`<div class="xs mut2" style="text-align:center;font-weight:600">${x}</div>`)}
      ${days.map((x) => html`<button type="button" class=${'cal-d' + (x.slice(0, 7) !== month.slice(0, 7) ? ' out' : '') + (x === t ? ' today' : '') + (x === sel ? ' sel' : '')} onClick=${() => setSel(x)}>
        <span class=${x === t ? 'c-acc' : ''} style="font-weight:600">${L.parse(x).getDate()}</span>
        <span class="dots">${dots(x).map((c) => html`<i style=${'background:' + c}></i>`)}</span>
      </button>`)}
    </div>
    <div class="row wrap xs mut2" style="gap:12px">
      <span><i style="display:inline-block;width:8px;height:8px;border-radius:4px;background:var(--gold)"></i> dekalog 10/10</span>
      <span><i style="display:inline-block;width:8px;height:8px;border-radius:4px;background:var(--red)"></i> treningi</span>
      <span><i style="display:inline-block;width:8px;height:8px;border-radius:4px;background:var(--blue)"></i> Deep Work ≥ 90 min</span>
      <span><i style="display:inline-block;width:8px;height:8px;border-radius:4px;background:var(--acc)"></i> podsumowanie</span>
    </div>

    <div class="card">
      <div class="row between">
        <div class="col" style="gap:2px"><div class="h" style="font-size:22px">${L.DOW[L.isoDow(sel)]}, ${L.fmtDate(sel)}</div>
          ${!future ? html`<div class="small mut">Dekalog ${st.dek}/${st.dekT}</div>` : html`<div class="small mut">Planowanie</div>`}</div>
        <button type="button" class="btn sm b-acc" onClick=${() => (sel === t ? nav.tab('today') : nav.push('day', { date: sel }))}>${future ? 'Planuj' : 'Otwórz'}</button>
      </div>
      ${!future ? html`<${Seg} states=${L.dekalogScore(sel).states.map((x) => x.ok === true)} />
        <div class="g2 small">
          <div><span class="mut">Deep Work:</span> ${fmtHM(st.focus)} h</div>
          <div><span class="mut">Zadania:</span> ${st.tasks}/${st.tasksT}</div>
          <div><span class="mut">Treningi:</span> ${st.tr}/${st.trT}</div>
          <div><span class="mut">Waga:</span> ${st.weight != null ? fmt1(st.weight) + ' kg' : '–'}</div>
          <div><span class="mut">Kalorie:</span> ${st.kcal ? fmt0(st.kcal) : '–'}</div>
          <div><span class="mut">Woda:</span> ${st.water ? fmt1(st.water / 1000) + ' l' : '–'}</div>
          <div><span class="mut">Sen:</span> ${d.sleepH != null ? fmt1(d.sleepH) + ' h' : '–'}${d.sleepQ ? ' · ' + d.sleepQ + '/5' : ''}</div>
          <div><span class="mut">Suple:</span> ${Object.values(d.supps || {}).filter(Boolean).length}/${L.supplements().length}</div>
        </div>` : null}
      ${slots.length ? html`<div class="col" style="gap:4px"><div class="lbl c-red">Treningi</div>${slots.map((sl) => { const ss = L.sessionFor(sel, sl.key); return html`<div class="small">${sl.label}: ${sl.name} ${ss ? html`<span class=${ss.status === 'done' ? 'up' : 'down'}>· ${ss.status === 'done' ? 'wykonany' : ss.status === 'skipped' ? 'pominięty' : 'w trakcie'}</span>` : ''}</div>`; })}</div>` : null}
      ${tasks.length ? html`<div class="col" style="gap:4px"><div class="lbl c-blue">Zadania</div>${tasks.map((x) => html`<div class=${'small ' + (x.done ? 'strike' : '')}>${x.title}</div>`)}</div>` : null}
      ${d.top || d.bottom || d.tomorrow ? html`<div class="col" style="gap:4px">
        ${d.top ? html`<div class="small"><span class="c-green">Top G:</span> ${d.top}</div>` : null}
        ${d.bottom ? html`<div class="small"><span class="c-red">Bottom G:</span> ${d.bottom}</div>` : null}
        ${d.tomorrow ? html`<div class="small"><span class="c-acc">Postanowienie:</span> ${d.tomorrow}${L.day(L.addDays(sel, 1)).resolution ? ' → ' + { done: 'zrobione', partial: 'częściowo', no: 'nie' }[L.day(L.addDays(sel, 1)).resolution] : ''}</div>` : null}
      </div>` : null}
      ${!future && d.eveningDone ? html`<button type="button" class="small c-gold" style="align-self:flex-start" onClick=${() => nav.push('dayCard', { date: sel })}>Karta dnia →</button>` : null}
    </div>
  </div>`;
}
