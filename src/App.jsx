// Explicit import (not relying on the automatic JSX runtime) — this React 19 + Vite 8 +
// @vitejs/plugin-react combination was observed to fail with "React is not defined" under
// Vitest without it; explicit imports work correctly under either JSX runtime mode.
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from './routes/AppRoutes.jsx';

// docs/07-frontend-foundation.md §4: server state (tasks, users, dashboard KPIs, reports) is
// owned entirely by React Query, never mixed into authStore. Full mutation/query wiring (e.g.
// toast-on-error defaults) belongs to the API Integration sub-phase, not this foundation one —
// only the sensible baseline defaults are set here.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
