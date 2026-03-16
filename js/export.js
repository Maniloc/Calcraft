// ═══════════════════════════════════════
// export.js — PNG & PDF via html2canvas
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

  // --- Prepare export clone (never touch the live DOM) ---

  // 1. Deep clone the sheet
  const clone = sheet.cloneNode(true);
  clone.style.cssText = '';
  Object.assign(clone.style, {
    width:        size.w + 'px',
    maxWidth:     size.w + 'px',
    position:     'fixed',
    top:          '-99999px',
    left:         '-99999px',
    borderRadius: '0',
    boxShadow:    'none',
    transform:    'none',
    animation:    'none',
    zIndex:       '-1',
  });

  // 2. Copy computed styles to every element in clone
  //    so html2canvas sees real colors even without CSS cascade
  const liveEls  = [sheet, ...sheet.querySelectorAll('*')];
  const cloneEls = [clone, ...clone.querySelectorAll('*')];

  // Save inline styles of live elements to restore after export
  const savedStyles = liveEls.map(el => el.getAttribute('style') || '');

  liveEls.forEach((el, i) => {
    const cs  = getComputedStyle(el);
    const cel = cloneEls[i];
    if (!(cel instanceof HTMLElement)) return;

    cel.style.color           = cs.color;
    cel.style.backgroundColor = cs.backgroundColor;
    cel.style.borderColor     = cs.borderColor;
    cel.style.fontFamily      = cs.fontFamily;
    cel.style.fontSize        = cs.fontSize;
    cel.style.fontWeight      = cs.fontWeight;
    cel.style.fontStyle       = cs.fontStyle;
  });

  // 3. Fix cover image in clone
  const cloneCover = clone.querySelector('#sheetCover');
  const cloneImg   = clone.querySelector('#coverImg');
  if (state.image && cloneCover && cloneImg) {
    const coverPx = Math.round(size.h * state.imgHeightPct / 100);
    cloneCover.style.height = coverPx + 'px';
    cloneImg.src = state.image;

    if (state.cropRect) {
      const { rx, ry, rw, rh } = state.cropRect;
      cloneImg.style.width      = (100 / rw) + '%';
      cloneImg.style.height     = (coverPx / rh) + 'px';
      cloneImg.style.objectFit  = 'none';
      cloneImg.style.marginLeft = (-rx / rw * 100) + '%';
      cloneImg.style.marginTop  = (-ry * coverPx / rh) + 'px';
      cloneImg.style.maxWidth   = 'none';
    } else {
      cloneImg.style.width          = '100%';
      cloneImg.style.height         = '100%';
      cloneImg.style.objectFit      = state.imgFit || 'cover';
      cloneImg.style.objectPosition = 'center';
    }
  }

  // 4. Append clone, render, remove — live DOM untouched
  document.body.appendChild(clone);
  await sleep(120);

  const bgColor = getComputedStyle(sheet).backgroundColor || '#ffffff';
  const canvas  = await html2canvas(clone, {
    scale:           2,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: bgColor,
    logging:         false,
    width:           size.w,
    windowWidth:     size.w,
  });

  clone.remove();

  return canvas;
}

// ── SAVE HELPERS ────────────────────────

function savePng(canvas) {
  const a    = document.createElement('a');
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
