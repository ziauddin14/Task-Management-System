import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUserActivityHistory } from '../services/activity.api.js';

// GET /admin/activity/users/:id/history — the person's task updates from before the log began.
// Read-only, shown in the timeline dialog only. No retry: on failure the section stays hidden.
export function useUserActivityHistory(userId, params) {
  return useQuery({
    queryKey: ['activityHistory', userId, params],
    queryFn: () => getUserActivityHistory(userId, params),
    enabled: Boolean(userId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}
