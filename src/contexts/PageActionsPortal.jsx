import React, { createContext, useContext } from 'react'; // explicit import — see src/App.jsx's comment for why
import { createPortal } from 'react-dom';

// Lets a page rendered through AppLayout's <Outlet /> (e.g. DashboardPage's Print View toggle +
// Export button) render controls INSIDE the Navbar itself, without AppLayout needing to know
// anything page-specific. AppLayout provides the target DOM node (via a callback ref, so the
// Provider only gets a real, non-null node once it's actually mounted); pages consume it with
// <PageActions> below, which is a no-op portal until that node exists (e.g. on any route that
// never sets one up).
const PageActionsPortalContext = createContext(null);

export function PageActionsPortalProvider({ target, children }) {
  return <PageActionsPortalContext.Provider value={target}>{children}</PageActionsPortalContext.Provider>;
}

export function PageActions({ children }) {
  const target = useContext(PageActionsPortalContext);
  if (!target) return null;
  return createPortal(children, target);
}
