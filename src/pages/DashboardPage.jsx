import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Plus, BellRing, Send } from 'lucide-react';
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
import RatingKpiGroup from '../components/dashboard/RatingKpiGroup.jsx';
import FilterBar from '../components/dashboard/FilterBar.jsx';
import TaskTable from '../components/dashboard/TaskTable.jsx';
import ActionsMenu from '../components/dashboard/ActionsMenu.jsx';
import TaskFormModal from '../components/task/TaskFormModal.jsx';
import UpdateModal from '../components/task/UpdateModal.jsx';
import PreviousUpdatesModal from '../components/task/PreviousUpdatesModal.jsx';
import SyntheticRatingDialog from '../components/task/SyntheticRatingDialog.jsx';
import SendNotificationDialog from '../components/admin/SendNotificationDialog.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import LoadingPhrase from '../components/common/LoadingPhrase.jsx';
import BusyButton from '../components/common/BusyButton.jsx';
import BusyRegion from '../components/common/BusyRegion.jsx';
import PushPermissionBanner from '../components/common/PushPermissionBanner.jsx';
import { PageActions } from '../contexts/PageActionsPortal.jsx';
import { STATUS_META, getStatusMeta } from '../utils/taskDisplay.js';
import { COLUMN_DEFINITIONS } from '../utils/dashboardColumns.js';

const STATUS_KEYS = Object.keys(STATUS_META);
const COLUMN_STORAGE_KEY = 'dashboard.visibleColumns.v1';

