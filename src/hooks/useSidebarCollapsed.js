import { useCallback, useState } from 'react';

// Collapsed/expanded is a personal preference, same reasoning as usePageSize.js's own localStorage
// choice: it should survive a reload, but has no reason to live in the URL.
//
// Desktop redesign — the sidebar is COLLAPSED by default (an icon-only rail); a person who expands
// it keeps it expanded. Only an explicit choice is ever stored, so "nothing stored" means "use the
// default". Storage is optional: where it is unavailable or refuses (private mode, blocked site
// data) the sidebar simply works for the session and forgets on reload.
const STORAGE_KEY = 'sidebar.collapsed.v1';
const DEFAULT_COLLAPSED = true;

function readStoredCollapsed() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // no storage: fall through to the default
  }
  return DEFAULT_COLLAPSED;
}

function storeCollapsed(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // no storage: the choice lasts for this session only
  }
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(readStoredCollapsed);

  const setCollapsed = useCallback((next) => {
    setCollapsedState(next);
    storeCollapsed(next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      storeCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, setCollapsed, toggleCollapsed };
}
