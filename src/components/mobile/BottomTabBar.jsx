import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { FILTER_SHARING_PATHS, MORE_PATHS, tabsForRole } from '../../utils/mobileTabs.js';

const TAB_CLASS =
  'flex h-full w-full min-w-0 flex-col items-center justify-center rounded-tk-chip focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tk-green-700';

function TabContent({ tab, active, badge }) {
  const Icon = tab.icon;
  return (
    <>
      <span className={clsx('relative flex h-[30px] w-[56px] items-center justify-center rounded-tk-pill', active && 'bg-tk-green-100')}>
        <Icon className={active ? 'h-[20px] w-[20px]' : 'h-[22px] w-[22px]'} strokeWidth={active ? 2 : 1.8} aria-hidden="true" />
        {badge > 0 && (
          <span
            data-tab-badge
            aria-hidden="true"
            className="absolute left-[8px] top-[-3px] flex h-[18px] min-w-[18px] items-center justify-center rounded-tk-pill bg-tk-badge px-[4px] text-[12px] font-semibold leading-none text-white"
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className={clsx('max-w-full truncate text-[12px] leading-tk-label', active && 'font-semibold')}>{tab.label}</span>
    </>
  );
}

// One equal column per tab: a normal user has four tabs, an Admin five. Written out in full so
// Tailwind's scanner sees both classes.
const GRID_COLUMNS_CLASS = { 4: 'grid-cols-4', 5: 'grid-cols-5' };

// Fixed to the bottom edge, 76px tall plus the phone's home-indicator inset. Whatever renders
// above it must leave that much room at the end of the page (layouts/AppLayout.jsx does).
function BottomTabBar({ isAdmin, unreadCount = 0, isNotificationsOpen, onOpenNotifications, isMoreOpen, onOpenMore }) {
  const location = useLocation();
  const tabs = tabsForRole(isAdmin);
  const sharesFilters = FILTER_SHARING_PATHS.includes(location.pathname);

  return (
    <nav
      aria-label="مرکزی نیویگیشن"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-tk-line bg-tk-card pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className={clsx('grid h-tk-tabbar items-stretch px-[4px] py-[6px]', GRID_COLUMNS_CLASS[tabs.length])}>
        {tabs.map((tab) => {
          if (tab.to) {
            const active = location.pathname === tab.to;
            const keepsQuery = sharesFilters && FILTER_SHARING_PATHS.includes(tab.to);
            return (
              <li key={tab.key} className="min-w-0">
                <Link
                  to={{ pathname: tab.to, search: keepsQuery ? location.search : '' }}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(TAB_CLASS, active ? 'text-tk-green-900' : 'text-tk-muted')}
                >
                  <TabContent tab={tab} active={active} />
                </Link>
              </li>
            );
          }

          if (tab.key === 'notifications') {
            return (
              <li key={tab.key} className="min-w-0">
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  aria-haspopup="dialog"
                  aria-expanded={isNotificationsOpen}
                  aria-label={unreadCount > 0 ? `اطلاعات، ${unreadCount} نہ پڑھی گئی` : 'اطلاعات'}
                  className={clsx(TAB_CLASS, 'text-tk-muted')}
                >
                  <TabContent tab={tab} active={false} badge={unreadCount} />
                </button>
              </li>
            );
          }

          // "مزید" is the current tab while one of the screens behind it is showing.
          const active = MORE_PATHS.includes(location.pathname);
          return (
            <li key={tab.key} className="min-w-0">
              <button
                type="button"
                onClick={onOpenMore}
                aria-haspopup="dialog"
                aria-expanded={isMoreOpen}
                aria-current={active ? 'page' : undefined}
                className={clsx(TAB_CLASS, active ? 'text-tk-green-900' : 'text-tk-muted')}
              >
                <TabContent tab={tab} active={active} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomTabBar;
