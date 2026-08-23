// Explicit import (not relying on the automatic JSX runtime) — this React 19 + Vite 8 +
// @vitejs/plugin-react combination was observed to fail with "React is not defined" under
// Vitest without it; explicit imports work correctly under either JSX runtime mode.
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes.jsx';
import { useAuthStore } from './store/authStore.js';
import { useCurrentUser } from './hooks/useCurrentUser.js';

// docs/10-api-integration.md §2 — global defaults, set once here. Exported (in addition to the
// default App export) purely so tests can reset it between cases via queryClient.clear() — this
// is the same module-level singleton the real app uses, not a second instance.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { onError: (err) => toast.error(err.message) },
  },
});

/**
 * docs/11-auth.md §4 — session restore, run once when the app first mounts:
 * 1. authStore rehydrates synchronously from localStorage (Zustand persist middleware — no code
 *    needed here, it's inherent to how authStore.js is defined) — if no token, render straight
 *    through to the routes (ProtectedRoute sends an unauthenticated visitor to /login itself).
 * 2. If a token IS present, show a full-screen loading state and fire useCurrentUser().
 * 3. Success -> render the routes normally, proceeding into the app.
 * 4. 401 -> the existing apiClient response interceptor (Frontend Foundation §6) already clears
 *    authStore and redirects — not duplicated here. (Once it clears the token, `token` below
 *    becomes falsy too, so this gate steps out of the way on its own.)
 */
function SessionGate({ children }) {
  const token = useAuthStore((state) => state.token);
  const { isLoading } = useCurrentUser();

  if (token && isLoading) {
    return (
      <div role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  return children;
}

function AppShell() {
  return (
    <BrowserRouter>
      <SessionGate>
        <AppRoutes />
      </SessionGate>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
