// ═══════════════════════════════════════
// main.js — Entry point
// ═══════════════════════════════════════

import { state, buildHolidaysForYear, buildTatarHolidaysForYear,
         RF_CALENDAR, SUPPORTED_YEARS } from './state.js';
import { render, renderCoverOnly, renderSizeOnly, renderHeaderOnly as renderHeaderOnlyFn,
         renderEventList, renderCoverText, renderLegend,
         renderSheetSize, syncImageUI, applyTheme } from './render.js';
import { initCrop } from './crop.js';
import { initExport } from './export.js';
import { saveState, loadState, clearState } from './storage.js';

// ── BOOT ────────────────────────────────

function boot() {
  const now = new Date().getFullYear();
  const defaultYear = SUPPORTED_YEARS.includes(now) ? now : SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1];

  // Восстанавливаем состояние из localStorage
  const restored = loadState(state);

  // Год из localStorage мог устареть — всегда берём текущий если он поддерживается
  if (!restored || !SUPPORTED_YEARS.includes(state.year)) {
    state.year = defaultYear;
  }

  rebuildSystemHolidays();
  initCrop();
  initExport();
  bindAll();
  syncYearUI();
  syncCheckboxes();
  rerender();

  // Пересчитываем размер листа при изменении окна
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderSheetSize(), 80);
  });

  // Автосохранение: каждые 3 секунды если было изменение
  let dirty = false;
  const origRerender = rerender;
  setInterval(() => { if (dirty) { saveState(state); dirty = false; } }, 3000);
  // Помечаем dirty после каждого rerender
  window._markDirty = () => { dirty = true; };
}

boot();

// ── SYNC UI FROM STATE (для восстановления из localStorage) ──

