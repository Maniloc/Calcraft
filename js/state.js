// ═══════════════════════════════════════
// state.js — App state & constants
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
  showWorkStats:    false,   // показывать р.д. / ч под месяцем
  hoursPerDay:      8,       // рабочих часов в день
  weekends:         new Set([0, 6]),
  image:            null,
  cropRect:         null,
  imgHeightPct:     38,
  /** @type {{ id:number, name:string, date:string, color:string, repeat:boolean }[]} */
  events:           [],
};
