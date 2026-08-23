// Mirrors backend/src/services/report.service.js's USER_SUMMARY_COLUMNS/USER_SUMMARY_COLUMN_LABELS
// exactly, so the keys sent in the export's `columns` param (docs/05-apis.md §9) match what the
// backend actually recognizes. "name" is locked — hiding the row's own identifier makes no sense.
export const USER_SUMMARY_COLUMN_DEFINITIONS = [
  { key: 'name', label: 'Name', locked: true },
  { key: 'responsibility', label: 'Responsibility', locked: false },
  { key: 'ongoing', label: 'Ongoing', locked: false },
  { key: 'pending', label: 'Pending', locked: false },
  { key: 'complete', label: 'Complete', locked: false },
  { key: 'closed', label: 'Closed', locked: false },
  { key: 'excellent', label: 'Excellent', locked: false },
  { key: 'good', label: 'Good', locked: false },
  { key: 'fair', label: 'Fair', locked: false },
  { key: 'weak', label: 'Weak', locked: false },
  { key: 'notApplicable', label: 'N/A', locked: false },
  { key: 'total', label: 'Total', locked: false },
];
