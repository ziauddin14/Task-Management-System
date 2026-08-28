import { useCallback, useState } from 'react';

// Prompt 5C — collapsed/expanded is a personal preference, same reasoning as usePageSize.js's own
// localStorage choice: it should survive a reload, but has no reason to live in the URL.
const STORAGE_KEY = 'sidebar.collapsed.v1';

function readStoredCollapsed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(readStoredCollapsed);

  const setCollapsed = useCallback((next) => {
    setCollapsedState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed };
}
