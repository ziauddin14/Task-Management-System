import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../services/dashboard.api.js';

// docs/10-api-integration.md §3 — key ['dashboardSummary', filters], staleTime 30s. The backend
// endpoint (docs/05-apis.md §8) takes no query params today — scoping is entirely by requesting
// user's role — so `filters` only affects the cache key, kept for forward-compatibility with the
// documented hook signature; nothing is sent to the server.
export function useDashboardSummary(filters = {}) {
  return useQuery({
    queryKey: ['dashboardSummary', filters],
    queryFn: getDashboardSummary,
    staleTime: 30_000,
  });
}
