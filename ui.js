// MRCNK – wspólne komponenty UI i nawigacja
import { html, useState, useEffect, useRef, useMemo } from './preact.js';
import * as db from './db.js';
export { html, useState, useEffect, useRef, useMemo };

// ---------- odświeżanie po zmianach w bazie ----------
export function useDB() {
  const [, set] = useState(0);
  useEffect(() => db.subscribe((v) => set(v)), []);
  return db.getVersion();
}
export function useTick(ms = 1000, on = true) {
  const [t, set] = useState(Date.now());
  useEffect(() => { if (!on) return; const i = setInterval(() => set(Date.now()), ms); return () => clearInterval(i); }, [ms, on]);
  return t;
}

// ---------- nawigacja ----------
export const screens = {};
export const registerScreen = (name, comp) => { screens[name] = comp; };
let navImpl = null;
export const nav = {
  bind: (impl) => { navImpl = impl; },
  push: (name, props = {}) => navImpl && navImpl.push(name, props),
  pop: () => navImpl && navImpl.pop(),
  replace: (name, props = {}) => navImpl && navImpl.replace(name, props),
  tab: (t) => navImpl && navImpl.tab(t),
  sheet: (comp, props = {}) => navImpl && navImpl.sheet(comp, props),
  closeSheet: () => navImpl && navImpl.closeSheet(),
  toast: (msg) => navImpl && navImpl.toast(msg),
};
export const toast = (m) => nav.toast(m);

// ---------- ikony ----------
const P = {
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 6l6 6-6 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  play: 'M7 5v14l12-7z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6z',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  cal: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  dumb: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  flame: 'M12 2c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3 0-3-1-5 0-8z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  scale: 'M4 7h16l-2 13H6zM9 7a3 3 0 0 1 6 0',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  fork: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 7h3v11',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.7H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  note: 'M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h6',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3-5.5-3-5.5 3 1-6.3L3 9.7l6.2-.9z',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  sync: 'M21 12a9 9 0 0 1-15.5 6.3L3 16M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M3 21v-5h5',
  img: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  send: 'M4 12l16-8-6 16-2-7z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  swap: 'M7 4l-4 4 4 4M3 8h14M17 20l4-4-4-4M21 16H7',
};
export function Icon({ n, s = 22, w = 2, fill }) {
  if (n === 'play' || fill) return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d=${P[n]}></path></svg>`;
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n]}></path></svg>`;
}

// ---------- elementy ----------
export function Check({ on, color = '', x, onClick, label }) {
  return html`<button type="button" class=${'chk ' + color + (on ? ' on' : '') + (x ? ' x' : '')} onClick=${onClick} aria-label=${label || 'Odhacz'} aria-pressed=${!!on}>
    ${on ? html`<${Icon} n="check" s=${16} w=${3} />` : x ? html`<${Icon} n="x" s=${14} w=${3} />` : null}
  </button>`;
}

export function Rating({ value, onChange, color = 'var(--green)', ink = 'var(--green-ink)', max = 5 }) {
  return html`<div class=${max === 5 ? 'g5' : 'row wrap'} style=${max !== 5 ? 'gap:6px' : ''}>
    ${Array.from({ length: max }, (_, i) => i + 1).map((v) => html`
      <button type="button" class=${'rate' + (value === v ? ' on' : '')} style=${(max !== 5 ? 'width:44px;' : '') + (value === v ? `background:${color};color:${ink}` : '')}
        onClick=${() => onChange(value === v ? null : v)}>${v}</button>`)}
  </div>`;
}

export function Bar({ pct, color = 'var(--acc)', bg }) {
  return html`<div class="bar" style=${bg ? 'background:' + bg : ''}><div style=${`width:${Math.max(0, Math.min(100, pct * 100))}%;background:${color}`}></div></div>`;
}

export function Head({ title, sub, right, back = true, onBack }) {
  return html`<div class="shead">
    ${back ? html`<button type="button" class="icon-btn" aria-label="Wstecz" onClick=${onBack || (() => nav.pop())}><${Icon} n="back" /></button>` : null}
    <div class="grow"><div class="h" style="font-size:26px;line-height:1.1">${title}</div>${sub ? html`<div class="small mut">${sub}</div>` : null}</div>
    ${right || null}
  </div>`;
}

export function Field({ label, children, hint }) {
  return html`<label class="col" style="gap:6px"><span class="lbl mut">${label}</span>${children}${hint ? html`<span class="xs mut2">${hint}</span>` : null}</label>`;
}

export function Empty({ children }) { return html`<div class="empty">${children}</div>`; }

export function Seg({ states, color = 'var(--gold)' }) {
  return html`<div class="seg" style=${`grid-template-columns:repeat(${states.length},minmax(0,1fr))`}>
    ${states.map((s) => html`<div style=${s === true ? 'background:' + color : s === false ? 'background:#3A1E22' : ''}></div>`)}
  </div>`;
}

