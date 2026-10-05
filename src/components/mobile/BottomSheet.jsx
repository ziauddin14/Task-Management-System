import React, { useEffect, useRef } from 'react'; // explicit import — see src/App.jsx's comment for why
import { X } from 'lucide-react';

// The mobile layout's overlay panel: it rises from the bottom edge, where a thumb reaches, and
// never covers more than most of the screen. Used for the filters, the "مزید" menu and a task's
// details-and-actions. Same contract as common/Modal.jsx — an explicit close button, a backdrop
// that closes it, Escape closes it — plus focus: it moves into the sheet when it opens and goes
// back to whatever opened it when it closes.
//
// `footer` stays pinned under the scrolling content (the sheet's own buttons must never scroll
// out of reach) and clears the phone's home-indicator area.
function BottomSheet({ isOpen, onClose, title, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="بند کریں"
        tabIndex={-1}
        onClick={onClose}
        className="tk-backdrop-enter absolute inset-0 touch-none bg-black/45"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="tk-sheet-enter relative flex max-h-[88vh] w-full flex-col rounded-t-tk-hero bg-tk-card text-tk-ink shadow-tk-sheet outline-none"
      >
        <div className="flex shrink-0 items-center gap-tk-gap-sm border-b border-tk-line py-[6px] pe-[6px] ps-tk-page">
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold leading-tk-label">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بند کریں"
            className="flex h-tk-touch w-tk-touch shrink-0 items-center justify-center rounded-tk-chip text-tk-muted hover:bg-tk-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-tk-green-700"
          >
            <X className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-tk-page py-tk-gap">{children}</div>

        {footer && (
          <div
            className="shrink-0 border-t border-tk-line px-tk-page pt-tk-gap"
            style={{ paddingBottom: 'calc(var(--tk-space-gap) + env(safe-area-inset-bottom, 0px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default BottomSheet;
