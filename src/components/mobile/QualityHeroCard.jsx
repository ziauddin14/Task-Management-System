import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import { PERFORMANCE_BAND_KEYS, SYNTHETIC_LABEL, getPerformanceMeta } from '../../utils/taskDisplay.js';
import { RATING_TONE } from '../../utils/mobileTheme.js';
import { UNRATED_LABEL } from '../../utils/taskFilters.js';

const RING_SIZE = 92;
const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// The average as a ring: the filled arc is the average percent, in the band's colour. The figure
// itself is written in the middle, so the ring is never the only way to read it.
function QualityRing({ percent, band }) {
  const filled = (Math.min(Math.max(percent, 0), 100) / 100) * RING_CIRCUMFERENCE;

  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }} role="img" aria-label={`اوسط ${percent} فیصد`}>
      <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} width={RING_SIZE} height={RING_SIZE} aria-hidden="true">
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-tk-track" />
        <circle
          data-ring-arc
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          className={RATING_TONE[band]?.stroke}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold text-tk-ink" dir="ltr" aria-hidden="true">
        {percent}%
      </span>
    </div>
  );
}

// The dashboard's hero card, "مجموعی کیفیت": the overall band and average, how many rated tasks
// that is based on, each band's share of them (one stacked bar + a four-column legend with the
// counts), and — underneath — how many of those ratings are synthetic ("تخمینی") and how many
// tasks have no rating at all.
//
// Everything comes from the summary endpoint's existing `ratings` block (docs/05-apis.md §8), the
// same one the desktop "کارکردگی" cards read: it follows every dashboard filter except the rating
// filter itself. With nothing rated there is no band and no average — the card says so rather
// than showing a zero.
//
// `hrefForRating(key)` is the task list filtered to one band ('-' = unrated): the legend and the
// "بغیر درجہ بندی" line link there, as the band cards filter the table on desktop.
// `isRefreshing` — a newer summary is on its way: the figures stay, marked busy, and the loading
// phrase shows over the footer line (which keeps its height, so nothing moves).
function QualityHeroCard({ ratings, activeRating, hrefForRating, isRefreshing = false }) {
  if (!ratings) return null;

  const { bands, ratedCount, unratedCount, syntheticCount, overallQuality } = ratings;
  const realCount = ratedCount - syntheticCount;
  const quality = overallQuality ? { ...overallQuality, meta: getPerformanceMeta(overallQuality.band), tone: RATING_TONE[overallQuality.band] } : null;
  const shares = PERFORMANCE_BAND_KEYS.map((key) => ({ key, label: getPerformanceMeta(key).label, ...(bands[key] || { count: 0, percent: 0 }) }));

  return (
    <section
      aria-label="مجموعی کیفیت"
      aria-busy={isRefreshing || undefined}
      className="flex flex-col gap-tk-gap rounded-tk-hero bg-tk-card p-[16px] shadow-tk-hero"
    >
      <div className="flex items-center gap-[14px]">
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-normal leading-tk-label text-tk-muted">مجموعی کیفیت</h2>
          {quality ? (
            <>
              <div className="flex flex-wrap items-center gap-x-tk-gap-sm">
                <span data-quality-band className={clsx('text-[26px] font-semibold leading-tk-title', quality.tone?.text)}>
                  {quality.meta.label}
                </span>
                <span className={clsx('whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] leading-[2.3]', quality.tone?.chip)}>
                  اوسط <span dir="ltr">{quality.percent}%</span>
                </span>
              </div>
              <p className="text-[12px] leading-tk-label text-tk-muted">{ratedCount} درجہ بند کاموں کی بنیاد پر</p>
            </>
          ) : (
            <p className="text-[16px] font-semibold leading-tk-title text-tk-ink-soft">ابھی کسی کام کی درجہ بندی نہیں ہوئی</p>
          )}
        </div>
        {quality && <QualityRing percent={quality.percent} band={quality.band} />}
      </div>

      {ratedCount > 0 && (
        <>
          {/* Each band's share of the RATED tasks. A 2px gap separates neighbours, so the segments
              are told apart by more than their colour; the legend below carries the numbers. */}
          <div
            role="img"
            aria-label={shares.map((share) => `${share.label} ${share.count}`).join('، ')}
            className="flex h-[12px] gap-[2px] overflow-hidden rounded-tk-pill"
          >
            {shares
              .filter((share) => share.count > 0)
              .map((share) => (
                <span
                  key={share.key}
                  data-band-segment={share.key}
                  title={`${share.label}: ${share.count} (${share.percent}%)`}
                  className={clsx('min-w-[4px]', RATING_TONE[share.key].fill)}
                  style={{ flexGrow: share.percent, flexBasis: 0 }}
                />
              ))}
          </div>

          <ul className="grid grid-cols-4 gap-[6px] text-center">
            {shares.map((share) => (
              <li key={share.key} className="min-w-0">
                <Link
                  to={hrefForRating(share.key)}
                  aria-label={`${share.label}: ${share.count} کام`}
                  aria-current={activeRating === share.key ? 'true' : undefined}
                  className={clsx(
                    'flex min-h-tk-touch flex-col items-center justify-center rounded-tk-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700',
                    activeRating === share.key && 'bg-tk-green-50'
                  )}
                >
                  <span className={clsx('text-[20px] font-semibold leading-tk-number', RATING_TONE[share.key].text)}>{share.count}</span>
                  <span className="text-[12px] leading-tk-title text-tk-muted">{share.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {(ratedCount > 0 || unratedCount > 0) && (
        <div className="relative min-h-[34px] border-t border-tk-line pt-[4px] text-[12px] leading-tk-label text-tk-muted">
          <div
            data-rating-lines
            className={clsx('flex min-h-[30px] flex-wrap items-center justify-between gap-x-tk-gap', isRefreshing && 'pointer-events-none opacity-0')}
          >
            {ratedCount > 0 && (
              <span>
                {syntheticCount} {SYNTHETIC_LABEL} <span aria-hidden="true">•</span> {realCount} اصل
              </span>
            )}
            {unratedCount > 0 && (
              <Link
                to={hrefForRating('-')}
                aria-current={activeRating === '-' ? 'true' : undefined}
                className={clsx(
                  'flex min-h-tk-touch items-center rounded-[6px] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700',
                  activeRating === '-' ? 'font-semibold text-tk-green-900' : 'text-tk-muted'
                )}
              >
                {UNRATED_LABEL}: {unratedCount}
              </Link>
            )}
          </div>
          {isRefreshing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingPhrase size="compact" label="خلاصہ اپڈیٹ ہو رہا ہے…" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default QualityHeroCard;
