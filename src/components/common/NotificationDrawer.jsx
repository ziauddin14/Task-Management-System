import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import Spinner from './Spinner.jsx';
import EmptyState from './EmptyState.jsx';
import NotificationItem from './NotificationItem.jsx';
import { useNotifications } from '../../hooks/useNotifications.js';
import { useMarkNotificationRead } from '../../hooks/useMarkNotificationRead.js';
import { useMarkAllNotificationsRead } from '../../hooks/useMarkAllNotificationsRead.js';

const PAGE_SIZE = 20;

// Locked blueprint §Notification UX / §Frontend Architecture — the off-canvas panel, built on the
// exact same mechanics as the existing Sidebar.jsx drawer (fixed + translate-x toggle + backdrop),
// but mirrored to the OPPOSITE edge: Sidebar sits at the RTL reading-direction start (the right
// edge), so this secondary panel sits at `end-0` (the visual left) — reading naturally as a
// distinct panel, not a second primary-nav surface. Unlike Sidebar, this is ALWAYS an overlay
// (never a persistent desktop panel), so there's no md:-prefixed "always visible" variant.
//
// RTL translate direction note (easy to get backwards): CSS transforms are NOT flipped by
// dir="rtl" — only logical properties (start/end) are. Sidebar sits at `start-0` (right edge) and
// hides via `translate-x-full` (positive = further right = off-screen, correct for a
// right-positioned panel). This drawer sits at `end-0` (LEFT edge), so hiding it off-screen needs
// the opposite sign — `-translate-x-full` (negative = further left = off-screen). Using
// `translate-x-full` here would push it further RIGHT, i.e. INTO the viewport — the opposite of
// hidden.
function NotificationDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const notificationsQuery = useNotifications({ page, limit: PAGE_SIZE }, { enabled: isOpen });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Fresh list every time the drawer is (re)opened — matches "Drawer opening should fetch the
  // notification list" rather than reusing a possibly-stale accumulated list from a prior open.
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setItems([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!notificationsQuery.data) return;
    setItems((prev) => (page === 1 ? notificationsQuery.data.items : [...prev, ...notificationsQuery.data.items]));
  }, [notificationsQuery.data, page]);

  const hasMore = notificationsQuery.data?.meta ? page < notificationsQuery.data.meta.totalPages : false;
  const isInitialLoading = notificationsQuery.isLoading && page === 1;

  // Mark-read always happens. Navigation is intentionally minimal for Phase 1 (no task-detail
  // page/route exists, and nothing yet populates metadata.taskCodeNumber — see the locked
  // blueprint's own §Task notification click resolution): if a future Phase 2/3 notification
  // carries that metadata field, this already knows how to use it; until then it's simply absent
  // and only the mark-read + close happens, which is the whole of what Phase 1 requires.
  function handleItemClick(notification) {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    const codeNumber = notification.metadata?.taskCodeNumber;
    if (notification.taskId && codeNumber) {
      navigate(`/?search=${encodeURIComponent(codeNumber)}`);
    }
    onClose();
  }

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <>
      {/* A plain div with role="dialog" (matching Modal.jsx's own overlay convention), not
          <aside> — this is a transient overlay panel, not a second persistent landmark alongside
          Sidebar.jsx's own <aside role="complementary">; sharing that role would make the two
          indistinguishable to assistive tech (and to a11y-role queries) despite being different
          things. */}
      <div
        role="dialog"
        className={
          'fixed inset-y-0 end-0 z-50 flex w-full max-w-sm flex-col border-s border-gray-200 bg-white shadow-lg transition-transform duration-200 ease-in-out sm:max-w-md ' +
          (isOpen ? 'translate-x-0' : '-translate-x-full')
        }
        aria-hidden={!isOpen}
        aria-label="اطلاعات"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b-2 border-brand/20 bg-brand-light/50 px-4">
          <h2 className="text-lg font-bold text-gray-900">اطلاعات</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="اطلاعات بند کریں"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {hasUnread && (
          <div className="shrink-0 border-b border-gray-100 px-4 py-2">
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="h-10 text-sm font-medium text-brand hover:underline disabled:opacity-50"
            >
              سب کو پڑھا ہوا نشان زد کریں
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {isInitialLoading && <Spinner label="اطلاعات لوڈ ہو رہی ہیں…" />}

          {!isInitialLoading && notificationsQuery.isError && (
            <EmptyState message="اطلاعات لوڈ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔" />
          )}

          {!isInitialLoading && !notificationsQuery.isError && items.length === 0 && (
            <EmptyState message="کوئی اطلاع موجود نہیں۔" />
          )}

          {items.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {items.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onClick={handleItemClick} />
              ))}
            </ul>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={notificationsQuery.isFetching}
              className="mt-2 h-10 w-full rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              مزید دیکھیں
            </button>
          )}
        </div>
      </div>

      {/* Overlay backdrop — shown at every viewport width (unlike Sidebar's mobile-only backdrop,
          this drawer is never a persistent desktop panel, so it always needs one when open). */}
      {isOpen && (
        <button
          type="button"
          aria-label="اطلاعات بند کریں"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}
    </>
  );
}

export default NotificationDrawer;
