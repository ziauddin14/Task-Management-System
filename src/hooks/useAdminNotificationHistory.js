import { useQuery } from '@tanstack/react-query';
import { getAdminNotificationHistory } from '../services/notifications.api.js';

// GET /admin/notifications/history. Only ever mounted from admin-gated UI (NotificationHistoryPanel,
// itself only reachable through the admin-only SendNotificationDialog) — the server independently
// re-enforces requireRole('admin') regardless.
export function useAdminNotificationHistory(params = {}) {
  return useQuery({
    queryKey: ['adminNotificationHistory', params],
    queryFn: () => getAdminNotificationHistory(params),
    staleTime: 30_000,
  });
}
