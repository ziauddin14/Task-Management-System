import React, { useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { SlidersHorizontal } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside.js';
import ExportMenu from '../reports/ExportMenu.jsx';

// Prompt — TMS Dashboard header UI/UX cleanup: one compact "ایکشن" trigger replacing the old
// Print View/Print/Columns controls, opening a dropdown with exactly two items — Export (and,
// nested inside it as before, WhatsApp Share once a file has been exported). Both are the
// existing ExportMenu/WhatsAppShareButton components rendered with variant="menuItem"; no export
// or share logic lives here.
function ActionsMenu({ onExport, isLoading }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useClickOutside(containerRef, open, () => setOpen(false));

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        title="ایکشن"
        className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        <span>ایکشن</span>
      </button>

      {open && (
        <div className="absolute end-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <ExportMenu mode="dashboard" onExport={onExport} isLoading={isLoading} variant="menuItem" />
        </div>
      )}
    </div>
  );
}

export default ActionsMenu;
