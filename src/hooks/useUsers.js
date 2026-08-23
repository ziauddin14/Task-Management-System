import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../services/users.api.js';

// docs/10-api-integration.md §3 — key ['users', filters], staleTime 60s. Used by the Users page
// table.
export function useUsers(filters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
    staleTime: 60_000,
  });
}
