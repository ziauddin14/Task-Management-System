import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Columns3 } from 'lucide-react';

// docs/08-ui-ux.md §6 — "a small 'columns' icon button at the end of the header row opening a
// checklist dropdown." docs/09-frontend-features.md §7 — locked columns shown disabled/checked so
// the control is self-explanatory rather than needing separate instructional text. Generalized in
// Phase 10.6 (columns now a prop, not a hardcoded import) so UserSummaryReportPage's column-hide
// control (docs/08-ui-ux.md §9 — "same pattern") can reuse this component against its own set.
function ColumnToggle({ columns, isVisible, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Columns"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
      >
        <Columns3 className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute end-0 z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex h-10 items-center gap-2 rounded px-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={isVisible(col.key)}
                disabled={col.locked}
                onChange={() => onToggle(col.key)}
                className="h-4 w-4"
              />
              <span className={col.locked ? 'text-gray-400' : 'text-gray-800'}>{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default ColumnToggle;
