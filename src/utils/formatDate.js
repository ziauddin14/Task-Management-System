import { format, isValid } from 'date-fns';

// docs/07-frontend-foundation.md §2 lists formatDate/formatDeadlineLabel among utils/. Latin
// digits stay LTR inside the RTL flow automatically (§7) — no special handling needed here.
export function formatDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? format(date, 'dd MMM yyyy') : '-';
}

// docs/08-ui-ux.md §6 — Time Status column example wording: "3 din baaqi" / "2 din taxeer se".
// timeStatus: { type: 'remaining'|'overdue'|'early'|'late', days: number } (backend/src/models/Task.js).
export function formatTimeStatusLabel(timeStatus) {
  if (!timeStatus) return '-';
  const { type, days } = timeStatus;
  switch (type) {
    case 'remaining':
      return days === 0 ? 'Aaj deadline hai' : `${days} din baaqi`;
    case 'overdue':
      return `${days} din taxeer se`;
    case 'early':
      return days === 0 ? 'Waqt par mukammal hua' : `${days} din pehle mukammal hua`;
    case 'late':
      return `${days} din taxeer se mukammal hua`;
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
