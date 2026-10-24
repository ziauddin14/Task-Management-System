import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import TaskTable from '../../src/components/dashboard/TaskTable.jsx';
import { useColumnVisibility } from '../../src/hooks/useColumnVisibility.js';
import { COLUMN_DEFINITIONS } from '../../src/utils/dashboardColumns.js';
import { formatCompletionPercent, hasNoRecordedCompletion } from '../../src/utils/taskDisplay.js';

vi.mock('../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));

// A closed task the historical import brought in with no recorded completion shows "—" instead of
// "0%" — the one rule in utils/taskDisplay.js; every other task shows its real percent.
const estimate = { isSynthetic: true, isFinal: false, assumedPercent: 80, assignedAt: '2026-10-05T09:20:22.000Z' };
const base = {
  id: 't1',
  codeNumber: '250103',
  title: 'کام',
  assignees: [{ id: 'u1', name: 'زید' }],
  responsibility: 'R',
  deadline: '2026-09-01T00:00:00.000Z',
  lastUpdateAt: '2026-08-20T00:00:00.000Z',
  status: 'closed',
  timeStatus: { type: 'late', days: 5 },
  completionPercent: 0,
  performanceRating: 'good',
  syntheticRating: estimate,
};

describe('hasNoRecordedCompletion / formatCompletionPercent', () => {
  it.each([
    ['closed, 0%, still an estimate', base],
    ['closed, 0%, a final rating', { ...base, syntheticRating: { ...estimate, isSynthetic: false, isFinal: true, assumedPercent: 100 } }],
    ['closed, 0%, an older backend (no isFinal)', { ...base, syntheticRating: { isSynthetic: true, assumedPercent: 80 } }],
    ['closed, 0%, the estimate since replaced by a real rating', { ...base, syntheticRating: { ...estimate, isSynthetic: false } }],
    ['closed, percent missing', { ...base, completionPercent: undefined }],
    ['closed, percent null', { ...base, completionPercent: null }],
  ])('"—" for a closed imported task with no recorded completion: %s', (_label, task) => {
    expect(hasNoRecordedCompletion(task)).toBe(true);
    expect(formatCompletionPercent(task)).toBe('—');
  });

  it.each([
    ['an app task an admin closed at 0% (no marker)', { ...base, syntheticRating: null }, '0%'],
    ['closed at 0% with the marker field absent', { ...base, syntheticRating: undefined }, '0%'],
    ['closed, imported, with a real percent', { ...base, completionPercent: 40 }, '40%'],
    ['a reopened task, pending at 0% (261006)', { ...base, status: 'pending' }, '0%'],
    ['a reopened task, pending at 50% (261015)', { ...base, status: 'pending', completionPercent: 50 }, '50%'],
    ['an ongoing task at 0%', { ...base, status: 'ongoing', syntheticRating: null }, '0%'],
    ['an ongoing imported task at 0% with an estimate', { ...base, status: 'ongoing' }, '0%'],
    ['a complete task at 100%', { ...base, status: 'complete', completionPercent: 100, syntheticRating: null }, '100%'],
    ['an open task with no percent at all', { ...base, status: 'ongoing', completionPercent: undefined, syntheticRating: null }, '0%'],
  ])('the real percent otherwise: %s', (_label, task, shown) => {
    expect(hasNoRecordedCompletion(task)).toBe(false);
    expect(formatCompletionPercent(task)).toBe(shown);
  });

  it('no task at all', () => {
    expect(hasNoRecordedCompletion(undefined)).toBe(false);
    expect(formatCompletionPercent(undefined)).toBe('0%');
  });
});

function TableHarness(props) {
  const columnVisibility = useColumnVisibility('dashboard.visibleColumns.v1', COLUMN_DEFINITIONS);
  return <TaskTable columnVisibility={columnVisibility} {...props} />;
}

describe('the task list row', () => {
  it('"—" for the closed imported task, the real percent for the others; the bar always follows the real number', () => {
    const tasks = [
      base,
      { ...base, id: 't2', codeNumber: '261101', status: 'ongoing', timeStatus: { type: 'remaining', days: 3 }, performanceRating: '-', syntheticRating: null },
      { ...base, id: 't3', codeNumber: '261102', status: 'complete', completionPercent: 100, timeStatus: { type: 'early', days: 1 }, performanceRating: 'excellent', syntheticRating: null },
      { ...base, id: 't4', codeNumber: '261006', status: 'pending', timeStatus: { type: 'overdue', days: 3 }, performanceRating: '-', syntheticRating: null },
    ];
    render(
      <TableHarness
        tasks={tasks}
        meta={{ page: 1, totalPages: 1 }}
        isLoading={false}
        isError={false}
        isAdmin={false}
        page={1}
        pageSize={25}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onEdit={vi.fn()}
        onUpdate={vi.fn()}
        onViewUpdates={vi.fn()}
        onSendReminder={vi.fn()}
        onEditSyntheticRating={vi.fn()}
        sortBy="completionPercent"
        sortOrder="asc"
        onSortChange={vi.fn()}
      />
    );
    const row = (code) => within(document.body).getByText(code).closest('tr');
    const shown = (code) => row(code).querySelector('[data-progress-fill]').parentElement.nextElementSibling.textContent;

    expect(shown('250103')).toBe('—');
    expect(shown('261101')).toBe('0%');
    expect(shown('261102')).toBe('100%');
    expect(shown('261006')).toBe('0%');
    expect(row('250103').querySelector('[data-progress-fill]')).toHaveStyle({ width: '0%' });
    expect(row('261102').querySelector('[data-progress-fill]')).toHaveStyle({ width: '100%' });
  });
});
