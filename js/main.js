// ═══════════════════════════════════════════════
// main.js — Entry point & event wiring
// ═══════════════════════════════════════════════

import { state, MONTHS_RU } from './state.js';
import { render, renderEventList, renderHolidayList, syncImageUI, applyTheme } from './render.js';
import { initCrop } from './crop.js';
import { initExport } from './export.js';

// ── BOOT ──────────────────────────────────────

(function boot() {
  // Set current month as default
  const now = new Date();
  state.month = new Date(now.getFullYear(), now.getMonth(), 1);

  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;
  document.getElementById('monthPicker').value = ym;

  // Init sub-modules
  initCrop();
  initExport();
  bindAll();

  // First render
  rerender();
})();

// ── BIND ALL CONTROLS ─────────────────────────

function bindAll() {
  bindTabs();
  bindContent();
  bindDesign();
  bindImage();
}

// ── TABS ──────────────────────────────────────

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

// ── CONTENT TAB ───────────────────────────────

function bindContent() {
  // Month picker
  document.getElementById('monthPicker').addEventListener('change', e => {
    const [y, m] = e.target.value.split('-').map(Number);
    state.month  = new Date(y, m - 1, 1);

    // Auto-fill title if user hasn't overridden it
    const titleInput = document.getElementById('calTitle');
    if (!titleInput.dataset.manual) {
      state.title = '';
      titleInput.value = '';
      titleInput.placeholder = MONTHS_RU[m - 1];
    }
    rerender();
  });

  // Update placeholder to reflect selected month
  updateTitlePlaceholder();

  // Title
  document.getElementById('calTitle').addEventListener('input', e => {
    state.title = e.target.value;
    e.target.dataset.manual = e.target.value ? '1' : '';
    rerender();
  });

  // Subtitle
  document.getElementById('calSubtitle').addEventListener('input', e => {
    state.subtitle = e.target.value;
    rerender();
  });

  // Weekend day toggles
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.day, 10);
      if (state.weekends.has(d)) state.weekends.delete(d);
      else                       state.weekends.add(d);
      btn.classList.toggle('active');
      rerender();
    });
  });

  // Add event
  document.getElementById('addEventBtn').addEventListener('click', () => {
    const name  = val('newEventName').trim();
    const date  = val('newEventDate');
    const color = val('newEventColor');
    if (!name || !date) return;
    state.events.push({ id: uid(), name, date, color });
    document.getElementById('newEventName').value = '';
    rerender();
  });

  // Enter key on event name
  document.getElementById('newEventName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addEventBtn').click();
  });

  // Add holiday
  document.getElementById('addHolidayBtn').addEventListener('click', () => {
    const name = val('newHolidayName').trim();
    const date = val('newHolidayDate');
    if (!name || !date) return;
    state.holidays.push({ id: uid(), name, date });
    document.getElementById('newHolidayName').value = '';
    rerender();
  });

  document.getElementById('newHolidayName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addHolidayBtn').click();
  });
}

// ── DESIGN TAB ────────────────────────────────

function bindDesign() {
  // Theme cards
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.theme = card.dataset.theme;
      rerender();
    });
  });

  // Accent preset buttons
  document.querySelectorAll('.accent-btn:not(.accent-custom)').forEach(btn => {
    btn.addEventListener('click', () => {
      setAccent(btn.dataset.color);
      document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Custom accent color picker
  const customPicker = document.getElementById('customAccent');
  customPicker.addEventListener('input', e => {
    setAccent(e.target.value);
    document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
    customPicker.classList.add('active');
  });

  // Size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.size = btn.dataset.size;
      rerender();
    });
  });

  // Toggles
  document.getElementById('showWeekNumbers').addEventListener('change', e => {
    state.showWeekNums = e.target.checked;
    rerender();
  });

  document.getElementById('showLegend').addEventListener('change', e => {
    state.showLegend = e.target.checked;
    rerender();
  });
}

// ── IMAGE TAB ─────────────────────────────────

function bindImage() {
  // File input
  document.getElementById('imgInput').addEventListener('change', e => {
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

  // Remove
  document.getElementById('removeImgBtn').addEventListener('click', () => {
    state.image    = null;
    state.cropRect = null;
    document.getElementById('imgInput').value = '';
    syncImageUI();
    rerender();
  });

  // Height slider
  const slider = document.getElementById('imgHeightRange');
  slider.addEventListener('input', () => {
    state.imgHeight = parseInt(slider.value, 10);
    document.getElementById('imgHeightVal').textContent = state.imgHeight + 'px';
    rerender();
  });

  // Fit buttons
  document.querySelectorAll('.fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.fit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.imgFit   = btn.dataset.fit;
      state.cropRect = null; // reset crop when switching fit mode
      rerender();
    });
  });
}

// ── HELPERS ───────────────────────────────────

function rerender() {
  render();
  renderEventList(id => { state.events   = state.events.filter(e => e.id !== id);   rerender(); });
  renderHolidayList(id => { state.holidays = state.holidays.filter(h => h.id !== id); rerender(); });
}

function setAccent(color) {
  state.accent = color;
  applyTheme();
  rerender();
}

function updateTitlePlaceholder() {
  if (!state.month) return;
  const input = document.getElementById('calTitle');
  if (!input.dataset.manual) {
    input.placeholder = MONTHS_RU[state.month.getMonth()];
  }
}

function val(id)  { return document.getElementById(id).value; }
function uid()    { return Date.now() + Math.random(); }
