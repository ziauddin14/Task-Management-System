import { PERFORMANCE_BAND_KEYS, getPerformanceMeta } from './taskDisplay.js';
import { RATING_TONE } from './mobileTheme.js';

// What the "مجموعی کیفیت" hero shows, derived once from the summary endpoint's `ratings` block
// (docs/05-apis.md §8) — shared by the mobile hero card and the desktop hero, so the two can never
// disagree. Nothing is computed here that the server did not already decide: the band, the average
// and each band's share are the server's; this only arranges them for display.
//   quality  — { band, percent, meta, tone } or null when nothing is rated (no value, not a zero)
//   shares   — the four bands in display order, each { key, label, count, percent }
//   realCount — rated tasks whose rating is not synthetic
export function summarizeRatings(ratings) {
  const { bands, ratedCount, unratedCount, syntheticCount, overallQuality } = ratings;

  return {
    ratedCount,
    unratedCount,
    syntheticCount,
    realCount: ratedCount - syntheticCount,
    quality: overallQuality ? { ...overallQuality, meta: getPerformanceMeta(overallQuality.band), tone: RATING_TONE[overallQuality.band] } : null,
    shares: PERFORMANCE_BAND_KEYS.map((key) => ({ key, label: getPerformanceMeta(key).label, ...(bands[key] || { count: 0, percent: 0 }) })),
  };
}

// The stroke-dasharray of a ring (or one donut segment) of the given radius: how much of the
// circumference is drawn, then the circumference itself as the gap.
export function arcLength(percent, radius) {
  const circumference = 2 * Math.PI * radius;
  return { filled: (Math.min(Math.max(percent, 0), 100) / 100) * circumference, circumference };
}
