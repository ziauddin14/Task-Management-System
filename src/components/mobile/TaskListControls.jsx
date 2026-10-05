import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePageSize.js';

// The fields the task list can be sorted by — the same ones the desktop table's column headers
// sort by (backend/src/validators/task.validator.js's sortBy), with the same labels.
const SORT_FIELDS = [
  { value: 'deadline', label: 'آخری تاریخ' },
  { value: 'codeNumber', label: 'کوڈ نمبر' },
  { value: 'title', label: 'کام' },
  { value: 'completionPercent', label: 'تکمیل فیصد' },
  { value: 'status', label: 'کیفیت' },
  { value: 'performanceRating', label: 'کارکردگی' },
];

const SELECT_CLASS =
  'h-tk-touch rounded-tk-chip border border-tk-line-strong bg-tk-card px-[8px] text-[13px] text-tk-ink focus:border-tk-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-tk-green-700';
const STEP_BUTTON_CLASS =
  'flex h-tk-touch min-w-[92px] items-center justify-center gap-[4px] rounded-tk-input border border-tk-line-strong bg-tk-card px-[12px] text-[14px] leading-tk-label text-tk-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700 disabled:opacity-40';

// "52 کام" and the sort control, above the cards. A card list has no column headers to click, so
// sorting gets a control of its own: the field, and a button that flips the direction.
export function TaskListHeader({ total, sortBy, sortOrder, onSortChange }) {
  const ascending = sortOrder === 'asc';

  return (
    <div className="flex items-center justify-between gap-tk-gap-sm px-[2px]">
      <p className="shrink-0 text-[14px] font-semibold leading-tk-label" aria-live="polite">
        {typeof total === 'number' ? `${total} کام` : ''}
      </p>
      <div className="flex min-w-0 items-center gap-[6px]">
        <label className="flex min-w-0 items-center gap-[6px] text-[12px] leading-tk-label text-tk-muted">
          <span className="shrink-0">ترتیب</span>
          <select value={sortBy} onChange={(event) => onSortChange(event.target.value, sortOrder)} className={`${SELECT_CLASS} min-w-0`}>
            {SORT_FIELDS.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onSortChange(sortBy, ascending ? 'desc' : 'asc')}
          aria-label={ascending ? 'ترتیب: چھوٹے سے بڑا — الٹنے کے لیے دبائیں' : 'ترتیب: بڑے سے چھوٹا — الٹنے کے لیے دبائیں'}
          className="flex h-tk-touch w-tk-touch shrink-0 items-center justify-center rounded-tk-chip border border-tk-line-strong bg-tk-card text-tk-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
        >
          {ascending ? <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" /> : <ArrowDown className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

// Under the cards: previous / next with the page in between, and the page-size choice (the same
// 10 / 25 / 50 preference the desktop table keeps). In this right-to-left layout "پچھلا" sits on
// the right and its chevron points right, toward where the reader came from.
export function TaskListPagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  const safeTotalPages = Math.max(totalPages || 1, 1);

  return (
    <nav aria-label="صفحات" className="flex flex-col items-center gap-tk-gap-sm pt-[4px]">
      <div className="flex w-full items-center justify-between gap-tk-gap-sm">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={STEP_BUTTON_CLASS}>
          <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
          پچھلا
        </button>
        <span className="text-[13px] leading-tk-label text-tk-muted" aria-live="polite">
          صفحہ <span dir="ltr">{page} / {safeTotalPages}</span>
        </span>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= safeTotalPages} className={STEP_BUTTON_CLASS}>
          اگلا
          <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>
      <label className="flex items-center gap-tk-gap-sm text-[13px] leading-tk-label text-tk-muted">
        <span>ہر صفحے پر</span>
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className={SELECT_CLASS}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
