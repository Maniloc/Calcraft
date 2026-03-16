// ═══════════════════════════════════════
// calendar.test.mjs — Unit tests
// Запуск: node --experimental-vm-modules tests/calendar.test.mjs
// Покрывает: buildHolidaysForYear, computeTransfer, workdays, hours
// ═══════════════════════════════════════

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Загружаем state.js как текст и вырезаем нужные части
// (state.js использует ES export — импортируем напрямую)
const statePath = join(__dir, '../js/state.js');

// Простой test runner
let passed = 0, failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ ok: true, name });
  } catch (e) {
    failed++;
    results.push({ ok: false, name, err: e.message });
  }
}

function expect(val) {
  return {
    toBe(expected) {
      if (val !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toEqual(expected) {
      const a = JSON.stringify(val), b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toContain(item) {
      if (!val.includes(item))
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
    },
    toHaveLength(n) {
      if (val.length !== n)
        throw new Error(`Expected length ${n}, got ${val.length}`);
    },
    toBeGreaterThan(n) {
      if (!(val > n)) throw new Error(`Expected ${val} > ${n}`);
    },
    toBeTruthy() {
      if (!val) throw new Error(`Expected truthy, got ${JSON.stringify(val)}`);
    },
    toBeNull() {
      if (val !== null) throw new Error(`Expected null, got ${JSON.stringify(val)}`);
    },
    toBeUndefined() {
      if (val !== undefined) throw new Error(`Expected undefined, got ${JSON.stringify(val)}`);
    },
  };
}

// ── Импортируем функции из state.js ──────────────────────────
const { RF_CALENDAR, RT_CALENDAR, buildHolidaysForYear, buildTatarHolidaysForYear } =
  await import('../js/state.js');

// ── Вспомогательная функция подсчёта рабочих дней
// (дублируем логику из render.js чтобы тестировать без DOM)
function calcWorkStats(year, monthIdx, events, weekends = new Set([0, 6]), hoursPerDay = 8) {
  const evMap = {};
  for (const ev of events) {
    let key = ev.date;
    if (ev.repeat) {
      const [, m, d] = ev.date.split('-');
      key = `${year}-${m}-${d}`;
    }
    if (!evMap[key]) evMap[key] = [];
    evMap[key].push(ev);
  }

  const lastDate = new Date(year, monthIdx + 1, 0).getDate();
  let workDays = 0, shortDays = 0;

  for (let d = 1; d <= lastDate; d++) {
    const date  = new Date(year, monthIdx, d);
    const jsDow = date.getDay();
    const isWE  = weekends.has(jsDow);
    const key   = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs   = evMap[key] || [];
    const isHol = evs.some(e => e.type === 'holiday');
    const isShort = evs.some(e => e.type === 'short');

    if (!isWE && !isHol) workDays++;
    if (isShort && !isWE && !isHol) shortDays++;
  }

  return { workDays, shortDays, hours: workDays * hoursPerDay - shortDays };
}

// ═══════════════════════════════════════════
// БЛОК 1: Данные RF_CALENDAR
// ═══════════════════════════════════════════

test('RF_CALENDAR содержит все 4 года', () => {
  expect(Object.keys(RF_CALENDAR)).toHaveLength(4);
  expect(Object.keys(RF_CALENDAR).map(Number).sort((a,b)=>a-b))
    .toEqual([2024, 2025, 2026, 2027]);
});

test('RF_CALENDAR: каждый год имеет base, govt, short', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    const cal = RF_CALENDAR[year];
    if (!Array.isArray(cal.base))  throw new Error(`${year}: нет base`);
    if (!Array.isArray(cal.govt))  throw new Error(`${year}: нет govt`);
    if (!Array.isArray(cal.short)) throw new Error(`${year}: нет short`);
  }
});

test('RF_CALENDAR: все даты в формате YYYY-MM-DD', () => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  for (const [year, cal] of Object.entries(RF_CALENDAR)) {
    for (const arr of [cal.base, cal.govt, cal.short]) {
      for (const h of arr) {
        if (!re.test(h.date))
          throw new Error(`${year}: неверный формат даты: ${h.date}`);
        if (!h.date.startsWith(year))
          throw new Error(`${year}: дата из другого года: ${h.date}`);
      }
    }
  }
});

