import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { LogOut, Settings, Users } from 'lucide-react';
import BottomSheet from './BottomSheet.jsx';

const ROW_CLASS =
  'flex min-h-[48px] w-full items-center gap-tk-gap rounded-tk-chip px-[10px] text-start text-[15px] leading-tk-label focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700';

function navRowClass({ isActive }) {
  return clsx(ROW_CLASS, isActive ? 'bg-tk-green-50 font-semibold text-tk-green-900' : 'text-tk-ink hover:bg-tk-green-50');
}

// The "مزید" menu — the mobile layout's replacement for the old slide-in drawer. It holds what the
// bottom tabs do not: who is signed in, the settings page, the users page (Admin), logout, and —
// in `pageActionsRef` — whatever actions the current page offers that have no place on a phone
// screen of their own (the dashboard's export and the Admin's reminder/notification buttons). That
// slot is the same portal target the desktop header exposes (contexts/PageActionsPortal.jsx); a
// page with nothing to put there leaves it empty and it takes no space.
function MoreSheet({ isOpen, onClose, user, isAdmin, onLogout, pageActionsRef }) {
  const initial = user?.name?.trim().charAt(0);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="مزید">
      <div className="flex flex-col gap-tk-gap">
        {user?.name && (
          <div className="flex items-center gap-tk-gap rounded-tk-tile bg-tk-page px-tk-card py-[10px]">
            <span
              aria-hidden="true"
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-tk-green-700 text-[17px] font-semibold text-white"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-semibold leading-tk-label">{user.name}</p>
              {user.responsibility && <p className="truncate text-[13px] leading-tk-label text-tk-muted">{user.responsibility}</p>}
            </div>
          </div>
        )}

        <div ref={pageActionsRef} data-page-actions className="flex flex-col gap-[2px] border-b border-tk-line pb-tk-gap empty:hidden" />

        <nav aria-label="مزید صفحات" className="flex flex-col gap-[2px]">
          <NavLink to="/settings" className={navRowClass} onClick={onClose}>
            <Settings className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />
            ترتیبات
          </NavLink>
          {isAdmin && (
            <NavLink to="/users" className={navRowClass} onClick={onClose}>
              <Users className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />
              تمام یوزرز
            </NavLink>
          )}
        </nav>

        <div className="border-t border-tk-line pt-tk-gap">
          <button type="button" onClick={onLogout} className={clsx(ROW_CLASS, 'font-semibold text-tk-danger hover:bg-tk-danger-bg')}>
            <LogOut className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />
            لاگ آؤٹ
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

export default MoreSheet;
