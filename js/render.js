// ═══════════════════════════════════════
// render.js — DOM rendering
// ═══════════════════════════════════════

import { state, MONTHS_RU, DOW_SHORT } from './state.js';

// ── PUBLIC ──────────────────────────────

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
  // weekend color follows accent
  sheet.style.setProperty('--cal-weekend', state.showWeekendColor ? state.accent : 'var(--cal-muted)');
}

export function renderCover() {
  const cover = document.getElementById('sheetCover');
  const img   = document.getElementById('coverImg');
  if (!state.image) { cover.style.display = 'none'; return; }

  cover.style.display = 'block';
  // Height as % of viewport-like preview — set via actual px via JS after layout
  cover.style.height = state.imgHeightPct + 'vh';
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

  // Apply layout class
  grid.className = 'months-grid layout-' + state.layout;

  // Fix border logic for different layouts
  updateMonthBorders(grid);

  const evMap   = buildEventMap();
  const today   = new Date();

  for (let m = 0; m < 12; m++) {
    grid.appendChild(makeMonth(m, evMap, today));
  }
}

export function renderEventList(onDelete) {
  const list = document.getElementById('eventList');
  list.innerHTML = '';
  state.events.forEach(ev => {
    const item = document.createElement('div');
    item.className = 'event-item';

    const dot  = el('div', 'event-dot');
    dot.style.background = ev.color;

    const name = el('span', 'event-name');
    name.textContent = ev.name;
    name.title = ev.name;

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
  const has      = !!state.image;
  const zone     = document.getElementById('uploadZone');
  const thumb    = document.getElementById('uploadThumb');
  const controls = document.getElementById('imageControls');
  const hGroup   = document.getElementById('imgHeightGroup');

  thumb.src = has ? state.image : '';
  zone.classList.toggle('has-image', has);
  controls.style.display = has ? 'flex' : 'none';
  hGroup.style.display   = has ? 'block' : 'none';
}

// ── MONTH BUILDER ──────────────────────

function makeMonth(monthIdx, evMap, today) {
  const wrap = el('div', 'month-block');

  const name = el('div', 'month-name');
  name.textContent = MONTHS_RU[monthIdx];
  wrap.appendChild(name);

  const grid = el('div', 'mini-grid');

  // DOW headers Mon-Sun
  DOW_SHORT.forEach((label, i) => {
    const jsDow = i === 6 ? 0 : i + 1;
    const d = el('div', 'mini-dow' + (state.weekends.has(jsDow) ? ' is-weekend' : ''));
    d.textContent = label;
    grid.appendChild(d);
  });

  // First day of month (Mon-based offset)
  const firstDay = new Date(state.year, monthIdx, 1);
  const lastDate = new Date(state.year, monthIdx + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < startDow; i++) {
    grid.appendChild(el('div', 'mini-cell is-empty'));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date   = new Date(state.year, monthIdx, d);
    const jsDow  = date.getDay();
    const isWE   = state.weekends.has(jsDow);
    const isToday = sameDay(date, today);
    const key    = toKey(state.year, monthIdx + 1, d);
    const evs    = evMap[key] || [];
    const isHol  = evs.some(e => e.type === 'holiday');

    const classes = ['mini-cell'];
    if (isWE)    classes.push('is-weekend');
    if (isToday) classes.push('is-today');
    if (isHol)   classes.push('is-holiday');
    if (evs.length && !isHol) classes.push('has-event');

    const cell = el('div', classes.join(' '));
    cell.textContent = d;

    // Show event dot color via CSS var
    const firstEv = evs.find(e => e.type === 'event');
    if (firstEv) cell.style.setProperty('--event-color', firstEv.color);

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);
  return wrap;
}

// ── HELPERS ─────────────────────────────

function updateMonthBorders(grid) {
  // CSS handles most border cases via nth-child,
  // but we also need to remove bottom border from last row
  // This is set dynamically after render via CSS only
}

function buildEventMap() {
  const map = {};
  for (const ev of state.events) {
    let key = ev.date;
    // If repeat, generate key for current year
    if (ev.repeat) {
      const parts = ev.date.split('-');
      key = `${state.year}-${parts[1]}-${parts[2]}`;
    }
    if (!map[key]) map[key] = [];
    map[key].push({
      name:  ev.name,
      color: ev.color,
      type:  'holiday',
    });
  }
  return map;
}

function toKey(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate()  === b.getDate();
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
