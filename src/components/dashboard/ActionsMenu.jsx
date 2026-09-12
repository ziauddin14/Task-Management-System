import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { SlidersHorizontal } from 'lucide-react';
import { FloatingPortal } from '@floating-ui/react';
import { useFloatingMenu } from '../../hooks/useFloatingMenu.js';
import ExportMenu from '../reports/ExportMenu.jsx';
import ColumnToggle from './ColumnToggle.jsx';

// Prompt — TMS Dashboard header UI/UX cleanup: one compact "ایکشن" trigger opening a dropdown
// with three items — کالمز (column visibility), Export (and, nested inside it as before, WhatsApp
// Share once a file has been exported). All three are the existing ColumnToggle/ExportMenu/
// WhatsAppShareButton components rendered with variant="menuItem"; no column/export/share logic
// lives here — this component only arranges them. Positioning goes through useFloatingMenu (see
// its own comment) — portal-rendered and boundary-aware, so it can never clip into the sidebar or
// off-screen. columnVisibility props are optional so callers that don't need the کالمز item
// (there are none today, but this keeps the component from hard-requiring them) can omit them.
function ActionsMenu({ onExport, isLoading, columns, isColumnVisible, onToggleColumn }) {
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
            {columns && <ColumnToggle columns={columns} isVisible={isColumnVisible} onToggle={onToggleColumn} variant="menuItem" />}
            <ExportMenu mode="dashboard" onExport={onExport} isLoading={isLoading} variant="menuItem" />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default ActionsMenu;
