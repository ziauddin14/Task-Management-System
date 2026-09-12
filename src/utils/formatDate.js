import { format, isValid } from 'date-fns';

// FINAL DATE FORMAT — every displayed date across the app is DD-MM-YY, zero-padded (e.g. "01-09-26"),
// numeric order preserved regardless of RTL flow (§7 — Latin digits stay LTR inside RTL automatically).
// formatDate/formatDateShortYear used to differ ("dd MMM yyyy" vs "dd MMM yy") but both prompts now
// resolve to the same "dd-MM-yy" token, so formatDate was retired in favor of this single formatter —
// its former call sites (PrintView.jsx's Deadline column, PreviousUpdatesContent.jsx's summary-table
// Deadline and updates-table Date) now call formatDateShortYear directly.
export function formatDateShortYear(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? format(date, 'dd-MM-yy') : '-';
}

// docs/08-ui-ux.md §7 — Previous Updates history entries show a date (with time, since a
// conversation-style thread of same-day updates reads better disambiguated).
export function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? format(date, 'dd-MM-yy, HH:mm') : '-';
}

// Prompt 5A — the redesigned "Previous Updates" table shows تاریخ (Date) and وقت (Time) as two
// separate columns rather than one combined string, so this splits out just the time-of-day half.
export function formatTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? format(date, 'HH:mm') : '-';
}

// docs/08-ui-ux.md §6 — Time Status column example wording: "3 din baaqi" / "2 din taxeer se".
// timeStatus: { type: 'remaining'|'overdue'|'early'|'late', days: number } (backend/src/models/Task.js).
// Prompt 2G fix — every branch (including the days===0 edge cases) is now proper Urdu script;
// "early"/"late" previously fell back to Roman Urdu/English, inconsistent with "remaining"/
// "overdue" already being in script.
export function formatTimeStatusLabel(timeStatus) {
  if (!timeStatus) return '-';
  const { type, days } = timeStatus;
  switch (type) {
    case 'remaining':
      return days === 0 ? 'آج آخری تاریخ ہے' : `${days} دن باقی`;
    case 'overdue':
      return `${days} دن تاخیر سے`;
    case 'early':
      return days === 0 ? 'وقت پر مکمل ہوا' : `${days} دن پہلے مکمل ہوا`;
    case 'late':
      return `${days} دن تاخیر سے مکمل ہوا`;
    default:
      return '-';
  }
}

// Urgency coloring (docs/08-ui-ux.md §6: "colored to match urgency"); exact thresholds aren't
// specified beyond the two illustrative examples, so this keeps it simple and consistent with the
// status/performance badge palette (docs/08-ui-ux.md §1).
export function getTimeStatusColorClass(timeStatus) {
  if (!timeStatus) return 'text-gray-500';
  switch (timeStatus.type) {
    case 'overdue':
    case 'late':
      return 'text-red-600';
    case 'early':
      return 'text-green-600';
    case 'remaining':
    default:
      return 'text-gray-700';
  }
}
