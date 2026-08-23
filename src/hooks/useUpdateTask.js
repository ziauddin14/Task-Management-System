import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTask } from '../services/tasks.api.js';

// docs/10-api-integration.md §4 — PATCH /tasks/:id. On success: write the fresh object directly
// into ['task', taskId] (no refetch needed) + invalidate ['tasks'].
export function useUpdateTask(taskId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateTask(taskId, payload),
    onSuccess: (task) => {
      queryClient.setQueryData(['task', taskId], task);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
