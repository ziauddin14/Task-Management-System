import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';

// docs/08-ui-ux.md §3 item 1 — app name (small), the logged-in user's name + role/responsibility
// (right side — the visually-leading edge in RTL), a logout icon/button. Wired around every
// authenticated route in routes/AppRoutes.jsx.
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
    <div className="flex min-h-screen flex-col">
      <header className="no-print flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-start leading-tight">
            <div className="text-sm font-medium text-gray-900">
              <span>{user?.name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {user?.responsibility && <span>{user.responsibility}</span>}
              <span>{user?.role}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            لاگ آؤٹ
          </button>
        </div>
        <span className="text-sm font-semibold text-brand">ٹاسک مینیجمینٹ سسٹم</span>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
