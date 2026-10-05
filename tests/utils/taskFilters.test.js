import { describe, it, expect } from 'vitest';
import { buildFilterHref, describeActiveFilters, matchQuickRange, quickRange, QUICK_RANGES } from '../../src/utils/taskFilters.js';
import { assigneeSummary } from '../../src/utils/taskDisplay.js';

// A fixed "now": Tuesday 6 October 2026.
const now = new Date(2026, 9, 6, 10, 0, 0);

describe('taskFilters — what the mobile filter UI knows about the dashboard filters', () => {
  describe('quickRange', () => {
    it('only offers ranges the existing from/to filter can express: today, this week, this month', () => {
      expect(QUICK_RANGES.map((range) => range.label)).toEqual(['آج', 'اس ہفتے', 'اس ماہ']);
    });

    it('today', () => {
      expect(quickRange('today', now)).toEqual({ from: '2026-10-06', to: '2026-10-06' });
    });

    it('this week runs Monday to Sunday', () => {
      expect(quickRange('week', now)).toEqual({ from: '2026-10-05', to: '2026-10-11' });
      // On a Sunday the week is the one ending that day, not the next one.
      expect(quickRange('week', new Date(2026, 9, 11, 23, 0, 0))).toEqual({ from: '2026-10-05', to: '2026-10-11' });
      expect(quickRange('week', new Date(2026, 9, 12, 0, 30, 0))).toEqual({ from: '2026-10-12', to: '2026-10-18' });
    });

    it('this month is its first to its last day, whatever its length', () => {
      expect(quickRange('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
      expect(quickRange('month', new Date(2026, 1, 10))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
      expect(quickRange('month', new Date(2028, 1, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    });

    it('an unknown key clears the range', () => {
      expect(quickRange('overdue', now)).toEqual({ from: undefined, to: undefined });
    });
  });

  describe('matchQuickRange', () => {
    it('names the quick range a from/to pair equals', () => {
      expect(matchQuickRange('2026-10-06', '2026-10-06', now)).toBe('today');
      expect(matchQuickRange('2026-10-05', '2026-10-11', now)).toBe('week');
      expect(matchQuickRange('2026-10-01', '2026-10-31', now)).toBe('month');
    });

    it('is null for any other range, and for an open-ended one', () => {
      expect(matchQuickRange('2026-10-01', '2026-10-30', now)).toBeNull();
      expect(matchQuickRange('2026-10-06', undefined, now)).toBeNull();
      expect(matchQuickRange(undefined, undefined, now)).toBeNull();
    });
  });

  describe('describeActiveFilters', () => {
    const users = [{ id: 'u1', name: 'Ali' }];

    it('is empty when nothing is filtered', () => {
      expect(describeActiveFilters({}, { now })).toEqual([]);
      expect(describeActiveFilters({ page: '3', sortBy: 'title', sortOrder: 'desc' }, { now })).toEqual([]);
    });

    it('one chip per filter, each with the patch that removes exactly that filter', () => {
      const chips = describeActiveFilters({ status: 'pending', performanceRating: 'weak', ratingSource: 'synthetic', assigneeId: 'u1' }, { users, now });

      expect(chips).toEqual([
        { key: 'status', label: 'پینڈنگ', clear: { status: undefined } },
        { key: 'performanceRating', label: 'کمزور', clear: { performanceRating: undefined } },
        { key: 'ratingSource', label: 'تخمینی', clear: { ratingSource: undefined } },
        { key: 'assigneeId', label: 'Ali', clear: { assigneeId: undefined } },
      ]);
    });

    it('labels: unrated, real ratings, and a zimmedar whose name is not known (yet)', () => {
      const labels = describeActiveFilters({ performanceRating: '-', ratingSource: 'real', assigneeId: 'u9' }, { users, now }).map((chip) => chip.label);
      expect(labels).toEqual(['بغیر درجہ بندی', 'اصل', 'منتخب ذمہ دار']);
    });

    it('a responsibility filter arriving in a link still shows, and can be removed', () => {
      expect(describeActiveFilters({ responsibility: 'IT' }, { now })).toEqual([
        { key: 'responsibility', label: 'ذمہ داری: IT', clear: { responsibility: undefined } },
      ]);
    });

    it('the search text is a chip only where asked for (a screen with no search field of its own)', () => {
      expect(describeActiveFilters({ search: 'audit' }, { now })).toEqual([]);
      expect(describeActiveFilters({ search: 'audit' }, { includeSearch: true, now })).toEqual([
        { key: 'search', label: 'تلاش: audit', clear: { search: undefined } },
      ]);
    });

    describe('the date range is one chip', () => {
      const label = (params) => describeActiveFilters(params, { now })[0].label;

      it('a quick range is named', () => {
        expect(label({ from: '2026-10-01', to: '2026-10-31' })).toBe('آخری تاریخ: اس ماہ');
        expect(label({ dateType: 'entry', from: '2026-10-06', to: '2026-10-06' })).toBe('تاریخِ اندراج: آج');
      });

      it('a custom range shows both dates (DD-MM-YY)', () => {
        expect(label({ from: '2026-01-01', to: '2026-03-31' })).toBe('آخری تاریخ: 01-01-26 تا 31-03-26');
      });

      it('an open-ended range says which end', () => {
        expect(label({ from: '2026-01-01' })).toBe('آخری تاریخ: 01-01-26 سے');
        expect(label({ dateType: 'entry', to: '2026-03-31' })).toBe('تاریخِ اندراج: 31-03-26 تک');
      });

      it('removing it clears from, to and the date field together', () => {
        expect(describeActiveFilters({ dateType: 'entry', from: '2026-01-01' }, { now })[0].clear).toEqual({ from: undefined, to: undefined, dateType: undefined });
      });

      it('a date field with no range is not a filter', () => {
        expect(describeActiveFilters({ dateType: 'entry' }, { now })).toEqual([]);
      });
    });
  });

  describe('buildFilterHref', () => {
    it('carries the current filters to the other screen, with the patch on top', () => {
      expect(buildFilterHref('/tasks', { assigneeId: 'u1', ratingSource: 'real' }, { status: 'pending' })).toBe('/tasks?assigneeId=u1&ratingSource=real&status=pending');
    });

    it('the patch replaces a filter already set', () => {
      expect(buildFilterHref('/tasks', { status: 'closed', search: 'audit' }, { status: 'pending' })).toBe('/tasks?status=pending&search=audit');
    });

    it('never carries the page number: a changed filter starts at page 1', () => {
      expect(buildFilterHref('/tasks', { page: '4', status: 'closed' })).toBe('/tasks?status=closed');
    });

    it('drops empty values, and gives the bare path when nothing is left', () => {
      expect(buildFilterHref('/tasks', { status: undefined, search: '' }, { performanceRating: null })).toBe('/tasks');
      expect(buildFilterHref('/', {})).toBe('/');
    });

    it('encodes values ("-" for unrated, Urdu search text)', () => {
      expect(buildFilterHref('/tasks', {}, { performanceRating: '-' })).toBe('/tasks?performanceRating=-');
      expect(new URLSearchParams(buildFilterHref('/tasks', { search: 'کام 1' }).split('?')[1]).get('search')).toBe('کام 1');
    });
  });
});

describe('assigneeSummary — a task\'s zimmedar on one line', () => {
  const people = (...names) => names.map((name, index) => ({ id: `u${index}`, name }));

  it('one or two are named in full', () => {
    expect(assigneeSummary(people('Ali'))).toBe('Ali');
    expect(assigneeSummary(people('Ali', 'Bilal'))).toBe('Ali، Bilal');
  });

  it('beyond two: the first two, then how many more', () => {
    expect(assigneeSummary(people('Ali', 'Bilal', 'Chand'))).toBe('Ali، Bilal +1');
    expect(assigneeSummary(people('Ali', 'Bilal', 'Chand', 'Dawood'))).toBe('Ali، Bilal +2');
  });

  it('none: a dash', () => {
    expect(assigneeSummary([])).toBe('-');
    expect(assigneeSummary(undefined)).toBe('-');
  });
});
