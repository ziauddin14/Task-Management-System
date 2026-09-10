import { useState } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useInteractions } from '@floating-ui/react';

// Prompt — TMS Dashboard dropdown positioning fix: the header ایکشن menu and each row's اقدامات
// menu used to be plain `absolute` panels, which got clipped by the table's own overflow-auto
// wrapper (and, at narrower widths, pushed past the viewport edge by the right sidebar) — no
// amount of z-index fixes that, since it's a containing-block/overflow problem, not a stacking
// one. This hook centralizes the real fix: floating-ui computes the panel's position from the
// trigger's actual screen coordinates, flip() swaps it above the trigger when there's no room
// below (e.g. the last table row), shift() nudges it sideways to stay inside the viewport instead
// of spilling past the sidebar, and the caller renders the panel through <FloatingPortal> (see
// ActionsMenu.jsx / TaskTable.jsx's RowActionsMenu) so it's appended to document.body — escaping
// every ancestor's overflow/clipping entirely. autoUpdate keeps it tracking the trigger while the
// table scrolls. useDismiss closes on outside click/Escape; opening a different trigger closes
// whichever menu was open, since that click starts outside the first instance's own elements.
export function useFloatingMenu({ placement = 'bottom-end' } = {}) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return { open, setOpen, refs, floatingStyles, getReferenceProps, getFloatingProps };
}
