import { useQuery } from '@tanstack/react-query';
import { getActivitySummary } from '../services/activity.api.js';

// GET /admin/activity/summary — the activity log's tiles and the dashboard's inactivity alert share
// this one cache entry. `enabled` lets the dashboard ask only for an Admin. No retry: when the
// endpoint is missing or failing, the alert simply stays hidden and the page shows no tiles.
export function useActivitySummary({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['activitySummary'],
    queryFn: getActivitySummary,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
