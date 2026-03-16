// ═══════════════════════════════════════
// main.js — Entry point & event wiring
// ═══════════════════════════════════════

import { state } from './state.js';
import { render, renderEventList, syncImageUI, applyTheme } from './render.js';
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
  document.getElementById('yearPrev').addEventListener('click', () => {
    state.year--;
    document.getElementById('yearDisplay').textContent = state.year;
    rerender();
  });
  document.getElementById('yearNext').addEventListener('click', () => {
    state.year++;
    document.getElementById('yearDisplay').textContent = state.year;
    rerender();
  });

  document.getElementById('calTitle').addEventListener('input', e => {
    state.title = e.target.value; rerender();
  });
  document.getElementById('calSubtitle').addEventListener('input', e => {
    state.subtitle = e.target.value; rerender();
  });

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

  const picker = document.getElementById('customAccent');
  picker.addEventListener('input', e => {
    setAccent(e.target.value);
    document.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
    picker.classList.add('active');
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.size = btn.dataset.size;
    });
  });

  document.getElementById('showWeekendColor').addEventListener('change', e => {
    state.showWeekendColor = e.target.checked; rerender();
  });
  document.getElementById('showWeekNums').addEventListener('change', e => {
    state.showWeekNums = e.target.checked; rerender();
  });

  // Work stats toggle
  document.getElementById('showWorkStats').addEventListener('change', e => {
    state.showWorkStats = e.target.checked;
    document.getElementById('hoursGroup').style.display = state.showWorkStats ? 'block' : 'none';
    rerender();
  });

  // Hours per day picker
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

// ── IMAGE TAB ───────────────────────────

function bindImage() {
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

  document.getElementById('removeImgBtn').addEventListener('click', () => {
    state.image    = null;
    state.cropRect = null;
    document.getElementById('imgInput').value = '';
    syncImageUI();
    rerender();
  });

  const slider = document.getElementById('imgHeightRange');
  slider.addEventListener('input', () => {
    state.imgHeightPct = parseInt(slider.value, 10);
    document.getElementById('imgHeightVal').textContent = state.imgHeightPct + '%';
    rerender();
  });
}

// ── EVENTS TAB ──────────────────────────

function bindEvents() {
  document.getElementById('addEventBtn').addEventListener('click', addEvent);
  document.getElementById('newEventName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addEvent();
  });
}

function addEvent() {
  const name   = document.getElementById('newEventName').value.trim();
  const date   = document.getElementById('newEventDate').value;
  const color  = document.getElementById('newEventColor').value;
  const repeat = document.getElementById('newEventRepeat').checked;
  if (!name || !date) return;
  state.events.push({ id: Date.now() + Math.random(), name, date, color, repeat });
  document.getElementById('newEventName').value = '';
  rerender();
}

// ── HELPERS ─────────────────────────────

function rerender() {
  render();
  renderEventList(id => {
    state.events = state.events.filter(e => e.id !== id);
    rerender();
  });
}

function setAccent(color) {
  state.accent = color;
  applyTheme();
  rerender();
}
