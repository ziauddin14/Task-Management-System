import React, { useEffect, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Paperclip } from 'lucide-react';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useTask } from '../../hooks/useTask.js';
import { useTaskUpdates } from '../../hooks/useTaskUpdates.js';
import { formatDate, formatDateTime, formatTimeStatusLabel } from '../../utils/formatDate.js';
import { getStatusMeta, getPerformanceMeta } from '../../utils/taskDisplay.js';

// docs/08-ui-ux.md §7, docs/09-frontend-features.md §4 — the actual Previous Updates content,
// shared between its own modal (PreviousUpdatesModal.jsx) and the Update Modal's inline
// expansion (UpdateModal.jsx), so the two entry points never drift apart. Only fetches when
// mounted (both entry points already gate that by conditional rendering) — never pre-loaded with
// the task list.
function PreviousUpdatesContent({ taskId }) {
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

  if (isTaskLoading || (updatesQuery.isLoading && page === 1)) {
    return <Spinner label="Purani updates load ho rahi hain..." />;
  }

  const statusMeta = getStatusMeta(task?.status);
  const performanceMeta = getPerformanceMeta(task?.performanceRating);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2 text-sm text-gray-600 sm:grid-cols-3">
        <div>
          <span className="font-mono">{task?.codeNumber}</span>
        </div>
        <div className="col-span-2 truncate">{task?.title}</div>
        <div>Deadline: {formatDate(task?.deadline)}</div>
        <div>
          Status:{' '}
          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', statusMeta.badgeClass)}>
            {statusMeta.label}
          </span>
        </div>
        <div>{formatTimeStatusLabel(task?.timeStatus)}</div>
        <div>
          Performance:{' '}
          <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', performanceMeta.badgeClass)}>
            {performanceMeta.label}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState message="Abhi tak koi update nahi di gayi." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((update) => {
            const isAdminEntry = update.updatedBy?.role === 'admin';
            return (
              <li
                key={update.id}
                className={clsx('rounded-lg border p-2 text-sm', isAdminEntry ? 'border-brand-light bg-brand-light/40' : 'border-gray-200 bg-gray-50')}
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
                  <span>
                    {update.updatedBy?.name} ({update.updatedBy?.role === 'admin' ? 'Admin' : 'User'})
                  </span>
                  <span>{formatDateTime(update.createdAt)}</span>
                </div>
                <p className="text-gray-800">{update.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Completion: {update.completionPercent}%</span>
                  {update.attachment && (
                    <a
                      href={update.attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 items-center gap-1 rounded-full border border-gray-300 px-2 text-xs text-gray-700 hover:bg-gray-100"
                    >
                      <Paperclip className="h-3 w-3" aria-hidden="true" />
                      {update.attachment.fileName}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={updatesQuery.isFetching}
          className="h-10 min-w-[40px] self-center rounded-lg border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Purani updates aur dekhein
        </button>
      )}
    </div>
  );
}

export default PreviousUpdatesContent;
