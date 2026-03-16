// ═══════════════════════════════════════════════
// render.js — All DOM rendering
// ═══════════════════════════════════════════════

import { state, MONTHS_RU, DOW_LABELS, SIZES } from './state.js';

// ── PUBLIC: full re-render ───────────────────

export function render() {
  applyTheme();
  renderHeader();
  renderImage();
  renderGrid();
  renderLegend();
}

// ── THEME ────────────────────────────────────

export function applyTheme() {
  const sheet = getSheet();
  sheet.dataset.theme = state.theme;
  document.documentElement.style.setProperty('--accent', state.accent);
  document.documentElement.style.setProperty(
    '--accent-light',
    hexToRgba(state.accent, 0.10),
  );
}

// ── HEADER ───────────────────────────────────

export function renderHeader() {
  if (!state.month) return;

  const autoTitle = MONTHS_RU[state.month.getMonth()];
  const year      = state.month.getFullYear();

  setText('sheetTitle',    state.title || autoTitle);
  setText('sheetYear',     year);
  setText('sheetSubtitle', state.subtitle);

  // Preview toolbar label
  const sizeInfo = SIZES[state.size];
  if (sizeInfo) setText('previewSizeInfo', sizeInfo.label);
}

// ── IMAGE ─────────────────────────────────────

export function renderImage() {
  const area = document.getElementById('sheetImage');
  const img  = document.getElementById('sheetImg');

  if (!state.image) {
    area.style.display = 'none';
    return;
  }

  area.style.display = 'block';
  area.style.height  = state.imgHeight + 'px';
  img.src            = state.image;

  if (state.cropRect) {
    const { rx, ry, rw, rh } = state.cropRect;
    img.style.width          = (100 / rw) + '%';
    img.style.height         = (state.imgHeight / rh) + 'px';
    img.style.objectFit      = 'none';
    img.style.marginLeft     = (-rx / rw * 100) + '%';
    img.style.marginTop      = (-ry * state.imgHeight / rh) + 'px';
    img.style.maxWidth       = 'none';
    img.style.objectPosition = '';
  } else {
    img.style.width          = '100%';
    img.style.height         = '100%';
    img.style.objectFit      = state.imgFit;
    img.style.objectPosition = 'center';
    img.style.marginLeft     = '';
    img.style.marginTop      = '';
    img.style.maxWidth       = '';
  }
}

// ── CALENDAR GRID ─────────────────────────────

export function renderGrid() {
  if (!state.month) return;

  const grid  = document.getElementById('calGrid');
  grid.innerHTML = '';

  const year  = state.month.getFullYear();
  const month = state.month.getMonth();

  // Day-of-week headers (Mon-first)
  DOW_LABELS.forEach((label, i) => {
    // i=0→Mon(JS=1)…i=5→Sat(JS=6)…i=6→Sun(JS=0)
    const jsDow = i === 6 ? 0 : i + 1;
    const isWE  = state.weekends.has(jsDow);
    grid.appendChild(makeDowCell(label, isWE));
  });

  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const today    = new Date();
  const evMap    = buildEventMap();

  // Empty padding cells
  for (let i = 0; i < startDow; i++) {
    grid.appendChild(makeEmptyCell());
  }

  // Day cells
  for (let d = 1; d <= lastDate; d++) {
    const date    = new Date(year, month, d);
    const jsDow   = date.getDay();
    const isWE    = state.weekends.has(jsDow);
    const isToday = sameDay(date, today);
    const key     = toKey(year, month + 1, d);
    const entries = evMap[key] || [];
    const isHol   = entries.some(e => e.type === 'holiday');

    grid.appendChild(makeDayCell(d, isWE, isToday, isHol, entries));
  }
}

// ── LEGEND ───────────────────────────────────

