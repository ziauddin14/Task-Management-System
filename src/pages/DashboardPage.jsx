import React, { useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useDashboardFilters } from '../hooks/useDashboardFilters.js';
import { usePageSize } from '../hooks/usePageSize.js';
import { useTasks } from '../hooks/useTasks.js';
import { useDashboardSummary } from '../hooks/useDashboardSummary.js';
import { useCloseTask } from '../hooks/useCloseTask.js';
import KpiCard from '../components/dashboard/KpiCard.jsx';
import FilterBar from '../components/dashboard/FilterBar.jsx';
import TaskTable from '../components/dashboard/TaskTable.jsx';
import TaskFormModal from '../components/task/TaskFormModal.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { STATUS_META, getStatusMeta, getPerformanceMeta, PERFORMANCE_SUMMARY_KEY_TO_VALUE } from '../utils/taskDisplay.js';

const STATUS_KEYS = Object.keys(STATUS_META);
const PERFORMANCE_SUMMARY_KEYS = Object.keys(PERFORMANCE_SUMMARY_KEY_TO_VALUE);

// docs/08-ui-ux.md §3 — top to bottom: header (AppLayout, already wired), KPI cards, filter bar,
// task table (+ column control, frozen header, pagination). Update Modal, Previous Updates Modal,
// attachment upload, Users page, and Reports/Export are explicitly out of scope for this
// sub-phase — the table's Update/Previous Updates buttons are rendered but inert (TaskTable.jsx).
function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [pageSize, setPageSize] = usePageSize();
  const filtersHook = useDashboardFilters(pageSize);
  const { apiFilters, page, params, toggleKpiFilter, setFilters, setPage } = filtersHook;

  const tasksQuery = useTasks(apiFilters);
  const summaryQuery = useDashboardSummary();

  const tableRef = useRef(null);

  const [formModal, setFormModal] = useState(null); // { mode: 'create' } | { mode: 'edit', task }
  const [closingTask, setClosingTask] = useState(null);
  const closeTaskMutation = useCloseTask(closingTask?.id);

  function handleKpiClick(paramKey, value) {
    toggleKpiFilter(paramKey, value);
    tableRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function handleCloseConfirm() {
    closeTaskMutation.mutate(undefined, {
      onSuccess: () => setClosingTask(null),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setFormModal({ mode: 'create' })}
            className="flex h-10 items-center gap-1 rounded-lg bg-brand px-4 text-white hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Naya Kaam
          </button>
        )}
      </div>

      {summaryQuery.isLoading && <Spinner label="Khulasa load ho raha hai..." />}

      {summaryQuery.data && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">Kaam ki Kaifiyat</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] snap-x md:flex-wrap md:overflow-visible">
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
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">Karkardagi</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] snap-x md:flex-wrap md:overflow-visible">
              {PERFORMANCE_SUMMARY_KEYS.map((key) => {
                const entry = summaryQuery.data.byPerformance[key] || { count: 0, percent: 0 };
                const ratingValue = PERFORMANCE_SUMMARY_KEY_TO_VALUE[key];
                return (
                  <KpiCard
                    key={key}
                    label={getPerformanceMeta(ratingValue).label}
                    count={entry.count}
                    percent={entry.percent}
                    active={params.performanceRating === ratingValue}
                    onClick={() => handleKpiClick('performanceRating', ratingValue)}
                  />
                );
              })}
            </div>
          </div>

          {(params.status || params.performanceRating) && (
            <button
              type="button"
              // Single atomic setFilters() call — see hooks/useDashboardFilters.js's comment on
              // setFilters for why two separate toggleKpiFilter() calls here would silently
              // clobber each other instead of clearing both.
              onClick={() => setFilters({ status: undefined, performanceRating: undefined })}
              className="w-fit text-sm text-brand hover:underline"
            >
              × Clear filter
            </button>
          )}
        </div>
      )}

      <FilterBar filtersHook={filtersHook} isAdmin={isAdmin} />

      <div ref={tableRef}>
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
          onClose={(task) => setClosingTask(task)}
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
          title="Kaam Close Karein"
          message="Is kaam ko close karne ke baad koi nayi update darj nahi ki ja sakegi. Wakai close karna chahte hain?"
          confirmLabel="Haan, Close Karein"
          cancelLabel="Cancel"
          onConfirm={handleCloseConfirm}
          onCancel={() => setClosingTask(null)}
          isLoading={closeTaskMutation.isPending}
        />
      )}
    </div>
  );
}

export default DashboardPage;
