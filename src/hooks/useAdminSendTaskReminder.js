import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendTaskReminder } from '../services/notifications.api.js';

// Flow C (POST /admin/tasks/:taskId/reminder). Same invalidation rationale as
// useAdminSendNotification.js.
export function useAdminSendTaskReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    // Wrapped (not `mutationFn: sendTaskReminder` directly) so the service function keeps a
    // clean two-argument signature independent of React Query v5's own mutate(variables) shape —
    // mirrors useCreateTask.js's own documented reason for wrapping.
    mutationFn: ({ taskId, payload }) => sendTaskReminder(taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotificationHistory'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
}
