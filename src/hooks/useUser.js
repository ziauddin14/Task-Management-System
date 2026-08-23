import { useQuery } from '@tanstack/react-query';
import { getUser } from '../services/users.api.js';

// docs/10-api-integration.md §1 names this hook in the file layout without its own row in the
// §3 query-hooks table — key/staleTime follow the same shape as every other single-resource hook
// (useTask, ['task', taskId]) and useUsers' own 60s staleTime, for consistency. Not currently
// wired into UsersPage.jsx (the edit modal is pre-filled from the already-fetched table row, the
// same pattern TaskFormModal used for tasks — no redundant fetch needed), but built per the
// documented file layout for a future need (e.g. a standalone user-detail view or self-profile).
export function useUser(userId) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
    staleTime: 60_000,
    enabled: Boolean(userId),
  });
}
