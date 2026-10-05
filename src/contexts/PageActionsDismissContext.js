import { createContext, useContext } from 'react';

// On a phone a page's own actions (contexts/PageActionsPortal.jsx) are shown inside the "مزید"
// sheet rather than in the header. An action that opens a dialog of its own has to close that
// sheet first — this is how it asks to: the mobile layout provides the function, the page calls it.
// Anywhere else (the desktop header, a test rendering the page alone) it is a no-op.
export const PageActionsDismissContext = createContext(() => {});

export function useDismissPageActions() {
  return useContext(PageActionsDismissContext);
}
