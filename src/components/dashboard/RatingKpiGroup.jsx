import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import KpiCard from './KpiCard.jsx';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import { PERFORMANCE_BAND_KEYS, SYNTHETIC_LABEL, getPerformanceMeta } from '../../utils/taskDisplay.js';

// The "کارکردگی" KPI group, driven by the summary endpoint's `ratings` block (docs/05-apis.md §8):
// - four band cards — count, and percent of the RATED set (never of all tasks);
// - an overall-quality card — the band and the average percent the backend computed. With nothing
//   rated it shows a dash: there is no value, which is not the same as zero;
// - a small line under the cards saying how many of the rated tasks are synthetic ("تخمینی"), and
//   how many tasks have no rating at all.
// The figures follow every dashboard filter except the rating filter itself (the backend leaves it
// out), so the four cards keep showing the whole distribution while one of them is the active
// filter. Used unchanged for an Admin (all tasks) and a normal user (their own) — the scope is the
// server's.
//
// `isRefreshing` — a newer summary is on its way (a filter just changed): the cards keep their
// previous figures, marked busy, and the loading phrase is shown over the line under them. That
// line has a fixed minimum height, so nothing below moves — and it is only hidden, never removed:
// its "بغیر درجہ بندی" button is itself a filter, so pressing it starts a refresh, and unmounting
// it at that moment would drop the keyboard focus that is sitting on it.
function OverallQualityCard({ overallQuality }) {
  const meta = overallQuality ? getPerformanceMeta(overallQuality.band) : null;

  return (
    <div
      role="group"
      aria-label="مجموعی کیفیت"
      className="flex min-h-[78px] w-full min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-brand/30 bg-brand-light/40 px-1.5 py-2.5 shadow-sm"
    >
      <div className="flex w-full items-center justify-center text-gray-600">
        <span className="truncate text-[17px] font-medium leading-tight">مجموعی کیفیت</span>
      </div>
      {overallQuality ? (
        // The percent and the band label wrap onto two centred lines where the card is narrow (one
        // row of five on desktop) and sit side by side where it is wide (two-up on a phone) —
        // neither is ever truncated or pushed out of the card.
        <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span className="text-xl font-bold leading-none text-gray-900" dir="ltr">
            {overallQuality.percent}%
          </span>
          <span className={clsx('whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold leading-tight', meta.badgeClass)}>{meta.label}</span>
        </div>
      ) : (
        <div className="flex w-full items-end justify-center">
          <span className="text-2xl font-bold leading-none text-gray-400" aria-label="کوئی درجہ بندی نہیں">
            —
          </span>
        </div>
      )}
    </div>
  );
}

function RatingKpiGroup({ ratings, activeRating, onToggleRating, isRefreshing = false }) {
  if (!ratings) return null;

  const { bands, ratedCount, unratedCount, syntheticCount, overallQuality } = ratings;

  return (
    <div aria-busy={isRefreshing || undefined}>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5">
        {PERFORMANCE_BAND_KEYS.map((key) => {
          const band = bands[key] || { count: 0, percent: 0 };
          return (
            <KpiCard
              key={key}
              label={getPerformanceMeta(key).label}
              count={band.count}
              // Percent of the rated set — meaningless (and so omitted) when nothing is rated.
              percent={ratedCount > 0 ? band.percent : undefined}
              active={activeRating === key}
              onClick={() => onToggleRating(key)}
            />
          );
        })}
        <OverallQualityCard overallQuality={overallQuality} />
      </div>

      <div className="relative mt-1 min-h-[2rem] text-xs text-gray-600">
        <div
          data-rating-lines
          className={clsx('flex min-h-[2rem] flex-wrap items-center justify-center gap-x-4 gap-y-0.5', isRefreshing && 'pointer-events-none opacity-0')}
        >
          {syntheticCount > 0 && (
            <span>
              {ratedCount} میں سے {syntheticCount} {SYNTHETIC_LABEL}
            </span>
          )}
          {unratedCount > 0 && (
            // Also the way to list those tasks: the old fifth card's "show unrated" click.
            <button
              type="button"
              onClick={() => onToggleRating('-')}
              aria-pressed={activeRating === '-'}
              className={clsx('rounded px-1 hover:underline', activeRating === '-' ? 'font-semibold text-brand underline' : 'text-gray-600')}
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
    </div>
  );
}

export default RatingKpiGroup;
