import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, Settings, Users, FileText, LogOut, X, Menu, ChevronRight } from 'lucide-react';

// Matches Tailwind's default `md` breakpoint (768px) — the same one the CSS classes below use to
// switch the sidebar from an off-canvas drawer to an always-visible desktop panel.
const DESKTOP_QUERY = '(min-width: 768px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_QUERY)?.matches) || false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(DESKTOP_QUERY);
    // Belt-and-suspenders: mql's own 'change' event is the standard way to react to this, but a
    // plain window 'resize' listener re-reading mql.matches is kept alongside it, since some
    // viewport-emulation tools resize the layout without firing matchMedia's change event.
    function recompute() {
      setIsDesktop(mql.matches);
    }
    mql.addEventListener('change', recompute);
    window.addEventListener('resize', recompute);
    return () => {
      mql.removeEventListener('change', recompute);
      window.removeEventListener('resize', recompute);
    };
  }, []);

  return isDesktop;
}

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const ITEM_BASE = `flex shrink-0 items-center rounded-tk-tile text-[15px] leading-tk-label transition-colors ${FOCUS_RING}`;
// Collapsed: a 52px icon square, its name shown as a tooltip. Expanded: icon + label, 50px tall.
const ITEM_COLLAPSED = 'tk-tooltip h-[52px] w-[52px] justify-center';
const ITEM_EXPANDED = 'h-[50px] w-full gap-3 px-[14px]';
const ITEM_IDLE = 'text-tk-sidebar-ink hover:bg-white/[0.12]';

// Persistent RIGHT-side navigation (this is an RTL app, so the reading-direction start is the
// right edge — see AppLayout.jsx's comment on why it is the FIRST flex child).
//
// Desktop redesign — a dark green rail. `collapsed` (the default, hooks/useSidebarCollapsed.js) is
// 84px of icons only: each link shows its name as a tooltip on hover and on keyboard focus, and is
// named for a screen reader by aria-label. Expanded is 236px, icon + label. The button at the top
// switches between the two (a menu icon to expand, a chevron to collapse); the width change is a
// 200ms transition and the page beside it simply follows. The current page's link is a light pill.
// Logout sits at the bottom. The links and their role rules are exactly what they were.
//
// Below 768px the app uses its own mobile layout (AppLayout.jsx → MobileLayout); the off-canvas
// drawer behaviour kept here (`isOpen`, the × button) only ever shows where that layout is not in
// use.
function Sidebar({ isOpen, onClose, isAdmin, onLogout, collapsed, onToggleCollapsed }) {
  const isDesktop = useIsDesktop();
  // Only actually hidden-from-assistive-tech when it's genuinely off-screen (drawer + closed) —
  // on desktop the panel is always visible, so it must never be aria-hidden there.
  const isHiddenFromA11yTree = !isDesktop && !isOpen;

  const links = [
    { to: '/', label: 'ڈیش بورڈ', icon: LayoutDashboard, end: true },
    // Web Push addition — personal, available to every user, not just Admins.
    { to: '/settings', label: 'ترتیبات', icon: Settings, end: false },
    ...(isAdmin ? [{ to: '/users', label: 'تمام یوزرز', icon: Users, end: false }] : []),
    ...(isAdmin ? [{ to: '/reports/user-summary', label: 'یوزر سمری رپورٹ', icon: FileText, end: false }] : []),
  ];

  return (
    <aside
      className={clsx(
        'no-print fixed inset-y-0 start-0 z-50 flex shrink-0 flex-col bg-tk-sidebar py-4 text-white shadow-lg transition-[width,transform] duration-200 ease-in-out motion-reduce:transition-none',
        collapsed ? 'w-tk-rail items-center px-0' : 'w-tk-rail-open px-[14px]',
        // The tooltips are drawn outside the rail, over the page beside it. The rail is its own
        // stacking layer (it is sticky) and comes first in the page, so on its own everything
        // after it — the navbar, the page's cards — is painted over them. While the pointer or
        // the keyboard focus is in the collapsed rail it is lifted above both; the rest of the
        // time it keeps its place, under the notification drawer's backdrop and the dialogs.
        collapsed && 'md:hover:z-40 md:focus-within:z-40',
        // Desktop: sticky (not static) — stays pinned to the viewport as the page scrolls, while
        // still an ordinary flex sibling for width purposes.
        'md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:shadow-none',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
      aria-hidden={isHiddenFromA11yTree}
    >
      <div className={clsx('flex shrink-0 items-center', collapsed ? 'flex-col gap-1' : 'justify-between border-b border-white/[0.14] px-1 pb-[14px]')}>
        {!collapsed && (
          <span aria-hidden="true" className="text-[14px] leading-tk-label text-tk-sidebar-muted">
            مینو
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'سائیڈبار پھیلائیں' : 'سائیڈبار سکیڑیں'}
            aria-expanded={!collapsed}
            data-tooltip={collapsed ? 'سائیڈبار پھیلائیں' : undefined}
            className={clsx(
              'flex shrink-0 items-center justify-center text-tk-sidebar-ink transition-colors hover:bg-white/[0.12]',
              FOCUS_RING,
              collapsed ? 'tk-tooltip h-[48px] w-[48px] rounded-tk-input' : 'h-[40px] w-[40px] rounded-tk-chip bg-white/10 text-white'
            )}
          >
            {collapsed ? <Menu className="h-6 w-6" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="سائیڈبار بند کریں"
            className={clsx('flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tk-chip text-tk-sidebar-ink hover:bg-white/[0.12] md:hidden', FOCUS_RING)}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Collapsed: nothing may clip the tooltips, which are drawn outside the rail. */}
      <nav
        className={clsx('flex flex-1 flex-col pt-[14px]', collapsed ? 'items-center gap-2 overflow-visible' : 'gap-[6px] overflow-y-auto')}
        aria-label="Main navigation"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onClose}
            aria-label={collapsed ? link.label : undefined}
            data-tooltip={collapsed ? link.label : undefined}
            className={({ isActive }) =>
              clsx(ITEM_BASE, collapsed ? ITEM_COLLAPSED : ITEM_EXPANDED, isActive ? 'bg-tk-green-50 font-semibold text-tk-sidebar' : ITEM_IDLE)
            }
          >
            <link.icon className={clsx('shrink-0', collapsed ? 'h-[23px] w-[23px]' : 'h-[21px] w-[21px]')} aria-hidden="true" />
            {!collapsed && <span className="truncate">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        aria-label={collapsed ? 'لاگ آؤٹ' : undefined}
        data-tooltip={collapsed ? 'لاگ آؤٹ' : undefined}
        className={clsx(ITEM_BASE, 'text-[14px] text-tk-sidebar-danger hover:bg-white/[0.12]', collapsed ? ITEM_COLLAPSED : 'h-[48px] w-full gap-3 px-[14px]')}
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!collapsed && <span>لاگ آؤٹ</span>}
      </button>
    </aside>
  );
}

export default Sidebar;
