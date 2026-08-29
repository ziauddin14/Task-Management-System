import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, Users, FileText, LogOut, X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import LogoMark from './LogoMark.jsx';

// Matches Tailwind's default `md` breakpoint (768px) — the same one the CSS classes below use to
// switch the sidebar from an off-canvas mobile drawer to an always-visible desktop panel.
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

function navLinkClass({ isActive }) {
  return clsx(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-brand text-white shadow-sm' : 'text-gray-600 hover:bg-brand-light hover:text-brand'
  );
}

// Prompt 5C — persistent RIGHT-side navigation panel (moved from the left: this is an RTL app, so
// the sidebar's natural position is the reading-direction start, the right edge — see
// AppLayout.jsx's comment on why it's now the FIRST flex child, not the last). Desktop: always
// visible, part of the normal flex flow. Mobile: an overlay drawer, fixed + slid off-screen until
// `isOpen`, closed via backdrop click, the × button, or navigating to a link. `collapsed` (new,
// Prompt 5C.2) shrinks it to an icon-only rail — independent of, and orthogonal to, the mobile
// open/closed state, so it applies on both desktop and mobile as asked.
function Sidebar({ isOpen, onClose, isAdmin, onLogout, collapsed, onToggleCollapsed }) {
  const isDesktop = useIsDesktop();
  // Only actually hidden-from-assistive-tech when it's genuinely off-screen (mobile + closed) —
  // on desktop the panel is always visible, so it must never be aria-hidden there regardless of
  // the `isOpen` state (which mobile's drawer toggle owns, not desktop).
  const isHiddenFromA11yTree = !isDesktop && !isOpen;

  const links = [
    { to: '/', label: 'ڈیش بورڈ', icon: LayoutDashboard, end: true },
    ...(isAdmin ? [{ to: '/users', label: 'تمام یوزرز', icon: Users, end: false }] : []),
    ...(isAdmin ? [{ to: '/reports/user-summary', label: 'یوزر سمری رپورٹ', icon: FileText, end: false }] : []),
  ];

  return (
    <aside
      className={clsx(
        'no-print fixed inset-y-0 start-0 z-50 flex shrink-0 flex-col border-e border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        // Desktop: sticky (not static) — stays pinned to the viewport as the page scrolls, per
        // the "sidebar/navbar never scroll away" bug fix, while still an ordinary flex sibling
        // for width purposes (unlike `fixed`, which would need the content column to hand-offset
        // itself to avoid overlapping it).
        'md:sticky md:top-0 md:h-screen md:z-auto md:shadow-none md:translate-x-0',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
      aria-hidden={isHiddenFromA11yTree}
    >
      {/* Prompt 5D — the full app name now lives once, prominently, in AppLayout's own navbar
          header — repeating it here too would just be noise, so this header keeps only the logo
          mark (which doubles as a visual anchor for the collapse toggle right below it). */}
      <div className={clsx('flex h-16 items-center border-b-2 border-brand/20 bg-brand-light/50 px-3', collapsed ? 'justify-center' : 'justify-between')}>
        <LogoMark className="h-8 w-8 shrink-0" decorative={false} />
        <button
          type="button"
          onClick={onClose}
          aria-label="سائیڈبار بند کریں"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={navLinkClass}
            onClick={onClose}
            title={collapsed ? link.label : undefined}
          >
            <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? 'سائیڈبار پھیلائیں' : 'سائیڈبار سکیڑیں'}
          aria-label={collapsed ? 'سائیڈبار پھیلائیں' : 'سائیڈبار سکیڑیں'}
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-brand-light hover:text-brand"
        >
          {collapsed ? (
            <ChevronsLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronsRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {!collapsed && <span>سکیڑیں</span>}
        </button>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'لاگ آؤٹ' : undefined}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span>لاگ آؤٹ</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
