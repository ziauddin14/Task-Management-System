// docs/08-ui-ux.md §6 — the Task Table's column set, RTL reading order (right -> left), and which
// ones can be hidden. Shared between components/dashboard/TaskTable.jsx (rendering) and
// components/dashboard/ColumnToggle.jsx (the checklist) so the two never drift apart.
// Prompt 2F — every column header in proper Urdu Rasm-ul-Khat; "Code Number"/"Kaam" were the last
// two still in English/Roman Urdu (everything else here was already translated).
export const COLUMN_DEFINITIONS = [
  { key: 'codeNumber', label: 'کوڈ نمبر', locked: true },
  { key: 'title', label: 'کام', locked: true },
  { key: 'assignees', label: 'ذمہ دار', locked: false },
  { key: 'responsibility', label: 'ذمہ داری', locked: false },
  { key: 'deadline', label: 'آخری تاریخ', locked: false },
  { key: 'lastUpdate', label: 'آخری اپڈیٹ', locked: false },
  { key: 'status', label: 'کیفیت', locked: false },
  { key: 'timeStatus', label: 'وقتی صورتحال', locked: false },
  { key: 'completionPercent', label: 'تکمیل فیصد', locked: false },
  { key: 'performance', label: 'کارکردگی', locked: false },
  { key: 'actions', label: 'اقدامات', locked: true },
];
