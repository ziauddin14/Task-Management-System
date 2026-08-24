import React, { useEffect } from 'react'; // explicit import — see src/App.jsx's comment for why
import SearchBar from './SearchBar.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useLookupList } from '../../hooks/useLookupList.js';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch.js';
import { STATUS_META } from '../../utils/taskDisplay.js';

const STATUS_OPTIONS = Object.keys(STATUS_META);

// docs/08-ui-ux.md §5, docs/09-frontend-features.md §5 — search + status + responsibility +
// (Admin-only) assignee + date-type-toggle-with-range, all reading/writing through the
// useDashboardFilters instance passed down from DashboardPage, so every change lands in the URL.
function FilterBar({ filtersHook, isAdmin }) {
  const { params, setFilter, clearAllFilters, hasActiveFilters } = filtersHook;
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

  const { data: responsibilities } = useLookupList('responsibility');
  const { data: assignableUsers } = useAssignableUsers({ enabled: isAdmin });

  const dateType = params.dateType === 'entry' ? 'entry' : 'deadline';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <SearchBar value={searchInput} onChange={setSearchInput} />

      <select
        value={params.status || ''}
        onChange={(event) => setFilter('status', event.target.value || undefined)}
        aria-label="Status filter"
        className="h-10 rounded-lg border border-gray-300 px-2"
      >
        <option value="">ہر کیفیت</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>

      <select
        value={params.responsibility || ''}
        onChange={(event) => setFilter('responsibility', event.target.value || undefined)}
        aria-label="Responsibility filter"
        className="h-10 rounded-lg border border-gray-300 px-2"
      >
        <option value="">ہر ذمہ داری</option>
        {(responsibilities || []).map((entry) => (
          <option key={entry.id} value={entry.value}>
            {entry.value}
          </option>
        ))}
      </select>

      {isAdmin && (
        <select
          value={params.assigneeId || ''}
          onChange={(event) => setFilter('assigneeId', event.target.value || undefined)}
          aria-label="Assignee filter"
          className="h-10 rounded-lg border border-gray-300 px-2"
        >
          <option value="">ہر ذمہ دار</option>
          {(assignableUsers?.items || []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-1">
        <select
          value={dateType}
          onChange={(event) => setFilter('dateType', event.target.value)}
          aria-label="Date type"
          className="h-10 rounded-lg border border-gray-300 px-2"
        >
          <option value="deadline">آخری تاریخ</option>
          <option value="entry">تاریخِ اندراج</option>
        </select>
        <input
          type="date"
          value={params.from || ''}
          onChange={(event) => setFilter('from', event.target.value || undefined)}
          aria-label="Az tareekh"
          className="h-10 rounded-lg border border-gray-300 px-2"
        />
        <input
          type="date"
          value={params.to || ''}
          onChange={(event) => setFilter('to', event.target.value || undefined)}
          aria-label="Ta tareekh"
          className="h-10 rounded-lg border border-gray-300 px-2"
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="h-10 min-w-[40px] rounded-lg px-3 text-sm text-brand hover:underline"
        >
          تمام فلٹرز صاف کریں
        </button>
      )}
    </div>
  );
}

export default FilterBar;
