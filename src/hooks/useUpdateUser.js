import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '../services/users.api.js';

// docs/10-api-integration.md §4 — PATCH /users/:id. On success: setQueryData(['user', userId],
// response) + invalidateQueries(['users']) (also invalidates useAssignableUsers' cache
// automatically, since it shares the ['users', ...] key prefix).
export function useUpdateUser(userId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => updateUser(userId, payload),
    onSuccess: (user) => {
      queryClient.setQueryData(['user', userId], user);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
