import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { X } from 'lucide-react';

// Each chip is a 44px-tall button (the touch target) drawing a shorter pill inside it.
const HIT_AREA_CLASS = 'group flex h-tk-touch min-w-tk-touch shrink-0 items-center justify-center focus-visible:outline-none';
const PILL_BASE_CLASS =
  'flex h-[34px] min-w-tk-touch items-center justify-center gap-[6px] whitespace-nowrap rounded-tk-pill px-[12px] text-[13px] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-tk-green-700';

// The row under the search field: first the filters in force, each a dark chip that removes its
// filter when tapped; then the quick choices that are not in force, as light chips that apply
// theirs. The row scrolls sideways on its own — it never widens the page.
//
// `chips`      — utils/taskFilters.js describeActiveFilters(): [{ key, label, clear }]
// `quickChips` — [{ key, label, onSelect }], optional
function FilterChips({ chips, onRemove, quickChips = [] }) {
  if (chips.length === 0 && quickChips.length === 0) return null;

  return (
    <ul aria-label="فلٹرز" className="tk-no-scrollbar -mx-tk-page flex items-center gap-tk-gap-sm overflow-x-auto px-tk-page">
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <button type="button" onClick={() => onRemove(chip)} aria-label={`${chip.label} — فلٹر ہٹائیں`} className={HIT_AREA_CLASS}>
            <span data-active-chip className={`${PILL_BASE_CLASS} bg-tk-green-900 text-white`}>
              <span className="leading-tk-label">{chip.label}</span>
              <X className="h-[14px] w-[14px] shrink-0" aria-hidden="true" />
            </span>
          </button>
        </li>
      ))}
      {quickChips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <button type="button" onClick={chip.onSelect} className={HIT_AREA_CLASS}>
            <span className={`${PILL_BASE_CLASS} border border-tk-line-strong bg-tk-card text-tk-ink-soft`}>
              <span className="leading-tk-label">{chip.label}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default FilterChips;
