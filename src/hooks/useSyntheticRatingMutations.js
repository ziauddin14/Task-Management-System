import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { editSyntheticRating, removeSyntheticRating } from '../services/tasks.api.js';
import { FINAL_RATING_NOTE } from '../utils/taskDisplay.js';

// Admin-only edits of a developer-assigned (synthetic) rating — docs/05-apis.md §5:
// PATCH / DELETE /tasks/:id/synthetic-rating. Same cache effects as useCloseTask: the task itself
// is replaced with the server's answer, and the task list and the KPI summary (band counts, the
// synthetic count and the overall average all move) are refetched.
//
// Errors are toasted exactly as everywhere else (App.jsx's mutations.onError — the server's
// message), except one: 409 SYNTHETIC_RATING_FINAL, when the rating had already been made final
// (by another admin, a moment ago). That one says so in the approved words, and the task and the
// lists are refetched so the row shows the rating as final.
function useSyntheticRatingMutation(taskId, mutationFn) {
  const queryClient = useQueryClient();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
  }

  return useMutation({
    mutationFn,
    onSuccess: (task) => {
      queryClient.setQueryData(['task', taskId], task);
      refresh();
    },
    onError: (err) => {
      if (err?.code === 'SYNTHETIC_RATING_FINAL') {
        toast.error(FINAL_RATING_NOTE);
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        refresh();
        return;
      }
      toast.error(err.message);
    },
  });
}

export function useEditSyntheticRating(taskId) {
  return useSyntheticRatingMutation(taskId, (payload) => editSyntheticRating(taskId, payload));
}

export function useRemoveSyntheticRating(taskId) {
  return useSyntheticRatingMutation(taskId, (payload) => removeSyntheticRating(taskId, payload));
}
