import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ChevronsUpDown, Upload, History, Pencil, MoreVertical, Bell, Gauge } from 'lucide-react';
import { FloatingPortal } from '@floating-ui/react';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Pagination from '../common/Pagination.jsx';
import SyntheticBadge from './SyntheticBadge.jsx';
import { useFloatingMenu } from '../../hooks/useFloatingMenu.js';
import { COLUMN_DEFINITIONS } from '../../utils/dashboardColumns.js';
import { formatDateShortYear, formatTimeStatusLabel, getTimeStatusColorClass } from '../../utils/formatDate.js';
import { getStatusMeta, getPerformanceMeta, isSyntheticRating, SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';
import { getRatingTone, getStatusTone } from '../../utils/mobileTheme.js';
import { progressFillClass } from '../../utils/dashboardTheme.js';

// Desktop redesign — the look only: a rounded card, a tinted sticky header row, taller rows that
// highlight under the pointer, status and rating as tinted chips, and a completion bar coloured by
// how far the task really is. Every column, the sorting, the paging and the row actions are what
// they were.
const TH_CLASS = 'whitespace-nowrap px-3 py-3 text-start text-[13px] font-semibold';
const TD_CLASS = 'whitespace-nowrap px-3 py-[14px]';
const CHIP_CLASS = 'inline-block whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] leading-[2.3]';

// Prompt — variant="menuItem" (TMS Dashboard row ایکشن menu) renders the same icon + label +
// onClick/disabled as a full-width menu row instead of a standalone square icon button; no
// handler or gating logic changes between variants.
function IconActionButton({ icon: Icon, label, onClick, disabled, variant = 'standalone' }) {
  if (variant === 'menuItem') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className="flex h-10 w-full items-center gap-2 whitespace-nowrap rounded-tk-chip px-2 text-start text-sm text-tk-ink transition-colors hover:bg-tk-hover hover:text-tk-green-900 disabled:opacity-40"
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tk-chip border border-tk-line-btn text-tk-green-900 transition-colors hover:bg-tk-hover disabled:opacity-40"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

// Prompt — TMS Dashboard row actions cleanup: one compact three-dot trigger per row replacing the
// old inline icon-button row, opening a small RTL-aligned dropdown with the SAME action buttons
// (as menuItem-variant IconActionButtons). Positioning goes through useFloatingMenu (see its own
// comment): portal-rendered to document.body so the table's own overflow-auto can never clip it,
// and it auto-flips above the row when opened near the bottom of the scroll area (e.g. the last
// visible row) instead of being cut off.
function RowActionsMenu({ children }) {
  const { open, setOpen, refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingMenu({
    placement: 'bottom-end',
  });

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-expanded={open}
        title="اقدامات"
        aria-label="اقدامات"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tk-chip bg-tk-hover text-tk-green-900 transition-colors hover:bg-tk-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
        {...getReferenceProps()}
      >
        <MoreVertical className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open && (
        <FloatingPortal>
          {/* onClick here just closes the menu after a row action is chosen (bubbles up from
              whichever IconActionButton was clicked) — it fires after the button's own onClick,
              so it never interferes with the action handler itself. */}
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            onClick={() => setOpen(false)}
            className="z-50 w-max min-w-[11rem] max-w-[calc(100vw-1rem)] rounded-tk-tile border border-tk-line bg-white p-1.5 shadow-tk-lift"
            {...getFloatingProps()}
          >
            {children}
          </div>
        </FloatingPortal>
      )}
    </>
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
        <span key={person.id} className="whitespace-nowrap rounded-tk-pill bg-tk-surface px-[10px] text-[12px] leading-[2.3] text-tk-ink-soft">
          {person.name}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-tk-muted">+{extra} more</span>}
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
        className="flex h-10 items-center gap-1 font-semibold hover:text-tk-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
      >
        <span>{column.label}</span>
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
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
  onSendReminder,
  onEditSyntheticRating,
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
    <div className="tk-rise tk-d4 overflow-hidden rounded-tk-panel bg-tk-card shadow-tk-card">
      {isLoading && <LoadingPhrase label="کام لوڈ ہو رہے ہیں…" />}

      {!isLoading && isError && <EmptyState message="کام لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" />}

      {!isLoading && !isError && tasks.length === 0 && (
        <EmptyState message="اس فلٹر سے مطابقت رکھنے والا کوئی کام نہیں ملا۔" />
      )}

      {!isLoading && !isError && tasks.length > 0 && (
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-start text-[13px]">
            <thead className="sticky top-0 z-[1] bg-tk-thead-bg text-tk-thead-ink">
              <tr>
                <ColumnHeader
                  column={codeNumberCol}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className={TH_CLASS}
                />
                <ColumnHeader
                  column={titleCol}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className={TH_CLASS}
                />
                {isVisible('assignees') && <th className={TH_CLASS}>ذمہ دار</th>}
                {isVisible('responsibility') && <th className={TH_CLASS}>ذمہ داری</th>}
                {isVisible('deadline') && (
                  <ColumnHeader
                    column={{ key: 'deadline', label: 'آخری تاریخ' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className={TH_CLASS}
                  />
                )}
                {isVisible('lastUpdate') && <th className={TH_CLASS}>آخری اپڈیٹ</th>}
                {isVisible('status') && (
                  <ColumnHeader
                    column={{ key: 'status', label: 'کیفیت' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className={TH_CLASS}
                  />
                )}
                {isVisible('timeStatus') && <th className={TH_CLASS}>وقتی صورتحال</th>}
                {isVisible('completionPercent') && (
                  <ColumnHeader
                    column={{ key: 'completionPercent', label: 'تکمیل فیصد' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className={TH_CLASS}
                  />
                )}
                {isVisible('performance') && (
                  <ColumnHeader
                    column={{ key: 'performance', label: 'کارکردگی' }}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    className={TH_CLASS}
                  />
                )}
                <th className={`no-print ${TH_CLASS}`}>ایکشن</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const statusMeta = getStatusMeta(task.status);
                const performanceMeta = getPerformanceMeta(task.performanceRating);
                const isClosed = task.status === 'closed';
                const isSynthetic = isSyntheticRating(task);
                return (
                  <tr key={task.id} className="border-t border-tk-line-row transition-colors hover:bg-tk-hover motion-reduce:transition-none">
                    <td className={`${TD_CLASS} font-mono text-tk-muted`}>{task.codeNumber}</td>
                    <td className="min-w-[200px] max-w-[340px] px-3 py-[14px] text-[14px] font-semibold leading-tk-label" title={task.title}>
                      <span className="line-clamp-2">{task.title}</span>
                    </td>
                    {isVisible('assignees') && (
                      <td className="px-3 py-[14px]">
                        <AssigneeChips assignees={task.assignees || []} />
                      </td>
                    )}
                    {isVisible('responsibility') && <td className={`${TD_CLASS} text-tk-ink-soft`}>{task.responsibility}</td>}
                    {isVisible('deadline') && <td className={TD_CLASS}>{formatDateShortYear(task.deadline)}</td>}
                    {isVisible('lastUpdate') && <td className={`${TD_CLASS} text-tk-muted`}>{formatDateShortYear(task.lastUpdateAt)}</td>}
                    {isVisible('status') && (
                      <td className={TD_CLASS}>
                        <span className={clsx(CHIP_CLASS, getStatusTone(task.status).chip)}>{statusMeta.label}</span>
                      </td>
                    )}
                    {isVisible('timeStatus') && (
                      <td className={clsx(TD_CLASS, 'text-[12px]', getTimeStatusColorClass(task.timeStatus))}>
                        {formatTimeStatusLabel(task.timeStatus)}
                      </td>
                    )}
                    {isVisible('completionPercent') && (
                      <td className={TD_CLASS}>
                        {/* Always the task's REAL completion percent — never the percent a synthetic
                            rating assumed. Red under 30%, amber to 69%, green from 70%. */}
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-14 overflow-hidden rounded-tk-pill bg-tk-track">
                            <div
                              data-progress-fill
                              className={clsx('tk-prog-wipe h-full rounded-tk-pill', progressFillClass(task.completionPercent))}
                              style={{ width: `${task.completionPercent}%` }}
                            />
                          </div>
                          <span className="min-w-[28px] text-xs text-tk-muted">{task.completionPercent}%</span>
                        </div>
                      </td>
                    )}
                    {isVisible('performance') && (
                      <td className={TD_CLASS}>
                        {/* A developer-assigned rating is marked "تخمینی" right beside it. The
                            completion-percent column to the side is untouched — it always shows
                            the task's REAL percent, so a closed task at 0% rated "بہتر" reads
                            exactly as that: a real 0%, and an assumed rating. */}
                        <div className="flex items-center gap-1">
                          <span
                            className={clsx(CHIP_CLASS, getRatingTone(task.performanceRating)?.chip || 'bg-tk-surface text-tk-muted', getRatingTone(task.performanceRating) && 'font-semibold')}
                          >
                            {performanceMeta.label}
                          </span>
                          {isSynthetic && <SyntheticBadge assumedPercent={task.syntheticRating.assumedPercent} />}
                        </div>
                      </td>
                    )}
                    <td className={`no-print ${TD_CLASS}`}>
                      <RowActionsMenu>
                        <IconActionButton
                          icon={Upload}
                          label="اپڈیٹ کریں"
                          onClick={() => onUpdate(task)}
                          disabled={isClosed}
                          variant="menuItem"
                        />
                        <IconActionButton
                          icon={History}
                          label="پرانی اپڈیٹس"
                          onClick={() => onViewUpdates(task)}
                          variant="menuItem"
                        />
                        {isAdmin && (
                          <IconActionButton
                            icon={Pencil}
                            label="ترمیم کریں"
                            onClick={() => onEdit(task)}
                            disabled={isClosed}
                            variant="menuItem"
                          />
                        )}
                        {/* Locked blueprint §Phase 2/§10 — admin-only, Flow C's row-level entry
                            point. Reuses the same SendNotificationDialog as the header's "نئی
                            اطلاع بھیجیں" button (DashboardPage.jsx), just pre-supplied with this
                            row's task so it opens locked to Flow C — no separate page/modal. */}
                        {isAdmin && (
                          <IconActionButton
                            icon={Bell}
                            label="یاددہانی بھیجیں"
                            onClick={() => onSendReminder(task)}
                            variant="menuItem"
                          />
                        )}
                        {/* Admin-only, and only on a task whose rating is synthetic — there is
                            nothing to change on a real rating or an unrated task (the backend
                            refuses those with 409). Works on closed tasks too. */}
                        {isAdmin && isSynthetic && (
                          <IconActionButton
                            icon={Gauge}
                            label={`${SYNTHETIC_LABEL} درجہ بندی تبدیل کریں`}
                            onClick={() => onEditSyntheticRating(task)}
                            variant="menuItem"
                          />
                        )}
                      </RowActionsMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="no-print border-t border-tk-line-row px-4">
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
