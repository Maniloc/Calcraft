// ═══════════════════════════════════════
// render.js — DOM rendering
// ═══════════════════════════════════════

import { state, MONTHS_RU, DOW_SHORT } from './state.js';

export function render() {
  applyTheme();
  renderCover();
  renderHeader();
  renderMonths();
}

export function applyTheme() {
  const sheet = sheet_();
  sheet.dataset.theme = state.theme;
  const root = document.documentElement;
  root.style.setProperty('--accent', state.accent);
  root.style.setProperty('--accent-light', hexAlpha(state.accent, 0.10));
  sheet.style.setProperty('--cal-weekend', state.showWeekendColor ? state.accent : 'var(--cal-muted)');
}

export function renderCover() {
  const cover = document.getElementById('sheetCover');
  const img   = document.getElementById('coverImg');
  if (!state.image) { cover.style.display = 'none'; return; }
  cover.style.display = 'block';
  cover.style.height  = state.imgHeightPct + 'vh';
  img.src = state.image;
  if (state.cropRect) {
    const { rx, ry, rw, rh } = state.cropRect;
    const h = cover.offsetHeight || 200;
    img.style.width          = (100 / rw) + '%';
    img.style.height         = (h / rh) + 'px';
    img.style.objectFit      = 'none';
    img.style.marginLeft     = (-rx / rw * 100) + '%';
    img.style.marginTop      = (-ry * h / rh) + 'px';
    img.style.maxWidth       = 'none';
    img.style.objectPosition = '';
  } else {
    img.style.width          = '100%';
    img.style.height         = '100%';
    img.style.objectFit      = 'cover';
    img.style.objectPosition = 'center';
    img.style.marginLeft     = '';
    img.style.marginTop      = '';
    img.style.maxWidth       = '';
  }
}

export function renderHeader() {
  setText('sheetYear',     state.year);
  setText('sheetTitle',    state.title);
  setText('sheetSubtitle', state.subtitle);
}

export function renderMonths() {
  const grid = document.getElementById('monthsGrid');
  grid.innerHTML = '';
  grid.className = 'months-grid layout-' + state.layout;
  const evMap = buildEventMap();
  const today = new Date();
  for (let m = 0; m < 12; m++) {
    grid.appendChild(makeMonth(m, evMap, today));
  }
}

export function renderEventList(onDelete) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  state.events.forEach(ev => {
    const item = el('div', 'event-item');
    const dot  = el('div', 'event-dot');
    dot.style.background = ev.color;
    const name = el('span', 'event-name');
    name.textContent = ev.name; name.title = ev.name;
    const date = el('span', 'event-date');
    date.textContent = fmtDate(ev.date);
    const del = el('button', 'event-del');
    del.textContent = '×';
    del.addEventListener('click', () => onDelete(ev.id));
    item.append(dot, name, date, del);
    list.appendChild(item);
  });
}

export function syncImageUI() {
  const has = !!state.image;
  document.getElementById('uploadThumb').src = has ? state.image : '';
  document.getElementById('uploadZone').classList.toggle('has-image', has);
  document.getElementById('imageControls').style.display = has ? 'flex' : 'none';
  document.getElementById('imgHeightGroup').style.display = has ? 'block' : 'none';
}

// ── MONTH BUILDER ──────────────────────

function makeMonth(monthIdx, evMap, today) {
  const wrap = el('div', 'month-block');

  const name = el('div', 'month-name');
  name.textContent = MONTHS_RU[monthIdx];
  wrap.appendChild(name);

  const grid = el('div', 'mini-grid');

  DOW_SHORT.forEach((label, i) => {
    const jsDow = i === 6 ? 0 : i + 1;
    const d = el('div', 'mini-dow' + (state.weekends.has(jsDow) ? ' is-weekend' : ''));
    d.textContent = label;
    grid.appendChild(d);
  });

  const firstDay = new Date(state.year, monthIdx, 1);
  const lastDate = new Date(state.year, monthIdx + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;
  let workDays   = 0;

  for (let i = 0; i < startDow; i++) {
    grid.appendChild(el('div', 'mini-cell is-empty'));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date    = new Date(state.year, monthIdx, d);
    const jsDow   = date.getDay();
    const isWE    = state.weekends.has(jsDow);
    const isToday = sameDay(date, today);
    const key     = toKey(state.year, monthIdx + 1, d);
    const evs     = evMap[key] || [];
    const isHol   = evs.some(e => e.type === 'holiday');

    if (!isWE) workDays++;

    const classes = ['mini-cell'];
    if (isWE)    classes.push('is-weekend');
    if (isToday) classes.push('is-today');
    if (isHol)   classes.push('is-holiday');
    if (evs.length && !isHol) classes.push('has-event');

    const cell = el('div', classes.join(' '));
    cell.textContent = d;
    const firstEv = evs.find(e => e.type === 'event');
    if (firstEv) cell.style.setProperty('--event-color', firstEv.color);
    grid.appendChild(cell);
  }

  wrap.appendChild(grid);

  // Work stats row
  if (state.showWorkStats) {
    const hours = workDays * state.hoursPerDay;
    const stats = el('div', 'work-stats');
    stats.innerHTML =
      `<span class="ws-days">${workDays}&thinsp;р.д.</span>` +
      `<span class="ws-sep"> / </span>` +
      `<span class="ws-hours">${hours}&thinsp;ч</span>`;
    wrap.appendChild(stats);
  }

  return wrap;
}

// ── HELPERS ─────────────────────────────

function buildEventMap() {
  const map = {};
  for (const ev of state.events) {
    let key = ev.date;
    if (ev.repeat) {
      const p = ev.date.split('-');
      key = `${state.year}-${p[1]}-${p[2]}`;
    }
    if (!map[key]) map[key] = [];
    map[key].push({ name: ev.name, color: ev.color, type: 'holiday' });
  }
  return map;
}

function toKey(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth()      === b.getMonth()
    && a.getDate()       === b.getDate();
}

function fmtDate(s) {
  if (!s) return '';
  const [y,m,d] = s.split('-');
  return `${d}.${m}.${y}`;
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function setText(id, val) {
  const e = document.getElementById(id);
  if (e) e.textContent = val ?? '';
}

function sheet_() { return document.getElementById('calSheet'); }

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
