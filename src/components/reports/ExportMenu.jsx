import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Download } from 'lucide-react';
import WhatsAppShareButton from './WhatsAppShareButton.jsx';

// docs/08-ui-ux.md §10, docs/09-frontend-features.md §8 — format + report-type picker (report
// type is dashboard-only per §10 step 2; the User Summary export has no report-type choice).
// Deliberately agnostic of WHERE the filters/columns come from — the caller's onExport callback
// is responsible for building the actual request params from its own current state (Phase 10.3's
// useDashboardFilters + the lifted columnVisibility, or UserSummaryReportPage's own column
// state) — this is what makes the component reusable between both pages rather than duplicated.
function ExportMenu({ mode, onExport, isLoading }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('excel');
  const [reportType, setReportType] = useState('summary');
  const [exportedFile, setExportedFile] = useState(null);

  async function handleConfirm() {
    try {
      const file = await onExport(format, mode === 'dashboard' ? reportType : undefined);
      setExportedFile(file);
      setOpen(false);
    } catch {
      // onExport (useExportReport/useExportUserSummary) already toasted the error.
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export
      </button>

      {open && (
        <div className="absolute end-0 z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <label className="mb-2 block text-sm">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2"
            >
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="jpeg">JPEG</option>
            </select>
          </label>

          {mode === 'dashboard' && (
            <label className="mb-2 block text-sm">
              Report Type
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2"
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-10 w-full rounded-lg bg-brand px-3 text-sm text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {isLoading ? 'Generate ho raha hai...' : 'Confirm'}
          </button>
        </div>
      )}

      <WhatsAppShareButton file={exportedFile} />
    </div>
  );
}

export default ExportMenu;
