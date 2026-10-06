import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Navigate, useLocation } from 'react-router-dom';
import { Plus, BellRing, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { useDashboardFilters } from '../hooks/useDashboardFilters.js';
import { usePageSize } from '../hooks/usePageSize.js';
import { useTasks } from '../hooks/useTasks.js';
import { useDashboardSummary } from '../hooks/useDashboardSummary.js';
import { useCloseTask } from '../hooks/useCloseTask.js';
import { useColumnVisibility } from '../hooks/useColumnVisibility.js';
import { useExportReport } from '../hooks/useExportReport.js';
import { useTriggerReminders } from '../hooks/useTriggerReminders.js';
import QualityHero from '../components/dashboard/QualityHero.jsx';
import StatusDonut from '../components/dashboard/StatusDonut.jsx';
import StatusTileRow from '../components/dashboard/StatusTileRow.jsx';
import FilterBar from '../components/dashboard/FilterBar.jsx';
import TaskTable from '../components/dashboard/TaskTable.jsx';
import ActionsMenu from '../components/dashboard/ActionsMenu.jsx';
import ExportMenu from '../components/reports/ExportMenu.jsx';
import MobileDashboardView from '../components/mobile/MobileDashboardView.jsx';
import MobileTasksView from '../components/mobile/MobileTasksView.jsx';
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
import { useDismissPageActions } from '../contexts/PageActionsDismissContext.js';
import { PAGE_BUTTON_GHOST, PAGE_BUTTON_PRIMARY, PAGE_SUBTITLE, PAGE_TITLE } from '../utils/uiClasses.js';
import { COLUMN_DEFINITIONS } from '../utils/dashboardColumns.js';

const COLUMN_STORAGE_KEY = 'dashboard.visibleColumns.v1';

// docs/08-ui-ux.md §3 — top to bottom: header (AppLayout, already wired, ایکشن menu portalled
// into it), KPI cards, filter bar, task table (frozen header, pagination), Update Modal, Previous
// Updates Modal.
//
// Mobile (< 768px, hooks/useIsMobile.js) — the same page, the same hooks and the same dialogs, laid
// out as two bottom-tab destinations instead of one long screen: `view="dashboard"` (route "/")
// shows the KPIs alone and `view="tasks"` (route "/tasks") the task list as cards. Both read the
// one filter state in the URL, so they always describe the same set, and each fetches only what
// it shows. From 768px up nothing changes: "/" is the whole dashboard as before, and "/tasks" just
// redirects to it (keeping the query string, so a link shared from a phone opens correctly).
function DashboardPage({ view = 'dashboard' }) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isMobile = useIsMobile();
  const location = useLocation();
  const dismissPageActions = useDismissPageActions();
  const showsTaskList = !isMobile || view === 'tasks';
  const showsKpis = !isMobile || view !== 'tasks';

  const [pageSize, setPageSize] = usePageSize();
  const filtersHook = useDashboardFilters(pageSize);
  const { apiFilters, statusSummaryFilters, ratingSummaryFilters, page, params, sortBy, sortOrder, toggleKpiFilter, setFilters, setSort, setPage } =
    filtersHook;

  const tasksQuery = useTasks(apiFilters, { enabled: showsTaskList });
  // The KPI cards follow the dashboard's filters: the same filter state the table uses, minus
  // sort/paging — and each group of cards minus its OWN filter, so the group a card was clicked in
  // keeps showing the whole distribution (see useDashboardFilters). Hence two reads of the same
  // endpoint; with no status and no rating chosen they are one and the same request.
  const statusSummaryQuery = useDashboardSummary(statusSummaryFilters, { enabled: showsKpis });
  const ratingSummaryQuery = useDashboardSummary(ratingSummaryFilters, { enabled: showsKpis });
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

  // Every dialog the page can open. Rendered identically by the desktop layout and by both mobile
  // views, which is why it is built once, here.
  const dialogs = (
    <>
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
          tone="danger"
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
    </>
  );

  if (!isMobile && view === 'tasks') {
    return <Navigate to={{ pathname: '/', search: location.search }} replace />;
  }

  if (isMobile) {
    return (
      <>
        {view === 'tasks' ? (
          <MobileTasksView
            tasks={tasksQuery.data?.items || []}
            meta={tasksQuery.data?.meta}
            isLoading={tasksQuery.isLoading}
            isError={tasksQuery.isError}
            isAdmin={isAdmin}
            filtersHook={filtersHook}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onCreateTask={() => setFormModal({ mode: 'create' })}
            onEdit={(task) => setFormModal({ mode: 'edit', task })}
            onUpdate={(task) => setUpdatingTask(task)}
            onViewUpdates={(task) => setViewingUpdatesTask(task)}
            onSendReminder={(task) => setSendNotificationState({ task })}
            onEditSyntheticRating={(task) => setSyntheticRatingTask(task)}
          />
        ) : (
          <MobileDashboardView
            statusSummary={statusSummary}
            ratingSummary={ratingSummary}
            isLoading={isSummaryLoading}
            isError={statusSummaryQuery.isError || ratingSummaryQuery.isError}
            isRefreshing={isSummaryRefreshing}
            filtersHook={filtersHook}
            isAdmin={isAdmin}
            onCreateTask={() => setFormModal({ mode: 'create' })}
          />
        )}

        {/* The page's own actions, which have no room in the phone's app bar: they go into the
            "مزید" sheet (the mobile layout's PageActions target). Export for everyone — it carries
            the current filters, as on desktop; the two notification actions for an Admin. The
            one that opens a dialog closes the sheet first. */}
        <PageActions>
          <ExportMenu mode="dashboard" onExport={handleDashboardExport} isLoading={exportReportHook.isLoading} variant="menuItem" />
          {isAdmin && (
            <BusyRegion lineClassName="">
              <BusyButton
                onClick={() => triggerRemindersMutation.mutate()}
                busy={triggerRemindersMutation.isPending}
                busyLabel="یاد دہانیاں بھیجی جا رہی ہیں…"
                className="flex h-10 w-full items-center gap-2 rounded-md px-2 text-start text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <BellRing className="h-4 w-4" aria-hidden="true" />
                یاد دہانیاں بھیجیں
              </BusyButton>
            </BusyRegion>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                dismissPageActions();
                setSendNotificationState({ task: null });
              }}
              className="flex h-10 w-full items-center gap-2 rounded-md px-2 text-start text-sm text-gray-700 hover:bg-gray-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              نئی اطلاع بھیجیں
            </button>
          )}
        </PageActions>

        {dialogs}
      </>
    );
  }

  // ---- Desktop / tablet (768px and wider) -----------------------------------------------------
  // Top to bottom: the page header (title, greeting, the Admin's three buttons), the hero
  // ("مجموعی کیفیت") beside the status donut, the four status tiles, the filter card and the task
  // table. Only the look and the arrangement are new: every card is fed by the same two summary
  // requests as before (each group asked without its OWN filter), and every click does what the
  // old KPI cards did — toggleKpiFilter on `status` / `performanceRating`.
  // The dialogs are siblings of the page content, not children of it: the content sets the new
  // ink colour for everything in it, and a dialog that keeps its classic look (Task Details) must
  // not inherit that.
  return (
    <>
      <div className="flex min-w-0 flex-col gap-5 text-tk-ink">
        {/* Web Push addition — appears once (if at all) and disappears for good once dismissed. */}
        <PushPermissionBanner />

        {/* BusyRegion: while "یاد دہانیاں بھیجیں" is in flight, the loading phrase shows on its own
            line under this header row (lineClassName cancels the column's own gap above it). */}
        <BusyRegion lineClassName="-mt-3">
          <div className="tk-rise flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className={PAGE_TITLE}>ڈیش بورڈ</h1>
              <p className={PAGE_SUBTITLE}>
                السلام علیکم{user?.name ? `، ${user.name}` : ''} — آج کی کارکردگی ایک نظر میں
              </p>
            </div>
            {isAdmin && (
              <BusyButton
                onClick={() => triggerRemindersMutation.mutate()}
                busy={triggerRemindersMutation.isPending}
                busyLabel="یاد دہانیاں بھیجی جا رہی ہیں…"
                title="یاد دہانیاں فوراً بھیجیں (روزانہ خودکار بھیجے جانے کا دستی ٹرگر)"
                className={PAGE_BUTTON_GHOST}
              >
                <BellRing className="h-[18px] w-[18px]" aria-hidden="true" />
                یاد دہانیاں بھیجیں
              </BusyButton>
            )}
            {isAdmin && (
              <button type="button" onClick={() => setSendNotificationState({ task: null })} title="نئی اطلاع بھیجیں" className={PAGE_BUTTON_GHOST}>
                <Send className="h-[18px] w-[18px]" aria-hidden="true" />
                نئی اطلاع بھیجیں
              </button>
            )}
            {isAdmin && (
              <button type="button" onClick={() => setFormModal({ mode: 'create' })} className={PAGE_BUTTON_PRIMARY}>
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                نیا کام
              </button>
            )}
          </div>
        </BusyRegion>

        {isSummaryLoading && <LoadingPhrase label="خلاصہ لوڈ ہو رہا ہے۔۔۔" />}

        {statusSummary && ratingSummary && (
          <>
            {/* Hero beside the donut from 1024px up (the hero first: it lands on the right in this
                right-to-left layout); stacked below that. */}
            <div data-dashboard-top className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
              <QualityHero
                className="tk-rise tk-d1"
                ratings={ratingSummary.ratings}
                activeRating={params.performanceRating}
                onToggleRating={(rating) => handleKpiClick('performanceRating', rating)}
                // One "updating" line for the whole KPI block, whichever group is being refetched.
                isRefreshing={isSummaryRefreshing}
              />
              {/* From the summary asked for WITHOUT the status filter: the donut and the tiles always
                  show the whole status distribution of the tasks the other filters leave. Its centre
                  is the old "مجموعی" card: every task regardless of status, and pressing it clears
                  both KPI filters. */}
              <StatusDonut
                className="tk-rise tk-d2"
                byStatus={statusSummary.byStatus}
                total={statusSummary.total}
                activeStatus={params.status}
                onToggleStatus={(status) => handleKpiClick('status', status)}
                onClearKpiFilters={() => setFilters({ status: undefined, performanceRating: undefined })}
                isRefreshing={statusSummaryQuery.isPlaceholderData}
              />
            </div>

            <StatusTileRow
              byStatus={statusSummary.byStatus}
              activeStatus={params.status}
              onToggleStatus={(status) => handleKpiClick('status', status)}
              isRefreshing={statusSummaryQuery.isPlaceholderData}
            />

            {(params.status || params.performanceRating) && (
              <button
                type="button"
                // Single atomic setFilters() call — see hooks/useDashboardFilters.js's comment on
                // setFilters for why two separate toggleKpiFilter() calls here would silently
                // clobber each other instead of clearing both.
                onClick={() => setFilters({ status: undefined, performanceRating: undefined })}
                className="-my-2 flex h-10 w-fit items-center rounded-tk-chip px-2 text-[13px] text-tk-green-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
              >
                × Clear filter
              </button>
            )}
          </>
        )}

        <FilterBar filtersHook={filtersHook} isAdmin={isAdmin} />

        {/* A single "ایکشن" trigger, rendered into the Navbar via the <PageActions> portal, holds
            کالمز (column visibility) + Export + WhatsApp Share. */}
        <PageActions>
          <ActionsMenu
            onExport={handleDashboardExport}
            isLoading={exportReportHook.isLoading}
            columns={COLUMN_DEFINITIONS}
            isColumnVisible={columnVisibility.isVisible}
            onToggleColumn={columnVisibility.toggleColumn}
          />
        </PageActions>

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

      {dialogs}
    </>
  );
}

export default DashboardPage;
