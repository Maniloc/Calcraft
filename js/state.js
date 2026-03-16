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

// ── Российские федеральные праздники (ТК РФ, ст. 112) ──
// repeat:true — работают каждый год; тип 'holiday' — влияют на рабочие дни
const RU_HOLIDAYS = [
  { m:'01', d:'01', name:'Новый год'                      },
  { m:'01', d:'02', name:'Новый год'                      },
  { m:'01', d:'03', name:'Новый год'                      },
  { m:'01', d:'04', name:'Новый год'                      },
  { m:'01', d:'05', name:'Новый год'                      },
  { m:'01', d:'06', name:'Новый год'                      },
  { m:'01', d:'07', name:'Рождество Христово'             },
  { m:'01', d:'08', name:'Новый год'                      },
  { m:'02', d:'23', name:'День защитника Отечества'       },
  { m:'03', d:'08', name:'Международный женский день'     },
  { m:'05', d:'01', name:'Праздник Весны и Труда'         },
  { m:'05', d:'09', name:'День Победы'                    },
  { m:'06', d:'12', name:'День России'                    },
  { m:'11', d:'04', name:'День народного единства'        },
].map((h, i) => ({
  id:     -(i + 1),          // отрицательные id — системные, не удаляются случайно
  name:   h.name,
  date:   `2000-${h.m}-${h.d}`,  // год неважен, repeat:true подставит текущий
  color:  '#C0392B',
  repeat: true,
  type:   'holiday',
}));

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
  image:        null,
  cropRect:     null,
  imgHeightPct: 38,
  imgFit:       'cover',

  // Текст на обложке
  coverText:         '',
  coverTextSize:     32,
  coverTextColor:    '#FFFFFF',
  coverTextPosition: 'center',

  // События: российские праздники предзаполнены
  /** @type {{ id:number, name:string, date:string, color:string, repeat:boolean, type:'holiday'|'event' }[]} */
  events: [...RU_HOLIDAYS],
};
