import { useCallback, useState } from 'react';
import { COLUMN_DEFINITIONS } from '../utils/dashboardColumns.js';

// docs/08-ui-ux.md §6, docs/09-frontend-features.md §7 — persisted to localStorage under a
// versioned key so a future column added by Claude Code doesn't collide with an old saved
// preference shape; locked columns are always visible regardless of stored state.
const STORAGE_KEY = 'dashboard.visibleColumns.v1';

function defaultVisibility() {
  return Object.fromEntries(COLUMN_DEFINITIONS.map((col) => [col.key, true]));
}

function readStoredVisibility() {
  if (typeof window === 'undefined') return defaultVisibility();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultVisibility();
    const parsed = JSON.parse(raw);
    return { ...defaultVisibility(), ...parsed };
  } catch {
    return defaultVisibility();
  }
}

export function useColumnVisibility() {
  const [visibility, setVisibility] = useState(readStoredVisibility);

  const toggleColumn = useCallback((key) => {
    const column = COLUMN_DEFINITIONS.find((col) => col.key === key);
    if (!column || column.locked) return;
    setVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const isVisible = useCallback((key) => visibility[key] !== false, [visibility]);

  return { visibility, isVisible, toggleColumn };
}
