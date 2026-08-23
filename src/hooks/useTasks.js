import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../services/tasks.api.js';

// docs/10-api-integration.md §3 — key ['tasks', filters], staleTime 30s. `filters` is the
// already backend-shaped query object (see hooks/useDashboardFilters.js).
export function useTasks(filters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
    staleTime: 30_000,
  });
}
