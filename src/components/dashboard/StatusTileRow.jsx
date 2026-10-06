import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import CountUp from '../common/CountUp.jsx';
import { getStatusMeta } from '../../utils/taskDisplay.js';
import { STATUS_ICONS, STATUS_ORDER, STATUS_TILE_TONE } from '../../utils/dashboardTheme.js';

const DELAY = ['tk-d2', 'tk-d3', 'tk-d4', 'tk-d5'];

// The four status tiles of the desktop dashboard (پینڈنگ، جاری، کلوز، مکمل): a tinted tile with
// an icon chip, the label, a big count and a percent pill. They replace the plain status cards and
// keep their behaviour exactly: a tile toggles its status as the table's filter (aria-pressed says
// which one is in force), and — fed by the summary asked for WITHOUT the status filter — the four
// keep showing the whole distribution while one of them is chosen.
function StatusTileRow({ byStatus, activeStatus, onToggleStatus, isRefreshing = false }) {
  if (!byStatus) return null;

  return (
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4" aria-busy={isRefreshing || undefined} data-status-tiles>
      {STATUS_ORDER.map((key, index) => {
        const entry = byStatus[key] || { count: 0, percent: 0 };
        const tone = STATUS_TILE_TONE[key];
        const Icon = STATUS_ICONS[key];
        const active = activeStatus === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggleStatus(key)}
            aria-pressed={active}
            className={clsx(
              'tk-rise tk-lift flex min-w-0 items-center gap-[14px] rounded-tk-hero px-[18px] py-[14px] text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700',
              DELAY[index],
              tone.tile,
              active && ['ring-2', tone.ring]
            )}
          >
            <span aria-hidden="true" className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-tk-tile', tone.chip)}>
              <Icon className={clsx('h-6 w-6', tone.icon)} strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={clsx('block truncate text-[14px] leading-tk-label', tone.label)}>{getStatusMeta(key).label}</span>
              <span className={clsx('block text-[36px] font-semibold leading-[1.4]', tone.number)}>
                <CountUp value={entry.count} />
              </span>
            </span>
            <span className={clsx('shrink-0 rounded-tk-pill px-[10px] text-[13px] leading-[2.3]', tone.chip, tone.label)} dir="ltr">
              {entry.percent}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default StatusTileRow;