test('RF_CALENDAR: нет дублирующихся дат внутри года', () => {
  for (const [year, cal] of Object.entries(RF_CALENDAR)) {
    const all = [...cal.base, ...cal.govt].map(h => h.date);
    const unique = new Set(all);
    if (all.length !== unique.size) {
      const dups = all.filter((d, i) => all.indexOf(d) !== i);
      throw new Error(`${year}: дублирующиеся даты: ${dups.join(', ')}`);
    }
  }
});

test('RF_CALENDAR 2025: новогодние каникулы — 1-3, 6-8 января', () => {
  const base2025 = RF_CALENDAR[2025].base.map(h => h.date);
  const nyDates = ['2025-01-01','2025-01-02','2025-01-03','2025-01-06','2025-01-07','2025-01-08'];
  for (const d of nyDates) {
    if (!base2025.includes(d))
      throw new Error(`Отсутствует дата НГ: ${d}`);
  }
  // 4 и 5 января — сб/вс, не в base
  expect(base2025.includes('2025-01-04')).toBe(false);
  expect(base2025.includes('2025-01-05')).toBe(false);
});

test('RF_CALENDAR 2026: 9 мая — суббота, значит govt не содержит автоперенос', () => {
  // 2026-05-09 — сб, автоперенос вычисляется программно
  // в govt НЕТ строки для 11 мая (это должен добавить buildHolidaysForYear)
  const govtDates = RF_CALENDAR[2026].govt.map(h => h.date);
  expect(govtDates.includes('2026-05-11')).toBe(false);
});

// ═══════════════════════════════════════════
// БЛОК 2: buildHolidaysForYear — автоперенос
// ═══════════════════════════════════════════

test('buildHolidaysForYear: 2025 — возвращает массив событий', () => {
  const evs = buildHolidaysForYear(2025);
  expect(Array.isArray(evs)).toBeTruthy();
  expect(evs.length).toBeGreaterThan(15);
});

test('buildHolidaysForYear: все события имеют обязательные поля', () => {
  const evs = buildHolidaysForYear(2025);
  for (const ev of evs) {
    if (!ev.id)    throw new Error(`Событие без id: ${JSON.stringify(ev)}`);
    if (!ev.name)  throw new Error(`Событие без name: ${JSON.stringify(ev)}`);
    if (!ev.date)  throw new Error(`Событие без date: ${JSON.stringify(ev)}`);
    if (!ev.type)  throw new Error(`Событие без type: ${JSON.stringify(ev)}`);
    if (!ev.color) throw new Error(`Событие без color: ${JSON.stringify(ev)}`);
    if (ev.system !== true) throw new Error(`system !== true: ${JSON.stringify(ev)}`);
  }
});

test('buildHolidaysForYear: 2026 — 9 мая (сб) → перенос на 11 мая (пн)', () => {
  // 2026-05-09 — суббота → автоматически добавляется перенос на 2026-05-11
  const evs = buildHolidaysForYear(2026);
  const dates = evs.map(e => e.date);
  expect(dates.includes('2026-05-09')).toBeTruthy(); // сам праздник
  expect(dates.includes('2026-05-11')).toBeTruthy(); // автоперенос
});

test('buildHolidaysForYear: 2026 — 8 марта (вс) → перенос на 9 марта (пн)', () => {
  const evs = buildHolidaysForYear(2026);
  const dates = evs.map(e => e.date);
  expect(dates.includes('2026-03-08')).toBeTruthy();
  expect(dates.includes('2026-03-09')).toBeTruthy();
});

