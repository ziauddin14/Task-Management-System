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
// (components/dashboard/QualityHero.jsx).
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

// The server sends `isSynthetic` meaning the rating is STILL AN ESTIMATE: false once an admin has
// changed it (backend utils/syntheticRating.js), so the badge disappears by itself.
export function isSyntheticRating(task) {
  return task?.syntheticRating?.isSynthetic === true;
}

// An admin changed this estimate, which made it FINAL: shown and counted as a real rating, and it
// can no longer be changed or removed. An older backend never sends `isFinal`, so this is false
// there and everything behaves as before.
export function isFinalRating(task) {
  return task?.syntheticRating?.isFinal === true;
}

// The owner-approved wording for a final rating.
export const FINAL_RATING_NOTE = 'یہ درجہ بندی حتمی ہو چکی ہے، اب تبدیل نہیں ہو سکتی۔';
export const FINAL_RATING_SAVED = 'درجہ بندی حتمی کر دی گئی';
export const FINALIZE_CONFIRM_LABEL = 'ہاں، حتمی کریں';

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

// The band an admin's edit will SAVE — a mirror of the backend's computeFinalRating, used ONLY for
// the estimate dialog's preview and its confirmation: an edit makes the rating final, and a final
// rating is rated like a real one with the percent entered — ONE level down when the task was
// completed late (ممتاز→بہتر, بہتر→مناسب, مناسب→کمزور; کمزور stays). While the task is open there
// is no downgrade. `downgraded` is true only when that actually lowered the band.
export function finalRatingFor(percent, task) {
  const plain = ratingForPercent(percent);
  const completedLate = ['complete', 'closed'].includes(task?.status) && task?.timeStatus?.type === 'late';
  if (!completedLate) return { band: plain, downgraded: false };
  const band = PERFORMANCE_BAND_KEYS[Math.min(PERFORMANCE_BAND_KEYS.indexOf(plain) + 1, PERFORMANCE_BAND_KEYS.length - 1)];
  return { band, downgraded: band !== plain };
}

// The owner-approved wording for that downgrade: the hint beside the preview, and the sentence
// added to the confirmation — each shown only when the band was actually lowered.
export const LATE_DOWNGRADE_HINT = 'تاخیر کی وجہ سے ایک درجہ کم';
export const LATE_DOWNGRADE_SENTENCE = 'کام تاخیر سے مکمل ہوا تھا، اس لیے درجہ بندی ایک درجہ کم رکھی گئی ہے۔';

// The owner-approved warning in the update form while a task is complete: an update below 100%
// reopens it (backend task.service.js applyNewUpdateToTask).
export const REOPEN_WARNING = 'یہ کام مکمل ہو چکا ہے۔ 100 سے کم فیصد درج کرنے پر یہ دوبارہ کھل جائے گا۔';

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || '-', badgeClass: 'bg-gray-100 text-gray-600' };
}

export function getPerformanceMeta(rating) {
  return PERFORMANCE_META[rating] || PERFORMANCE_META['-'];
}

// "Ali، Bilal +1" — a task's zimmedar on one line: the first two by name, then how many more.
// Used where there is no room for the table's row of name chips (the mobile task card).
export function assigneeSummary(assignees = [], maxNames = 2) {
  const names = assignees.slice(0, maxNames).map((person) => person.name);
  if (names.length === 0) return '-';
  const extra = assignees.length - names.length;
  return extra > 0 ? `${names.join('، ')} +${extra}` : names.join('، ');
}
