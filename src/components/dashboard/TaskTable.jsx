import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, Upload, History, Pencil } from 'lucide-react';
import Spinner from '../common/Spinner.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Pagination from '../common/Pagination.jsx';
import { COLUMN_DEFINITIONS } from '../../utils/dashboardColumns.js';
import { formatDateShortYear, formatTimeStatusLabel, getTimeStatusColorClass } from '../../utils/formatDate.js';
import { getStatusMeta, getPerformanceMeta } from '../../utils/taskDisplay.js';

// Prompt — compact icon-only action buttons (was text-labeled), matching the row height already
// established by the old h-10 text buttons. title + aria-label carry the same Urdu label the text
// button used to show, so the action is still named on hover and for screen readers.
function IconActionButton({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand disabled:opacity-40"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

// docs/08-ui-ux.md §6 — column set, RTL reading order, frozen header, column show/hide, mobile
// horizontal scroll. docs/09-frontend-features.md §2 — Edit is Admin-only. Update/Previous
// Updates are available to both roles (Admin, or an assignee — docs/05-apis.md §11's role
// matrix); Update is disabled on an already-closed task, matching taskUpdate.service.js's own
// "Yeh kaam close ho chuka hai" rejection (Previous Updates stays enabled — it's read-only).
function AssigneeChips({ assignees }) {
  const visible = assignees.slice(0, 2);
  const extra = assignees.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((person) => (
        <span key={person.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {person.name}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-gray-500">+{extra} more</span>}
    </div>
  );
}

// Prompt 2H — only columns the backend's listTasksQuerySchema actually accepts a sortBy value for
// (backend/src/validators/task.validator.js) are wired as sortable; everything else (assignees,
// responsibility, lastUpdate, timeStatus) has no backend sort field and stays a plain header.
const SORTABLE_COLUMNS = {
  codeNumber: 'codeNumber',
  title: 'title',
  deadline: 'deadline',
  completionPercent: 'completionPercent',
  status: 'status',
  performance: 'performanceRating',
};

function ColumnHeader({ column, sortBy, sortOrder, onSort, className }) {
  const sortField = SORTABLE_COLUMNS[column.key];
  if (!sortField) {
    return <th className={className}>{column.label}</th>;
  }

  const isActive = sortBy === sortField;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortField)}
        className="flex h-10 items-center gap-1 font-medium hover:text-gray-900"
      >
        <span>{column.label}</span>
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-gray-300" aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

function TaskTable({
  tasks,
  meta,
  isLoading,
  isError,
  isAdmin,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onUpdate,
  onViewUpdates,
  columnVisibility,
  sortBy,
  sortOrder,
  onSortChange,
}) {
  // Lifted to DashboardPage.jsx (Phase 10.6) so the Export flow can read the SAME visible-columns
  // state (docs/09-frontend-features.md §8: "the current visible-columns list") without a second,
  // out-of-sync source of truth. This component only ever reads it now (toggleColumn's only
  // consumer, the column-toggle button, was removed).
  const { isVisible } = columnVisibility;

  // Prompt 2H — click toggles asc -> desc on the same column; clicking a different column starts
  // it fresh at asc (standard single-column-sort behavior, matching sortBy/sortOrder both being
  // single fields, not arrays). Goes through useDashboardFilters' setSort, which already resets
  // page to 1 on any change.
  function handleSort(field) {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  }

  const codeNumberCol = COLUMN_DEFINITIONS.find((c) => c.key === 'codeNumber');
  const titleCol = COLUMN_DEFINITIONS.find((c) => c.key === 'title');

  return (
    // Prompt — the column-visibility toggle bar (and the empty gap it left above the actual
    // column headers) is removed from here; the table's own root no longer has that extra header
    // row, so there's nothing left to collapse — this IS the fix, not a follow-up width/flex
    // adjustment. The control itself moved to the Navbar's PageActions bar (DashboardPage.jsx),
    // next to Print View/Export — columnVisibility.isVisible below still gates which columns
    // render here exactly as before.
    <div className="rounded-lg border border-gray-200 bg-white">
      {isLoading && <Spinner label="کام لوڈ ہو رہے ہیں…" />}

      {!isLoading && isError && <EmptyState message="کام لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" />}

      {!isLoading && !isError && tasks.length === 0 && (
        <EmptyState message="اس فلٹر سے مطابقت رکھنے والا کوئی کام نہیں ملا۔" />
      )}

      {!isLoading && !isError && tasks.length > 0 && (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-start text-sm">
            <thead className="sticky top-0 z-[1] bg-gray-50 text-gray-600">
              <tr>
                <ColumnHeader
                  column={codeNumberCol}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="whitespace-nowrap px-3 py-2 font-medium"
                />
                <ColumnHeader
                  column={titleCol}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="whitespace-nowrap px-3 py-2 font-medium"
                />
                {isVisible('assignees') && <th className="whitespace-nowrap px-3 py-2 font-medium">ذمہ دار</th>}
                {isVisible('responsibility') && <th className="whitespace-nowrap px-3 py-2 font-medium">ذمہ داری</th>}
                {isVisible('deadline') && (
                  <ColumnHeader
                    column={{ key: 'deadline', label: 'آخری تاریخ' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="whitespace-nowrap px-3 py-2 font-medium"
                  />
                )}
                {isVisible('lastUpdate') && <th className="whitespace-nowrap px-3 py-2 font-medium">آخری اپڈیٹ</th>}
                {isVisible('status') && (
                  <ColumnHeader
                    column={{ key: 'status', label: 'کیفیت' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="whitespace-nowrap px-3 py-2 font-medium"
                  />
                )}
                {isVisible('timeStatus') && <th className="whitespace-nowrap px-3 py-2 font-medium">وقتی صورتحال</th>}
                {isVisible('completionPercent') && (
                  <ColumnHeader
                    column={{ key: 'completionPercent', label: 'تکمیل فیصد' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="whitespace-nowrap px-3 py-2 font-medium"
                  />
                )}
                {isVisible('performance') && (
                  <ColumnHeader
                    column={{ key: 'performance', label: 'کارکردگی' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className="whitespace-nowrap px-3 py-2 font-medium"
                  />
                )}
                <th className="no-print whitespace-nowrap px-3 py-2 font-medium">اقدامات</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const statusMeta = getStatusMeta(task.status);
                const performanceMeta = getPerformanceMeta(task.performanceRating);
                const isClosed = task.status === 'closed';
                return (
                  <tr key={task.id} className="border-t border-gray-100 hover:bg-brand-light/40">
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{task.codeNumber}</td>
                    <td className="max-w-[220px] truncate px-3 py-2" title={task.title}>
                      {task.title}
                    </td>
                    {isVisible('assignees') && (
                      <td className="px-3 py-2">
                        <AssigneeChips assignees={task.assignees || []} />
                      </td>
                    )}
                    {isVisible('responsibility') && <td className="whitespace-nowrap px-3 py-2">{task.responsibility}</td>}
                    {isVisible('deadline') && <td className="whitespace-nowrap px-3 py-2">{formatDateShortYear(task.deadline)}</td>}
                    {isVisible('lastUpdate') && <td className="whitespace-nowrap px-3 py-2">{formatDateShortYear(task.lastUpdateAt)}</td>}
                    {isVisible('status') && (
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', statusMeta.badgeClass)}>
                          {statusMeta.label}
                        </span>
                      </td>
                    )}
                    {isVisible('timeStatus') && (
                      <td className={clsx('whitespace-nowrap px-3 py-2', getTimeStatusColorClass(task.timeStatus))}>
                        {formatTimeStatusLabel(task.timeStatus)}
                      </td>
                    )}
                    {isVisible('completionPercent') && (
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                            <div className="h-full bg-brand" style={{ width: `${task.completionPercent}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{task.completionPercent}%</span>
                        </div>
                      </td>
                    )}
                    {isVisible('performance') && (
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={clsx('rounded-full px-2 py-0.5 text-xs font-medium', performanceMeta.badgeClass)}>
                          {performanceMeta.label}
                        </span>
                      </td>
                    )}
                    <td className="no-print whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-1">
                        <IconActionButton icon={Upload} label="اپڈیٹ کریں" onClick={() => onUpdate(task)} disabled={isClosed} />
                        <IconActionButton icon={History} label="پرانی اپڈیٹس" onClick={() => onViewUpdates(task)} />
                        {isAdmin && (
                          <IconActionButton icon={Pencil} label="ترمیم کریں" onClick={() => onEdit(task)} disabled={isClosed} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="no-print px-3">
        <Pagination
          page={page}
          totalPages={meta?.totalPages || 1}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}

export default TaskTable;
