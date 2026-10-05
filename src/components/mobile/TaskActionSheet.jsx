import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { Bell, Gauge, History, Pencil, Upload } from 'lucide-react';
import BottomSheet from './BottomSheet.jsx';
import { formatDateShortYear, formatTimeStatusLabel } from '../../utils/formatDate.js';
import { getPerformanceMeta, getStatusMeta, isSyntheticRating, SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';
import { getRatingTone, getStatusTone } from '../../utils/mobileTheme.js';

const CHIP_CLASS = 'whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] leading-[2.3]';
const ACTION_CLASS =
  'flex min-h-[48px] w-full items-center gap-tk-gap rounded-tk-input px-tk-card text-start text-[15px] leading-tk-label focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700 disabled:opacity-45';

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
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
              <span dir="ltr">{percent}%</span>
            </span>
          </Fact>
        </dl>

        <div className="flex flex-col gap-tk-gap-sm border-t border-tk-line pt-tk-gap">
          <Action icon={Upload} label="اپڈیٹ کریں" onClick={run(onUpdate)} disabled={isClosed} primary />
          {isClosed && <p className="text-[12px] leading-tk-label text-tk-muted">یہ کام بند ہو چکا ہے، اس میں نئی اپڈیٹ درج نہیں ہو سکتی۔</p>}
          <Action icon={History} label="کام کی تفصیل اور پرانی اپڈیٹس" onClick={run(onViewUpdates)} />
          {isAdmin && <Action icon={Pencil} label="ترمیم کریں" onClick={run(onEdit)} disabled={isClosed} />}
          {isAdmin && <Action icon={Bell} label="یاددہانی بھیجیں" onClick={run(onSendReminder)} />}
          {isAdmin && isSynthetic && <Action icon={Gauge} label={`${SYNTHETIC_LABEL} درجہ بندی تبدیل کریں`} onClick={run(onEditSyntheticRating)} />}
        </div>
      </div>
    </BottomSheet>
  );
}

export default TaskActionSheet;
