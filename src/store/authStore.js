import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// docs/07-frontend-foundation.md §4: the ONLY client-side global state — { user, token,
// isAuthenticated } + login()/logout(). Everything else (tasks, users, dashboard KPIs, reports)
// is server state owned by React Query, never mixed into this store. Persisted to localStorage
// via Zustand's own persist middleware so a page refresh doesn't force a fresh sign-in.
//
// Phase 10.1 scope note: login()/logout() are plain state setters here, exercised only by tests
// with fake data. Wiring login() to a real Google Sign-In flow, and restoring/verifying the
// persisted session against GET /auth/me on app load, is Phase 10.2's job — not reimplemented or
// anticipated here.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
