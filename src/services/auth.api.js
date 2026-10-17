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

// POST /auth/logout — only tells the server the person signed out (for the Admin's activity log);
// the session ends on this device whatever happens to it. Fire-and-forget: never awaited, never
// throws, never delays or blocks the logout. The token is passed in because the caller clears the
// store straight after calling this, before the request interceptor would read it.
// `skipSessionRedirect`: a 401 here (an already expired session) must not send the browser to
// /login a second time — the logout is already taking the person there.
export function notifyLogout(token) {
  if (!token) return;
  try {
    apiClient
      .post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` }, skipSessionRedirect: true })
      .catch(() => {});
  } catch {
    // Never let the logout itself fail.
  }
}
