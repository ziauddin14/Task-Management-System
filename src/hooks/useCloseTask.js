import { useMutation, useQueryClient } from '@tanstack/react-query';
import { closeTask } from '../services/tasks.api.js';

// docs/10-api-integration.md §4 — PATCH /tasks/:id/close. Same cache effects as useUpdateTask
// plus invalidating ['dashboardSummary'] (status counts changed). mutate() with nothing closes the
// task as always (no body); mutate(finalReply) sends the admin's final reply with the close — a new
// update in its history, so ['taskUpdates', taskId] is refreshed too.
export function useCloseTask(taskId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (finalReply) => (finalReply ? closeTask(taskId, finalReply) : closeTask(taskId)),
    onSuccess: (task, finalReply) => {
      queryClient.setQueryData(['task', taskId], task);
      if (finalReply) queryClient.invalidateQueries({ queryKey: ['taskUpdates', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
}
