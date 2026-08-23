import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../services/users.api.js';

// docs/10-api-integration.md §3 — deliberately reuses the same key shape as a hypothetical
// useUsers(filters) with fixed params, so it would share cache with the Users page (a later
// sub-phase) when filters happen to match. Powers the task form's assignee multi-select and the
// dashboard's Admin-only assignee filter — both restricted to Admin already (GET /users is
// Admin-only, docs/05-apis.md §3), so this hook is only ever invoked from Admin-rendered UI.
const ASSIGNABLE_FILTERS = { role: 'user', isActive: true };

export function useAssignableUsers({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['users', ASSIGNABLE_FILTERS],
    queryFn: () => getUsers(ASSIGNABLE_FILTERS),
    staleTime: 60_000,
    enabled,
  });
}
