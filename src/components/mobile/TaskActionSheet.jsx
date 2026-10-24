import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Bell, Gauge, History, Pencil, Upload } from 'lucide-react';
import BottomSheet from './BottomSheet.jsx';
import { formatDateShortYear, formatTimeStatusLabel } from '../../utils/formatDate.js';
import { getPerformanceMeta, getStatusMeta, isSyntheticRating, isFinalRating, formatCompletionPercent, FINAL_RATING_NOTE, SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';
import { getRatingTone, getStatusTone } from '../../utils/mobileTheme.js';
import { RECEIPT_TEXT, canAcknowledge, isAcknowledged, receiptSummary } from '../../utils/taskReceipt.js';
import ReceiptStatus, { ReceiptPeopleList } from '../task/ReceiptStatus.jsx';
import AcknowledgeButton, { ReceiptDoneChip } from '../task/AcknowledgeButton.jsx';

const CHIP_CLASS = 'whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] leading-[2.3]';
const ACTION_CLASS =
  'flex min-h-[48px] w-full items-center gap-tk-gap rounded-tk-input px-tk-card text-start text-[15px] leading-tk-label focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700 disabled:opacity-45';

function Fact({ label, children, className }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <dt className="text-[12px] leading-tk-label text-tk-muted">{label}</dt>
      <dd className="break-words text-[14px] leading-tk-label text-tk-ink">{children}</dd>
    </div>
  );
}

function Action({ icon: Icon, label, onClick, disabled, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(ACTION_CLASS, primary ? 'bg-tk-green-700 font-semibold text-white' : 'border border-tk-line-strong bg-tk-card text-tk-ink')}
    >
      <Icon className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

// What a tap on a task card opens: the task's own details (everything the desktop table shows in
// its columns) and, under them, every action the table's row menu offers — the same handlers, the
// same rules. "اپڈیٹ کریں" and "ترمیم کریں" are unavailable on a closed task; the Admin-only
// actions appear for an Admin alone; changing a "تخمینی" rating is offered only on a task that
// has one. Choosing an action closes the sheet and hands over to that action's existing dialog.
//
// The completion bar is the task's REAL percent. A synthetic rating's assumed percent is stated
// separately, in words, beside the rating.
function TaskActionSheet({ task, onClose, isAdmin, onUpdate, onViewUpdates, onEdit, onSendReminder, onEditSyntheticRating }) {
  if (!task) return <BottomSheet isOpen={false} onClose={onClose} title="کام" />;

  const statusMeta = getStatusMeta(task.status);
  const statusTone = getStatusTone(task.status);
  const ratingMeta = getPerformanceMeta(task.performanceRating);
  const ratingTone = getRatingTone(task.performanceRating);
  const isSynthetic = isSyntheticRating(task);
  const isFinal = isFinalRating(task);
  const isClosed = task.status === 'closed';
  const percent = task.completionPercent ?? 0;

  function run(handler) {
    return () => {
      onClose();
      handler(task);
    };
  }

  return (
    <BottomSheet isOpen onClose={onClose} title={`کام ${task.codeNumber}`}>
      <div className="flex flex-col gap-tk-gap">
        <div className="flex flex-wrap items-center gap-tk-gap-sm">
          <span className={clsx(CHIP_CLASS, statusTone.chip)}>{statusMeta.label}</span>
          {ratingTone && <span className={clsx(CHIP_CLASS, ratingTone.chip, isSynthetic && 'border border-dashed border-current')}>{ratingMeta.label}</span>}
          {isSynthetic && (
            <span className="text-[12px] leading-tk-label text-tk-muted">
              {SYNTHETIC_LABEL} — فرض کردہ <span dir="ltr">{task.syntheticRating.assumedPercent}%</span>
            </span>
          )}
        </div>

        <p className="text-[16px] font-semibold leading-tk-label">{task.title}</p>

        <dl className="grid grid-cols-2 gap-x-tk-gap gap-y-[4px]">
          <Fact label="ذمہ دار">{(task.assignees || []).map((person) => person.name).join('، ') || '-'}</Fact>
          <Fact label="ذمہ داری">{task.responsibility || '-'}</Fact>
          <Fact label="آخری تاریخ">
            <span dir="ltr">{formatDateShortYear(task.deadline)}</span>
          </Fact>
          <Fact label="وقتی صورتحال">
            <span className={clsx(task.timeStatus?.type === 'overdue' || task.timeStatus?.type === 'late' ? 'text-tk-danger' : undefined)}>
              {formatTimeStatusLabel(task.timeStatus)}
            </span>
          </Fact>
          <Fact label="آخری اپڈیٹ">
            <span dir="ltr">{formatDateShortYear(task.lastUpdateAt)}</span>
          </Fact>
          <Fact label="تکمیل فیصد">
            <span className="flex items-center gap-tk-gap-sm">
              <span className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-tk-pill bg-tk-track">
                <span className={clsx('block h-full rounded-tk-pill', statusTone.bar)} style={{ width: `${percent}%` }} />
              </span>
              <span dir="ltr">{formatCompletionPercent(task)}</span>
            </span>
          </Fact>
          {/* Task receipt: an admin sees who has and who has not confirmed; a user, their own state.
              Not shown on a task from before the feature. */}
          {isAdmin && receiptSummary(task) && (
            <Fact label={RECEIPT_TEXT.column} className="col-span-2">
              <span className="flex flex-col items-start gap-[6px] pt-[2px]">
                <ReceiptStatus task={task} />
                <ReceiptPeopleList people={receiptSummary(task).people} />
              </span>
            </Fact>
          )}
          {!isAdmin && task.myReceipt && (
            <Fact label={RECEIPT_TEXT.column}>
              {isAcknowledged(task) ? <ReceiptDoneChip /> : RECEIPT_TEXT.pending}
            </Fact>
          )}
        </dl>

        <div className="flex flex-col gap-tk-gap-sm border-t border-tk-line pt-tk-gap">
          {/* "وصول کر لیا" — the first action while the person's own receipt is open. It does not
              close the sheet: it turns into "✓ وصول شدہ" in place. */}
          {!isAdmin && canAcknowledge(task) && <AcknowledgeButton taskId={task.id} size="sheet" />}
          <Action icon={Upload} label="اپڈیٹ کریں" onClick={run(onUpdate)} disabled={isClosed} primary />
          {isClosed && <p className="text-[12px] leading-tk-label text-tk-muted">یہ کام بند ہو چکا ہے، اس میں نئی اپڈیٹ درج نہیں ہو سکتی۔</p>}
          <Action icon={History} label="کام کی تفصیل اور پرانی اپڈیٹس" onClick={run(onViewUpdates)} />
          {isAdmin && <Action icon={Pencil} label="ترمیم کریں" onClick={run(onEdit)} disabled={isClosed} />}
          {isAdmin && <Action icon={Bell} label="یاددہانی بھیجیں" onClick={run(onSendReminder)} />}
          {/* Once an admin has changed the estimate the rating is FINAL: the action stays,
              disabled like "اپڈیٹ کریں" on a closed task, with the reason under it. */}
          {isAdmin && (isSynthetic || isFinal) && (
            <Action icon={Gauge} label={`${SYNTHETIC_LABEL} درجہ بندی تبدیل کریں`} onClick={run(onEditSyntheticRating)} disabled={isFinal} />
          )}
          {isAdmin && isFinal && <p className="text-[12px] leading-tk-label text-tk-muted">{FINAL_RATING_NOTE}</p>}
        </div>
      </div>
    </BottomSheet>
  );
}

export default TaskActionSheet;
