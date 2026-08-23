import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTaskUpdate } from '../services/taskUpdates.api.js';

// docs/10-api-integration.md §4 — POST /tasks/:id/updates. Response is { update, task }. On
// success: setQueryData(['task', taskId], task) directly; invalidate ['taskUpdates', taskId],
// ['tasks'], and ['dashboardSummary'] — a single update can move a task between KPI buckets.
export function useCreateTaskUpdate(taskId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createTaskUpdate(taskId, payload),
    onSuccess: ({ task }) => {
      queryClient.setQueryData(['task', taskId], task);
      queryClient.invalidateQueries({ queryKey: ['taskUpdates', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
}
