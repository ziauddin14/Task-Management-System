import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import clsx from 'clsx';
import PhraseLine from './PhraseLine.jsx';

// The ONE loader used across the app: the client's phrase on a single fitted line (PhraseLine.jsx
// owns the phrase, the font and every sizing rule) inside an accessible busy status region.
// Three sizes:
//   fullscreen — owns the whole viewport (session restore)
//   section    — a page/table/list/drawer/modal area
//   compact    — a single small line (a picker/dropdown placeholder, the line under a busy button)
//
// The caption under the phrase stays visibly secondary to it, even where a wide fallback font on a
// small phone has brought the phrase itself down.
const LABEL_TO_PHRASE_RATIO = 0.8;
const MIN_LABEL_PX = 12;

const VARIANTS = {
  fullscreen: { root: 'min-h-screen justify-center px-4', label: 'text-base text-gray-500', labelMax: '1rem' },
  section: { root: 'py-6', label: 'text-sm text-gray-500', labelMax: '0.875rem' },
  compact: { root: '', label: 'sr-only', labelMax: null },
};

function LoadingPhrase({ size = 'section', label = 'لوڈ ہو رہا ہے…', maxRowHeight, className }) {
  const variantKey = VARIANTS[size] ? size : 'section';
  const variant = VARIANTS[variantKey];
  const [fontPx, setFontPx] = useState(null);

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
      <PhraseLine size={variantKey} animated decorative onFit={setFontPx} maxRowHeight={maxRowHeight} />
      <span
        className={variant.label}
        style={
          fontPx && variant.labelMax
            ? { fontSize: `min(${variant.labelMax}, ${Math.max(MIN_LABEL_PX, fontPx * LABEL_TO_PHRASE_RATIO)}px)` }
            : undefined
        }
      >
        {label}
      </span>
    </div>
  );
}

export default LoadingPhrase;