test('buildHolidaysForYear: 2025 — 23 февраля (вс) → перенос уже в govt, не дублируется', () => {
  const evs = buildHolidaysForYear(2025);
  const feb24 = evs.filter(e => e.date === '2025-02-24');
  // Должна быть ровно одна запись на 24 февраля (из govt)
  expect(feb24.length).toBe(1);
});

test('buildHolidaysForYear: 2025 — новогодние 1-8 янв НЕ переносятся автоматически', () => {
  const evs = buildHolidaysForYear(2025);
  // 4 и 5 января 2025 — сб/вс, но не должны порождать автоперенос
  // (они уже перенесены правительством на 02.05 и 31.12)
  const autoTransferJan = evs.filter(e =>
    e.name.includes('перенос') && e.date.startsWith('2025-01')
  );
  expect(autoTransferJan.length).toBe(0);
});

test('buildHolidaysForYear: несуществующий год → пустой массив', () => {
  const evs = buildHolidaysForYear(2099);
  expect(evs).toEqual([]);
});

test('buildHolidaysForYear: все даты соответствуют запрошенному году', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    const evs = buildHolidaysForYear(year);
    for (const ev of evs) {
      if (!ev.date.startsWith(String(year)))
        throw new Error(`${year}: событие с датой другого года: ${ev.date}`);
    }
  }
});

test('buildHolidaysForYear: перенос не попадает на выходной день', () => {
  const weekends = new Set([0, 6]);
  for (const year of [2024, 2025, 2026, 2027]) {
    const evs = buildHolidaysForYear(year);
    for (const ev of evs) {
      if (!ev.name.includes('перенос')) continue;
      const d = new Date(ev.date + 'T00:00:00');
      if (weekends.has(d.getDay()))
        throw new Error(`${year}: перенос попал на выходной: ${ev.date} (${['вс','пн','вт','ср','чт','пт','сб'][d.getDay()]})`);
    }
  }
});

test('buildHolidaysForYear: нет двух событий с одной датой', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    const evs   = buildHolidaysForYear(year);
    const dates = evs.filter(e => e.type === 'holiday').map(e => e.date);
    const unique = new Set(dates);
    if (dates.length !== unique.size) {
      const dups = dates.filter((d, i) => dates.indexOf(d) !== i);
      throw new Error(`${year}: дублирующиеся даты в событиях: ${dups.join(', ')}`);
    }
  }
});

// ═══════════════════════════════════════════
// БЛОК 3: buildTatarHolidaysForYear
// ═══════════════════════════════════════════

test('buildTatarHolidaysForYear: 2025 — содержит 4 праздника', () => {
  const evs = buildTatarHolidaysForYear(2025).filter(e => e.type === 'holiday');
  expect(evs.length).toBe(4);
});

test('buildTatarHolidaysForYear: цвет зелёный (#27AE60)', () => {
  const evs = buildTatarHolidaysForYear(2025).filter(e => e.type === 'holiday');
  for (const ev of evs) {
    if (ev.color !== '#27AE60')
      throw new Error(`Неверный цвет: ${ev.color}`);
  }
});

test('buildTatarHolidaysForYear: Ураза-байрам 2025 — 30 марта', () => {
  const evs = buildTatarHolidaysForYear(2025);
  const uzb = evs.find(e => e.name === 'Ураза-байрам');
  if (!uzb) throw new Error('Ураза-байрам не найден');
  expect(uzb.date).toBe('2025-03-30');
});

test('buildTatarHolidaysForYear: День Республики — 30 августа каждый год', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    const evs = buildTatarHolidaysForYear(year);
    const dr = evs.find(e => e.name === 'День Республики Татарстан');
    if (!dr) throw new Error(`${year}: День Республики не найден`);
    expect(dr.date).toBe(`${year}-08-30`);
  }
});

test('buildTatarHolidaysForYear: несуществующий год → пустой массив', () => {
  expect(buildTatarHolidaysForYear(2099)).toEqual([]);
});

// ═══════════════════════════════════════════
// БЛОК 4: Подсчёт рабочих дней и часов
// ═══════════════════════════════════════════

