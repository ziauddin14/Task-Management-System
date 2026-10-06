import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { useUnreadNotificationCount } from '../hooks/useUnreadNotificationCount.js';
import Sidebar from '../components/common/Sidebar.jsx';
import LogoMark from '../components/common/LogoMark.jsx';
import NotificationBell from '../components/common/NotificationBell.jsx';
import NotificationDrawer from '../components/common/NotificationDrawer.jsx';
import MobileAppBar from '../components/mobile/MobileAppBar.jsx';
import BottomTabBar from '../components/mobile/BottomTabBar.jsx';
import MoreSheet from '../components/mobile/MoreSheet.jsx';
import { PageActionsPortalProvider } from '../contexts/PageActionsPortal.jsx';
import { PageActionsDismissContext } from '../contexts/PageActionsDismissContext.js';

const APP_NAME = 'ٹاسک مینجمنٹ سسٹم';

// "منگل، 6 اکتوبر 2026" — today's date in Urdu, with Latin digits like every other date in the
// app. Empty where the browser cannot format it, in which case the navbar just shows nothing there.
function formatToday() {
  try {
    return new Intl.DateTimeFormat('ur-PK-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  } catch {
    return '';
  }
}
// What the mobile app bar shows per screen. Every screen not named here has a heading of its own
// in the page body, so the bar keeps the app's name there.
const MOBILE_TITLES = { '/tasks': 'ٹاسک' };

// The mobile layout (< 768px): a green app bar, the page, and a fixed bottom tab bar. The bell and
// the "اطلاعات" tab open the one notification drawer; the menu button and the "مزید" tab open the
// one "مزید" sheet, which also carries the current page's own actions (its `pageActionsRef` is the
// same portal target the desktop header exposes). The page is given room at its end for the tab
// bar, so nothing it renders can sit hidden behind it.
function MobileLayout({ user, isAdmin, onLogout, pathname }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const closeMore = useCallback(() => setIsMoreOpen(false), []);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [actionsSlot, setActionsSlot] = useState(null);
  const unreadCount = useUnreadNotificationCount().data?.count ?? 0;

  // A route change closes the menu (its links close it themselves; this covers back/forward).
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-tk-page text-tk-ink">
      <MobileAppBar
        title={MOBILE_TITLES[pathname] || APP_NAME}
        userName={user?.name}
        unreadCount={unreadCount}
        isMenuOpen={isMoreOpen}
        onOpenMenu={() => setIsMoreOpen(true)}
        isNotificationsOpen={isNotificationsOpen}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      <main
        className="min-w-0 flex-1 px-tk-page pt-[14px]"
        style={{ paddingBottom: 'calc(var(--tk-tabbar-h) + env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <PageActionsPortalProvider target={actionsSlot}>
          <PageActionsDismissContext.Provider value={closeMore}>
            <Outlet />
          </PageActionsDismissContext.Provider>
        </PageActionsPortalProvider>
      </main>

      <BottomTabBar
        isAdmin={isAdmin}
        unreadCount={unreadCount}
        isNotificationsOpen={isNotificationsOpen}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        isMoreOpen={isMoreOpen}
        onOpenMore={() => setIsMoreOpen(true)}
      />

      <MoreSheet
        isOpen={isMoreOpen}
        onClose={closeMore}
        user={user}
        isAdmin={isAdmin}
        onLogout={onLogout}
        pageActionsRef={setActionsSlot}
      />

      <NotificationDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
}

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
  const isMobile = useIsMobile();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
  // Prompt — Print View/Export move out of the Dashboard page's own body and into the Navbar
  // instead, "near the existing navbar controls." AppLayout has no idea what page is mounted (and
  // shouldn't need to), so it just exposes this DOM node as a portal target; whichever page wants
  // to render controls into the Navbar (currently only DashboardPage) does so via <PageActions>.
  // A callback ref (not useRef) is used deliberately, so state — and therefore the context value
  // consumers see — only updates once the node is genuinely mounted, not left permanently null.
  const [actionsSlot, setActionsSlot] = useState(null);
  const today = useMemo(formatToday, []);

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

  if (isMobile) {
    return <MobileLayout user={user} isAdmin={isAdmin} onLogout={handleLogout} pathname={location.pathname} />;
  }

  return (
    // Bug fix (regression from the earlier "only the table scrolls" change) — that change made
    // the outer shell h-screen/overflow-hidden with every page forced to fit exactly one viewport
    // height, which broke ordinary scrolling on content-heavy pages. Reverted to a normal
    // min-h-screen page: the page itself scrolls like any ordinary webpage, while the sidebar and
    // header stay put via `sticky` (below) instead of by constraining everything else's height.
    <div className="flex min-h-screen bg-tk-surface">
      {/* Sidebar is the FIRST child of this row: in this RTL app a plain flex row's first child
          lands at the visual/physical RIGHT edge, which is the sidebar's home. */}
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
        {/* The navbar: white, 84px, sticky. Three columns so the logo and the app's name stay
            centred whatever the two sides hold — start side: the page's own actions ("ایکشن") and
            today's date; end side: who is signed in, the bell, their initial. */}
        <header className="no-print sticky top-0 z-30 grid h-tk-navbar shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 bg-white px-4 shadow-[0_1px_0_var(--tk-line)] lg:px-7">
          <div className="flex min-w-0 items-center justify-start gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="مینیو کھولیں"
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-tk-input text-tk-green-900 hover:bg-tk-hover md:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            {/* Whatever the current page puts in the navbar (contexts/PageActionsPortal.jsx) —
                today the dashboard's "ایکشن" menu. Zero footprint when a page has nothing. */}
            <div ref={setActionsSlot} className="flex shrink-0 items-center gap-1" />
            {today && <span className="hidden truncate text-[13px] leading-tk-label text-tk-muted xl:block">{today}</span>}
          </div>

          {/* The real Dawat-e-Islami logo (LogoMark.jsx) and the app's name: the navbar's primary
              content, centred. */}
          <div className="flex min-w-0 items-center justify-center gap-3">
            <LogoMark className="h-[46px] w-[46px] shrink-0 lg:h-[58px] lg:w-[58px]" />
            <span className="truncate text-[22px] font-semibold leading-tk-label text-tk-green-700 lg:text-[28px]">{APP_NAME}</span>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-3">
            <div className="hidden min-w-0 lg:block">
              <span className="block truncate text-[13px] leading-tk-label text-tk-ink-soft">
                {user?.name}
                {user?.responsibility && <> ({user.responsibility})</>}
              </span>
            </div>
            <NotificationBell />
            {user?.name && (
              <span
                aria-hidden="true"
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-tk-green-900 text-[18px] font-semibold text-white"
              >
                {user.name.trim().charAt(0)}
              </span>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-10 pt-5 md:px-6 lg:px-8">
          {/* On screens of 1600px and wider the page content is capped (about 1320px) and centred,
              so cards and tables do not stretch across an ultrawide monitor; the navbar and the
              sidebar still span the full window. Below that it uses the width there is. */}
          <div data-page-container className="mx-auto w-full min-[1600px]:max-w-tk-content">
            <PageActionsPortalProvider target={actionsSlot}>
              <div key={location.pathname} className="tk-fade-in">
                <Outlet />
              </div>
            </PageActionsPortalProvider>
          </div>
        </main>
      </div>

      {/* Drawer backdrop, closes the drawer on tap. */}
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
