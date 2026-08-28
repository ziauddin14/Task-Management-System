import React, { useEffect, useRef } from 'react'; // explicit import — see src/App.jsx's comment for why
import { Download } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import PreviousUpdatesContent from './PreviousUpdatesContent.jsx';
import WhatsAppShareButton from '../reports/WhatsAppShareButton.jsx';
import { useExportNodeAsImage } from '../../hooks/useExportNodeAsImage.js';

// docs/08-ui-ux.md §7 — reachable directly via the row's own "Previous Updates" button. Wraps the
// same PreviousUpdatesContent used inline inside UpdateModal.jsx, so both entry points render
// identical content rather than two hand-maintained copies.
//
// Prompt 5A/5B — retitled "کام کی تفصیل" (was "پرانی اپڈیٹس"); widened (Modal's maxWidthClassName)
// to comfortably fit the new summary + updates tables; and an Export button in the header row
// captures that same content as a PNG via html2canvas, then offers it through the exact
// WhatsAppShareButton already used by the report-export flow — same Web Share API pattern, same
// desktop/unsupported-browser fallback, no separate implementation.
function PreviousUpdatesModal({ isOpen, onClose, taskId }) {
  const contentRef = useRef(null);
  const { run, isLoading, exportedFile, reset } = useExportNodeAsImage();

  // A stale image from a previously-viewed task (or a previous open of this same task) must never
  // linger into the next open — this component stays mounted across opens/closes (DashboardPage
  // just toggles isOpen/taskId), so the hook's own state would otherwise persist.
  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, taskId, reset]);

  async function handleExport() {
    try {
      await run(contentRef.current, 'kaam-ki-tafseel');
    } catch {
      // useExportNodeAsImage already toasted the error.
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="کام کی تفصیل"
      maxWidthClassName="max-w-4xl"
      headerActions={
        <button
          type="button"
          onClick={handleExport}
          disabled={isLoading}
          className="flex h-10 items-center gap-1 rounded-lg border border-brand px-3 text-sm text-brand hover:bg-brand-light disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {isLoading ? 'تیار ہو رہا ہے۔۔۔' : 'ایکسپورٹ کریں'}
        </button>
      }
    >
      <PreviousUpdatesContent ref={contentRef} taskId={taskId} />
      <WhatsAppShareButton file={exportedFile} title="Kaam ki Tafseel" />
    </Modal>
  );
}

export default PreviousUpdatesModal;
