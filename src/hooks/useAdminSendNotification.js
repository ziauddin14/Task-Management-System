import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendAdminNotification } from '../services/notifications.api.js';

// Flow A/B (POST /admin/notifications). On success: invalidate the admin history list so a newly
// opened/refreshed history panel reflects this send immediately. Also invalidates the requesting
// admin's own notification list/unread-count — a no-op today (admins are never recipients of any
// Phase 2 flow), but deliberately not hard-coded to assume that never changes (locked blueprint
// §React Query/Cache).
export function useAdminSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => sendAdminNotification(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotificationHistory'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
}
