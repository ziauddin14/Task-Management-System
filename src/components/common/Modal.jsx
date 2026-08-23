import React, { useEffect } from 'react'; // explicit import — see src/App.jsx's comment for why

// docs/08-ui-ux.md §7 — "Both modals close via an explicit close button (and backdrop click),
// never trap focus without an escape route, and are sized to comfortably fit a phone screen
// without horizontal scrolling." Generic enough to back both the task form and the close
// confirmation dialog, per docs/07-frontend-foundation.md §2's documented common/Modal.
function Modal({ isOpen, onClose, title, children }) {
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
        aria-label="Band karein"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Band karein"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
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
