import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Bell } from 'lucide-react';
import NotificationDrawer from './NotificationDrawer.jsx';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount.js';

// Locked blueprint §Frontend Architecture — mounted in AppLayout.jsx's header, next to the
// existing user-info block. Owns the drawer's open/closed state itself (mirroring how
// AppLayout owns Sidebar's — but self-contained here, so wiring this feature into the header
// only needs one new mount line, not new state/handlers threaded through AppLayout itself).
function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCountQuery = useUnreadNotificationCount();
  const count = unreadCountQuery.data?.count ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={count > 0 ? `اطلاعات، ${count} نہ پڑھی گئی` : 'اطلاعات'}
        aria-expanded={isOpen}
        className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-tk-input bg-tk-hover text-tk-green-900 transition-colors hover:bg-tk-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
      >
        <Bell className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute end-[4px] top-[4px] flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-tk-hover bg-tk-badge px-[3px] text-[10px] font-bold leading-none text-white"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <NotificationDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default NotificationBell;
