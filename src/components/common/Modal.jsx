import React, { useEffect } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';

// docs/08-ui-ux.md §7 — "Both modals close via an explicit close button (and backdrop click),
// never trap focus without an escape route, and are sized to comfortably fit a phone screen
// without horizontal scrolling." Generic enough to back both the task form and the close
// confirmation dialog, per docs/07-frontend-foundation.md §2's documented common/Modal.
// `headerActions` (Prompt 5B) — an optional node rendered opposite the close button (at `start-0`,
// mirroring the close button's own `end-0`), for a modal-specific header action like the Previous
// Updates popup's Export button. Undefined for every other caller — no visual change there.
// `maxWidthClassName` (Prompt 5A) — lets a content-heavy modal (the new table-based Previous
// Updates popup) opt into a wider card than the `max-w-lg` every other modal here still uses.
function Modal({ isOpen, onClose, title, headerActions, maxWidthClassName = 'max-w-lg', children }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="بند کریں"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-lg border-t-4 border-brand bg-white p-4 shadow-xl',
          maxWidthClassName
        )}
      >
        <div className="relative mb-3 flex items-center justify-center">
          {headerActions && <div className="absolute start-0">{headerActions}</div>}
          <h2 className="px-10 text-center text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بند کریں"
            className="absolute end-0 flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
