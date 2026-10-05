import { useEffect, useState } from 'react';

// The mobile layout applies below Tailwind's `md` breakpoint (768px): app bar + bottom tabs, task
// cards instead of the table, filters in a bottom sheet. From 768px up the app is the desktop
// layout, unchanged. This hook is the single switch between the two, so only one of them is ever
// mounted (no hidden second copy of the page, no doubled requests).
//
// Where `matchMedia` does not exist (the test environment) the answer is "not mobile": the
// desktop layout is the default, and a test opts into the mobile one by providing a matchMedia.
export const MOBILE_QUERY = '(max-width: 767.98px)';

function readIsMobile() {
  return (typeof window !== 'undefined' && window.matchMedia?.(MOBILE_QUERY)?.matches) || false;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(MOBILE_QUERY);
    // Same belt-and-suspenders as Sidebar.jsx's own breakpoint hook: some viewport-emulation
    // tools resize the layout without firing matchMedia's change event.
    function recompute() {
      setIsMobile(mql.matches);
    }
    recompute();
    mql.addEventListener?.('change', recompute);
    window.addEventListener('resize', recompute);
    return () => {
      mql.removeEventListener?.('change', recompute);
      window.removeEventListener('resize', recompute);
    };
  }, []);

  return isMobile;
}
