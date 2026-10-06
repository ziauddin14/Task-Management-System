import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePageSize.js';

// docs/08-ui-ux.md §6 — "page-size control + pagination: a small select (10/25/50) next to
// standard pagination controls (previous/next + page numbers) beneath the table."
function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <label className="flex items-center gap-2 text-[13px] leading-tk-label text-tk-muted">
        <span>ہر صفحے پر</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-tk-chip border-0 bg-tk-surface px-2 text-tk-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-tk-green-700"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-10 min-w-[40px] items-center justify-center rounded-tk-chip border border-tk-line-btn bg-white px-4 text-[13px] leading-tk-label text-tk-green-900 transition-colors hover:bg-tk-hover disabled:opacity-40 disabled:hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
        >
          پیچھے
        </button>
        <span className="text-[13px] text-tk-muted" dir="ltr">
          {page} / {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="flex h-10 min-w-[40px] items-center justify-center rounded-tk-chip border border-tk-line-btn bg-white px-4 text-[13px] leading-tk-label text-tk-green-900 transition-colors hover:bg-tk-hover disabled:opacity-40 disabled:hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
        >
          آگے
        </button>
      </div>
    </div>
  );
}

export default Pagination;
