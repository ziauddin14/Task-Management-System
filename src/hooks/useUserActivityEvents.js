import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUserActivityEvents } from '../services/activity.api.js';

// GET /admin/activity/users/:id/events — one person's timeline (the activity log's dialog).
export function useUserActivityEvents(userId, params) {
  return useQuery({
    queryKey: ['activityEvents', userId, params],
    queryFn: () => getUserActivityEvents(userId, params),
    enabled: Boolean(userId),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
