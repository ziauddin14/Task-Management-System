import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleCheck, Clock } from 'lucide-react';
import { getStatusMeta } from '../../utils/taskDisplay.js';
import { STATUS_TILE_ORDER, getStatusTone } from '../../utils/mobileTheme.js';

const STATUS_ICONS = { pending: Clock, ongoing: ArrowRight, closed: Check, complete: CircleCheck };

// "کاموں کی صورتحال": the four status counts as a 2x2 grid of tiles, with the total in the section
// header. `byStatus`/`total` are the summary asked for WITHOUT the status filter (as the desktop
// status cards are), so the four tiles always show the whole distribution of whatever the other
// filters leave. A tile is a link to the task list filtered to its status — the phone's version
// of the desktop card that filters the table beneath it. The tile whose status is the current
// filter is outlined.
function StatusTiles({ byStatus, total, activeStatus, hrefForStatus, isRefreshing = false }) {
  if (!byStatus) return null;

  return (
    <section aria-labelledby="status-tiles-heading" aria-busy={isRefreshing || undefined}>
      <div className="flex items-baseline justify-between px-[2px] pb-[4px]">
        <h2 id="status-tiles-heading" className="text-[16px] font-semibold leading-tk-label">
          کاموں کی صورتحال
        </h2>
        <span className="text-[13px] leading-tk-title text-tk-muted">کل {total}</span>
      </div>

      <ul className="grid grid-cols-2 gap-tk-gap">
        {STATUS_TILE_ORDER.map((key) => {
          const entry = byStatus[key] || { count: 0, percent: 0 };
          const tone = getStatusTone(key);
          const Icon = STATUS_ICONS[key];
          const { label } = getStatusMeta(key);
          const active = activeStatus === key;

          return (
            <li key={key} className="min-w-0">
              <Link
                to={hrefForStatus(key)}
                aria-label={`${label}: ${entry.count} کام، ${entry.percent} فیصد`}
                aria-current={active ? 'true' : undefined}
                className={clsx(
                  'block rounded-tk-tile bg-tk-card px-tk-card py-tk-gap shadow-tk-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700',
                  active && ['ring-2', tone.ring]
                )}
              >
                <span className="flex items-center gap-tk-gap-sm">
                  <span className={clsx('flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]', tone.iconWrap)}>
                    <Icon className={clsx('h-[17px] w-[17px]', tone.icon)} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 truncate text-[14px] leading-tk-label text-tk-ink-soft">{label}</span>
                </span>
                <span className="flex items-baseline justify-between">
                  <span className={clsx('text-[34px] font-semibold leading-[1.6]', tone.number)}>{entry.count}</span>
                  <span className="text-[12px] text-tk-muted" dir="ltr">
                    {entry.percent}%
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default StatusTiles;
