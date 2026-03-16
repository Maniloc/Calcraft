// ═══════════════════════════════════════
// main.js — Entry point
// ═══════════════════════════════════════

import { state, buildHolidaysForYear, buildTatarHolidaysForYear, RF_CALENDAR, RT_CALENDAR, SUPPORTED_YEARS } from './state.js';
import { render, renderEventList, renderCoverText, renderLegend, syncImageUI, applyTheme } from './render.js';
import { initCrop } from './crop.js';
import { initExport } from './export.js';

// ── BOOT ────────────────────────────────

function boot() {
  const now = new Date().getFullYear();
  state.year = SUPPORTED_YEARS.includes(now) ? now : SUPPORTED_YEARS[1]; // 2025 as fallback

  rebuildSystemHolidays();
  initCrop();
  initExport();
  bindAll();
  syncYearUI();
  renderHolidaysEditor();
  rerender();
}

boot();

// ── YEAR UI ─────────────────────────────

function syncYearUI() {
  $('yearDisplay').textContent = state.year;
  const rfYearEl = $('rfHolYear'); if (rfYearEl) rfYearEl.textContent = state.year;

  const cal     = RF_CALENDAR[state.year];
  const warning = cal?.warning;
  let warnEl    = $('yearWarning');

  if (warning) {
    if (!warnEl) {
      warnEl = document.createElement('p');
      warnEl.id = 'yearWarning';
      warnEl.className = 'year-warning';
      $('yearDisplay').closest('.field-group').appendChild(warnEl);
    }
    warnEl.textContent = '⚠ ' + warning;
  } else if (warnEl) {
    warnEl.remove();
  }

  // Disable nav buttons at boundaries
  const idx = SUPPORTED_YEARS.indexOf(state.year);
  $('yearPrev').disabled = idx <= 0;
  $('yearNext').disabled = idx >= SUPPORTED_YEARS.length - 1;
}

// ── REBUILD SYSTEM HOLIDAYS ──────────────

function rebuildSystemHolidays() {
  const sys     = buildHolidaysForYear(state.year);
  const tatar   = state.tatarstan ? buildTatarHolidaysForYear(state.year) : [];
  const userEvs = state.events.filter(e => !e.system);
  state.events  = [...sys, ...tatar, ...userEvs];
}

// ── BIND ALL ────────────────────────────

function bindAll() {
  bindTabs();
  bindContent();
  bindDesign();
  bindImage();
  bindEvents();
  bindHolidaysEditor();
}

// ── TABS ────────────────────────────────

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ── CONTENT TAB ─────────────────────────

function bindContent() {
  $('yearPrev').addEventListener('click', () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx <= 0) return;
    state.year = SUPPORTED_YEARS[idx - 1];
    rebuildSystemHolidays();
    syncYearUI();
    renderHolidaysEditor();
    rerender();
  });

  $('yearNext').addEventListener('click', () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx >= SUPPORTED_YEARS.length - 1) return;
    state.year = SUPPORTED_YEARS[idx + 1];
    rebuildSystemHolidays();
    syncYearUI();
    renderHolidaysEditor();
    rerender();
  });

  $('calTitle').addEventListener('input',    e => { state.title    = e.target.value; rerender(); });
  $('calSubtitle').addEventListener('input', e => { state.subtitle = e.target.value; rerender(); });

  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.day, 10);
      if (state.weekends.has(d)) state.weekends.delete(d);
      else                       state.weekends.add(d);
      btn.classList.toggle('active');
      rerender();
    });
  });

  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.layout = btn.dataset.layout;
      rerender();
    });
  });
}

// ── DESIGN TAB ──────────────────────────

