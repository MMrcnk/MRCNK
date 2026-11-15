// MRCNK – start aplikacji, nawigacja, zakładki
import { html, render, useState, useEffect } from './preact.js';
import { nav, screens, Icon, useDB } from './ui.js';
import * as db from './db.js';
import * as L from './logic.js';
import * as sync from './sync.js';
import { TodayTab, QuickAdd } from './today.js';
import { initFocusGuard, ReasonOverlay, FocusMiniBar } from './focus.js';
import { TrainingTab } from './training.js';
import { CalendarTab } from './calendar.js';
import { ReportsTab } from './reports.js';
import { MoreTab } from './more.js';
import './chat.js';

const TABS = [
  ['today', 'home', 'Dziś', TodayTab],
  ['calendar', 'cal', 'Kalendarz', CalendarTab],
  ['training', 'dumb', 'Trening', TrainingTab],
  ['reports', 'chart', 'Raporty', ReportsTab],
  ['more', 'dots', 'Więcej', MoreTab],
];

function App() {
  useDB();
  const [tab, setTab] = useState(localStorage.getItem('mrcnk_tab') || 'today');
  const [stack, setStack] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [toastMsg, setToast] = useState(null);

  nav.bind({
    push: (name, props) => { setStack((s) => [...s, { name, props, key: Date.now() + Math.random() }]); window.scrollTo(0, 0); },
    pop: () => setStack((s) => s.slice(0, -1)),
    replace: (name, props) => setStack((s) => [...s.slice(0, -1), { name, props, key: Date.now() + Math.random() }]),
    tab: (t) => { setStack([]); setTab(t); localStorage.setItem('mrcnk_tab', t); window.scrollTo(0, 0); },
    sheet: (comp, props) => setSheets((s) => [...s, { comp, props, key: Date.now() + Math.random() }]),
    closeSheet: () => setSheets((s) => s.slice(0, -1)),
    toast: (m) => { setToast(m); clearTimeout(window.__mt); window.__mt = setTimeout(() => setToast(null), 2600); },
  });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { if (sheets.length) setSheets((s) => s.slice(0, -1)); else if (stack.length) setStack((s) => s.slice(0, -1)); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheets.length, stack.length]);

  const top = stack[stack.length - 1];
  const Tab = (TABS.find((t) => t[0] === tab) || TABS[0])[3];
  const onTab = (t) => { if (t === tab && !stack.length) window.scrollTo({ top: 0, behavior: 'smooth' }); nav.tab(t); };
  const tabBtn = ([k, ic, label]) => html`<button type="button" class=${'tab' + (k === tab && !top ? ' on' : '')} onClick=${() => onTab(k)} aria-current=${k === tab ? 'page' : null}><${Icon} n=${ic} />${label}</button>`;

  return html`<div class="app">
    <nav class="side" aria-label="Menu">
      <div class="brand" style="font-size:22px;padding:0 14px 18px">MRCNK</div>
      ${TABS.map(tabBtn)}
      <button type="button" class="tab" onClick=${() => nav.push('chat')}><${Icon} n="chat" />Chat</button>
    </nav>
    <main class="main">
      <div style=${top ? 'display:none' : ''}><${Tab} /></div>
      ${stack.map((s, i) => { const C = screens[s.name]; return C ? html`<div key=${s.key} class="screen" style=${i === stack.length - 1 ? '' : 'display:none'}><${C} ...${s.props} /></div>` : null; })}
    </main>
    ${!top || top.name === 'day' ? html`
      <button type="button" class="fab2" aria-label="Chat" onClick=${() => nav.push('chat')}><${Icon} n="chat" /></button>
      <button type="button" class="fab" aria-label="Szybkie dodawanie" onClick=${() => nav.sheet(QuickAdd)}><${Icon} n="plus" s=${26} w=${2.5} /></button>` : null}
    <nav class="tabbar" aria-label="Menu">${TABS.map(tabBtn)}</nav>
    <${FocusMiniBar} hidden=${top && (top.name === 'focusRun' || top.name === 'focusSetup' || top.name === 'workout' || top.name === 'meditation')} />
    ${sheets.map((s, i) => html`<div key=${s.key} class="sheet-bg" onClick=${(e) => { if (e.target === e.currentTarget) setSheets((x) => x.filter((y) => y.key !== s.key)); }}>
      <div class="sheet" role="dialog" aria-modal="true"><${s.comp} ...${s.props} close=${() => setSheets((x) => x.filter((y) => y.key !== s.key))} /></div></div>`)}
    <${ReasonOverlay} />
    ${toastMsg ? html`<div class="toast" role="status">${toastMsg}</div>` : null}
  </div>`;
}

async function start() {
  try {
    await db.initDB();
  } catch (e) {
    document.body.innerHTML = '<div style="padding:40px;font-family:Inter,sans-serif;color:#F2F2F2">Nie można otworzyć bazy danych w tej przeglądarce (tryb prywatny?).</div>';
    return;
  }
  L.seedDefaults();
  render(html`<${App} />`, document.getElementById('app'));
  initFocusGuard();
  sync.initSync();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) nav.toast('Nowa wersja MRCNK – uruchom ponownie aplikację'); });
      });
    }).catch(() => {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
start();
