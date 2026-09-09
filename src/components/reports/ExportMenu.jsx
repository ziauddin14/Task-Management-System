import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Download } from 'lucide-react';
import WhatsAppShareButton from './WhatsAppShareButton.jsx';

// docs/08-ui-ux.md §10, docs/09-frontend-features.md §8 — format picker, plus (dashboard mode
// only) a "Sirf Last Update" checkbox. Prompt — the old Report Type (Summary/Detailed) dropdown
// is gone: there's now one unified grouped-by-Zimmedar report structure regardless of format, and
// this checkbox is its replacement for the one axis that still varies — whether each task's
// Updates section shows its full history or just the most recent entry. Deliberately agnostic of
// WHERE the filters/columns come from — the caller's onExport callback is responsible for
// building the actual request params from its own current state (Phase 10.3's
// useDashboardFilters, or UserSummaryReportPage's own column state) — this is what makes the
// component reusable between both pages rather than duplicated.
function ExportMenu({ mode, onExport, isLoading }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState('excel');
  const [lastUpdateOnly, setLastUpdateOnly] = useState(false);
  const [exportedFile, setExportedFile] = useState(null);

  async function handleConfirm() {
    try {
      const file = await onExport(format, mode === 'dashboard' ? lastUpdateOnly : undefined);
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
        title="ایکسپورٹ کریں"
        className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">ایکسپورٹ کریں</span>
      </button>

      {open && (
        <div className="absolute start-0 z-10 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
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
              {mode === 'dashboard' && <option value="docx">Word</option>}
            </select>
          </label>

          {mode === 'dashboard' && (
            <label className="mb-2 flex h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={lastUpdateOnly}
                onChange={(event) => setLastUpdateOnly(event.target.checked)}
                className="h-4 w-4"
              />
              صرف آخری اپڈیٹ
            </label>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-10 w-full rounded-lg bg-brand px-3 text-sm text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {isLoading ? 'تیار ہو رہا ہے۔۔۔' : 'Confirm'}
          </button>
        </div>
      )}

      <WhatsAppShareButton file={exportedFile} />
    </div>
  );
}

export default ExportMenu;
