import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// docs/09-frontend-features.md §5 — all filter/search/sort/page state lives in the URL's query
// string via useSearchParams, not component-only useState (shareable/bookmarkable, survives a
// refresh). Column visibility and page size are the documented exceptions (localStorage instead —
// see hooks/useColumnVisibility.js and hooks/usePageSize.js), so neither is handled here.
//
// URL param names used by this dashboard: status, performanceRating, assigneeId, responsibility,
// search, dateType ('deadline' | 'entry'), from, to, sortBy, sortOrder, page. `dateType`/`from`/`to`
// are a frontend-only representation of docs/08-ui-ux.md §5's "toggle between Deadline and Entry
// Date, plus a from/to range" — translated below into the backend's actual query param names
// (deadlineFrom/deadlineTo or entryFrom/entryTo, docs/05-apis.md §5) so services/tasks.api.js never
// has to know about the toggle.
const FILTER_KEYS = ['status', 'performanceRating', 'assigneeId', 'responsibility', 'search', 'dateType', 'from', 'to'];

function paramsToObject(searchParams) {
  const obj = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

export function useDashboardFilters(pageSize) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => paramsToObject(searchParams), [searchParams]);

  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const sortBy = params.sortBy || 'deadline';
  const sortOrder = params.sortOrder || 'asc';

  // docs/05-apis.md §5 — the exact query object GET /tasks (and, by extension, the dashboard
  // summary's own scoping — though that endpoint currently ignores query params entirely) expects.
  const apiFilters = useMemo(() => {
    const filters = {
      status: params.status || undefined,
      performanceRating: params.performanceRating || undefined,
      assigneeId: params.assigneeId || undefined,
      responsibility: params.responsibility || undefined,
      search: params.search || undefined,
      sortBy,
      sortOrder,
      page,
      limit: pageSize,
    };
    if (params.from || params.to) {
      const dateType = params.dateType === 'entry' ? 'entry' : 'deadline';
      if (dateType === 'entry') {
        filters.entryFrom = params.from || undefined;
        filters.entryTo = params.to || undefined;
      } else {
        filters.deadlineFrom = params.from || undefined;
        filters.deadlineTo = params.to || undefined;
      }
    }
    return filters;
  }, [params, sortBy, sortOrder, page, pageSize]);

  const hasActiveFilters = FILTER_KEYS.some((key) => Boolean(params[key]));

  // Sets one or more params at once; any change here — filter, search, or sort — resets page to 1
  // (docs/09-frontend-features.md §5: "a stale page 5 after narrowing a filter ... always reset").
  const applyParams = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        });
        next.delete('page');
        return next;
      });
    },
    [setSearchParams]
  );

  const setFilter = useCallback((key, value) => applyParams({ [key]: value }), [applyParams]);

  // Batched form of setFilter — react-router's setSearchParams functional updater reads from the
  // same closed-over `searchParams` for every call issued before the next render, so two
  // back-to-back setFilter() calls in one event handler would silently clobber each other (the
  // second call's `prev` wouldn't see the first call's change yet). Anything that needs to change
  // more than one param atomically (e.g. clearing both active KPI filters at once) MUST go through
  // this single call instead of multiple setFilter/toggleKpiFilter calls in a row.
  const setFilters = useCallback((patch) => applyParams(patch), [applyParams]);

  // docs/09-frontend-features.md §6 — clicking a KPI card toggles: same value again clears it.
  const toggleKpiFilter = useCallback(
    (key, value) => applyParams({ [key]: params[key] === value ? undefined : value }),
    [applyParams, params]
  );

  const clearAllFilters = useCallback(() => {
    const patch = {};
    FILTER_KEYS.forEach((key) => {
      patch[key] = undefined;
    });
    applyParams(patch);
  }, [applyParams]);

  const setSort = useCallback((nextSortBy, nextSortOrder) => applyParams({ sortBy: nextSortBy, sortOrder: nextSortOrder }), [applyParams]);

  // Page changes deliberately do NOT go through applyParams (which always resets page to 1).
  const setPage = useCallback(
    (nextPage) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(nextPage));
        return next;
      });
    },
    [setSearchParams]
  );

  return {
    params,
    page,
    sortBy,
    sortOrder,
    apiFilters,
    hasActiveFilters,
    setFilter,
    setFilters,
    toggleKpiFilter,
    clearAllFilters,
    setSort,
    setPage,
  };
}
