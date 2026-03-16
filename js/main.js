// ═══════════════════════════════════════
// main.js — Entry point
// ═══════════════════════════════════════

import { render, renderEventList, renderCoverText, renderLegend, syncImageUI, applyTheme } from './render.js';
import { state, buildHolidaysForYear } from './state.js';
import { initCrop } from './crop.js';
import { initExport } from './export.js';

(function boot() {
  initCrop();
  initExport();
  bindAll();
  rerender();
})();

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
    state.year--;
    $('yearDisplay').textContent = state.year;
    rebuildSystemHolidays();
    rerender();
  });
  $('yearNext').addEventListener('click', () => {
    state.year++;
    $('yearDisplay').textContent = state.year;
    rebuildSystemHolidays();
    rerender();
  });

  $('calTitle').addEventListener('input', e => { state.title = e.target.value; rerender(); });
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
  $('showWeekNums').addEventListener('change', e => { state.showWeekNums = e.target.checked; rerender(); });

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

  // Fit buttons
  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.imgFit   = btn.dataset.fit;
      state.cropRect = null; // сбрасываем кроп при смене режима
      rerender();
    });
  });

  // Cover text
  $('coverText').addEventListener('input', e => {
    state.coverText = e.target.value;
    renderCoverText();
  });

  $('coverTextSize').addEventListener('input', e => {
    state.coverTextSize = parseInt(e.target.value, 10);
    $('coverTextSizeVal').textContent = state.coverTextSize + 'px';
    renderCoverText();
  });

  // Cover text color presets
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

  // Position grid
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
  // Type selector
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
  const type   = typeBtn ? typeBtn.dataset.type : 'holiday';

  if (!name || !date) return;
  state.events.push({ id: Date.now() + Math.random(), name, date, color, repeat, type });
  $('newEventName').value = '';
  rerender();
}

// ── HELPERS ─────────────────────────────

function rerender() {
  render();
  renderLegend();
  renderEventList(id => {
    // Only allow deleting non-system events
    state.events = state.events.filter(e => e.id !== id);
    rerender();
  });
}

// Replaces system holidays for new year while keeping user events
function rebuildSystemHolidays() {
  const userEvents   = state.events.filter(e => !e.system);
  const sysHolidays  = buildHolidaysForYear(state.year);
  state.events = [...sysHolidays, ...userEvents];
}

function setAccent(color) {
  state.accent = color;
  applyTheme();
  rerender();
}

function $(id) { return document.getElementById(id); }
