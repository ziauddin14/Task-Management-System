import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import EmptyState from '../common/EmptyState.jsx';
import { formatDate, formatTimeStatusLabel } from '../../utils/formatDate.js';
import { getStatusMeta, getPerformanceMeta } from '../../utils/taskDisplay.js';
import { COLUMN_DEFINITIONS } from '../../utils/dashboardColumns.js';

// Prompt 2F — headers here now come from the same COLUMN_DEFINITIONS TaskTable.jsx uses, instead
// of a second, separately hardcoded (and previously English/Roman-Urdu) set of strings.
function columnLabel(key) {
  return COLUMN_DEFINITIONS.find((col) => col.key === key)?.label ?? key;
}

// docs/07-frontend-foundation.md §9 — the Print View toggle's denser, read-only TaskTable variant:
// no action buttons/columns, no column-visibility control, no pagination controls — just the
// currently-loaded rows, respecting the same column visibility as the regular table (so what's
// hidden there stays hidden here too) but with no way to change it from this view.
function PrintView({ tasks, isVisible }) {
  if (tasks.length === 0) {
    return <EmptyState message="اس فلٹر سے مطابقت رکھنے والا کوئی کام نہیں ملا۔" />;
  }

  return (
    // overflow-x-auto was missing here — the one real containment gap found (TaskTable.jsx and
    // UserTable.jsx both already had it). Without it, a wide print table had nothing of its own
    // to scroll within, so its width propagated straight up into the page-level overflow.
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-start text-xs">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('codeNumber')}</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('title')}</th>
            {isVisible('assignees') && <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('assignees')}</th>}
            {isVisible('responsibility') && (
              <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('responsibility')}</th>
            )}
            {isVisible('deadline') && <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('deadline')}</th>}
            {isVisible('status') && <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('status')}</th>}
            {isVisible('timeStatus') && (
              <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('timeStatus')}</th>
            )}
            {isVisible('completionPercent') && (
              <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('completionPercent')}</th>
            )}
            {isVisible('performance') && (
              <th className="whitespace-nowrap px-2 py-1 font-medium">{columnLabel('performance')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const statusMeta = getStatusMeta(task.status);
            const performanceMeta = getPerformanceMeta(task.performanceRating);
            return (
              <tr key={task.id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-2 py-1 font-mono">{task.codeNumber}</td>
                <td className="max-w-[200px] truncate px-2 py-1">{task.title}</td>
                {isVisible('assignees') && (
                  <td className="px-2 py-1">{(task.assignees || []).map((a) => a.name).join(', ')}</td>
                )}
                {isVisible('responsibility') && <td className="whitespace-nowrap px-2 py-1">{task.responsibility}</td>}
                {isVisible('deadline') && <td className="whitespace-nowrap px-2 py-1">{formatDate(task.deadline)}</td>}
                {isVisible('status') && (
                  <td className="whitespace-nowrap px-2 py-1">
                    <span className={clsx('rounded-full px-1.5 py-0.5', statusMeta.badgeClass)}>{statusMeta.label}</span>
                  </td>
                )}
                {isVisible('timeStatus') && (
                  <td className="whitespace-nowrap px-2 py-1">{formatTimeStatusLabel(task.timeStatus)}</td>
                )}
                {isVisible('completionPercent') && <td className="whitespace-nowrap px-2 py-1">{task.completionPercent}%</td>}
                {isVisible('performance') && (
                  <td className="whitespace-nowrap px-2 py-1">
                    <span className={clsx('rounded-full px-1.5 py-0.5', performanceMeta.badgeClass)}>{performanceMeta.label}</span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PrintView;
