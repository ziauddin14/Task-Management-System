import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js';
import Sidebar from '../components/common/Sidebar.jsx';
import LogoMark from '../components/common/LogoMark.jsx';

// docs/08-ui-ux.md §3 item 1 — right-side navigation (Sidebar.jsx, Prompt 5C — RTL's natural
// position, moved from the left) + a top header bar showing the app's own branding centered
// (Prompt 5D) and the logged-in user's name + responsibility directly (not hidden in a dropdown).
// Logout lives at the bottom of the sidebar, not in a header dropdown — see Sidebar.jsx.
function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

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
    // Prompt 5E — h-screen + overflow-hidden on the outer shell (rather than the old min-h-screen,
    // which let the whole page grow past the viewport and scroll) is what makes "only the table
    // scrolls" possible: every descendant below now has a definite, bounded height to fill instead
    // of an unbounded one, down to DashboardPage's own flex-1 table region.
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {/* Prompt 5C — Sidebar is the FIRST child of this row: in this RTL app a plain flex row's
          first child lands at the visual/physical RIGHT edge, which is the sidebar's new home
          (it was the LAST child before, which is what put it on the left). */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="no-print grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b-2 border-brand/10 bg-white px-4 shadow-sm">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="مینیو کھولیں"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-brand-light hover:text-brand md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Prompt 5D — the app's own brand text, centered and large/bold, reads as the
              navbar's primary content (previously this line only lived, much smaller, in the
              sidebar's own header) + a simple placeholder logo mark next to it. */}
          <div className="flex min-w-0 items-center justify-center gap-2">
            <LogoMark className="h-8 w-8 shrink-0 md:h-9 md:w-9" />
            <span className="truncate text-lg font-extrabold text-brand md:text-2xl">ٹاسک مینجمنٹ سسٹم</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden text-end leading-tight sm:block">
              <span className="text-sm font-medium text-gray-900">
                {user?.name}
                {user?.responsibility && <> ({user.responsibility})</>}
              </span>
            </div>
            {user?.name && (
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
              >
                {user.name.trim().charAt(0)}
              </span>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile-only backdrop, closes the drawer on tap. */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="بند کریں"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}
    </div>
  );
}

export default AppLayout;
