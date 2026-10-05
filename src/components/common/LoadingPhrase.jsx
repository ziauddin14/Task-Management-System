import React, { useLayoutEffect, useRef, useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import { LOADING_PHRASE_FIRST, LOADING_PHRASE_GAP, LOADING_PHRASE_SECOND } from '../../utils/loadingPhrase.js';

// The ONE loader used across the app: the client's phrase (utils/loadingPhrase.js, verbatim) in
// the UI's own font — inherited from Tailwind's default `font-sans` stack (tailwind.config.js),
// never a font named here — and the theme green. Three sizes:
//   fullscreen — owns the whole viewport (session restore)
//   section    — a page/table/list/drawer/modal area
//   compact    — a single small line (the placeholder inside a picker/dropdown box)
//
// Always ONE line. Sizing is measured, not guessed: the app does not ship its Nastaleeq webfont,
// so each device draws this in whichever font it has, and the same phrase is ~8em wide in Jameel
// Noori Nastaleeq but ~19em in a Naskh fallback (Segoe UI/Tahoma). A fixed clamp() tuned for one
// would clip in the other, so the font size is fitted to the actual rendered width of the two
// halves inside this loader's own container (not the viewport — a drawer or modal on a wide screen
// is still narrow). Order of give: the gap between the halves shrinks first (pure CSS — it is the
// only flex item allowed to shrink); only once it is at its minimum does the font size come down.
const MIN_GAP_EM = 0.6;
// The fit never goes below a comfortably readable size. A container too narrow for the phrase at
// this size (about 230px in a Naskh fallback font, 110px in Nastaleeq) is a layout problem, not
// something to solve with smaller text: give the loader a wider box — see TaskFormModal, where it
// spans the whole form row instead of sitting inside one narrow column.
const MIN_READABLE_PX = 12;

// The caption under the phrase stays visibly secondary to it, even where a wide fallback font on a
// small phone has brought the phrase itself down.
const LABEL_TO_PHRASE_RATIO = 0.8;

const VARIANTS = {
  fullscreen: { maxPx: 36, rowHeight: '4.5rem', root: 'min-h-screen justify-center px-4', label: 'text-base text-gray-500', labelMax: '1rem' },
  section: { maxPx: 26, rowHeight: '3rem', root: 'py-6', label: 'text-sm text-gray-500', labelMax: '0.875rem' },
  compact: { maxPx: 16, rowHeight: '2rem', root: '', label: 'sr-only', labelMax: null },
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

function LoadingPhrase({ size = 'section', label = 'لوڈ ہو رہا ہے…', className }) {
  const variant = VARIANTS[size] || VARIANTS.section;
  const { boxRef, firstRef, secondRef, fontPx } = useFittedFontSize(variant.maxPx);

  return (
    // role="status"/aria-live announce the caller's label exactly as the old loader did; the
    // phrase itself is decorative for assistive tech (aria-hidden) so a screen reader hears what
    // is loading, once, rather than the full phrase on every loader.
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={clsx('flex w-full flex-col items-center gap-1', variant.root, className)}
    >
      <div ref={boxRef} className="w-full" style={{ containerType: 'inline-size' }}>
        {/* Fixed row height per size: the block never changes height while the font is fitted or
            the viewport resizes, so nothing around the loader shifts. Until the first measurement
            (and with no JS layout at all) the clamp() below is the worst-case-safe size. */}
        <div
          data-loading-phrase
          aria-hidden="true"
          dir="rtl"
          className="flex items-center justify-center whitespace-nowrap text-brand motion-safe:animate-pulse"
          style={{
            height: variant.rowHeight,
            lineHeight: 1.6,
            fontSize: fontPx ? `${fontPx}px` : `clamp(${MIN_READABLE_PX}px, 5cqi, ${variant.maxPx}px)`,
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
        </div>
      </div>
      <span
        className={variant.label}
        style={
          fontPx && variant.labelMax
            ? { fontSize: `min(${variant.labelMax}, ${Math.max(MIN_READABLE_PX, fontPx * LABEL_TO_PHRASE_RATIO)}px)` }
            : undefined
        }
      >
        {label}
      </span>
    </div>
  );
}

export default LoadingPhrase;
