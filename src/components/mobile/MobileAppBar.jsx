import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Bell, Menu } from 'lucide-react';

const ICON_BUTTON_CLASS =
  'relative flex h-tk-touch w-tk-touch shrink-0 items-center justify-center rounded-tk-chip text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

// The mobile layout's top bar: menu button, the screen's title, the bell and the user's initial.
// One flex row in which only the title gives way (it shrinks, then truncates) — the buttons keep
// their full 44px, so at 320px the title can no longer run under the bell as it did in the old
// three-column header.
function MobileAppBar({ title, userName, unreadCount = 0, isMenuOpen, onOpenMenu, isNotificationsOpen, onOpenNotifications }) {
  const initial = userName?.trim().charAt(0);

  return (
    <header className="no-print sticky top-0 z-30 flex h-tk-appbar shrink-0 items-center gap-[6px] bg-tk-green-900 px-[10px] text-white min-[360px]:gap-[10px] min-[360px]:px-[14px]">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="مینو"
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
        className={ICON_BUTTON_CLASS}
      >
        <Menu className="h-[24px] w-[24px]" aria-hidden="true" />
      </button>

      <p className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-tk-label min-[360px]:text-[17px]">{title}</p>

      <button
        type="button"
        onClick={onOpenNotifications}
        aria-label={unreadCount > 0 ? `اطلاعات، ${unreadCount} نہ پڑھی گئی` : 'اطلاعات'}
        aria-haspopup="dialog"
        aria-expanded={isNotificationsOpen}
        className={ICON_BUTTON_CLASS}
      >
        <Bell className="h-[24px] w-[24px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-unread-dot
            aria-hidden="true"
            className="absolute left-[9px] top-[8px] h-[10px] w-[10px] rounded-full border-2 border-tk-green-900 bg-tk-bell-dot"
          />
        )}
      </button>

      {initial && (
        <span
          aria-hidden="true"
          className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-tk-green-50 text-[15px] font-semibold text-tk-green-900"
        >
          {initial}
        </span>
      )}
    </header>
  );
}

export default MobileAppBar;
