import { useMutation, useQueryClient } from '@tanstack/react-query';
import { editSyntheticRating, removeSyntheticRating } from '../services/tasks.api.js';

// Admin-only edits of a developer-assigned (synthetic) rating — docs/05-apis.md §5:
// PATCH / DELETE /tasks/:id/synthetic-rating. Same cache effects as useCloseTask: the task itself
// is replaced with the server's answer, and the task list and the KPI summary (band counts, the
// synthetic count and the overall average all move) are refetched.
function useSyntheticRatingMutation(taskId, mutationFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (task) => {
      queryClient.setQueryData(['task', taskId], task);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
}

export function useEditSyntheticRating(taskId) {
  return useSyntheticRatingMutation(taskId, (payload) => editSyntheticRating(taskId, payload));
}

export function useRemoveSyntheticRating(taskId) {
  return useSyntheticRatingMutation(taskId, (payload) => removeSyntheticRating(taskId, payload));
}
