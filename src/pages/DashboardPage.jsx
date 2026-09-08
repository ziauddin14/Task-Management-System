import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Plus, Printer, BellRing } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useDashboardFilters } from '../hooks/useDashboardFilters.js';
import { usePageSize } from '../hooks/usePageSize.js';
import { useTasks } from '../hooks/useTasks.js';
import { useDashboardSummary } from '../hooks/useDashboardSummary.js';
import { useCloseTask } from '../hooks/useCloseTask.js';
import { useColumnVisibility } from '../hooks/useColumnVisibility.js';
import { useExportReport } from '../hooks/useExportReport.js';
import { useTriggerReminders } from '../hooks/useTriggerReminders.js';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import FilterBar from '../components/dashboard/FilterBar.jsx';
import TaskTable from '../components/dashboard/TaskTable.jsx';
import PrintView from '../components/dashboard/PrintView.jsx';
import ColumnToggle from '../components/dashboard/ColumnToggle.jsx';
import TaskFormModal from '../components/task/TaskFormModal.jsx';
import UpdateModal from '../components/task/UpdateModal.jsx';
import PreviousUpdatesModal from '../components/task/PreviousUpdatesModal.jsx';
import ExportMenu from '../components/reports/ExportMenu.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { PageActions } from '../contexts/PageActionsPortal.jsx';
import {
  STATUS_META,
  getStatusMeta,
  getPerformanceMeta,
  PERFORMANCE_SUMMARY_KEY_TO_VALUE,
  PERFORMANCE_CARD_NOT_APPLICABLE_LABEL,
} from '../utils/taskDisplay.js';
import { COLUMN_DEFINITIONS } from '../utils/dashboardColumns.js';

const STATUS_KEYS = Object.keys(STATUS_META);
const PERFORMANCE_SUMMARY_KEYS = Object.keys(PERFORMANCE_SUMMARY_KEY_TO_VALUE);
const COLUMN_STORAGE_KEY = 'dashboard.visibleColumns.v1';

