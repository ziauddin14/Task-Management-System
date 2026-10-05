import React, { useLayoutEffect, useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { LOADING_PHRASE_FIRST, LOADING_PHRASE_GAP, LOADING_PHRASE_SECOND } from '../../utils/loadingPhrase.js';

// The client's phrase (utils/loadingPhrase.js, verbatim) on ONE line, in the UI's own font —
// inherited from Tailwind's default `font-sans` stack (tailwind.config.js), never a font named
// here — and the theme green. This is the only place the phrase is laid out: LoadingPhrase wraps
// it as a loader, BusyButton puts it inside a wide button, and the login page shows it as a static
// tagline, so the sizing rules below hold everywhere.
//
// Sizing is measured, not guessed: the app does not ship its Nastaleeq webfont, so each device
// draws this in whichever font it has, and the same phrase is ~8em wide in Jameel Noori Nastaleeq
// but ~19em in a Naskh fallback (Segoe UI/Tahoma). A fixed clamp() tuned for one would clip in the
// other, so the font size is fitted to the actual rendered width of the two halves inside this
// line's own container (not the viewport — a drawer or modal on a wide screen is still narrow).
// Order of give: the gap between the halves shrinks first (pure CSS — it is the only flex item
// allowed to shrink); only once it is at its minimum does the font size come down.
const MIN_GAP_EM = 0.6;
// The fit never goes below a comfortably readable size. A container too narrow for the phrase at
// this size (about 230px in a Naskh fallback font, 110px in Nastaleeq) is a layout problem, not
// something to solve with smaller text: give the line a wider box — see TaskFormModal, where the
// loader spans the whole form row instead of sitting inside one narrow column.
const MIN_READABLE_PX = 12;

// A line of this script with its stacked marks (shadda + pesh above, zer below) is about twice
// its font size tall, so a row needs roughly this many em of height to hold it unclipped.
const INK_HEIGHT_EM = 2.1;

// Fixed row height per size: the line never changes height while the font is fitted or the
// viewport resizes, so nothing around it shifts.
const SIZES = {
  fullscreen: { maxPx: 36, rowHeight: '4.5rem' },
  section: { maxPx: 26, rowHeight: '3rem' },
  compact: { maxPx: 16, rowHeight: '2rem' },
};

function useFittedFontSize(maxPx) {
  const boxRef = useRef(null);
  const firstRef = useRef(null);
  const secondRef = useRef(null);
  const [fontPx, setFontPx] = useState(null);

  useLayoutEffect(() => {
    let active = true;
    function fit() {
      if (!active || !boxRef.current) return;
      const available = boxRef.current.clientWidth;
      const currentPx = parseFloat(getComputedStyle(firstRef.current).fontSize);
      const textPx = firstRef.current.getBoundingClientRect().width + secondRef.current.getBoundingClientRect().width;
      // No layout (jsdom, or a hidden ancestor): leave the CSS fallback size in place.
      if (!available || !textPx || !currentPx) return;
      const widthInEm = textPx / currentPx + MIN_GAP_EM;
      const fitted = Math.floor((available / widthInEm) * 10) / 10;
      setFontPx(Math.max(MIN_READABLE_PX, Math.min(maxPx, fitted)));
    }

    fit();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    observer?.observe(boxRef.current);
    // A late font load/swap changes the phrase's width without resizing the box.
    document.fonts?.ready?.then(fit);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [maxPx]);

  return { boxRef, firstRef, secondRef, fontPx };
}

// `animated`  — the gentle pulse loaders use (off for the static tagline).
// `decorative` — hides the phrase from assistive tech, for places where a plain label next to it
//                already says what is happening; leave it off where the phrase IS the content.
// `onFit`     — receives the fitted font size in px, for a caption that should scale with it.
// `maxRowHeight` — a CSS length, for a spot with limited height (the strip under a Modal): the row
//                is never taller than this, and the text is kept small enough to stand inside it.
// Built from spans only, so it is valid inside a <button> as well as in block content.
function PhraseLine({ size = 'section', animated = false, decorative = false, onFit, maxRowHeight, className }) {
  const { maxPx, rowHeight: sizeRowHeight } = SIZES[size] || SIZES.section;
  const { boxRef, firstRef, secondRef, fontPx } = useFittedFontSize(maxPx);
  const rowHeight = maxRowHeight ? `min(${sizeRowHeight}, ${maxRowHeight})` : sizeRowHeight;
  const widthFittedSize = fontPx ? `${fontPx}px` : `clamp(${MIN_READABLE_PX}px, 5cqi, ${maxPx}px)`;

  useLayoutEffect(() => {
    onFit?.(fontPx);
  }, [onFit, fontPx]);

  return (
    <span ref={boxRef} className={clsx('block w-full', className)} style={{ containerType: 'inline-size' }}>
      {/* Until the first measurement (and with no JS layout at all) the clamp() below is the
          worst-case-safe size. */}
      <span
        data-phrase-line
        dir="rtl"
        aria-hidden={decorative ? 'true' : undefined}
        className={clsx(
          'flex items-center justify-center whitespace-nowrap text-brand',
          animated && 'motion-safe:animate-pulse'
        )}
        style={{
          height: rowHeight,
          lineHeight: 1.6,
          fontSize: maxRowHeight
            ? `max(${MIN_READABLE_PX}px, min(${widthFittedSize}, calc(${rowHeight} / ${INK_HEIGHT_EM})))`
            : widthFittedSize,
        }}
      >
        <span ref={firstRef} className="shrink-0">
          {LOADING_PHRASE_FIRST}
        </span>
        <span className="shrink overflow-hidden whitespace-pre" style={{ minWidth: `${MIN_GAP_EM}em` }}>
          {LOADING_PHRASE_GAP}
        </span>
        <span ref={secondRef} className="shrink-0">
          {LOADING_PHRASE_SECOND}
        </span>
      </span>
    </span>
  );
}

export default PhraseLine;
