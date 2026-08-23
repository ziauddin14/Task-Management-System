import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePageSize.js';

// docs/08-ui-ux.md §6 — "page-size control + pagination: a small select (10/25/50) next to
// standard pagination controls (previous/next + page numbers) beneath the table."
function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange }) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <span>Har safhe par</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-lg border border-gray-300 px-2"
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
          className="flex h-10 min-w-[40px] items-center justify-center rounded-lg border border-gray-300 px-3 disabled:opacity-40"
        >
          Peechay
        </button>
        <span className="text-sm text-gray-600">
          {page} / {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="flex h-10 min-w-[40px] items-center justify-center rounded-lg border border-gray-300 px-3 disabled:opacity-40"
        >
          Agay
        </button>
      </div>
    </div>
  );
}

export default Pagination;
