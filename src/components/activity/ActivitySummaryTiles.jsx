import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { CalendarDays, Sun, UserX } from 'lucide-react';
import CountUp from '../common/CountUp.jsx';
import { inactiveTileLabel } from '../../utils/activityLog.js';

// The activity log's three figures, in the dashboard's tile style (StatusTileRow.jsx), counted over
// ACTIVE accounts: active today (the Pakistan calendar day), active in the last 7 days, and how many
// are inactive for more than N days — in the red "weak" tint only while that is above zero.
const TONES = {
  today: { tile: 'bg-tk-closed-tint', chip: 'bg-tk-closed-chip', icon: 'text-tk-closed-text', label: 'text-tk-closed-ink', number: 'text-tk-closed-text' },
  week: { tile: 'bg-tk-ongoing-tint', chip: 'bg-tk-ongoing-chip', icon: 'text-tk-ongoing-text', label: 'text-tk-ongoing-ink', number: 'text-tk-ongoing-text' },
  inactive: { tile: 'bg-tk-weak-tint', chip: 'bg-white/70', icon: 'text-tk-weak', label: 'text-tk-weak-ink', number: 'text-tk-weak' },
};
const DELAY = ['tk-d1', 'tk-d2', 'tk-d3'];

function ActivitySummaryTiles({ summary }) {
  if (!summary) return null;

  const tiles = [
    { key: 'today', label: 'آج متحرک', value: summary.activeToday, icon: Sun, tone: TONES.today },
    { key: 'week', label: 'اس ہفتے متحرک', value: summary.activeThisWeek, icon: CalendarDays, tone: TONES.week },
    {
      key: 'inactive',
      label: inactiveTileLabel(summary.inactivityDays),
      value: summary.inactiveCount,
      icon: UserX,
      tone: summary.inactiveCount > 0 ? TONES.inactive : TONES.today,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-tk-gap sm:grid-cols-3 md:gap-5" data-activity-tiles>
      {tiles.map(({ key, label, value, icon: Icon, tone }, index) => (
        <div
          key={key}
          data-tile={key}
          aria-label={`${label}: ${value}`}
          role="group"
          className={clsx('tk-rise flex min-w-0 items-center gap-[14px] rounded-tk-hero px-[18px] py-[14px]', DELAY[index], tone.tile)}
        >
          <span aria-hidden="true" className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-tk-tile', tone.chip)}>
            <Icon className={clsx('h-6 w-6', tone.icon)} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1" aria-hidden="true">
            <span className={clsx('block truncate text-[14px] leading-tk-label', tone.label)}>{label}</span>
            <span className={clsx('block text-[36px] font-semibold leading-[1.4]', tone.number)}>
              <CountUp value={value} />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default ActivitySummaryTiles;
