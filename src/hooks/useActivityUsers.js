import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getActivityUsers } from '../services/activity.api.js';

// GET /admin/activity/users — the activity log's list. keepPreviousData: while a new search or page
// loads, the rows already shown stay in place instead of flashing away.
export function useActivityUsers(params) {
  return useQuery({
    queryKey: ['activityUsers', params],
    queryFn: () => getActivityUsers(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
