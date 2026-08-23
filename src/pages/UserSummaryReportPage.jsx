import React from 'react'; // explicit import — see src/App.jsx's comment for why
import ColumnToggle from '../components/dashboard/ColumnToggle.jsx';
import ExportMenu from '../components/reports/ExportMenu.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { useColumnVisibility } from '../hooks/useColumnVisibility.js';
import { useExportUserSummary } from '../hooks/useExportUserSummary.js';
import { USER_SUMMARY_COLUMN_DEFINITIONS } from '../utils/userSummaryColumns.js';

const STORAGE_KEY = 'userSummary.visibleColumns.v1';

// docs/08-ui-ux.md §9 — table (Name, Responsibility, same KPI columns as dashboard), a column-hide
// control feeding the export, an Export action reusing the same ExportMenu as the dashboard.
//
// GAP (reported, not silently resolved — see Phase 10.6 report §J): docs/05-apis.md §9's
// GET /reports/user-summary requires a `format` query param on every call (verified directly
// against backend/src/validators/report.validator.js's userSummaryQuerySchema — `format` is not
// optional) — there is no JSON-returning variant of this endpoint anywhere in the backend, only a
// binary-file-generating one. That means there is no way to render a live on-screen preview table
// without either inventing a new backend endpoint (out of scope for a frontend-only sub-phase) or
// duplicating report.service.js's per-user aggregation logic client-side (which would drift from
// the server's own computation over time). This page therefore builds everything that IS actually
// backed by the real API — the column-hide control (which correctly feeds the export's `columns`
// param) and the Export action — and is explicit about the missing preview rather than faking one.
function UserSummaryReportPage() {
  const columnVisibility = useColumnVisibility(STORAGE_KEY, USER_SUMMARY_COLUMN_DEFINITIONS);
  const { run, isLoading } = useExportUserSummary();

  async function handleExport(format) {
    const columns = USER_SUMMARY_COLUMN_DEFINITIONS.filter((col) => columnVisibility.isVisible(col.key)).map((col) => col.key);
    return run({ format, columns: columns.join(',') });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">User Summary Report</h1>
        <div className="flex items-center gap-2">
          <ColumnToggle
            columns={USER_SUMMARY_COLUMN_DEFINITIONS}
            isVisible={columnVisibility.isVisible}
            onToggle={columnVisibility.toggleColumn}
          />
          <ExportMenu mode="userSummary" onExport={handleExport} isLoading={isLoading} />
        </div>
      </div>

      <EmptyState message="Live preview yahan uplabdh nahi hai — Export button se report file hasil karein." />
    </div>
  );
}

export default UserSummaryReportPage;
