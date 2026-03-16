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

  // --cal-accent controls calendar colours only — UI buttons stay with fixed --accent
  setCssVar('--cal-accent',       state.accent);
  setCssVar('--cal-accent-light', hexAlpha(state.accent, 0.10));
  setCssVar('--cal-today-bg',     hexAlpha(state.accent, 0.08));

  // Precompute cell backgrounds as plain rgba (no color-mix — html2canvas compat)
  // These are set on :root so they cascade into .cal-sheet
  const weekendBg = hexAlpha(state.accent, 0.12);
  const holidayBg = hexAlpha(state.accent, 0.20);
  const holWeBg   = hexAlpha(state.accent, 0.25);
  setCssVar('--weekend-cell-bg',  weekendBg);
  setCssVar('--holiday-cell-bg',  holidayBg);
  setCssVar('--holiday-we-cell-bg', holWeBg);

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

  cover.style.display   = 'block';
  cover.style.overflow  = 'hidden';
  cover.style.position  = 'relative';
  // Высота = % от ширины самого листа (padding-bottom trick обеспечивает
  // одинаковое соотношение и в превью и при экспорте)
  cover.style.height       = '0';
  cover.style.paddingBottom = state.imgHeightPct + '%';

  const img = $('coverImg');
  img.src = state.image;

  // Картинка абсолютно позиционирована внутри cover
  img.style.position = 'absolute';
  img.style.top      = '0';
  img.style.left     = '0';

  if (state.cropRect) {
    const { rx, ry, rw, rh } = state.cropRect;
    // Ширина и высота изображения масштабируются относительно cover
    img.style.width          = (100 / rw) + '%';
    img.style.height         = (100 / rh) + '%';
    img.style.objectFit      = 'none';
    img.style.objectPosition = '';
    img.style.marginLeft     = (-rx / rw * 100) + '%';
    img.style.marginTop      = (-ry / rh * 100) + '%';
    img.style.maxWidth       = 'none';
  } else if (state.imgFit === 'fill') {
    img.style.width          = '100%';
    img.style.height         = '100%';
    img.style.objectFit      = 'fill';
    img.style.objectPosition = 'center';
    img.style.marginLeft     = '';
    img.style.marginTop      = '';
    img.style.maxWidth       = '';
  } else {
    img.style.width          = '100%';
    img.style.height         = '100%';
    img.style.objectFit      = 'cover';
    img.style.objectPosition = 'center';
    img.style.marginLeft     = '';
    img.style.marginTop      = '';
    img.style.maxWidth       = '';
  }

  renderCoverText();
}

export function renderCoverText() {
  // Удалить старый оверлей
  const old = document.getElementById('coverTextOverlay');
  if (old) old.remove();

  if (!state.coverText || !state.image) return;

  const overlay = document.createElement('div');
  overlay.id = 'coverTextOverlay';
  overlay.className = 'cover-text-overlay pos-' + state.coverTextPosition;

  const span = document.createElement('span');
  span.className = 'cover-text-content';
  // textContent не поддерживает \n — используем innerText чтобы сохранить переносы строк
  span.innerText = state.coverText;
  span.style.fontSize    = state.coverTextSize + 'px';
  span.style.color       = state.coverTextColor;
  span.style.whiteSpace  = 'pre-wrap';
  span.style.textAlign   = 'center';

  overlay.appendChild(span);
  $('sheetCover').appendChild(overlay);
}

// ── HEADER ──────────────────────────────

