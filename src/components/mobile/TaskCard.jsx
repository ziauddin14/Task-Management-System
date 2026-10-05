import React from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { CalendarDays, UserRound } from 'lucide-react';
import { formatDateShortYear, formatTimeStatusLabel } from '../../utils/formatDate.js';
import { assigneeSummary, getPerformanceMeta, getStatusMeta, isSyntheticRating, SYNTHETIC_LABEL } from '../../utils/taskDisplay.js';
import { getRatingTone, getStatusTone } from '../../utils/mobileTheme.js';

const CHIP_CLASS = 'whitespace-nowrap rounded-tk-pill px-[10px] text-[12px] leading-[2.3]';
// One task as a card — the phone's replacement for a row of the desktop table.
//   row 1: status chip, rating chip (marked "تخمینی" when the rating is developer-assigned), code
//   title: up to three lines
//   meta:  zimmedar, deadline, and a red "تاخیر" pill while the task is overdue
//   bar:   completion — ALWAYS the task's real completionPercent, never the assumed percent a
//          synthetic rating was derived from (a closed task at a real 0% rated "بہتر • تخمینی"
//          reads exactly as that)
//
// The whole card is one touch target: the title is a real <button> stretched over the card, which
// opens the task's details-and-actions sheet (`onOpen`). Nothing else inside is interactive, so
// there is never a control hidden under another.
function TaskCard({ task, onOpen }) {
  const statusMeta = getStatusMeta(task.status);
  const statusTone = getStatusTone(task.status);
  const ratingMeta = getPerformanceMeta(task.performanceRating);
  const ratingTone = getRatingTone(task.performanceRating);
  const isSynthetic = isSyntheticRating(task);
  const isOverdue = task.timeStatus?.type === 'overdue';
  const percent = task.completionPercent ?? 0;

  return (
    <article className="relative flex flex-col gap-[6px] rounded-tk-card bg-tk-card p-tk-card shadow-tk-soft focus-within:ring-2 focus-within:ring-tk-green-700">
      <div className="flex items-center gap-tk-gap-sm">
        <span className={clsx(CHIP_CLASS, statusTone.chip)}>{statusMeta.label}</span>
        {ratingTone && (
          <span data-rating-chip className={clsx(CHIP_CLASS, ratingTone.chip, isSynthetic && 'border border-dashed border-current')}>
            {ratingMeta.label}
            {isSynthetic && (
              <span data-synthetic-marker>
                {' '}
                <span aria-hidden="true">•</span> {SYNTHETIC_LABEL}
              </span>
            )}
          </span>
        )}
        <span className="min-w-0 flex-1" />
        <span className="shrink-0 text-[12px] text-tk-muted" dir="ltr">
          {task.codeNumber}
        </span>
      </div>

      <h3 className="text-[16px] font-semibold leading-tk-label">
        <button
          type="button"
          onClick={() => onOpen(task)}
          aria-haspopup="dialog"
          className="line-clamp-3 w-full text-start after:absolute after:inset-0 after:rounded-tk-card focus-visible:outline-none"
        >
          {task.title}
        </button>
      </h3>

      <div className="flex flex-wrap items-center gap-x-[14px] text-[12.5px] leading-tk-label text-tk-ink-soft">
        <span className="flex min-w-0 max-w-full items-center gap-[5px]">
          <UserRound className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
          <span className="sr-only">ذمہ دار:</span>
          <span className="truncate">{assigneeSummary(task.assignees)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-[5px]">
          <CalendarDays className="h-[15px] w-[15px] shrink-0" aria-hidden="true" />
          <span className="sr-only">آخری تاریخ:</span>
          <span dir="ltr">{formatDateShortYear(task.deadline)}</span>
        </span>
        {isOverdue && (
          <span data-overdue-pill title={formatTimeStatusLabel(task.timeStatus)} className="shrink-0 rounded-tk-pill bg-tk-danger-bg px-[8px] text-[12px] leading-[2.2] text-tk-danger">
            تاخیر
          </span>
        )}
      </div>

      <div className="flex items-center gap-[10px]">
        <div
          role="progressbar"
          aria-label="تکمیل"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-tk-pill bg-tk-track"
        >
          <div className={clsx('h-full rounded-tk-pill', statusTone.bar)} style={{ width: `${percent}%` }} />
        </div>
        <span data-completion-percent className="min-w-[34px] text-left text-[12px] text-tk-muted" dir="ltr">
          {percent}%
        </span>
      </div>
    </article>
  );
}

export default TaskCard;
