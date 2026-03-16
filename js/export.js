// ═══════════════════════════════════════
// export.js — PNG & PDF via html2canvas
// ═══════════════════════════════════════

import { state, SIZES } from './state.js';

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', () => doExport('png'));
  document.getElementById('exportPdf').addEventListener('click', () => doExport('pdf'));
}

async function doExport(fmt) {
  const btn = document.getElementById(fmt === 'png' ? 'exportPng' : 'exportPdf');
  btn.classList.add('loading');
  btn.querySelector('.btn-icon').textContent = '↻';

  try {
    const canvas = await capture();
    if (fmt === 'png') {
      downloadPng(canvas);
    } else {
      toPdf(canvas);
    }
  } catch (e) {
    console.error(e);
    alert('Ошибка экспорта. Попробуйте ещё раз.');
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-icon').textContent = '↓';
  }
}

async function capture() {
  const sheet = document.getElementById('calSheet');
  const size  = SIZES[state.size];

  // Pin sheet to exact export size off-screen
  const saved = sheet.getAttribute('style') || '';
  Object.assign(sheet.style, {
    width:        size.w + 'px',
    maxWidth:     size.w + 'px',
    position:     'fixed',
    top:          '-99999px',
    left:         '-99999px',
    borderRadius: '0',
    boxShadow:    'none',
    transform:    'none',
  });

  // Cover height in px
  const cover = document.getElementById('sheetCover');
  if (state.image && cover) {
    const coverPx = Math.round(size.h * state.imgHeightPct / 100);
    cover.style.height = coverPx + 'px';
    // Re-apply crop offsets at this height
    const img = document.getElementById('coverImg');
    if (state.cropRect) {
      const { rx, ry, rw, rh } = state.cropRect;
      img.style.width      = (100 / rw) + '%';
      img.style.height     = (coverPx / rh) + 'px';
      img.style.objectFit  = 'none';
      img.style.marginLeft = (-rx / rw * 100) + '%';
      img.style.marginTop  = (-ry * coverPx / rh) + 'px';
      img.style.maxWidth   = 'none';
    }
  }

  await sleep(120);

  const canvas = await html2canvas(sheet, {
    scale:           2,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: null,
    logging:         false,
    width:           size.w,
    windowWidth:     size.w,
  });

  // Restore
  sheet.setAttribute('style', saved);
  return canvas;
}

function downloadPng(canvas) {
  const a = document.createElement('a');
  a.href     = canvas.toDataURL('image/png', 1.0);
  a.download = filename('png');
  a.click();
}

function toPdf(canvas) {
  const { jsPDF } = window.jspdf;
  const size  = SIZES[state.size];
  const MM    = 25.4 / 96;          // px@96dpi → mm
  const wMM   = (canvas.width  / 2) * MM;
  const hMM   = (canvas.height / 2) * MM;
  const ori   = wMM >= hMM ? 'landscape' : 'portrait';
  const pdf   = new jsPDF({ orientation: ori, unit: 'mm', format: [wMM, hMM] });
  pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, wMM, hMM);
  pdf.save(filename('pdf'));
}

function filename(ext) {
  const base = (state.title || String(state.year)).replace(/[^a-zа-яё0-9]/gi, '-').replace(/-+/g,'-') || 'calendar';
  return `${base}-${state.year}.${ext}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
