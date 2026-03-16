// ═══════════════════════════════════════
// main.js — Entry point
// ═══════════════════════════════════════

import { state, loadHolidays, SUPPORTED_YEARS } from './state.js';
import { render, renderEventList, renderCoverText, renderLegend, syncImageUI, applyTheme } from './render.js';
import { initCrop } from './crop.js';
import { initExport } from './export.js';

// ── BOOT ────────────────────────────────

async function boot() {
  // Синхронизируем год: picker → state → display
  const now = new Date().getFullYear();
  // Если текущий год в списке — берём его, иначе первый доступный
  state.year = SUPPORTED_YEARS.includes(now) ? now : SUPPORTED_YEARS[0];

  // Показываем скелетон пока грузится
  showLoading(true);

  // Загружаем праздники из JSON
  await rebuildSystemHolidays();

  // Инициализируем UI
  initCrop();
  initExport();
  bindAll();
  syncYearUI();

  showLoading(false);
  rerender();
}

boot().catch(console.error);

// ── LOADING STATE ────────────────────────

function showLoading(on) {
  let el = document.getElementById('loadingOverlay');
  if (on && !el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:var(--font-ui);font-size:0.9rem;color:var(--ink-500)';
    el.textContent = 'Загрузка праздников…';
    document.body.appendChild(el);
  } else if (!on && el) {
    el.remove();
  }
}

// ── YEAR UI SYNC ─────────────────────────

function syncYearUI() {
  const display = document.getElementById('yearDisplay');
  if (display) display.textContent = state.year;

  // Показываем предупреждение для 2027 (переносы не утверждены)
  const cached = (window.__holidayCache || {})[state.year];
  const warning = cached?.warning;
  let warnEl = document.getElementById('yearWarning');

  if (warning) {
    if (!warnEl) {
      warnEl = document.createElement('p');
      warnEl.id = 'yearWarning';
      warnEl.style.cssText = 'font-size:0.68rem;color:#E67E22;margin-top:6px;line-height:1.4;';
      document.getElementById('yearDisplay').closest('.field-group').appendChild(warnEl);
    }
    warnEl.textContent = '⚠ ' + warning;
  } else if (warnEl) {
    warnEl.remove();
  }
}

// ── REBUILD SYSTEM HOLIDAYS ──────────────

async function rebuildSystemHolidays() {
  const { events: sysEvents, warning } = await loadHolidays(state.year);
  // Сохраняем в глобальный кэш для syncYearUI
  window.__holidayCache = window.__holidayCache || {};
  window.__holidayCache[state.year] = { warning };

  const userEvents = state.events.filter(e => !e.system);
  state.events = [...sysEvents, ...userEvents];
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
  $('yearPrev').addEventListener('click', async () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx <= 0) return;
    state.year = SUPPORTED_YEARS[idx - 1];
    await rebuildSystemHolidays();
    syncYearUI();
    rerender();
  });

  $('yearNext').addEventListener('click', async () => {
    const idx = SUPPORTED_YEARS.indexOf(state.year);
    if (idx >= SUPPORTED_YEARS.length - 1) return;
    state.year = SUPPORTED_YEARS[idx + 1];
    await rebuildSystemHolidays();
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
    });
  });

  $('showWeekendColor').addEventListener('change', e => { state.showWeekendColor = e.target.checked; rerender(); });
  $('showWeekNums').addEventListener('change',     e => { state.showWeekNums     = e.target.checked; rerender(); });

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
    state.image    = null;
    state.cropRect = null;
    $('imgInput').value = '';
    syncImageUI();
    rerender();
  });

  const slider = $('imgHeightRange');
  slider.addEventListener('input', () => {
    state.imgHeightPct = parseInt(slider.value, 10);
    $('imgHeightVal').textContent = state.imgHeightPct + '%';
    rerender();
  });

  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.imgFit   = btn.dataset.fit;
      state.cropRect = null;
      rerender();
    });
  });

  $('coverText').addEventListener('input', e => {
    state.coverText = e.target.value;
    renderCoverText();
  });

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
  const name    = $('newEventName').value.trim();
  const date    = $('newEventDate').value;
  const color   = $('newEventColor').value;
  const repeat  = $('newEventRepeat').checked;
  const typeBtn = document.querySelector('.event-type-btn.active');
  const type    = typeBtn ? typeBtn.dataset.type : 'holiday';

  if (!name || !date) return;
  state.events.push({ id: Date.now() + Math.random(), name, date, color, repeat, type, system: false });
  $('newEventName').value = '';
  rerender();
}

// ── HELPERS ─────────────────────────────

function rerender() {
  render();
  renderLegend();
  renderEventList(id => {
    // Системные праздники нельзя удалить через список
    const ev = state.events.find(e => e.id === id);
    if (ev?.system) return;
    state.events = state.events.filter(e => e.id !== id);
    rerender();
  });
}

function setAccent(color) {
  state.accent = color;
  applyTheme();
  rerender();
}

function $(id) { return document.getElementById(id); }
