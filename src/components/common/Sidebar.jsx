import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, Users, FileText, LogOut, X } from 'lucide-react';

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
    isActive ? 'bg-brand/10 text-brand' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  );
}

// Persistent left-side navigation panel (see AppLayout.jsx). Desktop: always visible, part of the
// normal flex flow (a plain flex sibling placed last in AppLayout's row so it lands on the
// physical left in this RTL app). Mobile: an overlay drawer, fixed + slid off-screen until
// `isOpen`, closed via backdrop click, the × button, or navigating to a link.
function Sidebar({ isOpen, onClose, isAdmin, onLogout }) {
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
        'no-print fixed inset-y-0 end-0 z-50 flex w-64 shrink-0 flex-col border-s border-gray-200 bg-white shadow-lg transition-transform duration-200 ease-in-out',
        'md:static md:z-auto md:shadow-none md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      aria-hidden={isHiddenFromA11yTree}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <span className="text-base font-bold text-brand">ٹاسک مینجمنٹ سسٹم</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sidebar band karein"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 md:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Main navigation">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass} onClick={onClose}>
            <link.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>لاگ آؤٹ</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
