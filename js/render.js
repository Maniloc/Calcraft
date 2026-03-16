// ═══════════════════════════════════════
// render.js
// ═══════════════════════════════════════

import { state, MONTHS_RU, DOW_SHORT, getSizeWithOrientation } from './state.js';

// ── PUBLIC ──────────────────────────────

export function render() {
  applyTheme();
  renderSheetSize();
  renderCover();
  renderHeader();
  renderMonths();
}

// Устанавливает размер и соотношение сторон листа в превью
export function renderSheetSize() {
  const sheet = $('calSheet');
  const stage = $('previewStage');
  if (!sheet || !stage) return;

  const size = getSizeWithOrientation(state.size, state.orientation);
  if (!size) return;

  const ratio = size.w / size.h; // например 0.707 для A4 портрет

  // Вписываем лист в доступную область превью
  const stageW = stage.clientWidth  - 48; // padding 24px с каждой стороны
  const stageH = stage.clientHeight - 48;

  let sheetW, sheetH;
  if (stageW / stageH > ratio) {
    // Ограничение по высоте
    sheetH = Math.min(stageH, 1200);
    sheetW = Math.round(sheetH * ratio);
  } else {
    // Ограничение по ширине
    sheetW = Math.min(stageW, 1200);
    sheetH = Math.round(sheetW / ratio);
  }

  sheet.style.width      = sheetW + 'px';
  sheet.style.height     = 'auto'; // высота определяется контентом — НЕ фиксируем
  sheet.style.aspectRatio = '';    // убираем aspect-ratio, пусть контент определяет высоту
  sheet.style.maxWidth   = sheetW + 'px';
  sheet.style.minWidth   = sheetW + 'px';

  // Обновляем подпись в тулбаре
  const info = $('previewSizeInfo');
  if (info) {
    const label = size.label;
    const ori   = state.orientation === 'landscape' ? 'альбом' : 'портрет';
    info.textContent = `${label} · ${ori}`;
  }
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

  cover.style.display      = 'block';
  cover.style.overflow     = 'hidden';
  cover.style.position     = 'relative';
  cover.style.height       = '0';
  cover.style.paddingBottom = state.imgHeightPct + '%';

  const img = $('coverImg');
  img.src = state.image;

  // Всегда абсолютное позиционирование в cover
  img.style.position = 'absolute';
  img.style.inset    = '0';

  if (state.cropRect) {
    // Кроп: показываем фрагмент изображения, выбранный в кроппере.
    // cropRect хранит доли натурального изображения: rx,ry — начало, rw,rh — размер выделения.
    // Стратегия: растягиваем изображение так чтобы выделенная область
    // совпала с размерами cover, затем сдвигаем его на нужное смещение.
    //
    // cover имеет размер W × H (в пикселях).
    // Нам нужно чтобы фрагмент [rx*natW .. (rx+rw)*natW] × [ry*natH .. (ry+rh)*natH]
    // заполнял cover полностью.
    //
    // Масштаб: imgDisplayW = W / rw (в % от cover: 100/rw %)
    //          imgDisplayH = H / rh (но H зависит от img aspect ratio)
    // Используем object-fit:none + object-position для точного управления.
    // object-position задаёт смещение в пикселях: -(rx*natW * scale), -(ry*natH * scale)
    // Но scale неизвестен без layout. Поэтому используем background-image подход
    // на самом cover — это самый надёжный способ:
    const { rx, ry, rw, rh } = state.cropRect;

    // Вместо <img> используем background на cover для кропа
    cover.style.backgroundImage    = `url('${state.image}')`;
    cover.style.backgroundSize     = `${(100 / rw).toFixed(4)}% ${(100 / rh).toFixed(4)}%`;
    cover.style.backgroundPosition = `${(-rx / rw * 100).toFixed(4)}% ${(-ry / rh * 100).toFixed(4)}%`;
    cover.style.backgroundRepeat   = 'no-repeat';

    // Скрываем <img> — кроп через background
    img.style.display = 'none';
  } else {
    // Нет кропа — показываем <img> обычным способом
    cover.style.backgroundImage = '';
    cover.style.backgroundSize  = '';
    cover.style.backgroundPosition = '';
    img.style.display    = 'block';
    img.style.width      = '100%';
    img.style.height     = '100%';
    img.style.objectFit  = state.imgFit === 'fill' ? 'fill' : 'cover';
    img.style.objectPosition = 'center';
    img.style.marginLeft = '';
    img.style.marginTop  = '';
    img.style.maxWidth   = '';
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
      .sort();

    items.push({
      isWeekend: false,
      label:     ev.name,
      dates:     formatDateRange(allDates),
    });
  }

  // Пользовательские события (type='event') — каждое со своим цветом
  const userEvents = state.events.filter(e => e.type === 'event' && !e.system);
  for (const ev of userEvents) {
    const key = ev.name + ev.color;
    if (seen.has(key)) continue;
    seen.add(key);
    const dates = state.events
      .filter(e => e.type === 'event' && e.name === ev.name && e.color === ev.color)
      .map(e => {
        let d = e.date;
        if (e.repeat) { const [,m,day] = e.date.split('-'); d = `${state.year}-${m}-${day}`; }
        return d;
      })
      .filter(d => d.startsWith(String(state.year)))
      .sort();
    items.push({ isEvent: true, color: ev.color, label: ev.name, dates: formatDateRange(dates) });
  }

  // Предпраздничные сокращённые дни
  const shortEvs = state.events.filter(e => e.type === 'short');
  if (shortEvs.length > 0) {
    const shortDates = formatDateRange(shortEvs.map(e => e.date).sort());
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
    } else if (item.isEvent) {
      swatch.style.background = item.color;
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

// Форматирует массив дат ['2025-01-01', '2025-01-02', ...] в читаемый вид:
// Последовательные даты одного месяца → диапазон: "1–8 января"
// Разные месяцы / несмежные → через запятую: "23 февраля, 8 марта"
function formatDateRange(sortedDates) {
  const MONTH_GEN = [
    'января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря',
  ];

  if (!sortedDates || sortedDates.length === 0) return '';

  // Группируем по месяцу
  const byMonth = {};
  for (const d of sortedDates) {
    const [, m, day] = d.split('-');
    const mIdx = parseInt(m, 10) - 1;
    if (!byMonth[mIdx]) byMonth[mIdx] = [];
    byMonth[mIdx].push(parseInt(day, 10));
  }

  const parts = [];
  for (const mIdx of Object.keys(byMonth).map(Number).sort((a,b) => a-b)) {
    const days = byMonth[mIdx].sort((a,b) => a-b);
    // Найти непрерывные диапазоны
    const ranges = [];
    let start = days[0], end = days[0];
    for (let i = 1; i < days.length; i++) {
      if (days[i] === end + 1) {
        end = days[i];
      } else {
        ranges.push([start, end]);
        start = end = days[i];
      }
    }
    ranges.push([start, end]);

    for (const [s, e] of ranges) {
      if (s === e) {
        parts.push(`${s} ${MONTH_GEN[mIdx]}`);
      } else {
        parts.push(`${s}–${e} ${MONTH_GEN[mIdx]}`);
      }
    }
  }

  return parts.join(', ');
}

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
