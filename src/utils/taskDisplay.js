// docs/08-ui-ux.md §1 — status/performance badge color coding, consistent everywhere a status
// appears (KPI cards, table, modals). Urdu labels for the two KPI groups ("Kaam ki Kaifiyat" /
// "Karkardagi") follow the same wording style as the document's own examples ("Jari", "Mumtaz").
export const STATUS_META = {
  ongoing: { label: 'Jari', badgeClass: 'bg-blue-100 text-blue-800' },
  pending: { label: 'Zer-e-Iltiwa', badgeClass: 'bg-orange-100 text-orange-800' },
  complete: { label: 'Mukammal', badgeClass: 'bg-green-100 text-green-800' },
  closed: { label: 'Band', badgeClass: 'bg-gray-200 text-gray-700' },
};

export const PERFORMANCE_META = {
  excellent: { label: 'Mumtaz', badgeClass: 'bg-green-100 text-green-800' },
  good: { label: 'Acha', badgeClass: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Darmiyana', badgeClass: 'bg-amber-100 text-amber-800' },
  weak: { label: 'Kamzor', badgeClass: 'bg-red-100 text-red-800' },
  '-': { label: '-', badgeClass: 'bg-gray-100 text-gray-500' },
};

// Dashboard summary's byPerformance uses the key "notApplicable" (docs/05-apis.md §8) for what's
// stored on the Task document itself as performanceRating: '-' (docs/04-db-models.md §3) — this
// map lets KPI cards and the query-param toggle share one lookup regardless of which key they hold.
export const PERFORMANCE_SUMMARY_KEY_TO_VALUE = {
  excellent: 'excellent',
  good: 'good',
  fair: 'fair',
  weak: 'weak',
  notApplicable: '-',
};

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || '-', badgeClass: 'bg-gray-100 text-gray-600' };
}

export function getPerformanceMeta(rating) {
  return PERFORMANCE_META[rating] || PERFORMANCE_META['-'];
}
