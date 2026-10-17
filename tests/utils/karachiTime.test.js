import { describe, it, expect } from 'vitest';
import { formatKarachiDate, formatKarachiDateTime } from '../../src/utils/karachiTime.js';

// The activity log's screens show Pakistan time (UTC+5, no daylight saving) whatever the device's
// own time zone is.
describe('utils/karachiTime', () => {
  it('formats in Pakistan time as dd-MM-yy, HH:mm', () => {
    expect(formatKarachiDateTime('2026-10-17T07:00:00.000Z')).toBe('17-10-26, 12:00');
  });

  it('turns the day over at Pakistan midnight (19:00 UTC), not at UTC midnight', () => {
    expect(formatKarachiDateTime('2026-10-16T18:59:00.000Z')).toBe('16-10-26, 23:59');
    expect(formatKarachiDateTime('2026-10-16T19:00:00.000Z')).toBe('17-10-26, 00:00');
    expect(formatKarachiDateTime('2026-10-16T19:01:00.000Z')).toBe('17-10-26, 00:01');
    expect(formatKarachiDate('2026-10-16T18:59:59.999Z')).toBe('16-10-26');
    expect(formatKarachiDate('2026-10-16T19:00:00.000Z')).toBe('17-10-26');
    // A late UTC evening is already the next day in Pakistan — also across a month and a year end.
    expect(formatKarachiDateTime('2026-12-31T20:30:00.000Z')).toBe('01-01-27, 01:30');
  });

  it('accepts a Date as well as an ISO string', () => {
    expect(formatKarachiDateTime(new Date('2026-10-17T00:00:00.000Z'))).toBe('17-10-26, 05:00');
  });

  it('a missing or invalid value is "-", like the other date helpers of the app', () => {
    expect(formatKarachiDateTime(null)).toBe('-');
    expect(formatKarachiDateTime(undefined)).toBe('-');
    expect(formatKarachiDateTime('not a date')).toBe('-');
    expect(formatKarachiDate('')).toBe('-');
  });
});
