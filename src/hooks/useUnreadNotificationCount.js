import { useQuery } from '@tanstack/react-query';
import { getUnreadNotificationCount } from '../services/notifications.api.js';

// Locked blueprint §Real-time vs Polling — the ONLY polling in this feature, and it polls just
// this one cheap count, never the full list. refetchInterval's default refetchIntervalInBackground
// (false) already means this pauses while the tab isn't focused, satisfying "~60s while the
// application/tab is active" with no extra configuration.
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