function syncCheckboxes() {
  setChecked('showWeekendColor', state.showWeekendColor);
  setChecked('showWeekNums',     state.showWeekNums);
  setChecked('showHeader',       state.showHeader !== false);
  setChecked('showWorkStats',    state.showWorkStats);
  setChecked('showTatarstan',    state.tatarstan);

  document.getElementById('hoursGroup').style.display =
    state.showWorkStats ? 'block' : 'none';
  document.getElementById('hoursDisplay').textContent = state.hoursPerDay;

  // Weekends
  document.querySelectorAll('.day-btn').forEach(btn => {
    const d = parseInt(btn.dataset.day, 10);
    btn.classList.toggle('active', state.weekends.has(d));
  });

  // Layout
  document.querySelectorAll('.layout-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.layout === state.layout));

  // Size
  document.querySelectorAll('.size-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.size === state.size));

  // Orientation
  document.querySelectorAll('.orient-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.orient === state.orientation));

  // Theme
  document.querySelectorAll('.theme-card').forEach(c =>
    c.classList.toggle('active', c.dataset.theme === state.theme));

  // Accent
  document.querySelectorAll('.accent-btn:not(.accent-custom)').forEach(b =>
    b.classList.toggle('active', b.dataset.color === state.accent));
  document.getElementById('customAccent').value = state.accent;

  // Cover text
  document.getElementById('coverText').value      = state.coverText || '';
  document.getElementById('calTitle').value       = state.title     || '';
  const fi = document.getElementById('calFooter'); if (fi) fi.value = state.footer || '';
  document.getElementById('calSubtitle').value    = state.subtitle  || '';
  document.getElementById('imgHeightRange').value = state.imgHeightPct;
  document.getElementById('imgHeightVal').textContent = state.imgHeightPct + '%';
  document.getElementById('coverTextSize').value  = state.coverTextSize;
  document.getElementById('coverTextSizeVal').textContent = state.coverTextSize + 'px';

  // Fit
  document.querySelectorAll('.fit-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.fit === state.imgFit));

  // Position
  document.querySelectorAll('.pos-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.pos === state.coverTextPosition));

  // Image UI
  if (state.image) syncImageUI();
}

function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

// ── YEAR UI ─────────────────────────────

function syncYearUI() {
  document.getElementById('yearDisplay').textContent = state.year;

  const cal     = RF_CALENDAR[state.year];
  const warning = cal?.warning;
  let warnEl    = document.getElementById('yearWarning');

  if (warning) {
    if (!warnEl) {
      warnEl = document.createElement('p');
      warnEl.id = 'yearWarning';
      warnEl.className = 'year-warning';
      document.getElementById('yearDisplay').closest('.field-group').appendChild(warnEl);
    }
    warnEl.textContent = '⚠ ' + warning;
  } else if (warnEl) {
    warnEl.remove();
  }

  const idx = SUPPORTED_YEARS.indexOf(state.year);
  document.getElementById('yearPrev').disabled = idx <= 0;
  document.getElementById('yearNext').disabled = idx >= SUPPORTED_YEARS.length - 1;
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
  bindReset();
  bindMobileNav();
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
  document.getElementById('yearPrev').addEventListener('click', () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx <= 0) return;
    state.year = SUPPORTED_YEARS[idx - 1];
    rebuildSystemHolidays();
    syncYearUI();
    rerender();
  });

  document.getElementById('yearNext').addEventListener('click', () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx >= SUPPORTED_YEARS.length - 1) return;
    state.year = SUPPORTED_YEARS[idx + 1];
    rebuildSystemHolidays();
    syncYearUI();
    rerender();
  });

  // Debounce 150мс — не перерисовывать весь календарь на каждый символ
  document.getElementById('calTitle').addEventListener('input',
    debounce(e => { state.title = e.target.value; renderHeaderOnly(); mark(); }, 150));
  document.getElementById('calSubtitle').addEventListener('input',
    debounce(e => { state.subtitle = e.target.value; renderHeaderOnly(); mark(); }, 150));

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

  // Orientation (в основном)
  document.querySelectorAll('.orient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.orient-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.orientation = btn.dataset.orient;
      renderSizeOnly();
      mark();
    });
  });

  // Footer
  const footerInput = document.getElementById('calFooter');
  if (footerInput) {
    footerInput.value = state.footer || '';
    footerInput.addEventListener('input',
      debounce(e => { state.footer = e.target.value; renderHeaderOnly(); mark(); }, 150));
  }

  document.getElementById('showWeekendColor').addEventListener('change', e => {
    state.showWeekendColor = e.target.checked; rerender();
  });
  document.getElementById('showWeekNums').addEventListener('change', e => {
    state.showWeekNums = e.target.checked; rerender();
  });
  document.getElementById('showHeader').addEventListener('change', e => {
    state.showHeader = e.target.checked; rerender();
  });
  document.getElementById('showTatarstan').addEventListener('change', e => {
    state.tatarstan = e.target.checked;
    rebuildSystemHolidays();
    rerender();
  });
  document.getElementById('showWorkStats').addEventListener('change', e => {
    state.showWorkStats = e.target.checked;
    document.getElementById('hoursGroup').style.display = state.showWorkStats ? 'block' : 'none';
    rerender();
  });
  document.getElementById('hoursMinus').addEventListener('click', () => {
    if (state.hoursPerDay <= 1) return;
    state.hoursPerDay--;
    document.getElementById('hoursDisplay').textContent = state.hoursPerDay;
    rerender();
  });
  document.getElementById('hoursPlus').addEventListener('click', () => {
    if (state.hoursPerDay >= 24) return;
    state.hoursPerDay++;
    document.getElementById('hoursDisplay').textContent = state.hoursPerDay;
    rerender();
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

  document.getElementById('customAccent').addEventListener('input', e => {
    setAccent(e.target.value);
    document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('customAccent').classList.add('active');
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.size = btn.dataset.size;
      renderSizeOnly();
      mark();
    });
  });
}

// ── IMAGE TAB ───────────────────────────

