import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { CalendarDays } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import FilterChips from '../mobile/FilterChips.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch.js';
import { QUICK_RANGES, describeActiveFilters, matchQuickRange, quickRange } from '../../utils/taskFilters.js';

const SELECT_CLASS =
  'h-[46px] max-w-full rounded-tk-input border-0 bg-tk-surface px-3 text-[13px] text-tk-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-tk-green-700';
const DATE_CLASS = `${SELECT_CLASS} px-3`;
const PILL_CLASS =
  'flex h-[36px] shrink-0 items-center gap-[6px] whitespace-nowrap rounded-tk-pill px-4 text-[13px] leading-tk-label transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700';
const PILL_IDLE = 'bg-tk-surface text-tk-ink-soft hover:bg-tk-green-50';
const PILL_ACTIVE = 'bg-tk-green-900 font-semibold text-white';

// docs/08-ui-ux.md §5, docs/09-frontend-features.md §5 — search + (Admin-only) assignee + rating
// source + date-type-with-range, all reading/writing through the useDashboardFilters instance
// passed down from DashboardPage, so every change lands in the URL. (The status and responsibility
// dropdowns were removed long ago: the status tiles cover the first, the second has no UI.)
//
// Desktop redesign — one rounded card. Every filter that existed is still here and still works the
// same way; what is new is how they are laid out:
//   - quick date ranges (آج، اس ہفتے، اس ماہ) as chips. Each is just a from/to pair on the chosen
//     date field (utils/taskFilters.js — the same model the mobile filter sheet uses), so pressing
//     the chosen one again clears the range;
//   - the date field and the two native date inputs sit behind the "تاریخ" button, for a custom
//     range. They are shown from the start when the URL already carries one;
//   - the filters in force are listed underneath as chips, each removing its own filter.
function FilterBar({ filtersHook, isAdmin }) {
  const { params, setFilter, setFilters, clearAllFilters, hasActiveFilters } = filtersHook;
  const [searchInput, setSearchInput, debouncedSearch] = useDebouncedSearch(params.search || '');

  // External changes (e.g. "Clear all filters", a KPI card) should be reflected back into the box.
  useEffect(() => {
    setSearchInput(params.search || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search]);

  useEffect(() => {
    if (debouncedSearch !== (params.search || '')) {
      setFilter('search', debouncedSearch || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data: assignableUsers } = useAssignableUsers({ enabled: isAdmin });
  const users = assignableUsers?.items || [];

  const dateType = params.dateType === 'entry' ? 'entry' : 'deadline';
  const activeQuickRange = matchQuickRange(params.from, params.to);
  const hasCustomRange = Boolean(params.from || params.to) && !activeQuickRange;
  const [showDates, setShowDates] = useState(hasCustomRange || params.dateType === 'entry');
  const chips = describeActiveFilters(params, { users });

  return (
    <div className="tk-rise tk-d3 flex flex-col gap-1 rounded-tk-hero bg-tk-card px-4 py-3 shadow-tk-soft">
      <div className="flex flex-wrap items-center gap-[10px]">
        <SearchBar value={searchInput} onChange={setSearchInput} />

        {isAdmin && (
          <select
            value={params.assigneeId || ''}
            onChange={(event) => setFilter('assigneeId', event.target.value || undefined)}
            aria-label="Assignee filter"
            className={SELECT_CLASS}
          >
            <option value="">تمام ذمہ داران</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )}

        {/* Where a rating came from: developer-assigned ("تخمینی") or real ("اصل"). Narrows the table,
            the KPI cards and an export alike (backend: ratingSource). */}
        <select
          value={params.ratingSource || ''}
          onChange={(event) => setFilter('ratingSource', event.target.value || undefined)}
          aria-label="Rating source filter"
          className={SELECT_CLASS}
        >
          <option value="">تمام درجہ بندی</option>
          <option value="synthetic">تخمینی</option>
          <option value="real">اصل</option>
        </select>

        <div role="group" aria-label="تاریخ کی حد" className="flex flex-wrap items-center gap-2">
          {QUICK_RANGES.map((range) => {
            const selected = activeQuickRange === range.key;
            return (
              <button
                key={range.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilters(selected ? { from: undefined, to: undefined } : quickRange(range.key))}
                className={clsx(PILL_CLASS, selected ? PILL_ACTIVE : PILL_IDLE)}
              >
                {range.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-expanded={showDates}
            aria-controls="filter-custom-dates"
            onClick={() => setShowDates((prev) => !prev)}
            className={clsx(PILL_CLASS, hasCustomRange ? PILL_ACTIVE : PILL_IDLE)}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            تاریخ
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="h-[40px] min-w-[40px] rounded-tk-chip px-3 text-[13px] leading-tk-label text-tk-green-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
          >
            تمام فلٹرز صاف کریں
          </button>
        )}
      </div>

      {/* A custom range: the date field and the browser's own two date inputs (they show the date
          in the device's locale format, which a page cannot change). */}
      {showDates && (
        <div id="filter-custom-dates" className="flex flex-wrap items-center gap-2 pt-2">
          <select value={dateType} onChange={(event) => setFilter('dateType', event.target.value)} aria-label="Date type" className={SELECT_CLASS}>
            <option value="deadline">آخری تاریخ</option>
            <option value="entry">تاریخِ اندراج</option>
          </select>
          <input
            type="date"
            value={params.from || ''}
            onChange={(event) => setFilter('from', event.target.value || undefined)}
            aria-label="از تاریخ"
            className={DATE_CLASS}
          />
          <input
            type="date"
            value={params.to || ''}
            onChange={(event) => setFilter('to', event.target.value || undefined)}
            aria-label="تا تاریخ"
            className={DATE_CLASS}
          />
        </div>
      )}

      <FilterChips chips={chips} onRemove={(chip) => setFilters(chip.clear)} />
    </div>
  );
}

export default FilterBar;
