import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask } from '../services/tasks.api.js';

// docs/10-api-integration.md §4 — POST /tasks. On success: invalidate ['tasks'] (all filter
// variants) + ['dashboardSummary']. Error toast is handled globally (App.jsx's queryClient
// mutations.onError) — this hook only specifies success behavior.
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    // Wrapped (rather than `mutationFn: createTask` directly) so services/tasks.api.js's
    // createTask keeps a clean single-argument signature — React Query v5 calls mutationFn with a
    // second (client/meta/mutationKey) context argument that createTask has no use for.
    mutationFn: (payload) => createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });
}
