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
// Sized up ~50% from the original compact pass (min-h-[52px]/min-w-[82px], text-[11px]/text-base)
// per explicit client request. Prompt — the "5 cards per group fit one row at 1366px+" bug this
// reopened is fixed by the parent grid (DashboardPage.jsx's grid-cols-5, not flex-wrap) plus
// min-w-0/w-full here: CSS Grid's minmax(0,1fr) tracks have a genuine zero-width floor, unlike a
// flex item's default min-width:auto, so the card now actually shrinks to its grid cell instead of
// forcing the row to wrap.
function KpiCard({ label, count, percent, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex min-h-[78px] w-full min-w-0 shrink-0 snap-start flex-col justify-between gap-1.5 rounded-lg border px-2.5 py-2.5 shadow-sm transition-colors',
        active ? 'border-brand bg-brand-light shadow-brand/20' : 'border-gray-200 bg-white hover:border-brand/40 hover:bg-brand-light/30'
      )}
    >
      <div className="flex w-full items-center justify-center gap-1.5 text-gray-500">
        {Icon ? <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /> : null}
        <span className="truncate text-[17px] font-medium leading-tight">{label}</span>
      </div>
      <div className="flex w-full items-end justify-between">
        <span className="text-2xl font-bold leading-none text-gray-900">{count}</span>
        {percent !== undefined && percent !== null && <span className="text-[17px] leading-none text-gray-500">{percent}%</span>}
      </div>
    </button>
  );
}

export default KpiCard;
