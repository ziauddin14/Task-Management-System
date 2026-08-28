import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';

// docs/08-ui-ux.md §4 — medium card size, clicking applies the filter and marks itself active
// (border/background highlight). Prompt 2E — client's explicit internal layout: label centered at
// the top, count at the bottom-right, percentage at the bottom-left. Read as literal screen
// positions (not logical start/end) per the client's own visual description — in this RTL app the
// bottom row's first child already lands at the visual right and the second at the visual left, so
// a plain `justify-between` row (count first, percent second) achieves it directly. `percent` is
// optional — the Total card (Prompt 2C) has no meaningful percentage and omits it entirely.
function KpiCard({ label, count, percent, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex min-h-[80px] min-w-[140px] shrink-0 snap-start flex-col justify-between gap-2 rounded-lg border p-3 transition-colors',
        active ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div className="flex w-full items-center justify-center gap-2 text-gray-500">
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex w-full items-end justify-between">
        <span className="text-xl font-bold text-gray-900">{count}</span>
        {percent !== undefined && percent !== null && <span className="text-sm text-gray-500">{percent}%</span>}
      </div>
    </button>
  );
}

export default KpiCard;