function bindDesign() {
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.theme = card.dataset.theme;
      rerender();
    });
  });

  document.querySelectorAll('.accent-btn:not(.accent-custom)').forEach(btn => {
    btn.addEventListener('click', () => {
      setAccent(btn.dataset.color);
      document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  $('customAccent').addEventListener('input', e => {
    setAccent(e.target.value);
    document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
    $('customAccent').classList.add('active');
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.size = btn.dataset.size;
    });
  });

  $('showTatarstan').addEventListener('change', e => {
    state.tatarstan = e.target.checked;
    rebuildSystemHolidays();
    renderHolidaysEditor();
    rerender();
  });
  $('showWeekendColor').addEventListener('change', e => { state.showWeekendColor = e.target.checked; rerender(); });
  $('showWeekNums').addEventListener('change',     e => { state.showWeekNums     = e.target.checked; rerender(); });
  $('showHeader').addEventListener('change',       e => { state.showHeader       = e.target.checked; rerender(); });

  $('showWorkStats').addEventListener('change', e => {
    state.showWorkStats = e.target.checked;
    $('hoursGroup').style.display = state.showWorkStats ? 'block' : 'none';
    rerender();
  });

  $('hoursMinus').addEventListener('click', () => {
    if (state.hoursPerDay <= 1) return;
    state.hoursPerDay--;
    $('hoursDisplay').textContent = state.hoursPerDay;
    rerender();
  });
  $('hoursPlus').addEventListener('click', () => {
    if (state.hoursPerDay >= 24) return;
    state.hoursPerDay++;
    $('hoursDisplay').textContent = state.hoursPerDay;
    rerender();
  });
}

// ── IMAGE TAB ───────────────────────────

function bindImage() {
  $('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.image    = ev.target.result;
      state.cropRect = null;
      syncImageUI();
      rerender();
    };
    reader.readAsDataURL(file);
  });

  $('removeImgBtn').addEventListener('click', () => {
    state.image = null; state.cropRect = null;
    $('imgInput').value = '';
    syncImageUI(); rerender();
  });

  $('imgHeightRange').addEventListener('input', e => {
    state.imgHeightPct = parseInt(e.target.value, 10);
    $('imgHeightVal').textContent = state.imgHeightPct + '%';
    rerender();
  });

  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.imgFit = btn.dataset.fit;
      state.cropRect = null;
      rerender();
    });
  });

  $('coverText').addEventListener('input', e => { state.coverText = e.target.value; renderCoverText(); });

  $('coverTextSize').addEventListener('input', e => {
    state.coverTextSize = parseInt(e.target.value, 10);
    $('coverTextSizeVal').textContent = state.coverTextSize + 'px';
    renderCoverText();
  });

  document.querySelectorAll('.cover-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cover-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.coverTextColor = btn.dataset.color;
      $('coverTextColorPicker').value = btn.dataset.color;
      renderCoverText();
    });
  });

  $('coverTextColorPicker').addEventListener('input', e => {
    state.coverTextColor = e.target.value;
    document.querySelectorAll('.cover-color-btn').forEach(b => b.classList.remove('active'));
    renderCoverText();
  });

  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.coverTextPosition = btn.dataset.pos;
      renderCoverText();
    });
  });
}

// ── EVENTS TAB ──────────────────────────

