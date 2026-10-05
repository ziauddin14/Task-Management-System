import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../services/tasks.api.js';

// docs/10-api-integration.md §3 — key ['tasks', filters], staleTime 30s. `filters` is the
// already backend-shaped query object (see hooks/useDashboardFilters.js).
// `enabled: false` — for a screen that does not list tasks (the mobile dashboard shows the KPIs
// alone; the list is its own tab), so it does not fetch a page of them for nothing.
export function useTasks(filters, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
    staleTime: 30_000,
    enabled,
  });
}
