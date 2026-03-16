// ═══════════════════════════════════════
// export.js — PNG & PDF via html2canvas
// Предпросмотр перед скачиванием.
// ═══════════════════════════════════════

import { state, getSizeWithOrientation } from './state.js';

export function initExport() {
  document.getElementById('exportPng').addEventListener('click', () => openPreview('png'));
  document.getElementById('exportPdf').addEventListener('click', () => openPreview('pdf'));

  document.getElementById('previewConfirm').addEventListener('click', () => {
    const fmt = document.getElementById('previewModal').dataset.fmt;
    closePreview();
    doExport(fmt);
  });
  document.getElementById('previewCancel').addEventListener('click', closePreview);
  document.getElementById('previewModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePreview();
  });
}

// ── PREVIEW MODAL ────────────────────────

async function openPreview(fmt) {
  const modal = document.getElementById('previewModal');
  const img   = document.getElementById('previewImg');
  const spin  = document.getElementById('previewSpinner');

  modal.dataset.fmt = fmt;
  modal.classList.add('open');
  spin.style.display = 'flex';
  img.style.display  = 'none';

  try {
    const dataUrl = await renderToDataUrl();
    img.src = dataUrl;
    img.onload = () => {
      spin.style.display = 'none';
      img.style.display  = 'block';
    };
  } catch (e) {
    closePreview();
    alert('Ошибка предпросмотра: ' + e.message);
  }
}

function closePreview() {
  document.getElementById('previewModal').classList.remove('open');
}

// ── EXPORT ───────────────────────────────

async function doExport(fmt) {
  const btnId = fmt === 'png' ? 'exportPng' : 'exportPdf';
  const btn   = document.getElementById(btnId);
  btn.classList.add('loading');
  btn.querySelector('.btn-icon').textContent = '↻';

  try {
    const dataUrl = await renderToDataUrl();
    if (fmt === 'png') savePng(dataUrl);
    else               savePdf(dataUrl);
  } catch (e) {
    console.error('Export error:', e);
    alert('Ошибка экспорта: ' + e.message);
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-icon').textContent = '↓';
  }
}

// ── RENDER TO DATA URL ───────────────────

async function renderToDataUrl() {
  const sheet = document.getElementById('calSheet');
  const size  = getSizeWithOrientation(state.size, state.orientation);

  // Клон для экспорта — живой DOM не трогаем
  const clone = sheet.cloneNode(true);
  clone.id = 'calSheetExport';
  Object.assign(clone.style, {
    width:        size.w + 'px',
    maxWidth:     size.w + 'px',
    minWidth:     size.w + 'px',
    position:     'fixed',
    top:          '-99999px',
    left:         '-99999px',
    borderRadius: '0',
    boxShadow:    'none',
    transform:    'none',
    animation:    'none',
    zIndex:       '0',
    visibility:   'hidden',
  });

  // Обложка
  const cloneCover = clone.querySelector('#sheetCover');
  const cloneImg   = clone.querySelector('#coverImg');
  if (state.image && cloneCover) {
    cloneCover.style.display       = 'block';
    cloneCover.style.overflow      = 'hidden';
    cloneCover.style.position      = 'relative';
    cloneCover.style.height        = '0';
    cloneCover.style.paddingBottom = state.imgHeightPct + '%';

    if (state.cropRect) {
      const { rx, ry, rw, rh } = state.cropRect;
      cloneCover.style.backgroundImage    = `url('${state.image}')`;
      cloneCover.style.backgroundSize     = `${(100/rw).toFixed(4)}% ${(100/rh).toFixed(4)}%`;
      cloneCover.style.backgroundPosition = `${(-rx/rw*100).toFixed(4)}% ${(-ry/rh*100).toFixed(4)}%`;
      cloneCover.style.backgroundRepeat   = 'no-repeat';
      if (cloneImg) cloneImg.style.display = 'none';
    } else if (cloneImg) {
      cloneCover.style.backgroundImage  = '';
      cloneImg.style.display            = 'block';
      cloneImg.style.position           = 'absolute';
      cloneImg.style.inset              = '0';
      cloneImg.style.width              = '100%';
      cloneImg.style.height             = '100%';
      cloneImg.style.objectFit          = state.imgFit === 'fill' ? 'fill' : 'cover';
      cloneImg.style.objectPosition     = 'center';
      cloneImg.src = state.image;
    }
  }

  document.body.appendChild(clone);
  clone.style.visibility = 'visible';
  await sleep(100);

  // Инлайним вычисленные стили (html2canvas не читает CSS-переменные)
  inlineStyles(sheet, clone);

  await sleep(60);

  const bgColor = getComputedStyle(sheet).backgroundColor || '#ffffff';
  const canvas  = await html2canvas(clone, {
    scale:           2,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: bgColor,
    logging:         false,
    width:           size.w,
    height:          clone.scrollHeight,
    windowWidth:     size.w,
    windowHeight:    clone.scrollHeight,
  });

  clone.remove();
  return canvas.toDataURL('image/png', 1.0);
}

// Копирует вычисленные стили из живых элементов в клон
function inlineStyles(liveRoot, cloneRoot) {
  const PROPS = [
    'color', 'backgroundColor', 'backgroundImage', 'backgroundSize',
    'backgroundPosition', 'backgroundRepeat',
    'borderColor', 'borderTopColor', 'borderBottomColor',
    'borderLeftColor', 'borderRightColor',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  ];

  const liveAll  = [liveRoot,  ...liveRoot.querySelectorAll('*')];
  const cloneAll = [cloneRoot, ...cloneRoot.querySelectorAll('*')];
  const len = Math.min(liveAll.length, cloneAll.length);

  for (let i = 0; i < len; i++) {
    const live  = liveAll[i];
    const clone = cloneAll[i];
    if (!(live instanceof HTMLElement) || !(clone instanceof HTMLElement)) continue;
    const cs = getComputedStyle(live);
    for (const prop of PROPS) {
      const val = cs[prop];
      if (val && !val.includes('color-mix') && !val.includes('var(')) {
        clone.style[prop] = val;
      }
    }
  }
}

// ── SAVE ────────────────────────────────

function savePng(dataUrl) {
  const a    = document.createElement('a');
  a.href     = dataUrl;
  a.download = makeFilename('png');
  a.click();
}

function savePdf(dataUrl) {
  const { jsPDF } = window.jspdf;
  const img = new Image();
  img.onload = () => {
    const MM  = 25.4 / 96;
    const wMM = (img.width  / 2) * MM;
    const hMM = (img.height / 2) * MM;
    // Ориентация берётся из state, а не из соотношения сторон canvas
    const ori = state.orientation === 'landscape' ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation: ori, unit: 'mm', format: [wMM, hMM] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, wMM, hMM);
    pdf.save(makeFilename('pdf'));
  };
  img.src = dataUrl;
}

function makeFilename(ext) {
  const base = (state.title || String(state.year))
    .replace(/[^a-zа-яё0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'calendar';
  return `${base}-${state.year}.${ext}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
