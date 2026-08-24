// Mirrors backend/src/services/report.service.js's USER_SUMMARY_COLUMNS/USER_SUMMARY_COLUMN_LABELS
// exactly, so the keys sent in the export's `columns` param (docs/05-apis.md §9) match what the
// backend actually recognizes. "name" is locked — hiding the row's own identifier makes no sense.
export const USER_SUMMARY_COLUMN_DEFINITIONS = [
  { key: 'name', label: 'نام', locked: true },
  { key: 'responsibility', label: 'ذمہ داری', locked: false },
  { key: 'ongoing', label: 'جاری', locked: false },
  { key: 'pending', label: 'زیر التواء', locked: false },
  { key: 'complete', label: 'مکمل', locked: false },
  { key: 'closed', label: 'بند', locked: false },
  { key: 'excellent', label: 'ممتاز', locked: false },
  { key: 'good', label: 'اچھا', locked: false },
  { key: 'fair', label: 'درمیانہ', locked: false },
  { key: 'weak', label: 'کمزور', locked: false },
  { key: 'notApplicable', label: 'N/A', locked: false },
  { key: 'total', label: 'Total', locked: false },
];
