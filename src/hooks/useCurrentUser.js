import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../services/auth.api.js';
import { useAuthStore } from '../store/authStore.js';

// docs/10-api-integration.md §3: GET /auth/me. Key ['currentUser'], staleTime: Infinity, enabled
// only when a token exists in authStore — drives the session-restore sequence (docs/11-auth.md §4).
export function useCurrentUser() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: Infinity,
    enabled: Boolean(token),
  });
}
