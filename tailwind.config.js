// docs/07-frontend-foundation.md §7-8. Tailwind v3 (classic JS config) deliberately, not v4 —
// the docs explicitly list `tailwind.config.js` as a top-level project file (§2) and describe
// "Brand color extended in tailwind.config.js" (§8), which assumes v3's config-file model; v4's
// CSS-first `@theme` approach would contradict that documented file, so v3 is pinned on purpose.
import tailwindcssRtl from 'tailwindcss-rtl';

// The mobile UI's design tokens. Their values live in src/styles/tokens.css (CSS variables) and
// nowhere else; this only gives each one a `tk-*` utility name. Used by the mobile layout
// (< 768px) alone — the desktop layout keeps `brand` and Tailwind's default palette.
const token = (name) => `var(--tk-${name})`;
const tokens = (names) => Object.fromEntries(names.map((name) => [name, token(name)]));

const TOKEN_COLORS = tokens([
  'green-900', 'green-700', 'green-100', 'green-50',
  'page', 'card', 'ink', 'ink-soft', 'muted', 'line', 'line-strong', 'track',
  'pending-bg', 'pending-text', 'pending-accent', 'pending-bar',
  'ongoing-bg', 'ongoing-text', 'closed-bg', 'closed-text', 'complete-bg', 'complete-text',
  'excellent', 'excellent-bg', 'excellent-fill', 'good', 'good-bg', 'good-fill',
  'fair', 'fair-bg', 'fair-fill', 'weak', 'weak-bg', 'weak-fill',
  'attention-bg', 'attention-chip', 'attention-text', 'attention-icon',
  'danger', 'danger-bg', 'badge', 'bell-dot',
]);

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
        tk: TOKEN_COLORS,
      },
      borderRadius: {
        'tk-hero': token('radius-hero'),
        'tk-card': token('radius-card'),
        'tk-tile': token('radius-tile'),
        'tk-input': token('radius-input'),
        'tk-chip': token('radius-chip'),
        'tk-pill': token('radius-pill'),
      },
      boxShadow: {
        'tk-soft': token('shadow-soft'),
        'tk-hero': token('shadow-hero'),
        'tk-fab': token('shadow-fab'),
        'tk-sheet': token('shadow-sheet'),
      },
      spacing: {
        'tk-page': token('space-page'),
        'tk-card': token('space-card'),
        'tk-gap': token('space-gap'),
        'tk-gap-sm': token('space-gap-sm'),
        'tk-appbar': token('appbar-h'),
        'tk-tabbar': token('tabbar-h'),
        'tk-touch': token('touch'),
      },
      lineHeight: {
        'tk-label': token('lh-label'),
        'tk-title': token('lh-title'),
        'tk-number': token('lh-number'),
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
