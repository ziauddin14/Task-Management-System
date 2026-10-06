// The shared look of the redesigned dialogs and desktop pages: buttons, form fields, cards. Class
// names only — every colour, radius and shadow behind them is a design token
// (src/styles/tokens.css). Written out in full so Tailwind's scanner sees every class.

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tk-green-700';

// ---- Dialog footer buttons: 50px tall, radius 16 -------------------------------------------------
// `tk-btn` and `tk-field` carry no style of their own: they are the names a redesigned dialog's
// short-window rules (styles/tokens.css) know these controls by.
const DIALOG_BUTTON_BASE = `tk-btn flex h-[50px] min-w-0 items-center justify-center gap-2 rounded-tk-btn px-6 text-[15px] leading-tk-label transition-colors disabled:cursor-not-allowed ${FOCUS_RING}`;

// The one action a dialog is for. `grow` it to fill the footer row. Dimmed, with no shadow, while
// it cannot be used.
export const BUTTON_PRIMARY = `${DIALOG_BUTTON_BASE} bg-tk-green-700 text-[16px] font-semibold text-white shadow-tk-primary hover:bg-tk-green-900 disabled:opacity-45 disabled:shadow-none`;
export const BUTTON_GHOST = `${DIALOG_BUTTON_BASE} border border-tk-line-btn bg-white text-tk-green-900 hover:bg-tk-hover disabled:opacity-45`;
export const BUTTON_DANGER = `${DIALOG_BUTTON_BASE} border border-tk-danger-line bg-tk-danger-bg text-tk-danger hover:brightness-95 disabled:opacity-45`;
export const BUTTON_AMBER = `${DIALOG_BUTTON_BASE} border border-tk-amber-line bg-tk-amber-bg text-tk-amber-text hover:brightness-95 disabled:opacity-45`;

// ---- Page-level buttons (page headers, tables): 46px tall, radius 14 ------------------------------
const PAGE_BUTTON_BASE = `flex h-[46px] shrink-0 items-center gap-2 rounded-tk-input px-[18px] text-[14px] leading-tk-label transition-colors disabled:opacity-50 ${FOCUS_RING}`;
export const PAGE_BUTTON_PRIMARY = `${PAGE_BUTTON_BASE} bg-tk-green-700 px-[22px] text-[15px] font-semibold text-white shadow-tk-primary hover:bg-tk-green-900`;
export const PAGE_BUTTON_GHOST = `${PAGE_BUTTON_BASE} border border-tk-line-btn bg-white text-tk-green-900 hover:bg-tk-hover`;
export const SMALL_BUTTON_GHOST = `flex h-[40px] shrink-0 items-center justify-center rounded-tk-chip border border-tk-line-btn bg-white px-[14px] text-[13px] leading-tk-label text-tk-green-900 transition-colors hover:bg-tk-hover ${FOCUS_RING}`;

// ---- Form fields: 48px tall, radius 14, tinted fill; a green border and ring on focus -------------
const FIELD_BASE =
  'tk-field w-full rounded-tk-input border-[1.5px] border-transparent bg-tk-surface px-[14px] text-[14px] text-tk-ink placeholder:text-tk-muted transition-colors focus:border-tk-green-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-tk-green-700/25 disabled:opacity-60';
export const FIELD = `${FIELD_BASE} h-[48px]`;
export const FIELD_TEXTAREA = `${FIELD_BASE} py-[10px] leading-tk-label`;
export const FIELD_LABEL = 'mb-[2px] block text-[13px] leading-tk-label text-tk-ink-soft';
export const FIELD_ERROR = 'mt-1 text-[13px] leading-tk-label text-tk-danger';

// ---- Surfaces -------------------------------------------------------------------------------------
export const CARD = 'rounded-tk-panel bg-tk-card shadow-tk-card';
export const PAGE_TITLE = 'text-[30px] font-semibold leading-[1.9] text-tk-ink';
export const PAGE_SUBTITLE = 'text-[13px] leading-tk-label text-tk-muted';
