import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../services/auth.api.js';
import { useAuthStore } from '../store/authStore.js';

// docs/10-api-integration.md §4: POST /auth/google. On success: store { token, user } in
// authStore, setQueryData(['currentUser'], user) directly (avoids an extra GET /auth/me
// round-trip right after login), navigate to /. Matches the exact `mutate({ idToken })` call
// shape shown in docs/11-auth.md §2.2.
export function useLoginWithGoogle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: ({ idToken }) => loginWithGoogle(idToken),
    onSuccess: ({ token, user }) => {
      login(user, token);
      queryClient.setQueryData(['currentUser'], user);
      navigate('/');
    },
  });
}
