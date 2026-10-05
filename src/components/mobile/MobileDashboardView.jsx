import React from 'react'; // explicit import — see src/App.jsx's comment for why
import LoadingPhrase from '../common/LoadingPhrase.jsx';
import EmptyState from '../common/EmptyState.jsx';
import PushPermissionBanner from '../common/PushPermissionBanner.jsx';
import QualityHeroCard from './QualityHeroCard.jsx';
import AttentionBanner from './AttentionBanner.jsx';
import StatusTiles from './StatusTiles.jsx';
import FilterChips from './FilterChips.jsx';
import NewTaskFab from './NewTaskFab.jsx';
import { useAssignableUsers } from '../../hooks/useAssignableUsers.js';
import { buildFilterHref, describeActiveFilters } from '../../utils/taskFilters.js';

// The "ڈیش بورڈ" tab on a phone: the KPIs alone — the hero card (overall quality), the delay
// banner and the four status tiles. The task list is its own tab ("/tasks").
//
// It follows the dashboard's filters exactly as the desktop KPI cards do: `statusSummary` is the
// summary asked for without the status filter, `ratingSummary` the one without the rating filter
// (DashboardPage passes the same two it always computed). Any filter in force is shown as a chip
// at the top, so a narrowed set of figures is never mistaken for the whole — and can be cleared
// right there.
//
// Every figure that can be acted on is a link into the task list with that filter added to the
// ones already in force: a status tile, a rating band, "بغیر درجہ بندی", the delay banner.
function MobileDashboardView({ statusSummary, ratingSummary, isLoading, isError, isRefreshing, filtersHook, isAdmin, onCreateTask }) {
  const { params, setFilters } = filtersHook;
  const { data: assignableUsers } = useAssignableUsers({ enabled: isAdmin && Boolean(params.assigneeId) });
  const chips = describeActiveFilters(params, { users: assignableUsers?.items || [], includeSearch: true });

  const tasksHref = (patch) => buildFilterHref('/tasks', params, patch);
  const pendingCount = statusSummary?.byStatus?.pending?.count ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-[14px]">
      <h1 className="sr-only">ڈیش بورڈ</h1>

      <PushPermissionBanner />

      <FilterChips chips={chips} onRemove={(chip) => setFilters(chip.clear)} />

      {isLoading && <LoadingPhrase label="خلاصہ لوڈ ہو رہا ہے۔۔۔" />}
      {!isLoading && isError && <EmptyState message="خلاصہ لوڈ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" />}

      {ratingSummary && (
        <QualityHeroCard
          ratings={ratingSummary.ratings}
          activeRating={params.performanceRating}
          hrefForRating={(rating) => tasksHref({ performanceRating: rating })}
          isRefreshing={isRefreshing}
        />
      )}

      {statusSummary && <AttentionBanner count={pendingCount} to={tasksHref({ status: 'pending' })} />}

      {statusSummary && (
        <StatusTiles
          byStatus={statusSummary.byStatus}
          total={statusSummary.total}
          activeStatus={params.status}
          hrefForStatus={(status) => tasksHref({ status })}
          isRefreshing={isRefreshing}
        />
      )}

      {/* Room for the floating "نیا کام" button, so it never covers the last tile. */}
      {isAdmin && <div aria-hidden="true" className="h-[44px]" />}
      {isAdmin && <NewTaskFab onClick={onCreateTask} />}
    </div>
  );
}

export default MobileDashboardView;
