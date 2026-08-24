// docs/08-ui-ux.md §6 — the Task Table's column set, RTL reading order (right -> left), and which
// ones can be hidden. Shared between components/dashboard/TaskTable.jsx (rendering) and
// components/dashboard/ColumnToggle.jsx (the checklist) so the two never drift apart.
export const COLUMN_DEFINITIONS = [
  { key: 'codeNumber', label: 'Code Number', locked: true },
  { key: 'title', label: 'Kaam', locked: true },
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
