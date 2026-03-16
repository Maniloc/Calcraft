// ═══════════════════════════════════════
// export.js — PNG & PDF via html2canvas
// Fixes: inline CSS vars before capture
// ═══════════════════════════════════════

import { state, SIZES } from './state.js';

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', () => doExport('png'));
  document.getElementById('exportPdf').addEventListener('click', () => doExport('pdf'));
}

async function doExport(fmt) {
  const btnId = fmt === 'png' ? 'exportPng' : 'exportPdf';
  const btn   = document.getElementById(btnId);
  btn.classList.add('loading');
  btn.querySelector('.btn-icon').textContent = '↻';

  try {
    const canvas = await capture();
    if (fmt === 'png') savePng(canvas);
    else               savePdf(canvas);
  } catch (e) {
    console.error('Export error:', e);
    alert('Ошибка экспорта. Попробуйте ещё раз.\n' + e.message);
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-icon').textContent = '↓';
  }
}

// ── CAPTURE ─────────────────────────────

async function capture() {
  const sheet = document.getElementById('calSheet');
  const size  = SIZES[state.size];

  // 1. Resolve all CSS custom properties on the sheet and children
  //    html2canvas can't read CSS vars — we must flatten them to real values
  inlineCssVars(sheet);

  // 2. Fix cover image height in export pixels
  const cover = document.getElementById('sheetCover');
  if (state.image && cover) {
    const coverPx = Math.round(size.h * state.imgHeightPct / 100);
    cover.style.height = coverPx + 'px';
    applyExportCrop(coverPx);
  }

  // 3. Move sheet off-screen at exact export dimensions
  const prevStyle = sheet.getAttribute('style') || '';
  Object.assign(sheet.style, {
    width:        size.w + 'px',
    maxWidth:     size.w + 'px',
    position:     'fixed',
    top:          '-99999px',
    left:         '-99999px',
    borderRadius: '0',
    boxShadow:    'none',
    transform:    'none',
    animation:    'none',
  });

  await sleep(150);

  const canvas = await html2canvas(sheet, {
    scale:           2,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: resolveVar('--cal-bg', sheet) || '#ffffff',
    logging:         false,
    width:           size.w,
    windowWidth:     size.w,
    onclone: (doc) => {
      // Also inline vars in the cloned document
      const clonedSheet = doc.getElementById('calSheet');
      if (clonedSheet) inlineCssVars(clonedSheet);
    },
  });

  // Restore original style
  sheet.setAttribute('style', prevStyle);

  return canvas;
}

// ── INLINE CSS VARS ──────────────────────
// html2canvas doesn't process CSS custom properties.
// We walk every element and replace var(--x) values with computed values.

function inlineCssVars(root) {
  const computed = getComputedStyle(document.documentElement);
  const sheet    = document.getElementById('calSheet');
  const sheetCs  = getComputedStyle(sheet);

  // Properties that use CSS vars in our stylesheet
  const PROPS = [
    'color', 'background', 'background-color', 'border-color',
    'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color',
  ];

  // Resolve a var() reference
  function resolveValue(el, prop) {
    const cs  = getComputedStyle(el);
    return cs.getPropertyValue(prop);
  }

  // Walk all elements under root
  const all = [root, ...root.querySelectorAll('*')];
  all.forEach(el => {
    if (!(el instanceof HTMLElement)) return;
    const cs = getComputedStyle(el);
    PROPS.forEach(prop => {
      const val = cs.getPropertyValue(prop);
      if (val && val.trim()) {
        el.style.setProperty(prop, val.trim());
      }
    });
    // Also set font explicitly (html2canvas needs it)
    el.style.fontFamily = cs.fontFamily;
    el.style.fontSize   = cs.fontSize;
    el.style.fontWeight = cs.fontWeight;
    el.style.color      = cs.color;
  });
}

function resolveVar(varName, el) {
  return getComputedStyle(el || document.documentElement)
    .getPropertyValue(varName).trim();
}

function applyExportCrop(coverPx) {
  if (!state.cropRect) return;
  const img = document.getElementById('coverImg');
  const { rx, ry, rw, rh } = state.cropRect;
  img.style.width      = (100 / rw) + '%';
  img.style.height     = (coverPx / rh) + 'px';
  img.style.objectFit  = 'none';
  img.style.marginLeft = (-rx / rw * 100) + '%';
  img.style.marginTop  = (-ry * coverPx / rh) + 'px';
  img.style.maxWidth   = 'none';
}

// ── SAVE HELPERS ────────────────────────

function savePng(canvas) {
  const a = document.createElement('a');
  a.href     = canvas.toDataURL('image/png', 1.0);
  a.download = makeFilename('png');
  a.click();
}

function savePdf(canvas) {
  const { jsPDF } = window.jspdf;
  const MM  = 25.4 / 96;
  const wMM = (canvas.width  / 2) * MM;
  const hMM = (canvas.height / 2) * MM;
  const ori = wMM >= hMM ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation: ori, unit: 'mm', format: [wMM, hMM] });
  pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, wMM, hMM);
  pdf.save(makeFilename('pdf'));
}

function makeFilename(ext) {
  const base = (state.title || String(state.year))
    .replace(/[^a-zа-яё0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'calendar';
  return `${base}-${state.year}.${ext}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
