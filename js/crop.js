// ═══════════════════════════════════════
// crop.js — Image crop modal
// ═══════════════════════════════════════

import { state } from './state.js';
import { renderCover } from './render.js';

let dragging  = false;
let ratio     = 0;
let start     = { x:0, y:0 };
let sel       = { x:0, y:0, w:0, h:0 };
let wRect     = null;
let natW = 0, natH = 0;

export function initCrop() {
  document.getElementById('openCropBtn').addEventListener('click', open);
  document.getElementById('cropClose').addEventListener('click', close);
  document.getElementById('cancelCrop').addEventListener('click', close);
  document.getElementById('applyCrop').addEventListener('click', apply);
  document.getElementById('cropBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) close();
  });

  document.querySelectorAll('.ratio-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ratio = parseFloat(b.dataset.ratio) || 0;
    });
  });

  const wrap = document.getElementById('cropWrap');
  wrap.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', e => { if (dragging) moveDrag(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { dragging = false; });

  wrap.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive:false });
  window.addEventListener('touchmove', e => { if (!dragging) return; e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive:false });
  window.addEventListener('touchend', () => { dragging = false; });
}

function open() {
  if (!state.image) return;
  const img = document.getElementById('cropSrc');
  img.src = state.image;
  img.onload = () => { natW = img.naturalWidth; natH = img.naturalHeight; };
  document.getElementById('cropRect').style.display = 'none';
  document.getElementById('cropDims').textContent = '';
  sel = { x:0, y:0, w:0, h:0 };
  document.getElementById('cropBackdrop').classList.add('open');
}

function close() { document.getElementById('cropBackdrop').classList.remove('open'); }

function apply() {
  const img   = document.getElementById('cropSrc');
  const iRect = img.getBoundingClientRect();
  const wR    = document.getElementById('cropWrap').getBoundingClientRect();
  const rx = (sel.x - (iRect.left - wR.left)) / iRect.width;
  const ry = (sel.y - (iRect.top  - wR.top))  / iRect.height;
  const rw = sel.w / iRect.width;
  const rh = sel.h / iRect.height;
  state.cropRect = (rw >= 0.02 && rh >= 0.02)
    ? { rx: clamp(rx), ry: clamp(ry), rw: clamp(rw), rh: clamp(rh) }
    : null;
  close();
  renderCover();
}

function startDrag(cx, cy) {
  dragging = true;
  wRect = document.getElementById('cropWrap').getBoundingClientRect();
  const x = cx - wRect.left;
  const y = cy - wRect.top;
  start = { x, y };
  sel = { x, y, w:0, h:0 };
}

function moveDrag(cx, cy) {
  let x = clampV(cx - wRect.left, 0, wRect.width);
  let y = clampV(cy - wRect.top,  0, wRect.height);
  let w = x - start.x;
  let h = y - start.y;

  if (ratio > 0) {
    const sign = h >= 0 ? 1 : -1;
    h = sign * Math.abs(w) / ratio;
    const ey = start.y + h;
    if (ey < 0)              h = -start.y;
    if (ey > wRect.height)   h = wRect.height - start.y;
  }

  sel = {
    x: w >= 0 ? start.x : start.x + w,
    y: h >= 0 ? start.y : start.y + h,
    w: Math.abs(w), h: Math.abs(h),
  };

  const rect = document.getElementById('cropRect');
  if (sel.w < 2 || sel.h < 2) { rect.style.display = 'none'; return; }
  rect.style.display = 'block';
  rect.style.left    = sel.x + 'px';
  rect.style.top     = sel.y + 'px';
  rect.style.width   = sel.w + 'px';
  rect.style.height  = sel.h + 'px';

  const img   = document.getElementById('cropSrc');
  const iRect = img.getBoundingClientRect();
  const pw = Math.round(sel.w * natW / iRect.width);
  const ph = Math.round(sel.h * natH / iRect.height);
  document.getElementById('cropDims').textContent = `${pw} × ${ph} пикс.`;
}

function clamp(v)        { return Math.max(0, Math.min(1, v)); }
function clampV(v, a, b) { return Math.max(a, Math.min(b, v)); }
