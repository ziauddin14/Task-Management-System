import apiClient from './apiClient.js';

// docs/10-api-integration.md §1 — raw axios calls only, no React Query here. Components never
// import this directly — always through hooks/useLoginWithGoogle.js / hooks/useCurrentUser.js.

// docs/05-apis.md §2 — POST /auth/google. Returns { token, user }.
export async function loginWithGoogle(idToken) {
  const response = await apiClient.post('/auth/google', { idToken });
  return response.data.data;
}

// docs/05-apis.md §2 — GET /auth/me. Returns the current user's profile.
export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data.data;
}
