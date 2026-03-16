// ═══════════════════════════════════════════════
// export.js — PNG & PDF export via html2canvas
// ═══════════════════════════════════════════════

import { state, SIZES } from './state.js';

// ── INIT ──────────────────────────────────────

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', () => doExport('png'));
  document.getElementById('exportPdf').addEventListener('click', () => doExport('pdf'));
}

// ── MAIN ──────────────────────────────────────

async function doExport(format) {
  const pngBtn = document.getElementById('exportPng');
  const pdfBtn = document.getElementById('exportPdf');
  const btn    = format === 'png' ? pngBtn : pdfBtn;

  btn.classList.add('loading');
  btn.querySelector('.btn-icon').textContent = '↻';

  try {
    const canvas = await captureSheet();

    if (format === 'png') {
      downloadCanvas(canvas, getFilename('png'));
    } else {
      await canvasToPdf(canvas, getFilename('pdf'));
    }
  } catch (err) {
    console.error('Export failed:', err);
    alert('Ошибка экспорта. Попробуйте ещё раз.');
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-icon').textContent = '↓';
  }
}

// ── CAPTURE ───────────────────────────────────

async function captureSheet() {
  const sheet   = document.getElementById('calendarSheet');
  const sizeKey = state.size;
  const size    = SIZES[sizeKey];

  // Temporarily set sheet to exact export dimensions
  const prevStyle = sheet.getAttribute('style') || '';
  sheet.style.width     = size.w + 'px';
  sheet.style.maxWidth  = size.w + 'px';
  sheet.style.transform = 'none';
  sheet.style.position  = 'fixed';
  sheet.style.top       = '-9999px';
  sheet.style.left      = '-9999px';
  sheet.style.boxShadow = 'none';
  sheet.style.borderRadius = '0';

  // Wait for layout to settle
  await sleep(80);

  const canvas = await html2canvas(sheet, {
    scale:            2,
    useCORS:          true,
    allowTaint:       true,
    backgroundColor:  null,
    logging:          false,
    width:            size.w,
    height:           sheet.scrollHeight,
    windowWidth:      size.w,
  });

  // Restore
  sheet.setAttribute('style', prevStyle);

  return canvas;
}

// ── DOWNLOAD HELPERS ──────────────────────────

function downloadCanvas(canvas, filename) {
  const a   = document.createElement('a');
  a.href    = canvas.toDataURL('image/png', 1.0);
  a.download = filename;
  a.click();
}

async function canvasToPdf(canvas, filename) {
  const { jsPDF } = window.jspdf;

  const cw = canvas.width;
  const ch = canvas.height;

  // Determine orientation from size config
  const size = SIZES[state.size];
  const ori  = size.w >= size.h ? 'landscape' : 'portrait';

  // Use mm dimensions for proper A4/A3 sizing
  const MM_PER_PX = 25.4 / 96; // 96dpi → mm
  const wMM = (cw / 2) * MM_PER_PX;  // /2 because scale=2
  const hMM = (ch / 2) * MM_PER_PX;

  const pdf = new jsPDF({
    orientation: ori,
    unit:        'mm',
    format:      [wMM, hMM],
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', 0, 0, wMM, hMM);
  pdf.save(filename);
}

function getFilename(ext) {
  const base = state.title || monthStr();
  return `${slugify(base)}-calendar.${ext}`;
}

function monthStr() {
  if (!state.month) return 'calendar';
  const y = state.month.getFullYear();
  const m = String(state.month.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    || 'calendar';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
