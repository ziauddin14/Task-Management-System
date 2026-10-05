import { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';

// How a busy button's loading phrase finds its place on screen. The phrase is far too wide to sit
// inside an ordinary button, so a busy button (components/common/BusyButton.jsx) keeps its own
// label and instead reports "I am busy" to the nearest region above it, and the region shows the
// one-line phrase:
//   - components/common/Modal.jsx is a region for everything inside a dialog (the line appears in
//     a strip attached under the dialog card);
//   - components/common/BusyRegion.jsx wraps a button row anywhere else (the line appears directly
//     under that row).
// The context value is the region's `report` function; null means "no region here".
export const BusyRegionContext = createContext(null);

// For a region owner. `report(label)` registers one busy button and returns its un-register
// function; the region is busy for as long as at least one button is registered.
export function useBusyRegionState() {
  const [entries, setEntries] = useState([]);

  const report = useCallback((label) => {
    const entry = { label };
    setEntries((prev) => [...prev, entry]);
    return () => setEntries((prev) => prev.filter((item) => item !== entry));
  }, []);

  return { report, isBusy: entries.length > 0, label: entries[entries.length - 1]?.label };
}

// For a busy button. A layout effect, not a plain effect, so the region's line is on screen in the
// same paint as the button's own disabled state.
export function useReportBusy(busy, label) {
  const report = useContext(BusyRegionContext);

  useLayoutEffect(() => {
    if (!busy || !report) return undefined;
    return report(label);
  }, [busy, label, report]);
}
