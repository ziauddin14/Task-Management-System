import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acknowledgeTask } from '../services/tasks.api.js';

// "وصول کر لیا" — the signed-in person confirms their own receipt on a task (task receipt,
// utils/taskReceipt.js). Idempotent on the server. Everything that shows a receipt is refreshed:
// the task itself, the task list, the KPI cards (the receipt filter feeds them), and the bell
// (the server marks the person's notices about this task read at the same time).
export function useAcknowledgeTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId) => acknowledgeTask(taskId),
    onSuccess: (task) => {
      if (task?.id) queryClient.setQueryData(['task', task.id], task);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
    },
  });
}