export function renderLegend() {
  const footer = document.getElementById('sheetFooter');
  const legend = document.getElementById('calLegend');
  legend.innerHTML = '';

  if (!state.showLegend) {
    footer.style.display = 'none';
    return;
  }

  footer.style.display = '';

  if (state.weekends.size > 0) {
    legend.appendChild(makeLegendItem(state.accent, 'Выходной'));
  }

  const seen = new Set();
  for (const ev of state.events) {
    if (seen.has(ev.color + ev.name)) continue;
    seen.add(ev.color + ev.name);
    legend.appendChild(makeLegendItem(ev.color, ev.name));
  }

  for (const h of state.holidays) {
    legend.appendChild(makeLegendItem(state.accent, h.name));
  }

  if (!legend.children.length) {
    footer.style.display = 'none';
  }
}

// ── EVENT/HOLIDAY SIDEBAR LISTS ──────────────

export function renderEventList(onDelete) {
  renderList('eventList', state.events, onDelete, ev => ev.color);
}

export function renderHolidayList(onDelete) {
  renderList('holidayList', state.holidays, onDelete, () => state.accent);
}

// ── IMAGE UI ─────────────────────────────────

export function syncImageUI() {
  const has     = !!state.image;
  const zone    = document.getElementById('uploadZone');
  const thumb   = document.getElementById('uploadThumb');
  const ph      = document.getElementById('uploadPlaceholder');
  const controls= document.getElementById('imageControls');
  const hGroup  = document.getElementById('imgHeightGroup');
  const fGroup  = document.getElementById('imgFitGroup');

  if (has) {
    thumb.src = state.image;
    zone.classList.add('has-image');
  } else {
    thumb.src = '';
    zone.classList.remove('has-image');
  }

  controls.style.display = has ? 'flex' : 'none';
  hGroup.style.display   = has ? 'block' : 'none';
  fGroup.style.display   = has ? 'block' : 'none';
}

// ── HELPERS ──────────────────────────────────

function makeDowCell(label, isWE) {
  const el = document.createElement('div');
  el.className = 'cal-dow' + (isWE ? ' is-weekend' : '');
  el.textContent = label;
  return el;
}

function makeEmptyCell() {
  const el = document.createElement('div');
  el.className = 'cal-cell is-empty';
  return el;
}

function makeDayCell(d, isWE, isToday, isHol, entries) {
  const el = document.createElement('div');
  const classes = ['cal-cell'];
  if (isWE)    classes.push('is-weekend');
  if (isToday) classes.push('is-today');
  if (isHol)   classes.push('is-holiday');
  el.className = classes.join(' ');

  const num = document.createElement('div');
  num.className   = 'cell-num';
  num.textContent = d;
  el.appendChild(num);

  if (entries.length) {
    const tags = document.createElement('div');
    tags.className = 'cell-tags';
    entries.slice(0, 3).forEach(ev => {
      const tag = document.createElement('div');
      tag.className = 'cell-tag';
      tag.style.background = ev.color;
      tag.textContent = ev.name;
      tags.appendChild(tag);
    });
    el.appendChild(tags);
  }

  return el;
}

function makeLegendItem(color, label) {
  const item = document.createElement('div');
  item.className = 'legend-item';

  const dot = document.createElement('div');
  dot.className = 'legend-swatch';
  dot.style.background = color;

  const txt = document.createElement('span');
  txt.textContent = label;

  item.append(dot, txt);
  return item;
}

function renderList(containerId, items, onDelete, colorFn) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'event-item';

    const dot = document.createElement('div');
    dot.className = 'event-color-dot';
    dot.style.background = colorFn(item);

    const name = document.createElement('span');
    name.className   = 'event-name';
    name.textContent = item.name;
    name.title       = item.name;

    const date = document.createElement('span');
    date.className   = 'event-date';
    date.textContent = formatDate(item.date);

    const del = document.createElement('button');
    del.className   = 'event-del';
    del.textContent = '×';
    del.title       = 'Удалить';
    del.addEventListener('click', () => onDelete(item.id));

    row.append(dot, name, date, del);
    el.appendChild(row);
  });
}

function buildEventMap() {
  const map = {};
  for (const ev of state.events) {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push({ name: ev.name, color: ev.color, type: 'event' });
  }
  for (const h of state.holidays) {
    if (!map[h.date]) map[h.date] = [];
    map[h.date].push({ name: h.name, color: state.accent, type: 'holiday' });
  }
  return map;
}

function toKey(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getSheet() {
  return document.getElementById('calendarSheet');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
