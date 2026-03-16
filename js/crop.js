// ═══════════════════════════════════════════════
// crop.js — Image crop modal
// ═══════════════════════════════════════════════

import { state } from './state.js';
import { renderImage } from './render.js';

// ── PRIVATE STATE ─────────────────────────────

let dragging   = false;
let cropRatio  = 0;         // 0 = free
let dragStart  = { x:0, y:0 };
let selection  = { x:0, y:0, w:0, h:0 };
let wrapRect   = null;
let naturalW   = 0;
let naturalH   = 0;

// ── INIT ──────────────────────────────────────

export function initCrop() {
  // Open / close
  document.getElementById('openCropBtn').addEventListener('click', openModal);
  document.getElementById('cropClose').addEventListener('click', closeModal);
  document.getElementById('cancelCrop').addEventListener('click', closeModal);
  document.getElementById('applyCrop').addEventListener('click', applySelection);
  document.getElementById('cropBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Ratio presets
  document.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cropRatio = parseFloat(btn.dataset.ratio) || 0;
    });
  });

  // Mouse
  const wrap = document.getElementById('cropWrap');
  wrap.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup',   onPointerUp);

  // Touch
  wrap.addEventListener('touchstart', e => {
    e.preventDefault();
    onPointerDown(e.touches[0]);
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    if (!dragging) return;
    e.preventDefault();
    onPointerMove(e.touches[0]);
  }, { passive: false });

  window.addEventListener('touchend', onPointerUp);
}

// ── MODAL OPEN/CLOSE ──────────────────────────

function openModal() {
  if (!state.image) return;

  const src = document.getElementById('cropSrc');
  src.src = state.image;
  src.onload = () => {
    naturalW = src.naturalWidth;
    naturalH = src.naturalHeight;
  };

  // Reset selection
  selection = { x:0, y:0, w:0, h:0 };
  updateRectEl();
  document.getElementById('cropDims').textContent = '';
  document.getElementById('cropRect').style.display = 'none';
  document.getElementById('cropBackdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('cropBackdrop').classList.remove('open');
}

// ── APPLY ─────────────────────────────────────

function applySelection() {
  const imgEl = document.getElementById('cropSrc');
  const iRect = imgEl.getBoundingClientRect();
  const wRect = document.getElementById('cropWrap').getBoundingClientRect();

  const offsetX = iRect.left - wRect.left;
  const offsetY = iRect.top  - wRect.top;

  const rx = (selection.x - offsetX) / iRect.width;
  const ry = (selection.y - offsetY) / iRect.height;
  const rw = selection.w / iRect.width;
  const rh = selection.h / iRect.height;

  state.cropRect = (rw >= 0.02 && rh >= 0.02)
    ? { rx: clamp(rx,0,1), ry: clamp(ry,0,1), rw: clamp(rw,0,1), rh: clamp(rh,0,1) }
    : null;

  closeModal();
  renderImage();
}

// ── POINTER HANDLERS ──────────────────────────

function onPointerDown(e) {
  dragging = true;
  wrapRect = document.getElementById('cropWrap').getBoundingClientRect();
  const x = e.clientX - wrapRect.left;
  const y = e.clientY - wrapRect.top;
  dragStart = { x, y };
  selection = { x, y, w:0, h:0 };
}

function onPointerMove(e) {
  if (!dragging) return;

  let x = clamp(e.clientX - wrapRect.left, 0, wrapRect.width);
  let y = clamp(e.clientY - wrapRect.top,  0, wrapRect.height);
  let w = x - dragStart.x;
  let h = y - dragStart.y;

  if (cropRatio > 0) {
    const sign = h >= 0 ? 1 : -1;
    h = sign * Math.abs(w) / cropRatio;
    // clamp h to wrap bounds
    const endY = dragStart.y + h;
    if (endY < 0)              h = -dragStart.y;
    if (endY > wrapRect.height) h = wrapRect.height - dragStart.y;
  }

  selection = {
    x: w >= 0 ? dragStart.x : dragStart.x + w,
    y: h >= 0 ? dragStart.y : dragStart.y + h,
    w: Math.abs(w),
    h: Math.abs(h),
  };

  updateRectEl();
  updateDims();
}

function onPointerUp() {
  dragging = false;
}

// ── UI HELPERS ────────────────────────────────

function updateRectEl() {
  const rect = document.getElementById('cropRect');
  if (selection.w < 2 || selection.h < 2) {
    rect.style.display = 'none';
    return;
  }
  rect.style.display = 'block';
  rect.style.left    = selection.x + 'px';
  rect.style.top     = selection.y + 'px';
  rect.style.width   = selection.w + 'px';
  rect.style.height  = selection.h + 'px';
}

function updateDims() {
  const imgEl  = document.getElementById('cropSrc');
  const iRect  = imgEl.getBoundingClientRect();
  const scaleX = naturalW / iRect.width;
  const scaleY = naturalH / iRect.height;
  const pw = Math.round(selection.w * scaleX);
  const ph = Math.round(selection.h * scaleY);
  document.getElementById('cropDims').textContent = `${pw} × ${ph} пикс.`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
