// ═══════════════════════════════════════
// state.js
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
  // Основное
  year:     new Date().getFullYear(),
  title:    '',
  subtitle: '',

  // Дизайн
  theme:            'paper',
  accent:           '#2B2D42',
  size:             'a3',
  layout:           '3x4',
  showWeekendColor: true,
  showWeekNums:     false,
  showWorkStats:    false,
  hoursPerDay:      8,

  // Выходные (JS day numbers: 0=Вс, 6=Сб)
  weekends: new Set([0, 6]),

  // Обложка
  image:        null,    // base64
  cropRect:     null,    // { rx,ry,rw,rh } — доли 0..1
  imgHeightPct: 38,      // % высоты листа
  imgFit:       'cover', // 'cover' | 'fill'

  // Текст на обложке
  coverText:          '',
  coverTextSize:      32,       // px в превью
  coverTextColor:     '#FFFFFF',
  coverTextPosition:  'center', // 'top-left'|'top-center'|'top-right'|'center'|'bottom-left'|'bottom-center'|'bottom-right'

  // События
  // type: 'holiday' — праздник (влияет на рабочие дни если isWorkday=false)
  // type: 'event'   — событие (точка, не влияет на рабочие дни)
  /** @type {{ id:number, name:string, date:string, color:string, repeat:boolean, type:'holiday'|'event' }[]} */
  events: [],
};
