import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationRead } from '../services/notifications.api.js';

// On success: invalidate both the list and the unread count so the bell badge and drawer stay in
// sync with the server. No success toast — a single notification click is a low-stakes, frequent
// action already reflected visually (the unread dot disappears, the badge decrements); error
// feedback is handled globally (App.jsx's queryClient mutations.onError), same as every other
// mutation hook in this codebase.
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
}