// docs/08-ui-ux.md §3 — top to bottom: header (AppLayout, already wired, ایکشن menu portalled
// into it), KPI cards, filter bar, task table (frozen header, pagination), Update Modal, Previous
// Updates Modal.
function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [pageSize, setPageSize] = usePageSize();
  const filtersHook = useDashboardFilters(pageSize);
  const { apiFilters, statusSummaryFilters, ratingSummaryFilters, page, params, sortBy, sortOrder, toggleKpiFilter, setFilters, setSort, setPage } =
    filtersHook;

  const tasksQuery = useTasks(apiFilters);
  // The KPI cards follow the dashboard's filters: the same filter state the table uses, minus
  // sort/paging — and each group of cards minus its OWN filter, so the group a card was clicked in
  // keeps showing the whole distribution (see useDashboardFilters). Hence two reads of the same
  // endpoint; with no status and no rating chosen they are one and the same request.
  const statusSummaryQuery = useDashboardSummary(statusSummaryFilters);
  const ratingSummaryQuery = useDashboardSummary(ratingSummaryFilters);
  const statusSummary = statusSummaryQuery.data;
  const ratingSummary = ratingSummaryQuery.data;
  const isSummaryLoading = statusSummaryQuery.isLoading || ratingSummaryQuery.isLoading;
  const isSummaryRefreshing = statusSummaryQuery.isPlaceholderData || ratingSummaryQuery.isPlaceholderData;

  const [formModal, setFormModal] = useState(null); // { mode: 'create' } | { mode: 'edit', task }
  const [closingTask, setClosingTask] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(null);
  const [viewingUpdatesTask, setViewingUpdatesTask] = useState(null);
  // null (closed) | { task: null } (general "نئی اطلاع بھیجیں") | { task } (row's "یاددہانی
  // بھیجیں" — locked blueprint §10: the SAME dialog backs both entry points, just with the task
  // pre-supplied or not, per §8.
  const [sendNotificationState, setSendNotificationState] = useState(null);
  // Admin-only: the task whose synthetic ("تخمینی") rating is being changed, or null.
  const [syntheticRatingTask, setSyntheticRatingTask] = useState(null);
  const closeTaskMutation = useCloseTask(closingTask?.id);

  // Lifted here (rather than owned inside TaskTable, as it was through Phase 10.5) — TaskTable
  // reads it to decide which columns to render, and the header's "ایکشن" menu's "کالمز" item
  // (ActionsMenu below) reads/writes the same instance so both stay in sync. Prompt — still
  // doesn't feed the Export flow: the task report is one fixed grouped-by-Zimmedar structure, not
  // a user-chosen column set.
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
  // query params (filters/search/sort)." apiFilters carries page/limit too (needed for the task
  // LIST), but GET /reports/export is unpaginated by design (backend/src/validators/
  // report.validator.js omits page/limit entirely) — dropped here.
  //
  // Prompt — the report is now a fixed grouped-by-Zimmedar structure, not a user-chosen column
  // set, so columnVisibility no longer feeds the export at all (it still only drives which
  // columns TaskTable itself renders). lastUpdateOnly replaces the old reportType.
  function handleDashboardExport(format, lastUpdateOnly) {
    // eslint-disable-next-line no-unused-vars
    const { page: _page, limit: _limit, ...taskFilters } = apiFilters;
    return exportReportHook.run({ ...taskFilters, format, lastUpdateOnly });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Web Push addition — deliberately outside the sticky header block below: this banner
          appears once (if at all) and disappears for good once dismissed/decided, so it should
          never be pinned like the KPI/filter block is. */}
      <PushPermissionBanner />

      {/* Prompt — Navbar + this whole block (heading, KPI cards, filter bar) together read as one
          sticky unit: top-16 seats it flush against AppLayout's own sticky h-16 header, so between
          the two there's never a gap the table can show through while scrolling. A solid
          background is required here — without one, the table's own rows would show through as
          they scroll underneath this block.

          Responsive fix — sticky only from `xl` (1280px) up, the width at which the two KPI
          groups fit side by side (see the grid below). Below that the groups are stacked and the
          cards reflow, which makes this whole block tall: kept sticky there, it would pin itself
          across most of the screen and the task table below it could barely (on a phone, never)
          scroll into view. Unstuck, it just scrolls away normally like the rest of the page — no
          functionality lost, since "stays visible while scrolling the table" was never achievable
          on a screen shorter than the block itself. (It used to switch at `md`/768px, where the
          side-by-side groups left each card about 40px wide once the sidebar took its share.) */}
      <div className="no-print z-20 -mx-4 flex flex-col gap-3 bg-gray-50 px-4 pb-3 pt-4 md:-mx-6 md:px-6 xl:sticky xl:top-16">
        {/* BusyRegion: while "یاد دہانیاں بھیجیں" is in flight, the loading phrase shows on its own
            line under this header row (lineClassName cancels the column's own gap above it). */}
        <BusyRegion lineClassName="-mt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-brand/10 pb-3">
            <h1 className="text-3xl font-bold text-gray-900">ڈیش بورڈ</h1>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <BusyButton
                  onClick={() => triggerRemindersMutation.mutate()}
                  busy={triggerRemindersMutation.isPending}
                  busyLabel="یاد دہانیاں بھیجی جا رہی ہیں…"
                  title="یاد دہانیاں فوراً بھیجیں (روزانہ خودکار بھیجے جانے کا دستی ٹرگر)"
                  className="flex h-10 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:border-brand/40 hover:bg-brand-light disabled:opacity-50"
                >
                  <BellRing className="h-4 w-4" aria-hidden="true" />
                  یاد دہانیاں بھیجیں
                </BusyButton>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setSendNotificationState({ task: null })}
                  title="نئی اطلاع بھیجیں"
                  className="flex h-10 items-center gap-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:border-brand/40 hover:bg-brand-light"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  نئی اطلاع بھیجیں
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
        </BusyRegion>

        {isSummaryLoading && <LoadingPhrase label="خلاصہ لوڈ ہو رہا ہے۔۔۔" />}

        {statusSummary && ratingSummary && (
          <div className="flex flex-col gap-2">
            {/* Prompt — a subtle brand-colored divider (xl:divide-x) separates the two groups;
                each group's own label is centered above its cards (was start-aligned with a side
                accent bar before). Side by side only from `xl`: any narrower and ten cards in one
                row are too thin to hold a count and a percentage — the groups stack instead, each
                with its own full-width row of five from `md`. */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:divide-x xl:divide-brand/25">
              <div className="xl:pe-4">
                <p className="mb-1.5 text-center text-sm font-semibold text-gray-700">کام کی کیفیت</p>
                {/* Responsive fix — was a bare grid-cols-5, which crushed 5 Urdu-labeled cards into
                    unreadable slivers below ~480px; reflows 2-up on mobile, 3-up on tablet, and
                    keeps the original one-row-of-5 from `md` (768px) up unchanged. */}
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5" aria-busy={statusSummaryQuery.isPlaceholderData || undefined}>
                  {STATUS_KEYS.map((key) => {
                    // From the summary asked for WITHOUT the status filter: the four cards always
                    // show the whole status distribution of the tasks the other filters leave.
                    const entry = statusSummary.byStatus[key] || { count: 0, percent: 0 };
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
                      KPI filters, the same "see everything" action as the Clear filter link below.
                      Like the four cards beside it, it is not narrowed by the status filter. */}
                  <KpiCard
                    label="مجموعی"
                    count={statusSummary.total}
                    active={false}
                    onClick={() => setFilters({ status: undefined, performanceRating: undefined })}
                  />
                </div>
              </div>

              <div className="xl:ps-4">
                <p className="mb-1.5 text-center text-sm font-semibold text-gray-700">کارکردگی</p>
                {/* KPI redesign — four band cards (count + share of the RATED tasks) and a real
                    overall-quality card, replacing the old fifth card that showed the number of
                    UNRATED tasks under the label "مجموعی کیفیت". Same component for an Admin (all
                    tasks) and a normal user (their own): the scope is the server's. */}
                <RatingKpiGroup
                  ratings={ratingSummary.ratings}
                  activeRating={params.performanceRating}
                  onToggleRating={(rating) => handleKpiClick('performanceRating', rating)}
                  // One "updating" line for the whole KPI block, whichever group is being refetched.
                  isRefreshing={isSummaryRefreshing}
                />
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

      {/* Prompt — TMS Dashboard header cleanup: a single "ایکشن" trigger (rendered into the
          Navbar via the <PageActions> portal below) holds کالمز (column visibility) + Export +
          WhatsApp Share — the standalone Columns button doesn't exist anywhere else on the page. */}
      <PageActions>
        <ActionsMenu
          onExport={handleDashboardExport}
          isLoading={exportReportHook.isLoading}
          columns={COLUMN_DEFINITIONS}
          isColumnVisible={columnVisibility.isVisible}
          onToggleColumn={columnVisibility.toggleColumn}
        />
      </PageActions>

      <div>
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
          onSendReminder={(task) => setSendNotificationState({ task })}
          onEditSyntheticRating={(task) => setSyntheticRatingTask(task)}
          columnVisibility={columnVisibility}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSort}
        />
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

      {isAdmin && (
        <SyntheticRatingDialog
          isOpen={Boolean(syntheticRatingTask)}
          task={syntheticRatingTask}
          onClose={() => setSyntheticRatingTask(null)}
        />
      )}

      {isAdmin && (
        <SendNotificationDialog
          isOpen={Boolean(sendNotificationState)}
          task={sendNotificationState?.task}
          onClose={() => setSendNotificationState(null)}
        />
      )}
    </div>
  );
}

export default DashboardPage;
