import { useQuery } from '@tanstack/react-query';
import { getTask } from '../services/tasks.api.js';

// docs/10-api-integration.md §3 — key ['task', taskId], staleTime 30s. Powers the Update/
// Previous-Updates modals' read-only header info.
export function useTask(taskId) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTask(taskId),
    staleTime: 30_000,
    enabled: Boolean(taskId),
  });
}
