import React, { forwardRef, useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Paperclip } from 'lucide-react';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useTask } from '../../hooks/useTask.js';
import { useTaskUpdates } from '../../hooks/useTaskUpdates.js';
import { formatDateShortYear, formatTime, formatTimeStatusLabel, getTimeStatusColorClass } from '../../utils/formatDate.js';

const TH_CLASS = 'whitespace-nowrap px-3 py-2 text-start font-medium';
const TD_CLASS = 'whitespace-nowrap px-3 py-2';

// docs/08-ui-ux.md §7, docs/09-frontend-features.md §4 — the actual Previous Updates ("Kaam ki
// Tafseel") content, shared between its own modal (PreviousUpdatesModal.jsx) and the Update
// Modal's inline expansion (UpdateModal.jsx), so the two entry points never drift apart. Only
// fetches when mounted (both entry points already gate that by conditional rendering) — never
// pre-loaded with the task list.
//
// Prompt 5A — forwardRef: PreviousUpdatesModal.jsx attaches this to a ref so its own Export
// button (Prompt 5B) can hand the whole rendered content — summary table + updates table — to
// html2canvas. The ref sits on a wrapper that's ALWAYS mounted (loading/empty/populated), so it's
// never null when the button is actually clickable.
const PreviousUpdatesContent = forwardRef(function PreviousUpdatesContent({ taskId }, ref) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const { data: task, isLoading: isTaskLoading } = useTask(taskId);
  const updatesQuery = useTaskUpdates(taskId, page, { enabled: true });

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [taskId]);

  useEffect(() => {
    if (!updatesQuery.data) return;
    setItems((prev) => (page === 1 ? updatesQuery.data.items : [...prev, ...updatesQuery.data.items]));
  }, [updatesQuery.data, page]);

  const hasMore = updatesQuery.data?.meta ? page < updatesQuery.data.meta.totalPages : false;
  const isInitialLoading = isTaskLoading || (updatesQuery.isLoading && page === 1);

  return (
    <div ref={ref} className="flex flex-col gap-4 bg-white">
      {isInitialLoading ? (
        <Spinner label="کام کی تفصیل لوڈ ہو رہی ہے…" />
      ) : (
        <>
          {/* Prompt 5A.2 — 5-column summary table directly below the heading: کام کوڈ, کام, آخری
              تاریخ, باقی دن (Time Status), تکمیل فیصد. */}
          <div className="overflow-x-auto rounded-lg border border-brand/30">
            <table className="w-full text-sm">
              <thead className="bg-brand-light text-brand">
                <tr>
                  <th className={TH_CLASS}>کام کوڈ</th>
                  <th className={TH_CLASS}>کام</th>
                  <th className={TH_CLASS}>آخری تاریخ</th>
                  <th className={TH_CLASS}>باقی دن</th>
                  <th className={TH_CLASS}>تکمیل فیصد</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-brand/20 bg-white">
                  <td className={clsx(TD_CLASS, 'font-mono')}>{task?.codeNumber}</td>
                  <td className={clsx(TD_CLASS, 'max-w-[220px] truncate')} title={task?.title}>
                    {task?.title}
                  </td>
                  <td className={TD_CLASS}>{formatDateShortYear(task?.deadline)}</td>
                  <td className={clsx(TD_CLASS, getTimeStatusColorClass(task?.timeStatus))}>
                    {formatTimeStatusLabel(task?.timeStatus)}
                  </td>
                  <td className={TD_CLASS}>{task?.completionPercent}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Prompt 5A.3 — the updates themselves, in table form, newest first (backend already
              sorts createdAt:-1 in taskUpdate.service.js, so date+time-descending ordering needs
              no client-side re-sort). Each row: تاریخ, وقت, اپڈیٹ کرنے والے کا نام اور کردار,
              ذمہ داری, وضاحت, تکمیل فیصد, اٹیچمنٹ. */}
          {items.length === 0 ? (
            <EmptyState message="ابھی تک کوئی اپڈیٹ نہیں دی گئی۔" />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className={TH_CLASS}>تاریخ</th>
                    <th className={TH_CLASS}>وقت</th>
                    <th className={TH_CLASS}>اپڈیٹ کرنے والا</th>
                    <th className={TH_CLASS}>ذمہ داری</th>
                    <th className={TH_CLASS}>وضاحت</th>
                    <th className={TH_CLASS}>تکمیل فیصد</th>
                    <th className={TH_CLASS}>اٹیچمنٹ</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((update) => {
                    const isAdminEntry = update.updatedBy?.role === 'admin';
                    return (
                      <tr
                        key={update.id}
                        className={clsx('border-t border-gray-100', isAdminEntry ? 'bg-brand-light/30' : 'bg-white')}
                      >
                        <td className={TD_CLASS}>{formatDateShortYear(update.createdAt)}</td>
                        <td className={TD_CLASS}>{formatTime(update.createdAt)}</td>
                        <td className={TD_CLASS}>
                          {update.updatedBy?.name} ({isAdminEntry ? 'Admin' : 'User'})
                        </td>
                        <td className={TD_CLASS}>{update.updatedBy?.responsibility}</td>
                        <td className="max-w-[240px] whitespace-normal px-3 py-2">{update.description}</td>
                        <td className={TD_CLASS}>{update.completionPercent}%</td>
                        <td className={TD_CLASS}>
                          {update.attachment ? (
                            <a
                              href={update.attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-10 w-fit items-center gap-1 rounded-full border border-gray-300 px-2 text-brand hover:bg-brand-light"
                            >
                              <Paperclip className="h-3 w-3" aria-hidden="true" />
                              {update.attachment.fileName}
                            </a>
                          ) : (
                            <span className="text-gray-400">کوئی اٹیچمنٹ نہیں</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={updatesQuery.isFetching}
              className="h-10 min-w-[40px] self-center rounded-lg border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              مزید پرانی اپڈیٹس دیکھیں
            </button>
          )}
        </>
      )}
    </div>
  );
});

export default PreviousUpdatesContent;
