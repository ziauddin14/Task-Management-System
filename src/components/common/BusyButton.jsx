import React from 'react'; // explicit import — see src/App.jsx's comment for why
import PhraseLine from './PhraseLine.jsx';
import { useReportBusy } from '../../contexts/BusyRegionContext.js';

// The ONE button used wherever a button has a busy state, so they all behave the same. It is a
// plain <button> that takes every normal button prop, plus:
//   busy        — the action this button started is in flight. The button is disabled and marked
//                 aria-busy; its label, size and position do not change.
//   busyLabel   — what a screen reader is told while busy (the visible signal is the phrase).
//   phraseInside — ONLY for a button that spans the full width of its container: the loading
//                 phrase replaces the label inside the button while busy, at the same height.
//
// Where the phrase shows by default: not here — it is far wider than a normal button, so this
// button reports itself busy to the nearest region (contexts/BusyRegionContext.js) and the region
// shows the one-line phrase: a Modal in the strip under its card, a <BusyRegion> directly under
// the button row it wraps. A busy button with no region above it is still disabled and aria-busy,
// but shows no phrase — wrap its row in <BusyRegion>.
//
// `disabled` stays the caller's own "not available" condition (an invalid form, another request
// in flight) — only `busy` brings the phrase.
function BusyButton({
  busy = false,
  disabled = false,
  phraseInside = false,
  busyLabel = 'براہِ کرم انتظار کریں…',
  type = 'button',
  style,
  children,
  ...buttonProps
}) {
  const showPhraseInside = busy && phraseInside;
  useReportBusy(busy && !phraseInside, busyLabel);

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      // The usual `disabled:opacity-50` dimming would wash the phrase out, and here the phrase is
      // itself the "busy" signal.
      style={showPhraseInside ? { ...style, opacity: 1 } : style}
    >
      {showPhraseInside ? (
        <>
          <PhraseLine size="compact" animated decorative />
          <span className="sr-only">{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default BusyButton;
