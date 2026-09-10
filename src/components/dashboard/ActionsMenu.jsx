import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { SlidersHorizontal } from 'lucide-react';
import { FloatingPortal } from '@floating-ui/react';
import { useFloatingMenu } from '../../hooks/useFloatingMenu.js';
import ExportMenu from '../reports/ExportMenu.jsx';

// Prompt — TMS Dashboard header UI/UX cleanup: one compact "ایکشن" trigger replacing the old
// Print View/Print/Columns controls, opening a dropdown with exactly two items — Export (and,
// nested inside it as before, WhatsApp Share once a file has been exported). Both are the
// existing ExportMenu/WhatsAppShareButton components rendered with variant="menuItem"; no export
// or share logic lives here. Positioning goes through useFloatingMenu (see its own comment) —
// portal-rendered and boundary-aware, so it can never clip into the sidebar or off-screen.
function ActionsMenu({ onExport, isLoading }) {
  const { open, refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingMenu({ placement: 'bottom-end' });

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-expanded={open}
        title="ایکشن"
        className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 text-sm text-gray-700 hover:bg-gray-50"
        {...getReferenceProps()}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        <span>ایکشن</span>
      </button>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
            {...getFloatingProps()}
          >
            <ExportMenu mode="dashboard" onExport={onExport} isLoading={isLoading} variant="menuItem" />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default ActionsMenu;
