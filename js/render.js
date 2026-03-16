// ═══════════════════════════════════════
// render.js
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
  const sheet = $('calSheet');
  sheet.dataset.theme = state.theme;
  setCssVar('--accent', state.accent);
  setCssVar('--accent-light', hexAlpha(state.accent, 0.10));
  sheet.style.setProperty(
    '--cal-weekend',
    state.showWeekendColor ? state.accent : 'var(--cal-muted)'
  );
}

// ── COVER ───────────────────────────────

export function renderCover() {
  const cover = $('sheetCover');
  if (!state.image) {
    cover.style.display = 'none';
    return;
  }

  cover.style.display = 'block';
  // Высота задаётся в процентах ширины листа (не vh!) чтобы корректно работать при экспорте
  cover.style.paddingBottom = '0';
  cover.style.height = state.imgHeightPct + 'vw';

  // Картинка
  const img = $('coverImg');
  img.src = state.image;

  if (state.cropRect) {
    // Кроп: позиционируем через margin
    const { rx, ry, rw, rh } = state.cropRect;
    const h = cover.offsetHeight || 200;
    img.style.width          = (100 / rw) + '%';
    img.style.height         = (h / rh) + 'px';
    img.style.objectFit      = 'none';
    img.style.objectPosition = '';
    img.style.marginLeft     = (-rx / rw * 100) + '%';
    img.style.marginTop      = (-ry * h / rh) + 'px';
    img.style.maxWidth       = 'none';
  } else if (state.imgFit === 'fill') {
    // Растянуть по размеру блока
    img.style.width          = '100%';
    img.style.height         = '100%';
    img.style.objectFit      = 'fill';
    img.style.objectPosition = 'center';
    img.style.marginLeft     = '';
    img.style.marginTop      = '';
    img.style.maxWidth       = '';
  } else {
    // cover — заполнить сохраняя пропорции (по умолчанию)
    img.style.width          = '100%';
    img.style.height         = '100%';
    img.style.objectFit      = 'cover';
    img.style.objectPosition = 'center';
    img.style.marginLeft     = '';
    img.style.marginTop      = '';
    img.style.maxWidth       = '';
  }

  // Текст поверх обложки
  renderCoverText();
}

export function renderCoverText() {
  // Удалить старый оверлей
  const old = document.getElementById('coverTextOverlay');
  if (old) old.remove();

  if (!state.coverText || !state.image) return;

  const overlay = document.createElement('div');
  overlay.id = 'coverTextOverlay';
  overlay.className = 'cover-text-overlay cover-text-' + state.coverTextPosition;

  const span = document.createElement('span');
  span.className = 'cover-text-content';
  span.textContent = state.coverText;
  span.style.fontSize = state.coverTextSize + 'px';
  span.style.color    = state.coverTextColor;

  overlay.appendChild(span);
  $('sheetCover').appendChild(overlay);
}

// ── HEADER ──────────────────────────────

export function renderHeader() {
  setText('sheetYear',     state.year);
  setText('sheetTitle',    state.title);
  setText('sheetSubtitle', state.subtitle);
}

// ── MONTHS GRID ─────────────────────────

export function renderMonths() {
  const grid = $('monthsGrid');
  grid.innerHTML = '';
  grid.className = 'months-grid layout-' + state.layout;

  const evMap = buildEventMap();
  const today = new Date();

  for (let m = 0; m < 12; m++) {
    grid.appendChild(makeMonth(m, evMap, today));
  }
}

// ── EVENT LIST ──────────────────────────

export function renderEventList(onDelete) {
  const list = $('eventList');
  list.innerHTML = '';
  state.events.forEach(ev => {
    const item = el('div', 'event-item');

    const dot = el('div', 'event-dot');
    dot.style.background = ev.color;

    const badge = el('span', 'event-badge event-badge--' + ev.type);
    badge.textContent = ev.type === 'holiday' ? 'празд.' : 'событ.';

    const name = el('span', 'event-name');
    name.textContent = ev.name;
    name.title = ev.name;

    const date = el('span', 'event-date');
    date.textContent = fmtDate(ev.date);

    const del = el('button', 'event-del');
    del.textContent = '×';
    del.addEventListener('click', () => onDelete(ev.id));

    item.append(dot, badge, name, date, del);
    list.appendChild(item);
  });
}

export function syncImageUI() {
  const has = !!state.image;
  $('uploadThumb').src = has ? state.image : '';
  $('uploadZone').classList.toggle('has-image', has);
  $('imageControls').style.display  = has ? 'flex'  : 'none';
  $('imgHeightGroup').style.display = has ? 'block' : 'none';
  $('imgTextGroup').style.display   = has ? 'block' : 'none';
}

// ── MONTH BUILDER ───────────────────────

function makeMonth(monthIdx, evMap, today) {
  const wrap = el('div', 'month-block');

  const name = el('div', 'month-name');
  name.textContent = MONTHS_RU[monthIdx];
  wrap.appendChild(name);

  const grid = el('div', 'mini-grid');

  // Заголовок дней недели
  DOW_SHORT.forEach((label, i) => {
    const jsDow = i === 6 ? 0 : i + 1; // i=0→Пн(1)…i=6→Вс(0)
    const d = el('div', 'mini-dow' + (state.weekends.has(jsDow) ? ' is-weekend' : ''));
    d.textContent = label;
    grid.appendChild(d);
  });

  const firstDay = new Date(state.year, monthIdx, 1);
  const lastDate = new Date(state.year, monthIdx + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  let workDays = 0;

  // Пустые ячейки перед 1-м числом
  for (let i = 0; i < startDow; i++) {
    grid.appendChild(el('div', 'mini-cell is-empty'));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date   = new Date(state.year, monthIdx, d);
    const jsDow  = date.getDay();
    const isWE   = state.weekends.has(jsDow);
    const key    = toKey(state.year, monthIdx + 1, d);
    const evs    = evMap[key] || [];
    const isHol  = evs.some(e => e.type === 'holiday');
    const hasEv  = evs.some(e => e.type === 'event');

    // Рабочие дни: не выходной; праздники не вычитаем (по договорённости)
    if (!isWE) workDays++;

    const classes = ['mini-cell'];
    if (isWE)   classes.push('is-weekend');
    // ❌ is-today убран — печатный календарь, подсветка сегодня не нужна
    if (isHol)  classes.push('is-holiday');
    if (hasEv)  classes.push('has-event');

    const cell = el('div', classes.join(' '));
    cell.textContent = d;

    // Цвет точки события
    const ev = evs.find(e => e.type === 'event');
    if (ev) cell.style.setProperty('--event-color', ev.color);

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);

  // Рабочая статистика
  if (state.showWorkStats) {
    const hours = workDays * state.hoursPerDay;
    const stats = el('div', 'work-stats');
    stats.innerHTML =
      `<span class="ws-days">${workDays}\u202fр.д.</span>` +
      `<span class="ws-sep"> / </span>` +
      `<span class="ws-hours">${hours}\u202fч</span>`;
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
      const [, m, d] = ev.date.split('-');
      key = `${state.year}-${m}-${d}`;
    }
    if (!map[key]) map[key] = [];
    map[key].push({ name: ev.name, color: ev.color, type: ev.type });
  }
  return map;
}

function toKey(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function fmtDate(s) {
  if (!s) return '';
  const [, m, d] = s.split('-');
  return `${d}.${m}`;
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function setText(id, val) {
  const e = $(id);
  if (e) e.textContent = val ?? '';
}

function $(id) { return document.getElementById(id); }

function setCssVar(name, val) {
  document.documentElement.style.setProperty(name, val);
}

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}