// docs/08-ui-ux.md §3 — top to bottom: header (AppLayout, already wired), KPI cards, filter bar,
// Print View toggle + Export (item 6), task table (+ column control, frozen header, pagination),
// Update Modal, Previous Updates Modal.
function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [pageSize, setPageSize] = usePageSize();
  const filtersHook = useDashboardFilters(pageSize);
  const { apiFilters, page, params, sortBy, sortOrder, toggleKpiFilter, setFilters, setSort, setPage } = filtersHook;

  const tasksQuery = useTasks(apiFilters);
  const summaryQuery = useDashboardSummary();

  const [formModal, setFormModal] = useState(null); // { mode: 'create' } | { mode: 'edit', task }
  const [closingTask, setClosingTask] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [viewingUpdatesTask, setViewingUpdatesTask] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  const closeTaskMutation = useCloseTask(closingTask?.id);

  // docs/09-frontend-features.md §8: columnVisibility is lifted here (rather than owned inside
  // TaskTable, as it was through Phase 10.5) so the Export flow reads the SAME visible-columns
  // state the table itself is showing — one source of truth, not two that could drift apart.
  const columnVisibility = useColumnVisibility(COLUMN_STORAGE_KEY, COLUMN_DEFINITIONS);
  const exportReportHook = useExportReport();
  const triggerRemindersMutation = useTriggerReminders();

  function handleKpiClick(paramKey, value) {
    toggleKpiFilter(paramKey, value);
  }

  function handleCloseConfirm() {
    closeTaskMutation.mutate(undefined, {
      onSuccess: () => setClosingTask(null),
    });
  }

  // docs/09-frontend-features.md §8 step 2 — "automatically carries the dashboard's current URL
  // query params (filters/search/sort) and the current visible-columns list." apiFilters carries
  // page/limit too (needed for the task LIST), but GET /reports/export is unpaginated by design
  // (backend/src/validators/report.validator.js omits page/limit entirely) — dropped here.
  function handleDashboardExport(format, reportType) {
    // eslint-disable-next-line no-unused-vars
    const { page: _page, limit: _limit, ...taskFilters } = apiFilters;
    const columns = COLUMN_DEFINITIONS.filter((col) => columnVisibility.isVisible(col.key)).map((col) => col.key);
    return exportReportHook.run({ ...taskFilters, format, reportType, columns: columns.join(',') });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Prompt — Navbar + this whole block (heading, KPI cards, filter bar) together read as one
          sticky unit: top-16 seats it flush against AppLayout's own sticky h-16 header, so between
          the two there's never a gap the table can show through while scrolling. A solid
          background is required here — without one, the table's own rows would show through as
          they scroll underneath this block. */}
      <div className="no-print sticky top-16 z-20 -mx-4 flex flex-col gap-3 bg-gray-50 px-4 pb-3 pt-4 md:-mx-6 md:px-6">
        <div className="flex items-center justify-between border-b-2 border-brand/10 pb-3">
          <h1 className="text-3xl font-bold text-gray-900">ڈیش بورڈ</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => triggerRemindersMutation.mutate()}
                disabled={triggerRemindersMutation.isPending}
                title="یاد دہانیاں فوراً بھیجیں (روزانہ خودکار بھیجے جانے کا دستی ٹرگر)"
                className="flex h-10 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:border-brand/40 hover:bg-brand-light disabled:opacity-50"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                یاد دہانیاں بھیجیں
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setFormModal({ mode: 'create' })}
                className="flex h-10 items-center gap-1 rounded-lg bg-brand px-4 text-white hover:bg-brand/90"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                نیا کام
              </button>
            )}
          </div>
        </div>

        {summaryQuery.isLoading && <Spinner label="خلاصہ لوڈ ہو رہا ہے۔۔۔" />}

        {summaryQuery.data && (
          <div className="flex flex-col gap-2">
            {/* Prompt — a subtle brand-colored divider (md:divide-x) now separates the two
                groups; each group's own label is centered above its cards (was start-aligned with
                a side accent bar before). */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:divide-x md:divide-brand/25">
              <div className="md:pe-4">
                <p className="mb-1.5 text-center text-sm font-semibold text-gray-700">کام کی کیفیت</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {STATUS_KEYS.map((key) => {
                    const entry = summaryQuery.data.byStatus[key] || { count: 0, percent: 0 };
                    return (
                      <KpiCard
                        key={key}
                        label={getStatusMeta(key).label}
                        count={entry.count}
                        percent={entry.percent}
                        active={params.status === key}
                        onClick={() => handleKpiClick('status', key)}
                      />
                    );
                  })}
                  {/* Prompt 2C item 5 — a 5th "Total" card: every task regardless of status, from
                      the summary's own top-level total (not a byStatus bucket, so there's no
                      single status value to toggle active/inactive on) — clicking it clears both
                      KPI filters, the same "see everything" action as the Clear filter link below. */}
                  <KpiCard
                    label="مجموعی"
                    count={summaryQuery.data.total}
                    active={false}
                    onClick={() => setFilters({ status: undefined, performanceRating: undefined })}
                  />
                </div>
              </div>

              <div className="md:ps-4">
                <p className="mb-1.5 text-center text-sm font-semibold text-gray-700">کارکردگی</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {PERFORMANCE_SUMMARY_KEYS.map((key) => {
                    const entry = summaryQuery.data.byPerformance[key] || { count: 0, percent: 0 };
                    const ratingValue = PERFORMANCE_SUMMARY_KEY_TO_VALUE[key];
                    // Prompt 2D item 5 — the "notApplicable" card gets the clearer card-only label
                    // instead of getPerformanceMeta's bare "-" (which stays correct for a single
                    // task's own badge elsewhere — see taskDisplay.js's comment on why these differ).
                    const label = key === 'notApplicable' ? PERFORMANCE_CARD_NOT_APPLICABLE_LABEL : getPerformanceMeta(ratingValue).label;
                    return (
                      <KpiCard
                        key={key}
                        label={label}
                        count={entry.count}
                        percent={entry.percent}
                        active={params.performanceRating === ratingValue}
                        onClick={() => handleKpiClick('performanceRating', ratingValue)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {(params.status || params.performanceRating) && (
              <button
                type="button"
                // Single atomic setFilters() call — see hooks/useDashboardFilters.js's comment on
                // setFilters for why two separate toggleKpiFilter() calls here would silently
                // clobber each other instead of clearing both.
                onClick={() => setFilters({ status: undefined, performanceRating: undefined })}
                className="flex h-10 w-fit items-center text-sm text-brand hover:underline"
              >
                × Clear filter
              </button>
            )}
          </div>
        )}

        <FilterBar filtersHook={filtersHook} isAdmin={isAdmin} />
      </div>

      {/* Prompt — Print View toggle + Export moved out of here and into the Navbar (see the
          <PageActions> portal below) — the KPI cards already cover status filtering, and this
          page's own body no longer needs a dedicated actions row for them. */}
      <PageActions>
        <button
          type="button"
          onClick={() => setPrintMode((prev) => !prev)}
          aria-pressed={printMode}
          title="پرنٹ ویو"
          className={clsx(
            'flex h-10 items-center gap-1 rounded-lg border px-2.5 text-sm transition-colors',
            printMode ? 'border-brand bg-brand-light text-brand' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          )}
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span className="hidden lg:inline">پرنٹ ویو</span>
        </button>
        {printMode && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-10 items-center gap-1 rounded-lg bg-brand px-2.5 text-sm text-white hover:bg-brand/90"
          >
            <span className="hidden lg:inline">پرنٹ کریں</span>
            <span className="lg:hidden">پرنٹ</span>
          </button>
        )}
        <ExportMenu mode="dashboard" onExport={handleDashboardExport} isLoading={exportReportHook.isLoading} />
        {/* Prompt — TaskTable's own column-toggle header row (and the empty space it left above
            the column headings) was removed; the control itself still exists here, next to Print
            View/Export, so the Export flow's "current visible-columns state" behavior keeps working. */}
        <ColumnToggle
          columns={COLUMN_DEFINITIONS}
          isVisible={columnVisibility.isVisible}
          onToggle={columnVisibility.toggleColumn}
        />
      </PageActions>

      <div>
        {printMode ? (
          <PrintView tasks={tasksQuery.data?.items || []} isVisible={columnVisibility.isVisible} />
        ) : (
          <TaskTable
            tasks={tasksQuery.data?.items || []}
            meta={tasksQuery.data?.meta}
            isLoading={tasksQuery.isLoading}
            isError={tasksQuery.isError}
            isAdmin={isAdmin}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onEdit={(task) => setFormModal({ mode: 'edit', task })}
            onUpdate={(task) => setUpdatingTask(task)}
            onViewUpdates={(task) => setViewingUpdatesTask(task)}
            columnVisibility={columnVisibility}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={setSort}
          />
        )}
      </div>

      {isAdmin && (
        <TaskFormModal
          isOpen={Boolean(formModal)}
          mode={formModal?.mode}
          task={formModal?.task}
          onClose={() => setFormModal(null)}
        />
      )}

      {isAdmin && (
        <ConfirmDialog
          isOpen={Boolean(closingTask)}
          title="کام بند کریں"
          message="اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟"
          confirmLabel="ہاں، بند کریں"
          cancelLabel="منسوخ کریں"
          onConfirm={handleCloseConfirm}
          onCancel={() => setClosingTask(null)}
          isLoading={closeTaskMutation.isPending}
        />
      )}

      <UpdateModal
        isOpen={Boolean(updatingTask)}
        taskId={updatingTask?.id}
        onClose={() => setUpdatingTask(null)}
        isAdmin={isAdmin}
        onCloseTask={() => {
          setClosingTask(updatingTask);
          setUpdatingTask(null);
        }}
      />

      <PreviousUpdatesModal
        isOpen={Boolean(viewingUpdatesTask)}
        taskId={viewingUpdatesTask?.id}
        onClose={() => setViewingUpdatesTask(null)}
      />
    </div>
  );
}

export default DashboardPage;
