import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '../services/notifications.api.js';

// Locked blueprint §Real-time vs Polling — fetched on demand (the drawer opening), never polled;
// `enabled` lets the caller (NotificationDrawer) gate the request to only fire while it's open.
export function useNotifications(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => getNotifications(params),
    staleTime: 30_000,
    enabled,
  });
}
