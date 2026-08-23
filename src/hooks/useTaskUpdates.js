import { useQuery } from '@tanstack/react-query';
import { getTaskUpdates } from '../services/taskUpdates.api.js';

// docs/10-api-integration.md §3 — key ['taskUpdates', taskId, page], staleTime 30s,
// `enabled: false` until the Previous Updates section is actually opened (docs/09-frontend-
// features.md §3-4 — lazy fetch, not pre-loaded with the task list). Defaults to disabled here so
// the caller must explicitly opt in when it's actually opened/expanded, matching that wording.
const PAGE_SIZE = 10;

export function useTaskUpdates(taskId, page, { enabled = false } = {}) {
  return useQuery({
    queryKey: ['taskUpdates', taskId, page],
    queryFn: () => getTaskUpdates(taskId, { page, limit: PAGE_SIZE }),
    staleTime: 30_000,
    enabled: Boolean(taskId) && enabled,
  });
}
