import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Plus } from 'lucide-react';

// The extended "+ نیا کام" button, floating at the bottom-left just above the tab bar. Rendered
// only for a role that can create tasks (an Admin) — the caller decides; this is the button alone.
// It opens the same "نیا کام" form the desktop header button opens.
function NewTaskFab({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print fixed left-[16px] z-30 flex h-[52px] items-center gap-tk-gap-sm rounded-tk-pill bg-tk-green-700 px-[20px] text-[15px] font-semibold text-white shadow-tk-fab focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-900"
      style={{ bottom: 'calc(var(--tk-tabbar-h) + env(safe-area-inset-bottom, 0px) + 14px)' }}
    >
      <Plus className="h-[20px] w-[20px]" strokeWidth={2.4} aria-hidden="true" />
      <span className="leading-tk-label">نیا کام</span>
    </button>
  );
}

export default NewTaskFab;
