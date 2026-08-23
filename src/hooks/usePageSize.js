import { useCallback, useState } from 'react';

// docs/09-frontend-features.md §5 — page size (10/25/50) is a personal preference -> localStorage,
// not the URL.
const STORAGE_KEY = 'dashboard.pageSize.v1';
const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_SIZES = [10, 25, 50];

function readStoredPageSize() {
  if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
  const raw = Number(window.localStorage.getItem(STORAGE_KEY));
  return ALLOWED_SIZES.includes(raw) ? raw : DEFAULT_PAGE_SIZE;
}

export function usePageSize() {
  const [pageSize, setPageSizeState] = useState(readStoredPageSize);

  const setPageSize = useCallback((nextSize) => {
    setPageSizeState(nextSize);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(nextSize));
    }
  }, []);

  return [pageSize, setPageSize];
}

export { ALLOWED_SIZES as PAGE_SIZE_OPTIONS };
