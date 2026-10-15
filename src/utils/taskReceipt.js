// Task receipt — when a task is given to someone they confirm it with "وصول کر لیا", and an admin
// sees who has and who has not (backend: services/receipt.service.js). What the API sends:
//   task.receipt   — admins only: { required, acknowledged, people: [{ id, user: { id, name },
//                    assignedAt, acknowledgedAt, remindersSent }] }, or null;
//   task.myReceipt — everyone else: their own { assignedAt, acknowledgedAt }, or null.
// Both are null on a task from before the feature, and simply ABSENT when the backend predates
// it — every helper here treats null and absent alike, so such a task shows nothing at all.

// The approved wording — no other receipt text is shown anywhere.
export const RECEIPT_TEXT = Object.freeze({
  column: 'وصولی',
  acknowledge: 'وصول کر لیا',
  done: '✓ وصول شدہ',
  pending: 'وصول نہیں ہوا',
});

export function partialLabel(required, acknowledged) {
  return `${required} میں سے ${acknowledged} نے وصول کیا`;
}

// The `receipt` filter's values and their labels (URL param `receipt`). `partial` is an admin
// filter: for a user the server matches nothing with it, so it is never offered to them.
export const RECEIPT_FILTER_LABELS = Object.freeze({
  received: 'وصول شدہ',
  not_received: 'وصول نہیں ہوا',
  partial: 'جزوی',
});

export function receiptFilterOptions(isAdmin) {
  const keys = isAdmin ? ['received', 'not_received', 'partial'] : ['received', 'not_received'];
  return keys.map((value) => ({ value, label: RECEIPT_FILTER_LABELS[value] }));
}

const OPEN_STATUSES = ['ongoing', 'pending'];

// Admin view of a task's receipts: null when there is nothing to show (an old task, or nobody on
// it who has to confirm), otherwise the counts plus `state`: received / not_received / partial.
export function receiptSummary(task) {
  const receipt = task?.receipt;
  if (!receipt || !receipt.required) return null;
  let state = 'partial';
  if (receipt.acknowledged === 0) state = 'not_received';
  else if (receipt.acknowledged >= receipt.required) state = 'received';
  return { ...receipt, people: receipt.people || [], state };
}

export function summaryLabel(summary) {
  if (summary.state === 'received') return RECEIPT_TEXT.done;
  if (summary.state === 'not_received') return RECEIPT_TEXT.pending;
  return partialLabel(summary.required, summary.acknowledged);
}

// The signed-in person's own receipt on this task.
export function isAcknowledged(task) {
  return Boolean(task?.myReceipt?.acknowledgedAt);
}

// Whether to offer them "وصول کر لیا": they have an unconfirmed receipt and the task is still open
// (a closed or completed task that was never confirmed shows no button).
export function canAcknowledge(task) {
  return Boolean(task?.myReceipt && !task.myReceipt.acknowledgedAt && OPEN_STATUSES.includes(task.status));
}

// Whether the backend in use knows about receipts at all — its tasks carry the `myReceipt` key
// (null or not). Until it does, the receipt filter is not offered: an older backend would reject it.
export function receiptsSupported(tasks) {
  return (tasks || []).some((task) => task && Object.prototype.hasOwnProperty.call(task, 'myReceipt'));
}

// The tint of a receipt status chip: green when done, amber while waiting, a softer amber in between.
export function receiptToneClass(state) {
  if (state === 'received') return 'bg-tk-good-bg text-tk-good';
  if (state === 'not_received') return 'bg-tk-amber-bg text-tk-amber-text';
  return 'bg-tk-pending-tint text-tk-pending-ink';
}
