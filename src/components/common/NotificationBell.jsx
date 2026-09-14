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
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-brand-light hover:text-brand"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute end-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white"
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
