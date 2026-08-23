// docs/08-ui-ux.md §6 — the Task Table's column set, RTL reading order (right -> left), and which
// ones can be hidden. Shared between components/dashboard/TaskTable.jsx (rendering) and
// components/dashboard/ColumnToggle.jsx (the checklist) so the two never drift apart.
export const COLUMN_DEFINITIONS = [
  { key: 'codeNumber', label: 'Code Number', locked: true },
  { key: 'title', label: 'Kaam', locked: true },
  { key: 'assignees', label: 'Zimmedar(an)', locked: false },
  { key: 'responsibility', label: 'Zimmedari', locked: false },
  { key: 'deadline', label: 'Deadline', locked: false },
  { key: 'lastUpdate', label: 'Last Update', locked: false },
  { key: 'status', label: 'Status', locked: false },
  { key: 'timeStatus', label: 'Time Status', locked: false },
  { key: 'completionPercent', label: 'Completion %', locked: false },
  { key: 'performance', label: 'Performance', locked: false },
  { key: 'actions', label: 'Actions', locked: true },
];
