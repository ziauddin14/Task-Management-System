// docs/07-frontend-foundation.md §7-8. Tailwind v3 (classic JS config) deliberately, not v4 —
// the docs explicitly list `tailwind.config.js` as a top-level project file (§2) and describe
// "Brand color extended in tailwind.config.js" (§8), which assumes v3's config-file model; v4's
// CSS-first `@theme` approach would contradict that documented file, so v3 is pinned on purpose.
import tailwindcssRtl from 'tailwindcss-rtl';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Placeholder shade — the exact tone will be reconciled with Dawat-e-Islami's real brand
        // assets once provided (docs/01-architecture.md's client-responsibility item).
        brand: {
          DEFAULT: '#1F6F3F',
          light: '#EAF3EC',
        },
      },
      fontFamily: {
        // Set once here so no component needs to repeat it (§7). Falls through to the fallback
        // stack until the real Jameel Noori Nastaleeq font file exists (see styles/fonts.css).
        sans: ['Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Noto Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssRtl],
};