export function renderHeader() {
  const headerEl = document.getElementById('sheetHeader');
  if (headerEl) {
    headerEl.style.display = state.showHeader === false ? 'none' : '';
  }
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

export function renderLegend() {
  const footer = document.getElementById('sheetFooter');
  if (!footer) return;

  const seen  = new Set();
  const items = [];

  // Выходные дни
  if (state.weekends.size > 0) {
    items.push({ isWeekend: true, label: 'Выходной день', dates: '' });
  }

  // Праздники — группируем по имени, собираем все даты за год
  for (const ev of state.events) {
    if (ev.type !== 'holiday') continue;
    const key = ev.name;
    if (seen.has(key)) continue;
    seen.add(key);

    // Собираем все даты этого праздника в текущем году
    const allDates = state.events
      .filter(e => e.type === 'holiday' && e.name === ev.name)
      .map(e => {
        let d = e.date;
        if (e.repeat) {
          const [, m, day] = e.date.split('-');
          d = `${state.year}-${m}-${day}`;
        }
        return d;
      })
      .filter(d => d.startsWith(String(state.year)))
      .sort()
      .map(d => { const [,m,day] = d.split('-'); return `${+day}.${+m}`; });

    items.push({
      isWeekend: false,
      label:     ev.name,
      dates:     allDates.join(', '),
    });
  }

  // Предпраздничные сокращённые дни
  const shortEvs = state.events.filter(e => e.type === 'short');
  if (shortEvs.length > 0) {
    const shortDates = shortEvs
      .map(e => { const [,m,d] = e.date.split('-'); return `${+d}.${+m}`; })
      .join(', ');
    items.push({ isShort: true, label: 'Сокращённый день (−1ч)', dates: shortDates });
  }

  if (items.length === 0) {
    footer.style.display = 'none';
    return;
  }

  footer.style.display = '';
  const legend = document.getElementById('calLegend');
  legend.innerHTML = '';

  items.forEach(item => {
    const row = el('div', 'legend-item');

    const swatch = el('div', 'legend-swatch');
    if (item.isWeekend) {
      swatch.style.background = state.accent;
    } else if (item.isShort) {
      swatch.style.background = '#E67E22';
    } else {
      // Праздник — такой же цвет как выходные
      swatch.style.background = state.accent;
    }

    const txt = el('span', 'legend-label');
    txt.textContent = item.label;

    row.append(swatch, txt);

    if (item.dates) {
      const datesTxt = el('span', 'legend-dates');
      datesTxt.textContent = item.dates;
      row.appendChild(datesTxt);
    }

    legend.appendChild(row);
  });
}

export function renderEventList(onDelete) {
  const list = $('eventList');
  list.innerHTML = '';
  // Показываем только пользовательские события (не системные праздники РФ)
  const userEvents = state.events.filter(e => !e.system);
  if (userEvents.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'font-size:0.75rem;color:var(--ink-400,#a09890);padding:8px 0 4px;';
    empty.textContent = 'Нет добавленных событий';
    list.appendChild(empty);
    return;
  }
  userEvents.forEach(ev => {
    const item = el('div', 'event-item');

    const dot = el('div', 'event-dot');
    dot.style.background = ev.color;

    const badge = el('span', 'event-badge event-badge--' + ev.type);
    const badgeMap = { holiday: 'празд.', short: 'сокр.', event: 'событ.' };
    badge.textContent = badgeMap[ev.type] || 'событ.';

    const name = el('span', 'event-name');
    name.textContent = ev.name;
    name.title = ev.name;

    const date = el('span', 'event-date');
    date.textContent = fmtDate(ev.date);

    const del = el('button', ev.system ? 'event-del event-del--system' : 'event-del');
    del.textContent = ev.system ? '🔒' : '×';
    del.title = ev.system ? 'Системный праздник — нельзя удалить' : 'Удалить';
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

  // Заголовок дней недели (+ колонка номеров недель если включено)
  if (state.showWeekNums) {
    const wh = el('div', 'mini-dow mini-wn-header');
    wh.textContent = '№';
    grid.style.gridTemplateColumns = '1.2fr repeat(7, 1fr)';
    grid.appendChild(wh);
  } else {
    grid.style.gridTemplateColumns = '';
  }

  DOW_SHORT.forEach((label, i) => {
    const jsDow = i === 6 ? 0 : i + 1;
    const d = el('div', 'mini-dow' + (state.weekends.has(jsDow) ? ' is-weekend' : ''));
    d.textContent = label;
    grid.appendChild(d);
  });

  const firstDay = new Date(state.year, monthIdx, 1);
  const lastDate = new Date(state.year, monthIdx + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  let workDays  = 0;
  let shortDays = 0; // предпраздничные рабочие дни (-1ч каждый)

  // Пустые ячейки перед 1-м числом
  if (state.showWeekNums) {
    // Перед первой строкой: номер недели + пустые ячейки
    if (startDow > 0) {
      const wn = el('div', 'mini-wn');
      wn.textContent = getWeekNumber(new Date(state.year, monthIdx, 1));
      grid.appendChild(wn);
    }
  }
  for (let i = 0; i < startDow; i++) {
    grid.appendChild(el('div', 'mini-cell is-empty'));
  }

  for (let d = 1; d <= lastDate; d++) {
    const date   = new Date(state.year, monthIdx, d);
    const jsDow  = date.getDay();
    const dowMon = (jsDow + 6) % 7; // Mon=0
    const isWE   = state.weekends.has(jsDow);
    const key    = toKey(state.year, monthIdx + 1, d);
    const evs    = evMap[key] || [];
    const isHol  = evs.some(e => e.type === 'holiday');
    const hasEv  = evs.some(e => e.type === 'event');

    // Вставляем номер недели в начале каждой строки (понедельник)
    if (state.showWeekNums && dowMon === 0) {
      const wn = el('div', 'mini-wn');
      wn.textContent = getWeekNumber(date);
      grid.appendChild(wn);
    }

    if (!isWE && !isHol) workDays++;

    const isShort = evs.some(e => e.type === 'short');
    // Предпраздничный считается рабочим, но -1ч
    if (isShort && !isWE && !isHol) shortDays++;

    const classes = ['mini-cell'];
    if (isWE)    classes.push('is-weekend');
    if (isHol)   classes.push('is-holiday');
    if (isShort) classes.push('is-short');
    if (hasEv)   classes.push('has-event');

    const cell = el('div', classes.join(' '));
    // Предпраздничный: добавляем * после числа
    cell.textContent = isShort ? d + '*' : d;

    const ev = evs.find(e => e.type === 'event');
    if (ev) cell.style.setProperty('--event-color', ev.color);

    grid.appendChild(cell);
  }

  wrap.appendChild(grid);

  // Рабочая статистика
  if (state.showWorkStats) {
    const hours = workDays * state.hoursPerDay - shortDays;
    const stats = el('div', 'work-stats');
    const daysSpan  = el('span', 'ws-days');
    daysSpan.textContent  = workDays + ' р.д.';
    const sepSpan   = el('span', 'ws-sep');
    sepSpan.textContent   = ' / ';
    const hoursSpan = el('span', 'ws-hours');
    hoursSpan.textContent = hours + ' ч';
    stats.append(daysSpan, sepSpan, hoursSpan);
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
    map[key].push({ name: ev.name, color: ev.color, type: ev.type || 'holiday' });
  }
  return map;
}

function toKey(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ISO week number (Mon=first day)
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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
