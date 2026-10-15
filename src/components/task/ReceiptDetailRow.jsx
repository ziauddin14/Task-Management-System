import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { useAuthStore } from '../../store/authStore.js';
import { RECEIPT_TEXT, isAcknowledged, receiptSummary } from '../../utils/taskReceipt.js';
import ReceiptStatus, { ReceiptPeopleList } from './ReceiptStatus.jsx';
import { ReceiptDoneChip } from './AcknowledgeButton.jsx';

// The one row the task-receipt feature adds to the Task Details dialog (کام کی تفصیل): "وصولی",
// then — for an admin — the status and who has / has not confirmed (with the time), or — for a
// user — their own "✓ وصول شدہ" / "وصول نہیں ہوا".
//
// It renders NOTHING when there is nothing to show (a task from before the feature, a backend
// without receipts, a task with nobody to confirm), so for such a task the dialog is exactly what
// it was. data-export-exclude keeps it out of the dialog's PNG export (useExportNodeAsImage).
function ReceiptDetailRow({ task }) {
  const isAdmin = useAuthStore((state) => state.user?.role) === 'admin';
  const summary = isAdmin ? receiptSummary(task) : null;
  const mine = !isAdmin ? task?.myReceipt : null;
  if (!summary && !mine) return null;

  return (
    <div data-receipt-detail data-export-exclude className="flex flex-wrap items-start gap-x-3 gap-y-2 rounded-tk-tile bg-tk-surface px-3 py-2 text-tk-ink">
      <span className="text-[13px] font-semibold leading-tk-label text-tk-ink-soft">{RECEIPT_TEXT.column}:</span>
      {summary ? (
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <ReceiptStatus task={task} />
          <ReceiptPeopleList people={summary.people} />
        </div>
      ) : isAcknowledged(task) ? (
        <ReceiptDoneChip />
      ) : (
        <span className="text-[13px] leading-tk-label">{RECEIPT_TEXT.pending}</span>
      )}
    </div>
  );
}

export default ReceiptDetailRow;
