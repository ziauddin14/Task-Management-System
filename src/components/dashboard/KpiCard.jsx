import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';

// docs/08-ui-ux.md §4 — medium card size, icon + label + count + percentage ("Jari — 8 (32%)"),
// clicking applies the filter and marks itself active (border/background highlight).
function KpiCard({ label, count, percent, active, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'flex min-h-[40px] min-w-[140px] shrink-0 snap-start flex-col gap-1 rounded-lg border p-3 text-start transition-colors',
        active ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      <div className="flex items-center gap-2 text-gray-500">
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">
        {count} <span className="text-sm font-normal text-gray-500">({percent}%)</span>
      </div>
    </button>
  );
}

export default KpiCard;
