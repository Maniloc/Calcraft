// ═══════════════════════════════════════
// state.js — Central state & constants
// ═══════════════════════════════════════

export const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

export const DOW_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export const SIZES = {
  a2:     { w: 1587, h: 2245, label: 'A2' },
  a3:     { w: 1123, h: 1587, label: 'A3' },
  a4:     { w: 794,  h: 1123, label: 'A4' },
  square: { w: 1200, h: 1200, label: 'Квадрат' },
};

export const SUPPORTED_YEARS = [2024, 2025, 2026, 2027];

// Кэш загруженных данных из holidays.json
export const holidayCache = {};

// Загрузить праздники для года из data/holidays.json
export async function loadHolidays(year) {
  if (holidayCache[year]) return holidayCache[year];

  try {
    const resp = await fetch('./data/holidays.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();

    // Кэшируем все годы сразу
    for (const [y, cal] of Object.entries(data)) {
      if (isNaN(+y)) continue;
      const events = [];
      let idx = 0;
      (cal.holidays || []).forEach(h => {
        events.push({
          id:      -(+y * 1000 + idx++),
          name:    h.name,
          date:    h.date,
          color:   '#C0392B',
          repeat:  false,
          type:    'holiday',
          system:  true,
        });
      });
      (cal.short || []).forEach(h => {
        events.push({
          id:      -(+y * 1000 + 500 + idx++),
          name:    h.name,
          date:    h.date,
          color:   '#E67E22',
          repeat:  false,
          type:    'short',
          system:  true,
          warning: cal._warning || null,
        });
      });
      holidayCache[+y] = {
        events,
        warning: cal._warning || null,
      };
    }

    return holidayCache[year] || { events: [], warning: null };
  } catch (e) {
    console.warn('Не удалось загрузить holidays.json:', e);
    return { events: [], warning: null };
  }
}

export const state = {
  year:             new Date().getFullYear(),
  title:            '',
  subtitle:         '',
  theme:            'paper',
  accent:           '#2B2D42',
  size:             'a3',
  layout:           '3x4',
  showWeekendColor: true,
  showWeekNums:     false,
  showWorkStats:    false,
  hoursPerDay:      8,
  weekends:         new Set([0, 6]),
  image:            null,
  cropRect:         null,
  imgHeightPct:     38,
  imgFit:           'cover',
  coverText:        '',
  coverTextSize:    32,
  coverTextColor:   '#FFFFFF',
  coverTextPosition:'center',
  /** @type {Array} системные праздники + пользовательские события */
  events: [],
};