function bindEvents() {
  document.querySelectorAll('.event-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.event-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  $('addEventBtn').addEventListener('click', addEvent);
  $('newEventName').addEventListener('keydown', e => { if (e.key === 'Enter') addEvent(); });
}

function addEvent() {
  const name   = $('newEventName').value.trim();
  const date   = $('newEventDate').value;
  const color  = $('newEventColor').value;
  const repeat = $('newEventRepeat').checked;
  const typeBtn = document.querySelector('.event-type-btn.active');
  const type   = typeBtn?.dataset.type || 'holiday';

  if (!name || !date) return;
  state.events.push({ id: Date.now() + Math.random(), name, date, color, repeat, type, system: false });
  $('newEventName').value = '';
  rerender();
}

// ── HOLIDAYS EDITOR TAB ─────────────────

function bindHolidaysEditor() {
  renderHolidaysEditor();

  $('addHolidayRfBtn').addEventListener('click', () => {
    const name = $('rfHolName').value.trim();
    const date = $('rfHolDate').value;
    const type = document.querySelector('.rf-type-btn.active')?.dataset.type || 'holiday';
    if (!name || !date) return;

    // Find the year from date
    const year = parseInt(date.split('-')[0], 10);
    if (!RF_CALENDAR[year]) return;

    const arr = type === 'short' ? RF_CALENDAR[year].short : RF_CALENDAR[year].holidays;
    arr.push({ date, name });
    arr.sort((a, b) => a.date.localeCompare(b.date));

    $('rfHolName').value = '';
    rebuildSystemHolidays();
    renderHolidaysEditor();
    rerender();
  });

  // Type toggle
  document.querySelectorAll('.rf-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rf-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

export function renderHolidaysEditor() {
  const container = $('rfHolidaysList');
  if (!container) return;
  container.innerHTML = '';

  const cal = RF_CALENDAR[state.year];
  if (!cal) return;

  // Tatarstan section
  if (state.tatarstan) {
    const tCal = RT_CALENDAR[state.year];
    if (tCal) {
      const tHeader = document.createElement('div');
      tHeader.className = 'rf-section-header';
      tHeader.textContent = '🟢 Праздники Республики Татарстан';
      container.appendChild(tHeader);

      if (tCal.warning) {
        const tw = document.createElement('div');
        tw.className = 'rf-warning';
        tw.textContent = '⚠ ' + tCal.warning;
        container.appendChild(tw);
      }

      const tEntries = [
        ...tCal.holidays.map(h => ({ ...h, type: 'holiday' })),
        ...tCal.short.map(h => ({ ...h, type: 'short' })),
      ].sort((a, b) => a.date.localeCompare(b.date));

      tEntries.forEach(entry => {
        const row = document.createElement('div');
        row.className = 'rf-entry rf-entry--region';
        const badge = document.createElement('span');
        badge.className = 'rf-badge rf-badge--' + entry.type;
        badge.textContent = entry.type === 'holiday' ? 'вых.' : 'сокр.';
        const date = document.createElement('span');
        date.className = 'rf-entry-date';
        date.textContent = fmtDateShort(entry.date);
        const name = document.createElement('span');
        name.className = 'rf-entry-name';
        name.textContent = entry.name;
        const del = document.createElement('button');
        del.className = 'event-del';
        del.textContent = '×';
        del.addEventListener('click', () => {
          const year = parseInt(entry.date.split('-')[0], 10);
          const arr  = entry.type === 'short' ? RT_CALENDAR[year].short : RT_CALENDAR[year].holidays;
          const idx  = arr.findIndex(h => h.date === entry.date && h.name === entry.name);
          if (idx !== -1) arr.splice(idx, 1);
          rebuildSystemHolidays();
          renderHolidaysEditor();
          rerender();
        });
        row.append(badge, date, name, del);
        container.appendChild(row);
      });

      const rfHeader = document.createElement('div');
      rfHeader.className = 'rf-section-header';
      rfHeader.textContent = '🔴 Федеральные праздники РФ';
      container.appendChild(rfHeader);
    }
  }

  // Warning banner
  if (cal.warning) {
    const warn = document.createElement('div');
    warn.className = 'rf-warning';
    warn.textContent = '⚠ ' + cal.warning;
    container.appendChild(warn);
  }

  const allEntries = [
    ...cal.holidays.map(h => ({ ...h, type: 'holiday' })),
    ...cal.short.map(h => ({ ...h, type: 'short' })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  allEntries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'rf-entry';

    const badge = document.createElement('span');
    badge.className = 'rf-badge rf-badge--' + entry.type;
    badge.textContent = entry.type === 'holiday' ? 'вых.' : 'сокр.';

    const date = document.createElement('span');
    date.className = 'rf-entry-date';
    date.textContent = fmtDateShort(entry.date);

    const name = document.createElement('span');
    name.className = 'rf-entry-name';
    name.textContent = entry.name;

    const del = document.createElement('button');
    del.className = 'event-del';
    del.textContent = '×';
    del.title = 'Удалить';
    del.addEventListener('click', () => {
      const year = parseInt(entry.date.split('-')[0], 10);
      const arr  = entry.type === 'short' ? RF_CALENDAR[year].short : RF_CALENDAR[year].holidays;
      const idx  = arr.findIndex(h => h.date === entry.date && h.name === entry.name);
      if (idx !== -1) arr.splice(idx, 1);
      rebuildSystemHolidays();
      renderHolidaysEditor();
      rerender();
    });

    row.append(badge, date, name, del);
    container.appendChild(row);
  });

  if (allEntries.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'font-size:0.75rem;color:var(--ink-400,#a09890);text-align:center;padding:12px 0';
    empty.textContent = 'Нет записей для этого года';
    container.appendChild(empty);
  }
}

// ── HELPERS ─────────────────────────────

function rerender() {
  render();
  renderLegend();
  renderEventList(id => {
    const ev = state.events.find(e => e.id === id);
    if (ev?.system) return; // системные нельзя удалить через этот список
    state.events = state.events.filter(e => e.id !== id);
    rerender();
  });
}

function setAccent(color) {
  state.accent = color;
  applyTheme();
  rerender();
}

function fmtDateShort(s) {
  if (!s) return '';
  const [, m, d] = s.split('-');
  return `${d}.${m}`;
}

function $(id) { return document.getElementById(id); }
