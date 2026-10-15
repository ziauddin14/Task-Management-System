import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { ClipboardCheck } from 'lucide-react';
import BusyButton from '../common/BusyButton.jsx';
import BusyRegion from '../common/BusyRegion.jsx';
import { useAcknowledgeTask } from '../../hooks/useAcknowledgeTask.js';
import { RECEIPT_TEXT, receiptToneClass } from '../../utils/taskReceipt.js';

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700';

// The look of each place the button appears:
//   compact — a table row or a notification in the bell: a small pill;
//   card    — a task card on a phone: a pill at least 44px tall (a thumb's target);
//   sheet   — the first action of a task's sheet on a phone: full width, like the other actions.
const BUTTON_CLASS = {
  compact: 'h-[34px] justify-center rounded-tk-pill px-[14px] text-[12.5px]',
  card: 'min-h-tk-touch justify-center rounded-tk-pill px-[18px] text-[14px]',
  // Like the sheet's other actions: icon, then the label, from the start edge.
  sheet: 'min-h-[48px] w-full justify-start gap-tk-gap rounded-tk-input px-tk-card text-start text-[15px]',
};
const DONE_CLASS = {
  compact: 'rounded-tk-pill px-[10px] text-[12px] leading-[2.3]',
  card: 'rounded-tk-pill px-[12px] text-[13px] leading-[2.3]',
  sheet: 'flex min-h-[48px] w-full items-center justify-center rounded-tk-input text-[15px]',
};

// "✓ وصول شدہ" — the done state, wherever a receipt is shown as confirmed.
export function ReceiptDoneChip({ size = 'compact', className }) {
  return (
    <span data-receipt-done className={clsx('inline-block whitespace-nowrap font-semibold', receiptToneClass('received'), DONE_CLASS[size], className)}>
      {RECEIPT_TEXT.done}
    </span>
  );
}

// "وصول کر لیا" — confirms the signed-in person's own receipt on `taskId`. While it runs the button
// keeps its label and size, is disabled and aria-busy, and the loading phrase shows (under it, or
// — full width on the sheet — inside it); once it succeeds it is replaced by the done chip. An
// error is shown by the app's global mutation handler and the button simply becomes usable again.
// `ownRegion={false}` — the caller already wraps a wider row in a <BusyRegion>, so the phrase shows
// under that whole row instead (the bell's notification row).
function AcknowledgeButton({ taskId, size = 'compact', className, ownRegion = true }) {
  const acknowledge = useAcknowledgeTask();

  if (acknowledge.isSuccess) {
    return <ReceiptDoneChip size={size} className={className} />;
  }

  const button = (
    <BusyButton
      onClick={() => acknowledge.mutate(taskId)}
      busy={acknowledge.isPending}
      phraseInside={size === 'sheet'}
      data-acknowledge-button
      className={clsx(
        'flex shrink-0 items-center whitespace-nowrap bg-tk-green-700 font-semibold leading-tk-label text-white transition-colors hover:bg-tk-green-900 disabled:cursor-not-allowed',
        size !== 'sheet' && 'disabled:opacity-60',
        FOCUS_RING,
        BUTTON_CLASS[size],
        className
      )}
    >
      {size === 'sheet' && <ClipboardCheck className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />}
      <span>{RECEIPT_TEXT.acknowledge}</span>
    </BusyButton>
  );

  // The sheet's full-width button carries its phrase inside; everywhere else the phrase needs a
  // region of its own to show under the button.
  return size === 'sheet' || !ownRegion ? button : <BusyRegion>{button}</BusyRegion>;
}

export default AcknowledgeButton;
