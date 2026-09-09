import React, { useEffect } from 'react'; // explicit import — see src/App.jsx's comment for why
import SearchBar from './SearchBar.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch.js';

// docs/08-ui-ux.md §5, docs/09-frontend-features.md §5 — search + (Admin-only) assignee +
// date-type-toggle-with-range, all reading/writing through the useDashboardFilters instance
// passed down from DashboardPage, so every change lands in the URL. Prompt — the status dropdown
// was removed deliberately: the KPI cards already cover status filtering by click, so it was a
// redundant second control for the same `status` URL param (still fully wired — just no longer
// has its own dropdown UI). The Responsibility dropdown was removed the same way (UI cleanup
// only) — no `responsibility` filter UI remains, and its lookup-list hook call went with it.
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

  const { data: assignableUsers } = useAssignableUsers({ enabled: isAdmin });

  const dateType = params.dateType === 'entry' ? 'entry' : 'deadline';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <SearchBar value={searchInput} onChange={setSearchInput} />

      {isAdmin && (
        <select
          value={params.assigneeId || ''}
          onChange={(event) => setFilter('assigneeId', event.target.value || undefined)}
          aria-label="Assignee filter"
          className="h-10 rounded-lg border border-gray-300 px-2 focus:border-brand focus:outline-none"
        >
          <option value="">تمام ذمہ داران</option>
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
          className="h-10 rounded-lg border border-gray-300 px-2 focus:border-brand focus:outline-none"
        >
          <option value="deadline">آخری تاریخ</option>
          <option value="entry">تاریخِ اندراج</option>
        </select>
        <input
          type="date"
          value={params.from || ''}
          onChange={(event) => setFilter('from', event.target.value || undefined)}
          aria-label="از تاریخ"
          className="h-10 rounded-lg border border-gray-300 px-2 focus:border-brand focus:outline-none"
        />
        <input
          type="date"
          value={params.to || ''}
          onChange={(event) => setFilter('to', event.target.value || undefined)}
          aria-label="تا تاریخ"
          className="h-10 rounded-lg border border-gray-300 px-2 focus:border-brand focus:outline-none"
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