// wykres liniowy SVG
export function LineChart({ data, color = 'var(--acc)', h = 140, target, fmtY = (v) => v, labels }) {
  if (!data || data.length < 2) return html`<${Empty}>Za mało danych na wykres.</${Empty}>`;
  const W = 600, H = h, pl = 6, pr = 44, pt = 10, pb = 22;
  const ys = data.map((d) => d.y).concat(target != null ? [target] : []);
  let mn = Math.min(...ys), mx = Math.max(...ys);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad_ = (mx - mn) * 0.1; mn -= pad_; mx += pad_;
  const X = (i) => pl + (i / (data.length - 1)) * (W - pl - pr);
  const Y = (v) => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const pts = data.map((d, i) => `${X(i).toFixed(1)},${Y(d.y).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  return html`<svg viewBox=${`0 0 ${W} ${H}`} width="100%" height=${h} preserveAspectRatio="none" role="img" aria-label="Wykres">
    ${[0, 0.5, 1].map((f) => html`<line x1=${pl} x2=${W - pr} y1=${pt + f * (H - pt - pb)} y2=${pt + f * (H - pt - pb)} stroke="#26262C" stroke-width="1" vector-effect="non-scaling-stroke" />`)}
    ${target != null ? html`<line x1=${pl} x2=${W - pr} y1=${Y(target)} y2=${Y(target)} stroke="#F2C14E" stroke-dasharray="6 6" stroke-width="1.5" vector-effect="non-scaling-stroke" />` : null}
    <polyline points=${pts} fill="none" stroke=${color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    ${data.map((d, i) => html`<circle cx=${X(i)} cy=${Y(d.y)} r="3" fill=${color} />`)}
    <text x=${W - pr + 6} y=${Y(last.y) + 4} fill="#F2F2F2" font-size="13" font-family="Inter">${fmtY(last.y)}</text>
    <text x=${W - pr + 6} y=${pt + 10} fill="#8E8E97" font-size="11" font-family="Inter">${fmtY(mx - pad_)}</text>
    <text x=${W - pr + 6} y=${H - pb} fill="#8E8E97" font-size="11" font-family="Inter">${fmtY(mn + pad_)}</text>
    ${labels ? html`<text x=${pl} y=${H - 5} fill="#8E8E97" font-size="11" font-family="Inter">${data[0].x}</text><text x=${W - pr} y=${H - 5} fill="#8E8E97" font-size="11" text-anchor="end" font-family="Inter">${last.x}</text>` : null}
  </svg>`;
}

export function Bars({ data, color = 'var(--blue)', h = 120, fmtY = (v) => v }) {
  if (!data.length) return html`<${Empty}>Brak danych.</${Empty}>`;
  const mx = Math.max(1, ...data.map((d) => d.y));
  return html`<div class="row" style=${`align-items:flex-end;gap:4px;height:${h}px`}>
    ${data.map((d) => html`<div class="col grow" style="gap:4px;align-items:center;height:100%;justify-content:flex-end">
      <div class="xs mut2">${d.y ? fmtY(d.y) : ''}</div>
      <div style=${`width:100%;max-width:34px;border-radius:6px 6px 2px 2px;background:${d.color || color};height:${Math.max(2, (d.y / mx) * (h - 34))}px;opacity:${d.y ? 1 : 0.25}`}></div>
      <div class="xs mut2">${d.x}</div>
    </div>`)}
  </div>`;
}

// potwierdzenie w arkuszu
export function confirmSheet(text, onYes, yes = 'Tak', danger = true) {
  nav.sheet(({ close }) => html`<div class="col">
    <div style="font-size:17px;font-weight:500;line-height:1.4">${text}</div>
    <div class="g2">
      <button type="button" class="btn b-ghost" onClick=${close}>Anuluj</button>
      <button type="button" class=${'btn ' + (danger ? 'b-danger' : 'b-acc')} onClick=${() => { close(); onYes(); }}>${yes}</button>
    </div>
  </div>`);
}

// pole liczby (przecinek lub kropka)
export function NumIn({ value, onCommit, placeholder, step, style, autoFocus, big }) {
  const [v, setV] = useState(value == null ? '' : String(value).replace('.', ','));
  const ref = useRef();
  useEffect(() => { if (document.activeElement !== ref.current) setV(value == null ? '' : String(value).replace('.', ',')); }, [value]);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, []);
  const commit = () => { const n = parseFloat(v.replace(',', '.')); onCommit(isFinite(n) ? n : null); };
  return html`<input ref=${ref} type="text" inputmode="decimal" value=${v} placeholder=${placeholder || ''} step=${step}
    style=${(big ? 'font-family:Anton,Impact,sans-serif;font-size:28px;padding:8px 12px;' : '') + (style || '')}
    onInput=${(e) => setV(e.target.value)} onBlur=${commit} onKeyDown=${(e) => { if (e.key === 'Enter') { e.target.blur(); } }} />`;
}
