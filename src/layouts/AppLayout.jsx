import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import Sidebar from '../components/common/Sidebar.jsx';

// docs/08-ui-ux.md §3 item 1 — persistent left-side navigation (Sidebar.jsx) + a top header bar
// showing the logged-in user's name + responsibility directly (not hidden in a dropdown) and a
// logout action. Logout lives at the bottom of the sidebar now, not in a header dropdown — see
// Sidebar.jsx.
function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close the mobile drawer on every route change (also triggered by Sidebar's own NavLink
  // onClick, but this covers back/forward navigation and any other route change too).
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // docs/11-auth.md §5, all four steps, in order.
  function handleLogout() {
    logout();
    queryClient.clear();
    if (typeof window !== 'undefined' && window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect();
    }
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="no-print flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Menu kholein"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="text-end leading-tight">
            <span className="text-sm font-medium text-gray-900">
              {user?.name}
              {user?.responsibility && <> ({user.responsibility})</>}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile-only backdrop, closes the drawer on tap. */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Band karein"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default AppLayout;
