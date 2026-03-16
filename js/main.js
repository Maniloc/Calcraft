// ═══════════════════════════════════════
// main.js — Entry point
// ═══════════════════════════════════════

import { state, buildHolidaysForYear, buildTatarHolidaysForYear, RF_CALENDAR, SUPPORTED_YEARS } from './state.js';
import { render, renderEventList, renderCoverText, renderLegend, renderSheetSize, syncImageUI, applyTheme } from './render.js';
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
  rerender();

  // Пересчитываем размер листа при изменении окна
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderSheetSize(), 80);
  });
}

boot();

// ── YEAR UI ─────────────────────────────

function syncYearUI() {
  $('yearDisplay').textContent = state.year;
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
    rerender();
  });

  $('yearNext').addEventListener('click', () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx >= SUPPORTED_YEARS.length - 1) return;
    state.year = SUPPORTED_YEARS[idx + 1];
    rebuildSystemHolidays();
    syncYearUI();
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
      rerender();
    });
  });

  // Orientation
  document.querySelectorAll('.orient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.orient-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.orientation = btn.dataset.orient;
      rerender();
    });
  });

  $('showTatarstan').addEventListener('change', e => {
    state.tatarstan = e.target.checked;
    rebuildSystemHolidays();
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
  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);
  const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB

  $('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      alert('Поддерживаются только форматы: JPG, PNG, WEBP, GIF');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`Файл слишком большой (${(file.size/1024/1024).toFixed(1)} МБ). Максимум — 15 МБ.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      state.image    = ev.target.result;
      state.cropRect = null;
      syncImageUI();
      rerender();
    };
    reader.onerror = () => alert('Не удалось прочитать файл.');
    reader.readAsDataURL(file);
  });

  $('removeImgBtn').addEventListener('click', () => {
    state.image = null; state.cropRect = null;
    $('imgInput').value = '';
    syncImageUI(); rerender();
  });

  $('imgHeightRange').addEventListener('input', e => {
    state.imgHeightPct = clamp(parseInt(e.target.value, 10), 10, 70);
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
    state.coverTextSize = clamp(parseInt(e.target.value, 10), 8, 200);
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

  const VALID_POSITIONS = new Set([
    'top-left','top-center','top-right',
    'center-left','center','center-right',
    'bottom-left','bottom-center','bottom-right',
  ]);

  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = btn.dataset.pos;
      if (!VALID_POSITIONS.has(pos)) return;
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.coverTextPosition = pos;
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
  state.events.push({ id: crypto.randomUUID(), name, date, color, repeat, type, system: false });
  $('newEventName').value = '';
  rerender();
}



// ── HELPERS ─────────────────────────────

function onDeleteEvent(id) {
  const ev = state.events.find(e => e.id === id);
  if (ev?.system) return;
  state.events = state.events.filter(e => e.id !== id);
  rerender();
}

function rerender() {
  render();
  renderLegend();
  renderEventList(onDeleteEvent);
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
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
