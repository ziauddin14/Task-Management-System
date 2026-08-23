import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore.js';

// docs/07-frontend-foundation.md §2: "header (name, role, logout), page container." Minimal,
// functional implementation for this sub-phase — full visual polish belongs to a later,
// UI/UX-driven sub-phase. Wired around every authenticated route in routes/AppRoutes.jsx.
function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // docs/11-auth.md §5, all four steps, in order.
  function handleLogout() {
    logout(); // 1. clear authStore (token + user) — persist middleware clears localStorage too
    queryClient.clear(); // 2. wipe all cached React Query data
    if (typeof window !== 'undefined' && window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect(); // 3. guarded — not loaded in tests/some envs
    }
    navigate('/login'); // 4. redirect to /login
  }

  return (
    <div>
      <header>
        <span>{user?.name}</span>
        <span>{user?.role}</span>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
