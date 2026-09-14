import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useAdminNotificationHistory } from '../../hooks/useAdminNotificationHistory.js';
import { formatDateTime } from '../../utils/formatDate.js';

const PAGE_SIZE = 20;

const RECIPIENT_MODE_LABEL = {
  all: 'تمام ذمہ داران',
  user: 'مخصوص ذمہ دار',
  task: 'کام کی یاددہانی',
};

// Locked blueprint §12 — an operational history list, not an analytics dashboard: one row per
// admin send action (a NotificationBatch), server-side paginated directly — no client-side
// grouping of Notification rows (§9/§11). Self-contained (owns its own page state/query) so
// SendNotificationDialog can mount it behind a simple toggle, matching UpdateModal.jsx's own
// "پرانی اپڈیٹس دیکھیں" inline-expand convention rather than a new route/page.
function NotificationHistoryPanel() {
  const [page, setPage] = useState(1);
  const historyQuery = useAdminNotificationHistory({ page, limit: PAGE_SIZE });

  const items = historyQuery.data?.items || [];

  function recipientLabel(item) {
    if (item.recipientMode === 'user') return item.targetUser?.name || '—';
    if (item.recipientMode === 'task') {
      return item.targetTask ? `${item.targetTask.title} (${item.targetTask.codeNumber})` : '—';
    }
    return 'تمام ذمہ داران';
  }

  return (
    <div className="flex flex-col gap-2">
      {historyQuery.isLoading && <Spinner label="سرگزشت لوڈ ہو رہی ہے…" />}

      {!historyQuery.isLoading && historyQuery.isError && (
        <EmptyState message="سرگزشت لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" />
      )}

      {!historyQuery.isLoading && !historyQuery.isError && items.length === 0 && (
        <EmptyState message="ابھی تک کوئی اطلاع نہیں بھیجی گئی۔" />
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-start text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 font-medium">نوعیت</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">وصول کنندہ</th>
                <th className="px-3 py-2 font-medium">پیغام</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">وصول کنندگان</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">کامیاب</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">ناکام</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">بھیجنے والا</th>
                <th className="whitespace-nowrap px-3 py-2 font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const failedCount = item.recipientsResolved - item.createdCount;
                return (
                  <tr key={item.batchId} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-3 py-2">{RECIPIENT_MODE_LABEL[item.recipientMode]}</td>
                    <td className="whitespace-nowrap px-3 py-2">{recipientLabel(item)}</td>
                    <td className="max-w-[280px] truncate px-3 py-2" title={item.message}>
                      {item.message}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">{item.recipientsResolved}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">{item.createdCount}</td>
                    <td className={clsx('whitespace-nowrap px-3 py-2 text-center', failedCount > 0 && 'font-semibold text-red-600')}>
                      {failedCount}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{item.createdBy?.name || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDateTime(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Simple prev/next only, not the full common/Pagination (which bundles a page-size
          selector this fixed-limit operational list doesn't need — locked blueprint §12: this is
          a history list, not something users customize the density of). */}
      {items.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            type="button"
            onClick={() => setPage((prev) => prev - 1)}
            disabled={page <= 1}
            className="flex h-10 min-w-[40px] items-center justify-center rounded-lg border border-gray-300 px-3 disabled:opacity-40"
          >
            پیچھے
          </button>
          <span className="text-sm text-gray-600">
            {page} / {historyQuery.data?.meta.totalPages || 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={page >= (historyQuery.data?.meta.totalPages || 1)}
            className="flex h-10 min-w-[40px] items-center justify-center rounded-lg border border-gray-300 px-3 disabled:opacity-40"
          >
            آگے
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationHistoryPanel;
