import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import CountUp from '../common/CountUp.jsx';
import { getStatusMeta } from '../../utils/taskDisplay.js';
import { DONUT_ORDER, STATUS_TILE_TONE } from '../../utils/dashboardTheme.js';

const SIZE = 168;
const RADIUS = 60;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// "کاموں کی صورتحال" as a donut: one segment per status that has tasks, sized by its share, the
// total in the middle, and a legend with each status's count and percent. Plain inline SVG — no
// chart library.
//
// `byStatus` / `total` are the summary asked for WITHOUT the status filter (the same data the
// status tiles use), so the donut always shows the whole distribution of whatever the other
// filters leave — choosing a status never empties the rest of it.
//
// Every part acts exactly as the status tiles do: a segment or a legend row toggles that status as
// the table's filter (`onToggleStatus`), and the total in the middle clears the status and rating
// filters (`onClearKpiFilters` — what the old "مجموعی" card did). Segments are real focusable
// buttons (Enter / Space), each named with its status, count and percent.
function StatusDonut({ byStatus, total, activeStatus, onToggleStatus, onClearKpiFilters, isRefreshing = false, className }) {
  if (!byStatus) return null;

  const rows = DONUT_ORDER.map((key) => ({ key, label: getStatusMeta(key).label, tone: STATUS_TILE_TONE[key], ...(byStatus[key] || { count: 0, percent: 0 }) }));
  const drawnTotal = rows.reduce((sum, row) => sum + row.count, 0);

  // Each segment starts where the previous one ended; its length is its share of the tasks drawn.
  let offset = 0;
  const segments = rows
    .filter((row) => row.count > 0)
    .map((row) => {
      const length = (row.count / drawnTotal) * CIRCUMFERENCE;
      const segment = { ...row, length, offset };
      offset += length;
      return segment;
    });

  function handleSegmentKey(event, key) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleStatus(key);
    }
  }

  return (
    <section
      aria-labelledby="status-donut-heading"
      aria-busy={isRefreshing || undefined}
      className={clsx('flex min-w-0 flex-col gap-[10px] rounded-tk-panel bg-tk-card px-[26px] py-[22px] shadow-tk-card', className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="status-donut-heading" className="text-[17px] font-semibold leading-tk-label">
          کاموں کی صورتحال
        </h2>
        <span className="text-[13px] text-tk-muted">کل {total}</span>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-center gap-x-[22px] gap-y-3">
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            role="group"
            aria-label={rows.map((row) => `${row.label} ${row.count}`).join('، ')}
          >
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-tk-track" />
            {segments.map((segment) => {
              const active = activeStatus === segment.key;
              return (
                <circle
                  key={segment.key}
                  data-donut-segment={segment.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${segment.label}: ${segment.count} کام، ${segment.percent} فیصد`}
                  aria-pressed={active}
                  onClick={() => onToggleStatus(segment.key)}
                  onKeyDown={(event) => handleSegmentKey(event, segment.key)}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  strokeWidth={active ? STROKE + 6 : STROKE}
                  strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  pointerEvents="stroke"
                  className={clsx(
                    'tk-arc-draw cursor-pointer outline-none transition-[stroke-width,opacity] duration-150 hover:opacity-80 focus-visible:[stroke-width:30px] motion-reduce:transition-none',
                    segment.tone.stroke
                  )}
                  style={{ '--tk-arc-c': CIRCUMFERENCE }}
                >
                  <title>{`${segment.label}: ${segment.count} (${segment.percent}%)`}</title>
                </circle>
              );
            })}
          </svg>
          {/* The total. Pressing it clears the status and rating filters: "show everything". */}
          <button
            type="button"
            onClick={onClearKpiFilters}
            aria-label={`مجموعی: ${total} کام — کیفیت اور کارکردگی کے فلٹر ہٹائیں`}
            className="absolute left-1/2 top-1/2 flex h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full hover:bg-tk-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
          >
            <CountUp value={total} className="text-[32px] font-semibold leading-tk-number" />
            <span className="text-[12px] leading-tk-title text-tk-muted">کل کام</span>
          </button>
        </div>

        <ul className="flex min-w-[150px] flex-1 flex-col gap-[2px]">
          {rows.map((row) => {
            const active = activeStatus === row.key;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onToggleStatus(row.key)}
                  aria-pressed={active}
                  aria-label={`${row.label}: ${row.count} کام، ${row.percent} فیصد`}
                  className={clsx(
                    'flex min-h-[40px] w-full items-center gap-[10px] rounded-tk-chip px-2 text-[14px] transition-colors hover:bg-tk-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700',
                    active && 'bg-tk-hover font-semibold'
                  )}
                >
                  <span aria-hidden="true" className={clsx('h-3 w-3 shrink-0 rounded-[4px]', row.tone.swatch)} />
                  <span className="min-w-0 flex-1 truncate text-start leading-tk-label">{row.label}</span>
                  <CountUp value={row.count} className="font-semibold" />
                  <span className="min-w-[34px] text-left text-[12px] text-tk-muted" dir="ltr">
                    {row.percent}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default StatusDonut;
