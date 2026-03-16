// ═══════════════════════════════════════
// storage.js — localStorage persistence
// Сохраняет state между сессиями.
// Изображение хранится отдельным ключом
// (может быть большим).
// ═══════════════════════════════════════

const KEY_STATE = 'calcraft_state_v1';
const KEY_IMAGE = 'calcraft_image_v1';
// При изменении структуры данных — увеличить версию,
// чтобы не восстанавливать несовместимый state
// Версия должна совпадать с RF_CALENDAR_VERSION в state.js
const STATE_VERSION = 2;

// Поля которые сериализуются (без image и events системных)
const PERSIST_FIELDS = [
  'year', 'title', 'subtitle',
  'theme', 'accent', 'size', 'layout', 'orientation',
  'showWeekendColor', 'showWeekNums', 'showHeader',
  'showWorkStats', 'hoursPerDay',
  'tatarstan',
  'imgHeightPct', 'imgFit', 'cropRect',
  'coverText', 'coverTextSize', 'coverTextColor', 'coverTextPosition',
];

export function saveState(state) {
  try {
    const data = { _v: STATE_VERSION };
    for (const key of PERSIST_FIELDS) {
      data[key] = state[key];
    }
    // weekends — Set → Array
    data.weekends = [...state.weekends];
    // user events only (system holidays rebuilt from RF_CALENDAR)
    data.events = state.events.filter(e => !e.system);
    localStorage.setItem(KEY_STATE, JSON.stringify(data));

    // Image stored separately — can be large
    if (state.image) {
      try { localStorage.setItem(KEY_IMAGE, state.image); }
      catch { /* quota exceeded — skip image */ }
    } else {
      localStorage.removeItem(KEY_IMAGE);
    }
  } catch (e) {
    console.warn('CalCraft: не удалось сохранить состояние', e);
  }
}

export function loadState(state) {
  try {
    const raw = localStorage.getItem(KEY_STATE);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data._v !== STATE_VERSION) {
      // Несовместимая версия — сбрасываем
      clearState();
      return false;
    }
    for (const key of PERSIST_FIELDS) {
      if (key in data) state[key] = data[key];
    }
    if (Array.isArray(data.weekends)) {
      state.weekends = new Set(data.weekends);
    }
    if (Array.isArray(data.events)) {
      state.events = data.events;
    }
    // Restore image
    const img = localStorage.getItem(KEY_IMAGE);
    if (img) state.image = img;

    return true;
  } catch (e) {
    console.warn('CalCraft: не удалось восстановить состояние', e);
    return false;
  }
}

export function clearState() {
  localStorage.removeItem(KEY_STATE);
  localStorage.removeItem(KEY_IMAGE);
}
