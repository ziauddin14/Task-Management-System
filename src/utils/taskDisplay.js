// docs/08-ui-ux.md §1 — status/performance badge color coding, consistent everywhere a status
// appears (KPI cards, table, modals). Urdu labels for the two KPI groups ("Kaam ki Kaifiyat" /
// "Karkardagi") follow the same wording style as the document's own examples ("Jari", "Mumtaz").
// Prompt 2C/2D — client-specified relabeling: pending -> "پینڈنگ" (the word "Pending" in Urdu
// script, not the literal translation), closed -> "کلوز" (the word "Close" in Urdu script, a
// loanword per the client's explicit instruction). good -> "بہتر", fair -> "مناسب". These labels
// are shared by the KPI cards AND the per-task badge shown in the table/modals (docs/08-ui-ux.md
// §1's own "consistent everywhere" rule), so every one of them reads correctly in both places.
//
// The "-" (not-applicable) entry keeps its bare-dash label — correct for a single TASK row that
// has no rating. The KPI group no longer has a card for that bucket at all: its fifth card is the
// real overall quality (an average), and unrated tasks are a plain count under the cards
// (components/dashboard/RatingKpiGroup.jsx).
export const STATUS_META = {
  ongoing: { label: 'جاری', badgeClass: 'bg-blue-100 text-blue-800' },
  pending: { label: 'پینڈنگ', badgeClass: 'bg-orange-100 text-orange-800' },
  complete: { label: 'مکمل', badgeClass: 'bg-green-100 text-green-800' },
  closed: { label: 'کلوز', badgeClass: 'bg-gray-200 text-gray-700' },
};

export const PERFORMANCE_META = {
  excellent: { label: 'ممتاز', badgeClass: 'bg-green-100 text-green-800' },
  good: { label: 'بہتر', badgeClass: 'bg-blue-100 text-blue-800' },
  fair: { label: 'مناسب', badgeClass: 'bg-amber-100 text-amber-800' },
  weak: { label: 'کمزور', badgeClass: 'bg-red-100 text-red-800' },
  '-': { label: '-', badgeClass: 'bg-gray-100 text-gray-500' },
};

// The four rating bands, best first — the order the KPI cards are shown in.
export const PERFORMANCE_BAND_KEYS = ['excellent', 'good', 'fair', 'weak'];

// A developer-assigned ("synthetic") rating is always labelled with this word wherever it shows,
// so it is never read as a real one (backend: Task.syntheticRating, docs/02-db-design.md §7).
export const SYNTHETIC_LABEL = 'تخمینی';

export function isSyntheticRating(task) {
  return task?.syntheticRating?.isSynthetic === true;
}

// "تخمینی 80%" — the badge's tooltip / expanded text, and what print and exports show outright.
export function syntheticDetail(assumedPercent) {
  return `${SYNTHETIC_LABEL} ${assumedPercent}%`;
}

// The rating thresholds (>=90 / >=80 / >=70 / below), with no late downgrade — a mirror of the
// backend's ratingForPercent, used ONLY to preview the band while an admin types a new assumed
// percentage. Every rating actually shown for a task comes from the server.
export function ratingForPercent(percent) {
  if (percent >= 90) return 'excellent';
  if (percent >= 80) return 'good';
  if (percent >= 70) return 'fair';
  return 'weak';
}

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || '-', badgeClass: 'bg-gray-100 text-gray-600' };
}

export function getPerformanceMeta(rating) {
  return PERFORMANCE_META[rating] || PERFORMANCE_META['-'];
}
