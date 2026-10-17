import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Check, Search } from 'lucide-react';
import { useActivitySummary } from '../hooks/useActivitySummary.js';
import { useActivityUsers } from '../hooks/useActivityUsers.js';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch.js';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePageSize.js';
import ActivitySummaryTiles from '../components/activity/ActivitySummaryTiles.jsx';
import ActivityUserList from '../components/activity/ActivityUserList.jsx';
import UserActivityDialog from '../components/activity/UserActivityDialog.jsx';
import Pagination from '../components/common/Pagination.jsx';
import { PAGE_TITLE } from '../utils/uiClasses.js';

const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[1];
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700';

// The Admin-only activity log (route /activity, inside the admin RoleGuard): three figures, then
// every ACTIVE account — admins included — with its last login, last activity, last action and the
// days without activity, most inactive first; an account with no activity for more than N days is
// tinted and badged "غیر متحرک". A search (name, email or responsibility) also finds deactivated
// accounts, so their history stays reachable. "صرف غیر متحرک" narrows the list to the flagged ones
// (?inactive=1, which the dashboard alert links to). A name opens that person's timeline.
// Every time here is Pakistan time. If the backend has no activity log yet (or it fails), the
// list says so calmly and the figures are left out; nothing here can break the rest of the app.
function ActivityLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const inactiveOnly = searchParams.get('inactive') === '1';
  const [searchInput, setSearchInput, debouncedSearch] = useDebouncedSearch('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState(null);

  const summaryQuery = useActivitySummary();
  const usersQuery = useActivityUsers({
    search: debouncedSearch || undefined,
    inactiveOnly: inactiveOnly ? 'true' : undefined,
    page,
    limit: pageSize,
  });
  const rows = usersQuery.data?.items || [];
  const meta = usersQuery.data?.meta;

  function toggleInactiveOnly() {
    const next = new URLSearchParams(searchParams);
    if (inactiveOnly) next.delete('inactive');
    else next.set('inactive', '1');
    setSearchParams(next, { replace: true });
    setPage(1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-[14px]">
      <div className="tk-rise flex flex-wrap items-center gap-[14px] text-tk-ink">
        <div className="min-w-0 flex-1">
          <h1 className={PAGE_TITLE}>ایکٹیویٹی لاگ</h1>
        </div>
        <label className="flex h-[48px] w-full items-center gap-2 rounded-tk-btn bg-tk-card px-[14px] shadow-[0_1px_0_var(--tk-line)] focus-within:ring-2 focus-within:ring-tk-green-700 sm:w-[300px]">
          <Search className="h-[18px] w-[18px] shrink-0 text-tk-muted" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="نام یا ای میل تلاش کریں…"
            aria-label="نام یا ای میل تلاش کریں"
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-tk-ink placeholder:text-tk-muted focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={toggleInactiveOnly}
          aria-pressed={inactiveOnly}
          className={clsx(
            'flex h-[48px] shrink-0 items-center gap-2 rounded-tk-input border px-[18px] text-[14px] leading-tk-label transition-colors',
            FOCUS_RING,
            inactiveOnly ? 'border-tk-danger-line bg-tk-weak-tint font-semibold text-tk-weak-ink' : 'border-tk-line-btn bg-white text-tk-green-900 hover:bg-tk-hover'
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              'flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border',
              inactiveOnly ? 'border-tk-weak bg-tk-weak text-white' : 'border-tk-line-btn bg-white'
            )}
          >
            {inactiveOnly && <Check className="h-[13px] w-[13px]" strokeWidth={3} />}
          </span>
          صرف غیر متحرک
        </button>
      </div>

      {!summaryQuery.isError && <ActivitySummaryTiles summary={summaryQuery.data} />}

      <ActivityUserList
        rows={rows}
        baselineAt={meta?.baselineAt ?? summaryQuery.data?.baselineAt}
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        onOpen={setSelected}
      />

      {meta && !usersQuery.isError && meta.total > PAGE_SIZE_OPTIONS[0] && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <UserActivityDialog user={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default ActivityLogPage;
