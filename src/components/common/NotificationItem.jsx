import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import BusyRegion from './BusyRegion.jsx';
import AcknowledgeButton, { ReceiptDoneChip } from '../task/AcknowledgeButton.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import { getNotificationIcon } from '../../utils/notificationTypes.js';

// Locked blueprint §Notification UX — unread: start-side accent dot + a subtle brand-light
// background tint (the same bg-brand-light token already used for active nav items/KPI cards, no
// new color introduced). Read: plain default row styling. Message clamps to 2 lines so a long
// custom admin message never blows out the drawer's height — full text isn't needed in Phase 1
// (there's no per-notification detail view, matching "don't invent behavior beyond what's
// required").
//
// Task receipt — an assignment notice or a receipt reminder carries `receipt`, the CURRENT state of
// the recipient's own receipt (backend notification.controller.js). While it can still be
// confirmed, the row gets a "وصول کر لیا" button beside the notification; once confirmed, "✓ وصول
// شدہ" in its place. The button is a SIBLING of the row's own button, never inside it. Every other
// notification (and one from a backend without receipts) renders exactly as before.
function NotificationContent({ notification, isUnread, Icon }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', isUnread ? 'bg-brand' : 'bg-transparent')}
      />
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={clsx('block text-sm', isUnread ? 'font-semibold text-gray-900' : 'font-normal text-gray-700')}>
          {notification.title}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-gray-600">{notification.message}</span>
        <span className="mt-1 block text-xs text-gray-400">{formatDateTime(notification.createdAt)}</span>
      </span>
    </>
  );
}

function NotificationItem({ notification, onClick }) {
  const Icon = getNotificationIcon(notification.type);
  const isUnread = !notification.isRead;
  const receipt = notification.receipt;
  const showReceipt = Boolean(notification.taskId && receipt && (receipt.canAcknowledge || receipt.acknowledgedAt));

  if (!showReceipt) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onClick(notification)}
          className={clsx(
            'flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-gray-50',
            isUnread && 'bg-brand-light/50'
          )}
        >
          <NotificationContent notification={notification} isUnread={isUnread} Icon={Icon} />
        </button>
      </li>
    );
  }

  return (
    <li data-receipt-notification>
      <BusyRegion lineClassName="px-3 pb-2">
        <div className={clsx('flex items-center gap-1 rounded-lg', isUnread && 'bg-brand-light/50')}>
          <button
            type="button"
            onClick={() => onClick(notification)}
            className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-3 py-2.5 text-start transition-colors hover:bg-gray-50"
          >
            <NotificationContent notification={notification} isUnread={isUnread} Icon={Icon} />
          </button>
          <div className="shrink-0 pe-2">
            {receipt.acknowledgedAt ? (
              <ReceiptDoneChip />
            ) : (
              <AcknowledgeButton taskId={String(notification.taskId)} ownRegion={false} />
            )}
          </div>
        </div>
      </BusyRegion>
    </li>
  );
}

export default NotificationItem;
