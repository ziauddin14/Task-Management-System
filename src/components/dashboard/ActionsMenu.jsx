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
        className="flex h-[46px] items-center gap-2 rounded-tk-input border border-tk-line-btn bg-white px-4 text-[14px] leading-tk-label text-tk-green-900 transition-colors hover:bg-tk-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700"
        {...getReferenceProps()}
      >
        <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
        <span>ایکشن</span>
      </button>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-50 w-56 rounded-tk-tile border border-tk-line bg-white p-2 shadow-tk-lift"
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
