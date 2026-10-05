import React, { useEffect, useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { SearchX } from 'lucide-react';
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import EmptyState from '../common/EmptyState.jsx';
import MobileFilterBar from './MobileFilterBar.jsx';
import TaskCard from './TaskCard.jsx';
import TaskActionSheet from './TaskActionSheet.jsx';
import NewTaskFab from './NewTaskFab.jsx';
import { TaskListHeader, TaskListPagination } from './TaskListControls.jsx';

// The "ٹاسک" tab on a phone: search + filters, then the tasks as cards (the desktop table's rows),
// then previous/next. Same data, same filters, same handlers as the table — DashboardPage owns
// all of it and passes it down; this only lays it out for a narrow screen.
//
// Tapping a card opens that task's details-and-actions sheet, from which every row action the
// table's menu offers is reachable (the Admin-only ones included).
function MobileTasksView({
  tasks,
  meta,
  isLoading,
  isError,
  isAdmin,
  filtersHook,
  pageSize,
  onPageSizeChange,
  onCreateTask,
  onEdit,
  onUpdate,
  onViewUpdates,
  onSendReminder,
  onEditSyntheticRating,
}) {
  const { page, sortBy, sortOrder, setSort, setPage, hasActiveFilters, clearAllFilters } = filtersHook;
  const [openTask, setOpenTask] = useState(null);

  // A new page of cards starts at its top — the control that asked for it is at the very bottom.
  const previousPage = useRef(page);
  useEffect(() => {
    if (previousPage.current !== page) {
      previousPage.current = page;
      window.scrollTo?.(0, 0);
    }
  }, [page]);

  const showList = !isLoading && !isError && tasks.length > 0;
  const showEmpty = !isLoading && !isError && tasks.length === 0;
  // The count-and-sort row stays mounted while a list is loading too: changing the sort is itself
  // what starts a load, and the control must not vanish from under the hand that just used it.
  const showHeader = !isError && !showEmpty;

  return (
    <div className="flex min-w-0 flex-col gap-tk-gap">
      <h1 className="sr-only">ٹاسک</h1>

      <MobileFilterBar filtersHook={filtersHook} isAdmin={isAdmin} />

      {showHeader && <TaskListHeader total={isLoading ? undefined : meta?.total} sortBy={sortBy} sortOrder={sortOrder} onSortChange={setSort} />}

      {isLoading && <LoadingPhrase label="کام لوڈ ہو رہے ہیں…" />}

      {!isLoading && isError && <EmptyState message="کام لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" />}

      {showEmpty && (
        <div className="flex flex-col items-center gap-tk-gap-sm rounded-tk-card bg-tk-card px-tk-page py-[28px] text-center shadow-tk-soft">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-tk-green-50">
            <SearchX className="h-[26px] w-[26px] text-tk-green-700" aria-hidden="true" />
          </span>
          <p className="text-[15px] font-semibold leading-tk-label">{hasActiveFilters ? 'اس فلٹر سے کوئی کام نہیں ملا' : 'ابھی کوئی کام موجود نہیں'}</p>
          {hasActiveFilters && (
            <>
              <p className="text-[13px] leading-tk-label text-tk-muted">فلٹر یا تلاش بدل کر دوبارہ دیکھیں۔</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-[4px] h-tk-touch rounded-tk-input bg-tk-green-700 px-[20px] text-[14px] font-semibold leading-tk-label text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
              >
                فلٹر صاف کریں
              </button>
            </>
          )}
        </div>
      )}

      {showList && (
        <>
          <ul className="flex flex-col gap-tk-gap">
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskCard task={task} onOpen={setOpenTask} />
              </li>
            ))}
          </ul>

          <TaskListPagination
            page={page}
            totalPages={meta?.totalPages || 1}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}

      {/* Room for the floating "نیا کام" button, so it never covers the last control. */}
      {isAdmin && <div aria-hidden="true" className="h-[52px]" />}
      {isAdmin && <NewTaskFab onClick={onCreateTask} />}

      <TaskActionSheet
        task={openTask}
        onClose={() => setOpenTask(null)}
        isAdmin={isAdmin}
        onUpdate={onUpdate}
        onViewUpdates={onViewUpdates}
        onEdit={onEdit}
        onSendReminder={onSendReminder}
        onEditSyntheticRating={onEditSyntheticRating}
      />
    </div>
  );
}

export default MobileTasksView;
