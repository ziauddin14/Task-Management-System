import { useMutation, useQueryClient } from '@tanstack/react-query';
import { closeTask } from '../services/tasks.api.js';

// docs/10-api-integration.md §4 — PATCH /tasks/:id/close. Same cache effects as useUpdateTask
// plus invalidating ['dashboardSummary'] (status counts changed).
export function useCloseTask(taskId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => closeTask(taskId),
    onSuccess: (task) => {
      queryClient.setQueryData(['task', taskId], task);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
}
