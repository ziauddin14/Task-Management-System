// How a task status and a rating band look in the mobile layout. Class names only — every colour
// behind them is a design token (src/styles/tokens.css). The labels themselves stay where they
// always were (utils/taskDisplay.js), shared with the desktop table.
//
// Written out in full (never assembled from parts) so Tailwind's scanner sees every class.
export const STATUS_TONE = {
  pending: {
    chip: 'bg-tk-pending-bg text-tk-pending-text',
    iconWrap: 'bg-tk-pending-bg',
    icon: 'text-tk-pending-accent',
    number: 'text-tk-pending-accent',
    bar: 'bg-tk-pending-bar',
    ring: 'ring-tk-pending-accent',
  },
  ongoing: {
    chip: 'bg-tk-ongoing-bg text-tk-ongoing-text',
    iconWrap: 'bg-tk-ongoing-bg',
    icon: 'text-tk-ongoing-text',
    number: 'text-tk-ongoing-text',
    bar: 'bg-tk-ongoing-text',
    ring: 'ring-tk-ongoing-text',
  },
  closed: {
    chip: 'bg-tk-closed-bg text-tk-closed-text',
    iconWrap: 'bg-tk-closed-bg',
    icon: 'text-tk-closed-text',
    number: 'text-tk-closed-text',
    bar: 'bg-tk-closed-text',
    ring: 'ring-tk-closed-text',
  },
  complete: {
    chip: 'bg-tk-complete-bg text-tk-complete-text',
    iconWrap: 'bg-tk-complete-bg',
    icon: 'text-tk-complete-text',
    number: 'text-tk-complete-text',
    bar: 'bg-tk-complete-text',
    ring: 'ring-tk-complete-text',
  },
};

const UNKNOWN_STATUS_TONE = {
  chip: 'bg-tk-track text-tk-ink-soft',
  iconWrap: 'bg-tk-track',
  icon: 'text-tk-ink-soft',
  number: 'text-tk-ink',
  bar: 'bg-tk-muted',
  ring: 'ring-tk-muted',
};

// The order the status tiles are shown in (the approved mockup's): what needs attention first.
export const STATUS_TILE_ORDER = ['pending', 'ongoing', 'closed', 'complete'];

export const RATING_TONE = {
  excellent: { text: 'text-tk-excellent', chip: 'bg-tk-excellent-bg text-tk-excellent', fill: 'bg-tk-excellent-fill', stroke: 'stroke-tk-excellent-fill' },
  good: { text: 'text-tk-good', chip: 'bg-tk-good-bg text-tk-good', fill: 'bg-tk-good-fill', stroke: 'stroke-tk-good-fill' },
  fair: { text: 'text-tk-fair', chip: 'bg-tk-fair-bg text-tk-fair', fill: 'bg-tk-fair-fill', stroke: 'stroke-tk-fair-fill' },
  weak: { text: 'text-tk-weak', chip: 'bg-tk-weak-bg text-tk-weak', fill: 'bg-tk-weak-fill', stroke: 'stroke-tk-weak-fill' },
};

export function getStatusTone(status) {
  return STATUS_TONE[status] || UNKNOWN_STATUS_TONE;
}

// undefined for an unrated task ('-') — it has no band, so it gets no rating chip at all.
export function getRatingTone(rating) {
  return RATING_TONE[rating];
}