test('calcWorkStats: январь 2025 — 17 рабочих дней', () => {
  // По официальному производственному календарю: январь 2025 = 17 р.д.
  const evs = buildHolidaysForYear(2025);
  const { workDays } = calcWorkStats(2025, 0, evs); // 0 = январь
  expect(workDays).toBe(17);
});

test('calcWorkStats: февраль 2025 — 19 рабочих дней (23-24 нерабочие)', () => {
  // 23.02 — вс, 24.02 — перенос → оба нерабочие
  const evs = buildHolidaysForYear(2025);
  const { workDays } = calcWorkStats(2025, 1, evs);
  expect(workDays).toBe(19);
});

test('calcWorkStats: март 2025 — 20 рабочих дней (8 марта вс + 10 марта перенос)', () => {
  const evs = buildHolidaysForYear(2025);
  const { workDays } = calcWorkStats(2025, 2, evs);
  expect(workDays).toBe(20);
});

test('calcWorkStats: май 2025 — 18 рабочих дней', () => {
  // Май 2025: праздники 1,2,8,9; выходные 3-4,10-11,17-18,24-25,31 → 18 р.д.
  const evs = buildHolidaysForYear(2025);
  const { workDays } = calcWorkStats(2025, 4, evs);
  expect(workDays).toBe(18);
});

test('calcWorkStats: июнь 2025 — 19 рабочих дней', () => {
  const evs = buildHolidaysForYear(2025);
  const { workDays } = calcWorkStats(2025, 5, evs);
  expect(workDays).toBe(19);
});

test('calcWorkStats: предпраздничный день уменьшает часы на 1', () => {
  // Март 2025: 21 р.д., 7 марта — предпраздничный
  const evs = buildHolidaysForYear(2025);
  const { workDays, shortDays, hours } = calcWorkStats(2025, 2, evs, new Set([0,6]), 8);
  expect(shortDays).toBe(1);  // 7 марта
  expect(hours).toBe(workDays * 8 - 1); // 167 ч
});

test('calcWorkStats: апрель 2025 — предпраздничный 30 апреля (-1ч)', () => {
  const evs = buildHolidaysForYear(2025);
  const { shortDays } = calcWorkStats(2025, 3, evs);
  expect(shortDays).toBe(1);
});

test('calcWorkStats: 40ч неделя, январь 2025 = 136 часов', () => {
  // Официальная норма: 136,0 ч (40ч неделя)
  const evs = buildHolidaysForYear(2025);
  const { hours } = calcWorkStats(2025, 0, evs, new Set([0,6]), 8);
  expect(hours).toBe(136);
});

test('calcWorkStats: 40ч неделя, март 2025 = 159 часов (20р.д. × 8 − 1 предпр.)', () => {
  const evs = buildHolidaysForYear(2025);
  const { hours } = calcWorkStats(2025, 2, evs, new Set([0,6]), 8);
  expect(hours).toBe(159);
});

test('calcWorkStats: без праздников — все будни рабочие', () => {
  // Январь 2025 без праздников: 31 - 8 выходных = 23 рабочих
  const { workDays } = calcWorkStats(2025, 0, []);
  expect(workDays).toBe(23);
});

test('calcWorkStats: нет отрицательных часов', () => {
  for (const year of [2024, 2025, 2026, 2027]) {
    const evs = buildHolidaysForYear(year);
    for (let m = 0; m < 12; m++) {
      const { hours } = calcWorkStats(year, m, evs);
      if (hours < 0) throw new Error(`${year}-${m+1}: отрицательные часы: ${hours}`);
    }
  }
});

// ═══════════════════════════════════════════
// ИТОГ
// ═══════════════════════════════════════════

const total = passed + failed;
console.log(`\n${'─'.repeat(60)}`);
for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : `\n  → ${r.err}`}`);
}
console.log(`${'─'.repeat(60)}`);
console.log(`Итого: ${total} тестов | ✓ ${passed} пройдено | ✗ ${failed} упало\n`);

if (failed > 0) process.exit(1);
