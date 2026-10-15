import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { FloatingPortal } from '@floating-ui/react';
import { useFloatingMenu } from '../../hooks/useFloatingMenu.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { RECEIPT_TEXT, receiptSummary, receiptToneClass, summaryLabel } from '../../utils/taskReceipt.js';

const CHIP_CLASS = 'inline-flex items-center whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] leading-[2.3]';

// Who has and who has not confirmed (task receipt) — one line per person: their name, and either
// "✓ وصول شدہ" with the time or "وصول نہیں ہوا". Admin data only (task.receipt.people).
export function ReceiptPeopleList({ people, className }) {
  return (
    <ul data-receipt-people className={clsx('flex flex-col gap-[6px]', className)}>
      {people.map((person) => (
        <li key={person.id} className="flex flex-wrap items-center gap-x-2 text-[13px] leading-tk-label">
          <span className="font-semibold text-tk-ink">{person.user?.name || '-'}</span>
          {person.acknowledgedAt ? (
            <>
              <span className={clsx(CHIP_CLASS, receiptToneClass('received'))}>{RECEIPT_TEXT.done}</span>
              <span className="text-[12px] text-tk-muted" dir="ltr">
                {formatDateTime(person.acknowledgedAt)}
              </span>
            </>
          ) : (
            <span className={clsx(CHIP_CLASS, receiptToneClass('not_received'))}>{RECEIPT_TEXT.pending}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// An admin's view of one task's receipts, as a tinted chip: "✓ وصول شدہ", "وصول نہیں ہوا", or
// "N میں سے M نے وصول کیا". With `withPopover` the chip is a button opening the per-person list
// (portal-rendered, like the row actions menu, so the table's scroll area cannot clip it).
// Renders nothing for a task with no receipts to show.
function ReceiptStatus({ task, withPopover = false, className }) {
  const summary = receiptSummary(task);
  const { open, refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingMenu({ placement: 'bottom-start' });
  if (!summary) return null;

  const label = summaryLabel(summary);
  const chipClass = clsx(CHIP_CLASS, receiptToneClass(summary.state), 'font-semibold', className);

  if (!withPopover) {
    return (
      <span data-receipt-status={summary.state} className={chipClass}>
        {label}
      </span>
    );
  }

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-receipt-status={summary.state}
        className={clsx(chipClass, 'transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700')}
        {...getReferenceProps()}
      >
        {label}
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            role="dialog"
            aria-label={RECEIPT_TEXT.column}
            data-receipt-popover
            className="z-50 w-max min-w-[14rem] max-w-[calc(100vw-1rem)] rounded-tk-tile border border-tk-line bg-white p-3 text-tk-ink shadow-tk-lift"
            {...getFloatingProps()}
          >
            <p className="mb-2 text-[12px] font-semibold leading-tk-label text-tk-muted">{RECEIPT_TEXT.column}</p>
            <ReceiptPeopleList people={summary.people} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default ReceiptStatus;
