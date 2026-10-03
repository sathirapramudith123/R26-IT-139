// All "which day / which week / which hour" logic uses the shop's timezone
// (Sri Lanka by default), not the server's. A cloud server usually runs in UTC,
// where a Sri Lanka day would otherwise start at 05:30.
// Timestamps in the DB (created_at, timestamptz) stay in UTC — only the day
// boundaries are computed here.
export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Colombo";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TZ, hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

// Offset of APP_TZ from UTC (ms) at instant t. Intl is slow, so the offset is cached per
// hour (time zones only change offset on an hour boundary; Asia/Colombo never does).
const offsetCache = new Map();
function offsetAt(t) {
  const hour = Math.floor(t / 3600000);
  let off = offsetCache.get(hour);
  if (off === undefined) {
    const p = {};
    for (const { type, value } of fmt.formatToParts(new Date(hour * 3600000))) p[type] = value;
    off = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - hour * 3600000;
    if (offsetCache.size > 10000) offsetCache.clear();
    offsetCache.set(hour, off);
  }
  return off;
}

// Wall-clock parts of d in APP_TZ:
// { year, month (1-12), day, hour, minute, second, weekday (Mon=0..Sun=6), date: "YYYY-MM-DD" }
export function localParts(d = new Date()) {
  const t = new Date(d).getTime();
  const x = new Date(t + offsetAt(t));          // wall-clock time, read with the UTC getters
  const year = x.getUTCFullYear(), month = x.getUTCMonth() + 1, day = x.getUTCDate();
  return {
    year, month, day,
    hour: x.getUTCHours(), minute: x.getUTCMinutes(), second: x.getUTCSeconds(),
    weekday: (x.getUTCDay() + 6) % 7,             // pandas: Monday=0 ... Sunday=6
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

// "2026-09-29" — the calendar date of d in APP_TZ
export const localDateStr = (d = new Date()) => localParts(d).date;

// The instant (Date) at which the local day "YYYY-MM-DD" starts in APP_TZ.
// Sri Lanka: "2026-09-29" -> 2026-09-28T18:30:00.000Z
export function localDayStart(dateStr = localDateStr()) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);          // second pass handles a DST change near midnight
  return new Date(t);
}

// "YYYY-MM-DD" n days after dateStr (plain calendar arithmetic)
export function addDays(dateStr, n) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Local midnight at the start of the Monday of d's week, as a ms timestamp.
// Plain arithmetic (called once per sale line, so it has to be fast).
const DAY = 86400000;
export function localWeekStart(d) {
  const t = new Date(d).getTime();
  const wall = t + offsetAt(t);                              // local wall-clock time
  const dayWall = wall - (((wall % DAY) + DAY) % DAY);       // local midnight
  const monday = dayWall - ((new Date(dayWall).getUTCDay() + 6) % 7) * DAY;
  let u = monday - offsetAt(monday);
  u = monday - offsetAt(u);                                  // second pass handles DST
  return u;
}

