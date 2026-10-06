import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import CountUp from '../common/CountUp.jsx';
import QualityRing from './QualityRing.jsx';
import { SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';
import { RATING_TONE } from '../../utils/mobileTheme.js';
import { BAND_TILE_TONE } from '../../utils/dashboardTheme.js';
import { summarizeRatings } from '../../utils/ratingSummary.js';

// The desktop dashboard's hero, "مجموعی کیفیت" — the summary endpoint's `ratings` block
// (docs/05-apis.md §8) drawn as: the overall band and average (with a ring in the band's colour),
// a stacked bar of each band's share of the RATED tasks, four tinted band tiles, and a line saying
// how many of the rated tasks are synthetic ("تخمینی") and how many tasks have no rating.
//
// The rules are the ones the old "کارکردگی" cards had, unchanged:
//   - the figures follow every dashboard filter except the rating filter itself, so the four
//     tiles keep showing the whole distribution while one of them is the active filter;
//   - a band tile toggles that rating as the table's filter, and "بغیر درجہ بندی" toggles the
//     unrated ('-') filter;
//   - with nothing rated there is no band and no average: a dash, never a zero, and the tiles
//     carry no percent;
//   - `isRefreshing` (a newer summary is on its way): the figures stay, marked busy, and the
//     loading phrase shows over the line under the tiles. That line keeps its height and is only
//     hidden, never removed — its button is itself a filter, and unmounting it mid-press would
//     drop the keyboard focus sitting on it.
// The ring, the band, the shares: shared with the mobile hero (utils/ratingSummary.js).
function QualityHero({ ratings, activeRating, onToggleRating, isRefreshing = false, className }) {
  if (!ratings) return null;

  const { ratedCount, unratedCount, syntheticCount, quality, shares } = summarizeRatings(ratings);

  return (
    <section
      aria-busy={isRefreshing || undefined}
      className={clsx('flex min-w-0 flex-col gap-[14px] rounded-tk-panel bg-tk-card px-[26px] py-[22px] shadow-tk-card', className)}
    >
      <div role="group" aria-label="مجموعی کیفیت" className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-tk-label text-tk-muted">مجموعی کیفیت</p>
          {quality ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3">
                <span data-quality-band className={clsx('text-[38px] font-semibold leading-[1.9]', quality.tone?.text)}>
                  {quality.meta.label}
                </span>
                <span className={clsx('whitespace-nowrap rounded-tk-pill px-[14px] text-[14px] leading-[2.4]', quality.tone?.chip)}>
                  اوسط <span dir="ltr">{quality.percent}%</span>
                </span>
              </div>
              <p className="text-[13px] leading-[2.2] text-tk-muted">{ratedCount} درجہ بند کاموں کی بنیاد پر</p>
            </>
          ) : (
            <span className="block text-[38px] font-semibold leading-[1.9] text-tk-muted" aria-label="کوئی درجہ بندی نہیں">
              —
            </span>
          )}
        </div>
        {quality && <QualityRing percent={quality.percent} band={quality.band} size={140} radius={56} strokeWidth={14} labelClassName="text-[26px]" animated />}
      </div>

      {/* Each band's share of the RATED tasks. A 2px gap separates neighbours, so the segments
          are told apart by more than their colour; the tiles below carry the numbers. */}
      {ratedCount > 0 && (
        <div
          role="img"
          aria-label={shares.map((share) => `${share.label} ${share.count}`).join('، ')}
          className="tk-bar-wipe flex h-[14px] gap-[2px] overflow-hidden rounded-tk-pill bg-tk-track"
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
      )}

      <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-4">
        {shares.map((share) => {
          const tone = BAND_TILE_TONE[share.key];
          const active = activeRating === share.key;
          return (
            <button
              key={share.key}
              type="button"
              onClick={() => onToggleRating(share.key)}
              aria-pressed={active}
              className={clsx(
                'tk-lift min-w-0 rounded-tk-input px-3 py-2 text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700',
                tone.tile,
                active && ['ring-2', tone.ring]
              )}
            >
              <span className={clsx('block truncate text-[13px] leading-tk-label', tone.label)}>{share.label}</span>
              <span className="flex items-baseline justify-between gap-2">
                <CountUp value={share.count} className={clsx('text-[26px] font-semibold leading-tk-number', tone.number)} />
                {/* Percent of the rated set — meaningless (and so omitted) when nothing is rated. */}
                {ratedCount > 0 && (
                  <span className={clsx('text-[12px]', tone.label)} dir="ltr">
                    {share.percent}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[44px] border-t border-tk-line pt-[2px] text-[12px] leading-[2.2] text-tk-muted">
        <div
          data-rating-lines
          className={clsx('flex min-h-[42px] flex-wrap items-center justify-between gap-x-4', isRefreshing && 'pointer-events-none opacity-0')}
        >
          {syntheticCount > 0 ? (
            <span>
              {ratedCount} میں سے {syntheticCount} {SYNTHETIC_LABEL}
            </span>
          ) : (
            <span />
          )}
          {unratedCount > 0 && (
            // Also the way to list those tasks: the rating filter '-'.
            <button
              type="button"
              onClick={() => onToggleRating('-')}
              aria-pressed={activeRating === '-'}
              className={clsx(
                'flex min-h-[40px] items-center rounded-[8px] px-2 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700',
                activeRating === '-' ? 'font-semibold text-tk-green-900 underline' : 'text-tk-muted'
              )}
            >
              بغیر درجہ بندی: {unratedCount}
            </button>
          )}
        </div>
        {isRefreshing && (
          <div className="absolute inset-0 flex flex-wrap items-center justify-center">
            <LoadingPhrase size="compact" label="خلاصہ اپڈیٹ ہو رہا ہے…" />
          </div>
        )}
      </div>
    </section>
  );
}

export default QualityHero;