function bindImage() {
  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);
  const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

  document.getElementById('imgInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      alert('Поддерживаются только форматы: JPG, PNG, WEBP, GIF');
      e.target.value = ''; return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert(`Файл слишком большой (${(file.size/1024/1024).toFixed(1)} МБ). Максимум — 15 МБ.`);
      e.target.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      state.image = ev.target.result; state.cropRect = null;
      syncImageUI(); rerender();
    };
    reader.onerror = () => alert('Не удалось прочитать файл.');
    reader.readAsDataURL(file);
  });

  document.getElementById('removeImgBtn').addEventListener('click', () => {
    state.image = null; state.cropRect = null;
    document.getElementById('imgInput').value = '';
    syncImageUI(); rerender();
  });

  document.getElementById('imgHeightRange').addEventListener('input', e => {
    state.imgHeightPct = clamp(parseInt(e.target.value, 10), 10, 70);
    document.getElementById('imgHeightVal').textContent = state.imgHeightPct + '%';
    renderCoverOnly(); mark();
  });

  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.imgFit = btn.dataset.fit;
      state.cropRect = null;
      renderCoverOnly(); mark();
    });
  });

  document.getElementById('coverText').addEventListener('input',
    debounce(e => { state.coverText = e.target.value; renderCoverText(); mark(); }, 150));

  document.getElementById('coverTextSize').addEventListener('input', e => {
    state.coverTextSize = clamp(parseInt(e.target.value, 10), 8, 200);
    document.getElementById('coverTextSizeVal').textContent = state.coverTextSize + 'px';
    renderCoverText(); mark();
  });

  document.querySelectorAll('.cover-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cover-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.coverTextColor = btn.dataset.color;
      document.getElementById('coverTextColorPicker').value = btn.dataset.color;
      renderCoverText(); mark();
    });
  });

  document.getElementById('coverTextColorPicker').addEventListener('input', e => {
    state.coverTextColor = e.target.value;
    document.querySelectorAll('.cover-color-btn').forEach(b => b.classList.remove('active'));
    renderCoverText(); mark();
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
      renderCoverText(); mark();
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
  document.getElementById('addEventBtn').addEventListener('click', addEvent);
  document.getElementById('newEventName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addEvent();
  });
}

function addEvent() {
  const name    = document.getElementById('newEventName').value.trim();
  const date    = document.getElementById('newEventDate').value;
  const color   = document.getElementById('newEventColor').value;
  const repeat  = document.getElementById('newEventRepeat').checked;
  const typeBtn = document.querySelector('.event-type-btn.active');
  const type    = typeBtn?.dataset.type || 'holiday';
  if (!name || !date) return;
  state.events.push({ id: crypto.randomUUID(), name, date, color, repeat, type, system: false });
  document.getElementById('newEventName').value = '';
  rerender(); mark();
}

// ── RESET ────────────────────────────────

function bindReset() {
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (!confirm('Сбросить все настройки и начать заново?')) return;
    clearState();
    location.reload();
  });
}

// ── HELPERS ─────────────────────────────

function onDeleteEvent(id) {
  const ev = state.events.find(e => e.id === id);
  if (ev?.system) return;
  state.events = state.events.filter(e => e.id !== id);
  rerender(); mark();
}

function rerender() {
  render();
  renderLegend();
  renderEventList(onDeleteEvent);
  mark();
}

function renderHeaderOnly() {
  renderHeaderOnlyFn();
  mark();
}

function setAccent(color) {
  state.accent = color;
  applyTheme();
  rerender();
}

function mark() {
  if (window._markDirty) window._markDirty();
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ── MOBILE NAV ───────────────────────────

function bindMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (!nav) return; // desktop

  const sidebar     = document.querySelector('.sidebar');
  const preview     = document.querySelector('.preview-area');
  const btnSettings = document.getElementById('mobileNavSettings');
  const btnPreview  = document.getElementById('mobileNavPreview');
  const btnExport   = document.getElementById('mobileExportBtn');
  const sheet       = document.getElementById('mobileExportSheet');
  const backdrop    = document.getElementById('mobileExportBackdrop');
  const cancelBtn   = document.getElementById('mobileExportCancel');

  function showPanel(panel) {
    if (panel === 'sidebar') {
      sidebar.classList.remove('mobile-hidden');
      preview.classList.remove('mobile-visible');
      btnSettings.classList.add('active');
      btnPreview.classList.remove('active');
    } else {
      sidebar.classList.add('mobile-hidden');
      preview.classList.add('mobile-visible');
      btnPreview.classList.add('active');
      btnSettings.classList.remove('active');
    }
  }

  btnSettings.addEventListener('click', () => showPanel('sidebar'));
  btnPreview.addEventListener('click',  () => { showPanel('preview'); renderSheetSize(); });

  // Export bottom sheet
  function openSheet()  {
    sheet.classList.add('open');
    backdrop.classList.add('open');
  }
  function closeSheet() {
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
  }

  btnExport.addEventListener('click', openSheet);
  cancelBtn.addEventListener('click', closeSheet);
  backdrop.addEventListener('click',  closeSheet);

  document.getElementById('mobileExportPng').addEventListener('click', () => {
    closeSheet();
    document.getElementById('exportPng').click();
  });
  document.getElementById('mobileExportPdf').addEventListener('click', () => {
    closeSheet();
    document.getElementById('exportPdf').click();
  });

  // Init: sidebar visible by default on mobile
  showPanel('sidebar');
}
