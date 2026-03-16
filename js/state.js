// ═══════════════════════════════════════════════
// state.js — Central application state
// ═══════════════════════════════════════════════

export const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

export const DOW_LABELS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export const SIZES = {
  a4p:    { label: 'A4 портрет',  w: 794,  h: 1123 },
  a4l:    { label: 'A4 альбом',   w: 1123, h: 794  },
  a3p:    { label: 'A3 портрет',  w: 1123, h: 1587 },
  square: { label: 'Квадрат',     w: 900,  h: 900  },
};

export const THEMES = {
  paper:  'paper',
  noir:   'noir',
  slate:  'slate',
  sand:   'sand',
  mist:   'mist',
  forest: 'forest',
};

/** @type {AppState} */
export const state = {
  // Period
  month: null,        // Date — first day of selected month
  title: '',          // Custom title (empty = auto)
  subtitle: '',

  // Design
  theme:        'paper',
  accent:       '#2B2D42',
  size:         'a4p',
  showWeekNums: false,
  showLegend:   true,

  // Image
  image:     null,   // base64 data URL
  cropRect:  null,   // { rx, ry, rw, rh } — ratios 0..1
  imgHeight: 220,    // px in preview
  imgFit:    'cover',

  // Data
  weekends: new Set([0, 6]),   // JS day numbers (0=Sun)
  /** @type {{ id:number, name:string, date:string, color:string }[]} */
  events:   [],
  /** @type {{ id:number, name:string, date:string }[]} */
  holidays: [],
};
