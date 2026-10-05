import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../services/dashboard.api.js';

// docs/10-api-integration.md §3 — key ['dashboardSummary', filters], staleTime 30s. `filters` is
// one of useDashboardFilters' `statusSummaryFilters` / `ratingSummaryFilters`: the dashboard's
// current task filters (never sort/paging, which the endpoint rejects), sent to the server so the
// KPI cards describe the filtered set. The dashboard calls this once per KPI group; two calls with
// equal filters share one cache entry and one request.
//
// keepPreviousData — when a filter changes, the cards keep showing the previous figures (flagged
// by isPlaceholderData) until the new ones arrive, instead of the whole KPI block collapsing into
// a loader and jumping back on every keystroke of a search.
//
// `enabled: false` — for a screen that shows no KPIs (the mobile task list; they are on the
// dashboard tab there).
export function useDashboardSummary(filters = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['dashboardSummary', filters],
    queryFn: () => getDashboardSummary(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  });
}
