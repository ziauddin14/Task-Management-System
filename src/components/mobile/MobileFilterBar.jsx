import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { ListFilter, Search } from 'lucide-react';
import FilterChips from './FilterChips.jsx';
import FilterSheet from './FilterSheet.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch.js';
import { QUICK_RANGES, describeActiveFilters, matchQuickRange, quickRange } from '../../utils/taskFilters.js';

// The task list's filter controls on a phone: a search field, a "فلٹر" button (with the number of
// filters in force) that opens the filter sheet, and under them the chip row — the filters in
// force as removable chips, then the quick date ranges that are not.
//
// Same state as the desktop FilterBar: everything reads and writes the useDashboardFilters
// instance passed down, so every change lands in the URL. Search is debounced exactly as there.
function MobileFilterBar({ filtersHook, isAdmin }) {
  const { params, setFilter, setFilters } = filtersHook;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchInput, setSearchInput, debouncedSearch] = useDebouncedSearch(params.search || '');

  // An outside change (a chip removed, "فلٹر صاف کریں") is reflected back into the box.
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

  const chips = describeActiveFilters(params, { users });
  const activeQuickRange = matchQuickRange(params.from, params.to);
  const quickChips = QUICK_RANGES.filter((range) => range.key !== activeQuickRange).map((range) => ({
    key: range.key,
    label: range.label,
    // On the date field already chosen (the deadline unless the sheet says otherwise).
    onSelect: () => setFilters(quickRange(range.key)),
  }));

  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex gap-[10px]">
        <label className="flex h-[48px] min-w-0 flex-1 items-center gap-tk-gap-sm rounded-tk-input bg-tk-card px-tk-card shadow-tk-soft focus-within:ring-2 focus-within:ring-tk-green-700">
          <Search className="h-[20px] w-[20px] shrink-0 text-tk-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="کام یا کوڈ نمبر تلاش کریں..."
            aria-label="کام یا کوڈ نمبر تلاش کریں"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-tk-ink placeholder:text-tk-muted focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isSheetOpen}
          aria-label={chips.length > 0 ? `فلٹر، ${chips.length} فعال` : 'فلٹر'}
          className="flex h-[48px] shrink-0 items-center gap-[6px] rounded-tk-input bg-tk-green-700 px-tk-card text-[14px] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
        >
          <ListFilter className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="leading-tk-label">فلٹر</span>
          {chips.length > 0 && (
            <span
              data-filter-count
              aria-hidden="true"
              className="flex h-[20px] min-w-[20px] items-center justify-center rounded-tk-pill bg-tk-card px-[4px] text-[12px] font-semibold leading-none text-tk-green-900"
            >
              {chips.length}
            </span>
          )}
        </button>
      </div>

      <FilterChips chips={chips} onRemove={(chip) => setFilters(chip.clear)} quickChips={quickChips} />

      <FilterSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        params={params}
        onApply={setFilters}
        isAdmin={isAdmin}
        users={users}
      />
    </div>
  );
}

export default MobileFilterBar;
