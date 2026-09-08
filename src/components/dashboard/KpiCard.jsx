import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';

// docs/08-ui-ux.md §4 — clicking applies the filter and marks itself active (border/background
// highlight). Prompt 2E — client's explicit internal layout: label centered at the top, count at
// the bottom-right, percentage at the bottom-left. Read as literal screen positions (not logical
// start/end) per the client's own visual description — in this RTL app the bottom row's first
// child already lands at the visual right and the second at the visual left, so a plain
// `justify-between` row (count first, percent second) achieves it directly. `percent` is optional
// — the Total card (Prompt 2C) has no meaningful percentage and omits it entirely.
//
// Prompt — deliberately compact (was min-h-[80px]/min-w-[140px] with p-3/text-xl): at that size,
// 5 cards per group don't fit one row on common desktop widths (1366/1440px) and wrap to a second
// line, pushing the table down. Shrunk enough that both 5-card groups fit a single row without
// wrapping at 1366px+ (confirmed live), while staying comfortably inside the 40px min touch-target
// (docs/08-ui-ux.md §1) on the count/percent row.
function KpiCard({ label, count, percent, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex min-h-[52px] min-w-[82px] shrink-0 snap-start flex-col justify-between gap-1 rounded-lg border px-1.5 py-1.5 shadow-sm transition-colors',
        active ? 'border-brand bg-brand-light shadow-brand/20' : 'border-gray-200 bg-white hover:border-brand/40 hover:bg-brand-light/30'
      )}
    >
      <div className="flex w-full items-center justify-center gap-1 text-gray-500">
        {Icon ? <Icon className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
        <span className="truncate text-[11px] font-medium leading-tight">{label}</span>
      </div>
      <div className="flex w-full items-end justify-between">
        <span className="text-base font-bold leading-none text-gray-900">{count}</span>
        {percent !== undefined && percent !== null && <span className="text-[11px] leading-none text-gray-500">{percent}%</span>}
      </div>
    </button>
  );
}

export default KpiCard;
