import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '../services/users.api.js';

// docs/10-api-integration.md §4 — POST /users. On success: invalidateQueries(['users']).
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
