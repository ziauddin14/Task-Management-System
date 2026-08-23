import { useCallback, useState } from 'react';

// docs/08-ui-ux.md §6, docs/09-frontend-features.md §7 — persisted to localStorage under a
// versioned key so a future column added by Claude Code doesn't collide with an old saved
// preference shape; locked columns are always visible regardless of stored state. Generalized in
// Phase 10.6 (storageKey + columnDefinitions now parameters, not hardcoded to the dashboard's own
// set) so UserSummaryReportPage's column-hide control (docs/08-ui-ux.md §9 — "same pattern") can
// reuse this hook against its own column set/localStorage key instead of a near-duplicate hook.
function defaultVisibility(columnDefinitions) {
  return Object.fromEntries(columnDefinitions.map((col) => [col.key, true]));
}

function readStoredVisibility(storageKey, columnDefinitions) {
  if (typeof window === 'undefined') return defaultVisibility(columnDefinitions);
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultVisibility(columnDefinitions);
    const parsed = JSON.parse(raw);
    return { ...defaultVisibility(columnDefinitions), ...parsed };
  } catch {
    return defaultVisibility(columnDefinitions);
  }
}

export function useColumnVisibility(storageKey, columnDefinitions) {
  const [visibility, setVisibility] = useState(() => readStoredVisibility(storageKey, columnDefinitions));

  const toggleColumn = useCallback(
    (key) => {
      const column = columnDefinitions.find((col) => col.key === key);
      if (!column || column.locked) return;
      setVisibility((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        }
        return next;
      });
    },
    [storageKey, columnDefinitions]
  );

  const isVisible = useCallback((key) => visibility[key] !== false, [visibility]);

  return { visibility, isVisible, toggleColumn };
}
