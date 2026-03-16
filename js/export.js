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

  // Clone the sheet — live DOM stays untouched
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

  // Fix cover image in clone
  // Uses same padding-bottom % trick as renderCover() — guarantees
  // identical crop geometry in preview and export
  const cloneCover = clone.querySelector('#sheetCover');
  const cloneImg   = clone.querySelector('#coverImg');
  if (state.image && cloneCover && cloneImg) {
    cloneCover.style.display      = 'block';
    cloneCover.style.overflow     = 'hidden';
    cloneCover.style.position     = 'relative';
    cloneCover.style.height       = '0';
    cloneCover.style.paddingBottom = state.imgHeightPct + '%';
    cloneImg.src = state.image;

    // Position image absolutely inside cover
    cloneImg.style.position = 'absolute';
    cloneImg.style.top      = '0';
    cloneImg.style.left     = '0';

    if (state.cropRect) {
      const { rx, ry, rw, rh } = state.cropRect;
      cloneImg.style.width         = (100 / rw) + '%';
      cloneImg.style.height        = (100 / rh) + '%';
      cloneImg.style.objectFit     = 'none';
      cloneImg.style.objectPosition = '';
      cloneImg.style.marginLeft    = (-rx / rw * 100) + '%';
      cloneImg.style.marginTop     = (-ry / rh * 100) + '%';
      cloneImg.style.maxWidth      = 'none';
    } else {
      cloneImg.style.width          = '100%';
      cloneImg.style.height         = '100%';
      cloneImg.style.objectFit      = state.imgFit || 'cover';
      cloneImg.style.objectPosition = 'center';
      cloneImg.style.marginLeft     = '';
      cloneImg.style.marginTop      = '';
      cloneImg.style.maxWidth       = '';
    }
  }

  // Inline computed styles element-by-element using matching by selector
  // Safe approach: iterate clone elements, find matching live element by position
  document.body.appendChild(clone);
  clone.style.visibility = 'visible';
  await sleep(80); // allow layout

  // Now flatten computed styles — iterate clone elements directly
  const STYLE_PROPS = [
    'color', 'backgroundColor', 'borderColor',
    'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  ];

  // Build parallel arrays after clone is in DOM (so it has computed styles)
  const cloneAll = [clone, ...clone.querySelectorAll('*')];
  const liveAll  = [sheet, ...sheet.querySelectorAll('*')];

  // Only iterate up to min length to avoid index mismatch
  const len = Math.min(cloneAll.length, liveAll.length);
  for (let i = 0; i < len; i++) {
    const liveEl  = liveAll[i];
    const cloneEl = cloneAll[i];
    if (!(liveEl instanceof HTMLElement) || !(cloneEl instanceof HTMLElement)) continue;
    const cs = getComputedStyle(liveEl);
    STYLE_PROPS.forEach(prop => {
      const val = cs[prop];
      // html2canvas не поддерживает color-mix() — пропускаем, уже резолвлено браузером в rgb()
      if (val && !val.includes('color-mix') && !val.includes('var(')) {
        cloneEl.style[prop] = val;
      } else if (val && (val.includes('color-mix') || val.includes('var('))) {
        // Принудительно пересчитываем через временный элемент
        cloneEl.style[prop] = resolveColor(liveEl, prop);
      }
    });
  }

  await sleep(60);

  const bgColor = getComputedStyle(sheet).backgroundColor || '#ffffff';

  const canvas = await html2canvas(clone, {
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

// ── SAVE ────────────────────────────────

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

// Resolve any CSS value (including color-mix, var) to a plain rgb() string
function resolveColor(el, prop) {
  try {
    const cs  = getComputedStyle(el);
    const val = cs[prop];
    // If browser already resolved it to rgb/rgba — use directly
    if (!val || val === 'transparent' || val.startsWith('rgb')) return val;
    // Otherwise create a temp element to force resolution
    const tmp = document.createElement('div');
    tmp.style.cssText = `${cssProp(prop)}:${val};position:absolute;visibility:hidden`;
    document.body.appendChild(tmp);
    const resolved = getComputedStyle(tmp)[prop];
    tmp.remove();
    return resolved || val;
  } catch (e) {
    return '';
  }
}

// Convert camelCase to kebab-case for style attribute
function cssProp(camel) {
  return camel.replace(/([A-Z])/g, m => '-' + m.toLowerCase());
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
