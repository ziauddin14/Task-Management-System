import { ArrowRight, Check, CircleCheck, Clock } from 'lucide-react';

// How a task status and a rating band look on the DESKTOP dashboard (tinted tiles, the donut, the
// table's progress bar). Class names only — every colour behind them is a design token
// (src/styles/tokens.css). The chips inside the table reuse utils/mobileTheme.js as they are.
//
// Written out in full (never assembled from parts) so Tailwind's scanner sees every class.

// The order the status tiles, the donut legend and the donut's segments are shown in.
export const STATUS_ORDER = ['pending', 'ongoing', 'closed', 'complete'];
// The donut draws the largest group first in the approved mockup: closed, pending, ongoing, complete.
export const DONUT_ORDER = ['closed', 'pending', 'ongoing', 'complete'];

export const STATUS_ICONS = { pending: Clock, ongoing: ArrowRight, closed: Check, complete: CircleCheck };

export const STATUS_TILE_TONE = {
  pending: {
    tile: 'bg-tk-pending-tint',
    chip: 'bg-tk-pending-chip',
    icon: 'text-tk-pending-text',
    label: 'text-tk-pending-ink',
    number: 'text-tk-pending-text',
    ring: 'ring-tk-pending-text',
    stroke: 'stroke-tk-pending-fill',
    swatch: 'bg-tk-pending-fill',
  },
  ongoing: {
    tile: 'bg-tk-ongoing-tint',
    chip: 'bg-tk-ongoing-chip',
    icon: 'text-tk-ongoing-text',
    label: 'text-tk-ongoing-ink',
    number: 'text-tk-ongoing-text',
    ring: 'ring-tk-ongoing-text',
    stroke: 'stroke-tk-ongoing-fill',
    swatch: 'bg-tk-ongoing-fill',
  },
  closed: {
    tile: 'bg-tk-closed-tint',
    chip: 'bg-tk-closed-chip',
    icon: 'text-tk-closed-text',
    label: 'text-tk-closed-ink',
    number: 'text-tk-closed-text',
    ring: 'ring-tk-closed-text',
    stroke: 'stroke-tk-closed-fill',
    swatch: 'bg-tk-closed-fill',
  },
  complete: {
    tile: 'bg-tk-complete-tint',
    chip: 'bg-tk-complete-chip',
    icon: 'text-tk-complete-text',
    label: 'text-tk-complete-ink',
    number: 'text-tk-complete-text',
    ring: 'ring-tk-complete-text',
    stroke: 'stroke-tk-complete-fill',
    swatch: 'bg-tk-complete-fill',
  },
};

export const BAND_TILE_TONE = {
  excellent: { tile: 'bg-tk-excellent-tint', label: 'text-tk-excellent-ink', number: 'text-tk-excellent', ring: 'ring-tk-excellent' },
  good: { tile: 'bg-tk-good-tint', label: 'text-tk-good-ink', number: 'text-tk-good', ring: 'ring-tk-good' },
  fair: { tile: 'bg-tk-fair-tint', label: 'text-tk-fair-ink', number: 'text-tk-fair', ring: 'ring-tk-fair' },
  weak: { tile: 'bg-tk-weak-tint', label: 'text-tk-weak-ink', number: 'text-tk-weak', ring: 'ring-tk-weak' },
};

// The table's completion bar, coloured by how far the task REALLY is: under 30% red, 30–69% amber,
// 70% and over green.
export function progressFillClass(percent) {
  if (percent >= 70) return 'bg-tk-good-fill';
  if (percent >= 30) return 'bg-tk-pending-fill';
  return 'bg-tk-weak-fill';
}
