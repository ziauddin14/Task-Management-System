import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { formatDateShortYear } from './formatDate.js';
import { getPerformanceMeta, getStatusMeta, SYNTHETIC_LABEL } from './taskDisplay.js';

// Everything the mobile filter UI (the sheet, the chips under the search field, the quick date
// chips) needs to know about the dashboard's filters. It adds no filter of its own: every value
// here is one of the URL params hooks/useDashboardFilters.js already reads.

export const UNRATED_LABEL = 'بغیر درجہ بندی';
export const RATING_SOURCE_LABELS = { synthetic: SYNTHETIC_LABEL, real: 'اصل' };
export const DATE_TYPE_LABELS = { deadline: 'آخری تاریخ', entry: 'تاریخِ اندراج' };

// The filters the sheet edits. Search is not one of them — it has its own field.
export const SHEET_FILTER_KEYS = ['status', 'performanceRating', 'ratingSource', 'assigneeId', 'dateType', 'from', 'to'];

// What a native <input type="date"> reads and writes, and what the `from`/`to` params hold.
function toDateParam(date) {
  return format(date, 'yyyy-MM-dd');
}

// The quick date ranges. Each is only a from/to pair on the chosen date field, so the existing
// date-range filter carries them. A week runs Monday to Sunday.
export const QUICK_RANGES = [
  { key: 'today', label: 'آج' },
  { key: 'week', label: 'اس ہفتے' },
  { key: 'month', label: 'اس ماہ' },
];

export function quickRange(key, now = new Date()) {
  switch (key) {
    case 'today':
      return { from: toDateParam(now), to: toDateParam(now) };
    case 'week':
      return {
        from: toDateParam(startOfWeek(now, { weekStartsOn: 1 })),
        to: toDateParam(endOfWeek(now, { weekStartsOn: 1 })),
      };
    case 'month':
      return { from: toDateParam(startOfMonth(now)), to: toDateParam(endOfMonth(now)) };
    default:
      return { from: undefined, to: undefined };
  }
}

// Which quick range (if any) a from/to pair is.
export function matchQuickRange(from, to, now = new Date()) {
  if (!from || !to) return null;
  const match = QUICK_RANGES.find((range) => {
    const candidate = quickRange(range.key, now);
    return candidate.from === from && candidate.to === to;
  });
  return match ? match.key : null;
}

function dateRangeLabel(params, now) {
  const type = params.dateType === 'entry' ? 'entry' : 'deadline';
  const quickKey = matchQuickRange(params.from, params.to, now);
  if (quickKey) {
    return `${DATE_TYPE_LABELS[type]}: ${QUICK_RANGES.find((range) => range.key === quickKey).label}`;
  }
  if (params.from && params.to) {
    return `${DATE_TYPE_LABELS[type]}: ${formatDateShortYear(params.from)} تا ${formatDateShortYear(params.to)}`;
  }
  if (params.from) return `${DATE_TYPE_LABELS[type]}: ${formatDateShortYear(params.from)} سے`;
  return `${DATE_TYPE_LABELS[type]}: ${formatDateShortYear(params.to)} تک`;
}

// The filters currently in force, as chips: a label, and the patch (for setFilters) that removes
// that one filter. `users` (Admin only) names the chosen zimmedar; `includeSearch` adds the search
// text as a chip — for a screen that has no search field of its own to show it in.
export function describeActiveFilters(params, { users = [], includeSearch = false, now = new Date() } = {}) {
  const chips = [];

  if (includeSearch && params.search) {
    chips.push({ key: 'search', label: `تلاش: ${params.search}`, clear: { search: undefined } });
  }
  if (params.status) {
    chips.push({ key: 'status', label: getStatusMeta(params.status).label, clear: { status: undefined } });
  }
  if (params.performanceRating) {
    const label = params.performanceRating === '-' ? UNRATED_LABEL : getPerformanceMeta(params.performanceRating).label;
    chips.push({ key: 'performanceRating', label, clear: { performanceRating: undefined } });
  }
  if (params.ratingSource) {
    chips.push({
      key: 'ratingSource',
      label: RATING_SOURCE_LABELS[params.ratingSource] || params.ratingSource,
      clear: { ratingSource: undefined },
    });
  }
  if (params.assigneeId) {
    const person = users.find((user) => user.id === params.assigneeId);
    chips.push({ key: 'assigneeId', label: person ? person.name : 'منتخب ذمہ دار', clear: { assigneeId: undefined } });
  }
  if (params.responsibility) {
    chips.push({ key: 'responsibility', label: `ذمہ داری: ${params.responsibility}`, clear: { responsibility: undefined } });
  }
  if (params.from || params.to) {
    chips.push({
      key: 'dateRange',
      label: dateRangeLabel(params, now),
      clear: { from: undefined, to: undefined, dateType: undefined },
    });
  }

  return chips;
}

// "/tasks?…" (or "/?…") carrying the current filters, with `patch` applied on top. The mobile
// dashboard and the task list are two routes sharing one filter state through the query string;
// this is how one links to the other without dropping it. The list's page number never carries
// over — a changed filter always starts at page 1.
export function buildFilterHref(pathname, params, patch = {}) {
  const next = new URLSearchParams();
  Object.entries({ ...params, ...patch }).forEach(([key, value]) => {
    if (key === 'page') return;
    if (value !== undefined && value !== null && value !== '') next.set(key, String(value));
  });
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
