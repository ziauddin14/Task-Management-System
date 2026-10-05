import React, { useEffect } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import LoadingPhrase from './LoadingPhrase.jsx';
import { BusyRegionContext, useBusyRegionState } from '../../contexts/BusyRegionContext.js';

// docs/08-ui-ux.md §7 — "Both modals close via an explicit close button (and backdrop click),
// never trap focus without an escape route, and are sized to comfortably fit a phone screen
// without horizontal scrolling." Generic enough to back both the task form and the close
// confirmation dialog, per docs/07-frontend-foundation.md §2's documented common/Modal.
// `headerActions` (Prompt 5B) — an optional node rendered opposite the close button (at `start-0`,
// mirroring the close button's own `end-0`), for a modal-specific header action like the Previous
// Updates popup's Export button. Undefined for every other caller — no visual change there.
// `maxWidthClassName` (Prompt 5A) — lets a content-heavy modal (the new table-based Previous
// Updates popup) opt into a wider card than the `max-w-lg` every other modal here still uses.
//
// Busy buttons — the Modal is the busy region (contexts/BusyRegionContext.js) for every BusyButton
// inside it. While one is busy, the one-line loading phrase shows in a strip attached under the
// card (whose bottom corners square off, so the two read as one card that grew downward). The
// strip is deliberately OUTSIDE the card's own layout: the card is vertically centred, so anything
// that made it taller would re-centre it and move the very button that was just pressed; and the
// card scrolls on a short screen, where a line added at the end of its content would land below
// the fold — or, laid over the card's edge, would cover the button itself. Hung entirely below the
// card instead, it always shows and nothing inside the card moves or is covered. The card is at
// most 90vh tall and centred, so there is always at least 5vh free beneath it: BUSY_STRIP_ROOM
// keeps the strip within that on a short phone screen.
//
// Mobile (< 768px) — every dialog is a bottom sheet: the same card, docked to the bottom edge at
// full width with rounded top corners, where a thumb reaches it. Done here, once, with `max-md:`
// classes only, so every dialog in the app converts together and nothing at 768px and up changes.
// A sheet has no free space beneath it, so there the busy strip hangs ABOVE the card instead
// (the card's top corners square off rather than its bottom ones) — still outside the card, still
// never moving or covering the button that was pressed. The sheet is at most 88vh tall, which
// leaves the strip its 5vh above.
const BUSY_STRIP_ROOM = '5vh';

function Modal({ isOpen, onClose, title, headerActions, maxWidthClassName = 'max-w-lg', children }) {
  const busyRegion = useBusyRegionState();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-md:items-end max-md:p-0">
      <button
        type="button"
        aria-label="بند کریں"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-label={title} className={clsx('relative w-full max-md:max-w-none', maxWidthClassName)}>
        <div
          className={clsx(
            'relative max-h-[90vh] w-full overflow-y-auto rounded-lg border-t-4 border-brand bg-white p-4 shadow-xl',
            'max-md:max-h-[88vh] max-md:rounded-b-none max-md:rounded-t-[20px] max-md:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]',
            busyRegion.isBusy && 'rounded-b-none max-md:rounded-t-none'
          )}
        >
          <BusyRegionContext.Provider value={busyRegion.report}>
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
          </BusyRegionContext.Provider>
        </div>
        {busyRegion.isBusy && (
          <div
            data-busy-strip
            className="absolute inset-x-0 top-full rounded-b-lg bg-white px-4 shadow-xl max-md:bottom-full max-md:top-auto max-md:rounded-b-none max-md:rounded-t-[20px]"
          >
            <LoadingPhrase size="compact" label={busyRegion.label} maxRowHeight={BUSY_STRIP_ROOM} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
