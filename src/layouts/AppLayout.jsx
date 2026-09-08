import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js';
import Sidebar from '../components/common/Sidebar.jsx';
import LogoMark from '../components/common/LogoMark.jsx';
import { PageActionsPortalProvider } from '../contexts/PageActionsPortal.jsx';

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
  // Prompt — Print View/Export move out of the Dashboard page's own body and into the Navbar
  // instead, "near the existing navbar controls." AppLayout has no idea what page is mounted (and
  // shouldn't need to), so it just exposes this DOM node as a portal target; whichever page wants
  // to render controls into the Navbar (currently only DashboardPage) does so via <PageActions>.
  // A callback ref (not useRef) is used deliberately, so state — and therefore the context value
  // consumers see — only updates once the node is genuinely mounted, not left permanently null.
  const [actionsSlot, setActionsSlot] = useState(null);

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
    // Bug fix (regression from the earlier "only the table scrolls" change) — that change made
    // the outer shell h-screen/overflow-hidden with every page forced to fit exactly one viewport
    // height, which broke ordinary scrolling on content-heavy pages. Reverted to a normal
    // min-h-screen page: the page itself scrolls like any ordinary webpage, while the sidebar and
    // header stay put via `sticky` (below) instead of by constraining everything else's height.
    <div className="flex min-h-screen bg-gray-50/50">
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

      {/* min-w-0: without it, a flex item defaults to min-width:auto — meaning it refuses to
          shrink below the width of its widest descendant (a wide table). That width then
          propagates all the way up to this row, pushing the whole page wider than the viewport
          instead of letting the table's own overflow-x-auto container do the scrolling. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* sticky, not fixed: it stays pinned to the top of the viewport as the page scrolls
            without needing to be pulled out of flow and hand-measured against the sidebar's
            width — flow layout already handles that for free. */}
        <header className="no-print sticky top-0 z-30 grid h-16 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b-2 border-brand/10 bg-white px-4 shadow-sm">
          <div className="flex items-center justify-start gap-1">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="مینیو کھولیں"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-brand-light hover:text-brand md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* Prompt — Columns/Print View/Export live here now: the empty space between the
                centered logo and the Sidebar (this column was previously only ever occupied by the
                mobile menu button above, empty on desktop) — moved out of the opposite side, next
                to the user info, which had no room to spare. Zero footprint when no page has
                anything to put in it (DashboardPage.jsx is currently the only one that does). */}
            <div ref={setActionsSlot} className="flex items-center gap-1" />
          </div>

          {/* The app's own brand text, centered and large/bold, reads as the navbar's primary
              content, next to the real Dawat-e-Islami logo (LogoMark.jsx). */}
          <div className="flex min-w-0 items-center justify-center gap-2">
            <LogoMark className="h-8 w-8 shrink-0 md:h-9 md:w-9" />
            <span className="truncate text-lg font-extrabold text-brand md:text-2xl">ٹاسک مینجمنٹ سسٹم</span>
          </div>

          <div className="flex items-center justify-end gap-1">
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

        <main className="min-w-0 flex-1 p-4 md:p-6">
          <PageActionsPortalProvider target={actionsSlot}>
            <Outlet />
          </PageActionsPortalProvider>
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
