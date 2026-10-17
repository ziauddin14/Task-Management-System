import { useQuery } from '@tanstack/react-query';
import { getActivitySettings } from '../services/activity.api.js';

// GET /admin/settings/activity — the Settings page's Admin-only card. No retry: on failure the
// card is simply not shown.
export function useActivitySettings() {
  return useQuery({
    queryKey: ['activitySettings'],
    queryFn: getActivitySettings,
    staleTime: 60_000,
    retry: false,
  });
}
