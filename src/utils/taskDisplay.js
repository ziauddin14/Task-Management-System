// docs/08-ui-ux.md §1 — status/performance badge color coding, consistent everywhere a status
// appears (KPI cards, table, modals). Urdu labels for the two KPI groups ("Kaam ki Kaifiyat" /
// "Karkardagi") follow the same wording style as the document's own examples ("Jari", "Mumtaz").
// Prompt 2C/2D — client-specified relabeling: pending -> "پینڈنگ" (the word "Pending" in Urdu
// script, not the literal translation), closed -> "کلوز" (the word "Close" in Urdu script, a
// loanword per the client's explicit instruction). good -> "بہتر", fair -> "مناسب". These labels
// are shared by the KPI cards AND the per-task badge shown in the table/modals (docs/08-ui-ux.md
// §1's own "consistent everywhere" rule), so every one of them reads correctly in both places.
//
// The "-" (not-applicable) entry deliberately keeps its bare-dash label here — it's still correct
// for a single TASK row whose performance genuinely isn't applicable yet (ongoing/pending). The
// KPI card's 5th "overall" bucket needing a clearer label than a bare dash (client's complaint) is
// a DIFFERENT concern — see PERFORMANCE_CARD_NOT_APPLICABLE_LABEL below — conflating the two would
// have mislabeled every ongoing task's row badge as "Overall" instead of "not applicable yet".
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

// Prompt 2D — the KPI card for the "notApplicable" bucket gets this label instead of the bare "-"
// (the client found the dash confusing, "like something was broken"). Used only by
// DashboardPage.jsx's 5th performance KpiCard — never by the per-task badge (PERFORMANCE_META
// above), which legitimately means something different in that context (this task's performance
// isn't applicable yet, not "here is the overall figure").
export const PERFORMANCE_CARD_NOT_APPLICABLE_LABEL = 'مجموعی کیفیت';

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
