import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAllNotificationsRead } from '../services/notifications.api.js';

// Same rationale as useMarkNotificationRead.js — silent on success (the drawer visually updates
// immediately), errors surface via the global mutation onError toast.
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
}
