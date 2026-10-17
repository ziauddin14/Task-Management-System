// Pakistan time (Asia/Karachi) for the activity log's screens ONLY — the activity log page, its
// timeline dialog, the dashboard's inactivity alert and its Settings card. Every other date in the
// app keeps using utils/formatDate.js (the device's own time zone); nothing there changes.
//
// Same look as the rest of the app: "dd-MM-yy, HH:mm" with Latin digits (e.g. "17-10-26, 00:01").
// Pakistan is UTC+5 all year (no daylight saving since 2009); that fixed offset is the fallback
// where a browser cannot format in a named time zone.
const TIME_ZONE = 'Asia/Karachi';
const FIXED_OFFSET_MS = 5 * 60 * 60 * 1000;

let formatter;
try {
  formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
} catch {
  formatter = null;
}

const pad = (number) => String(number).padStart(2, '0');

// { dd, MM, yy, HH, mm } of the moment in Pakistan, or null for a missing / invalid value.
function karachiParts(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (formatter) {
    const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
    return { dd: parts.day, MM: parts.month, yy: parts.year, HH: parts.hour === '24' ? '00' : parts.hour, mm: parts.minute };
  }
  const shifted = new Date(date.getTime() + FIXED_OFFSET_MS);
  return {
    dd: pad(shifted.getUTCDate()),
    MM: pad(shifted.getUTCMonth() + 1),
    yy: pad(shifted.getUTCFullYear() % 100),
    HH: pad(shifted.getUTCHours()),
    mm: pad(shifted.getUTCMinutes()),
  };
}

// "dd-MM-yy, HH:mm" in Pakistan time; "-" when there is no (valid) value, like formatDateTime.
export function formatKarachiDateTime(value) {
  const p = karachiParts(value);
  return p ? `${p.dd}-${p.MM}-${p.yy}, ${p.HH}:${p.mm}` : '-';
}

// "dd-MM-yy" — the Pakistan calendar date of the moment.
export function formatKarachiDate(value) {
  const p = karachiParts(value);
  return p ? `${p.dd}-${p.MM}-${p.yy}` : '-';
}
