import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskTable from '../../../src/components/dashboard/TaskTable.jsx';
import PrintView from '../../../src/components/dashboard/PrintView.jsx';
import FilterBar from '../../../src/components/dashboard/FilterBar.jsx';
import PreviousUpdatesContent from '../../../src/components/task/PreviousUpdatesContent.jsx';
import { useColumnVisibility } from '../../../src/hooks/useColumnVisibility.js';
import { useDashboardFilters } from '../../../src/hooks/useDashboardFilters.js';
import { COLUMN_DEFINITIONS } from '../../../src/utils/dashboardColumns.js';

vi.mock('../../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('../../../src/services/tasks.api.js', () => ({ getTask: vi.fn() }));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } }),
  createTaskUpdate: vi.fn(),
}));

import { getTask } from '../../../src/services/tasks.api.js';

// Wherever a rating is shown, a developer-assigned one is marked "تخمینی" — and the task's REAL
// completion percent is always shown as stored, never replaced by the assumed one.
const base = {
  id: 't1',
  codeNumber: '260801',
  title: 'A real task',
  assignees: [{ id: 'u1', name: 'Ali' }],
  responsibility: 'IT',
  deadline: '2026-09-01T00:00:00.000Z',
  lastUpdateAt: '2026-08-20T00:00:00.000Z',
  status: 'closed',
  timeStatus: { type: 'early', days: 5 },
  completionPercent: 95,
  performanceRating: 'excellent',
  syntheticRating: null,
};
// Closed at a real 0%, rated "بہتر" from an assumed 80% — expected, and must stay visible as-is.
const closedSynthetic = { ...base, id: 't2', codeNumber: '250103', title: 'Closed synthetic', completionPercent: 0, performanceRating: 'good', syntheticRating: { isSynthetic: true, assumedPercent: 80, assignedAt: '2026-10-05T09:20:22.000Z' } };
const pendingSynthetic = { ...base, id: 't3', codeNumber: '250124', title: 'Pending synthetic', status: 'pending', completionPercent: 25, performanceRating: 'weak', syntheticRating: { isSynthetic: true, assumedPercent: 40, assignedAt: '2026-10-05T09:20:22.000Z' } };
// Its synthetic rating was replaced by a real one: the marker is off.
const retired = { ...base, id: 't4', codeNumber: '250200', title: 'Retired synthetic', syntheticRating: { isSynthetic: false, assumedPercent: 40, assignedAt: '2026-10-05T09:20:22.000Z' } };
const unrated = { ...base, id: 't5', codeNumber: '250104', title: 'Unrated', completionPercent: 0, performanceRating: '-' };

function TableHarness(props) {
  const columnVisibility = useColumnVisibility('dashboard.visibleColumns.v1', COLUMN_DEFINITIONS);
  return <TaskTable columnVisibility={columnVisibility} {...props} />;
}
function renderTable(overrides = {}) {
  const onEditSyntheticRating = vi.fn();
  render(
    <TableHarness
      tasks={[base, closedSynthetic, pendingSynthetic, retired, unrated]}
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
      onEditSyntheticRating={onEditSyntheticRating}
      sortBy="deadline"
      sortOrder="asc"
      onSortChange={vi.fn()}
      {...overrides}
    />
  );
  return { onEditSyntheticRating };
}
const rowOf = (code) => screen.getByText(code).closest('tr');
const openRowMenu = (code) => fireEvent.click(within(rowOf(code)).getByLabelText('اقدامات'));
const EDIT_LABEL = 'تخمینی درجہ بندی تبدیل کریں';

describe('TaskTable — the "تخمینی" badge', () => {
  beforeEach(() => window.localStorage.clear());

  it('marks a synthetic rating, right beside the rating badge', () => {
    renderTable();

    const row = rowOf('250103');
    const badge = within(row).getByRole('button', { name: /تخمینی درجہ بندی/ });
    expect(badge).toHaveTextContent(/^تخمینی$/);
    expect(badge.parentElement).toHaveTextContent('بہتر');
  });

  it('hover shows "تخمینی N%"; a tap expands the badge to the same text', () => {
    renderTable();
    const badge = within(rowOf('250124')).getByRole('button', { name: /تخمینی درجہ بندی/ });

    expect(badge).toHaveAttribute('title', 'تخمینی 40%');
    fireEvent.click(badge);
    expect(badge).toHaveTextContent('تخمینی 40%');
  });

  it('keeps the REAL completion percent exactly as stored — a closed task at 0% rated "بہتر" stays 0%', () => {
    renderTable();

    const closedRow = rowOf('250103');
    expect(closedRow).toHaveTextContent('0%');
    expect(closedRow).not.toHaveTextContent('80%'); // the assumed percent is only in the badge's tooltip
    expect(rowOf('250124')).toHaveTextContent('25%');
  });

  it('shows no badge on a real rating, on an unrated task, or once a synthetic rating is no longer in force', () => {
    renderTable();

    ['260801', '250200', '250104'].forEach((code) => {
      expect(within(rowOf(code)).queryByRole('button', { name: /تخمینی درجہ بندی/ })).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole('button', { name: /تخمینی درجہ بندی — فرض کردہ/ })).toHaveLength(2);
  });
});

describe('TaskTable — admin-only "تخمینی درجہ بندی تبدیل کریں"', () => {
  beforeEach(() => window.localStorage.clear());

  it('admin: offered on a synthetic task (closed ones included), and hands that task to the page', () => {
    const { onEditSyntheticRating } = renderTable({ isAdmin: true });

    openRowMenu('250103');
    fireEvent.click(screen.getByRole('button', { name: EDIT_LABEL }));

    expect(onEditSyntheticRating).toHaveBeenCalledWith(closedSynthetic);
  });

  it.each(['260801', '250200', '250104'])('admin: not offered on task %s (real rating / retired synthetic / unrated)', (code) => {
    renderTable({ isAdmin: true });
    openRowMenu(code);
    expect(screen.getByRole('button', { name: 'پرانی اپڈیٹس' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: EDIT_LABEL })).not.toBeInTheDocument();
  });

  it('a normal user: never offered, even on a synthetic task', () => {
    renderTable({ isAdmin: false });
    openRowMenu('250103');
    expect(screen.getByRole('button', { name: 'پرانی اپڈیٹس' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: EDIT_LABEL })).not.toBeInTheDocument();
  });
});

describe('PrintView — synthetic ratings say so outright (print cannot be hovered or tapped)', () => {
  it('prints "تخمینی N%" beside a synthetic rating, as plain text', () => {
    render(<PrintView tasks={[base, closedSynthetic]} isVisible={() => true} />);

    const row = screen.getByText('250103').closest('tr');
    expect(row).toHaveTextContent('بہتر');
    expect(row).toHaveTextContent('تخمینی 80%');
    expect(row).toHaveTextContent('0%'); // the real completion percent, in its own column
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('prints nothing extra beside a real rating', () => {
    render(<PrintView tasks={[base, retired, unrated]} isVisible={() => true} />);
    expect(screen.queryByText(/تخمینی/)).not.toBeInTheDocument();
  });

  it('with the performance column hidden there is no rating, so no marker either', () => {
    render(<PrintView tasks={[closedSynthetic]} isVisible={(key) => key !== 'performance'} />);
    expect(screen.queryByText(/تخمینی/)).not.toBeInTheDocument();
  });
});

describe('PreviousUpdatesContent (task detail) — the rating line', () => {
  function renderDetail(task) {
    getTask.mockResolvedValue(task);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <PreviousUpdatesContent taskId={task.id} />
      </QueryClientProvider>
    );
  }

  it('shows the rating with "تخمینی N%" beside it for a synthetic rating; the completion percent stays the real one', async () => {
    renderDetail(closedSynthetic);

    const line = (await screen.findByText('کارکردگی:')).parentElement;
    expect(line).toHaveTextContent('بہتر');
    expect(line).toHaveTextContent('تخمینی 80%');
    const summaryRow = screen.getAllByRole('table')[0].querySelector('tbody tr');
    expect(summaryRow).toHaveTextContent('0%');
    expect(summaryRow).not.toHaveTextContent('80%');
  });

  it('shows a real rating with no marker', async () => {
    renderDetail(base);
    const line = (await screen.findByText('کارکردگی:')).parentElement;
    expect(line).toHaveTextContent('ممتاز');
    expect(screen.queryByText(/تخمینی/)).not.toBeInTheDocument();
  });

  it('shows no rating line at all for an unrated task', async () => {
    renderDetail(unrated);
    await screen.findByText('250104');
    expect(screen.queryByText('کارکردگی:')).not.toBeInTheDocument();
  });
});

describe('FilterBar — the "تخمینی / اصل" filter', () => {
  function Harness({ isAdmin }) {
    const filtersHook = useDashboardFilters(25);
    return (
      <div>
        <FilterBar filtersHook={filtersHook} isAdmin={isAdmin} />
        <div data-testid="rating-source">{filtersHook.params.ratingSource || ''}</div>
        <div data-testid="api-filters">{JSON.stringify(filtersHook.apiFilters)}</div>
        <div data-testid="status-summary-filters">{JSON.stringify(filtersHook.statusSummaryFilters)}</div>
        <div data-testid="rating-summary-filters">{JSON.stringify(filtersHook.ratingSummaryFilters)}</div>
        <div data-testid="page">{filtersHook.page}</div>
      </div>
    );
  }
  function renderBar(isAdmin = false, url = '/?page=3') {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <Harness isAdmin={isAdmin} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }
  const select = () => screen.getByLabelText('Rating source filter');

  it('offers all / تخمینی / اصل, to an admin and to a normal user alike', () => {
    renderBar(false);
    expect(within(select()).getAllByRole('option').map((o) => o.textContent)).toEqual(['تمام درجہ بندی', 'تخمینی', 'اصل']);
  });

  // Both KPI groups: ratingSource is neither group's own filter, so neither leaves it out.
  const kpiFilters = () => ['status-summary-filters', 'rating-summary-filters'].map((id) => JSON.parse(screen.getByTestId(id).textContent));

  it('choosing "تخمینی" writes ratingSource=synthetic to the URL, the task query AND both KPI queries, and resets the page', () => {
    renderBar(true);

    fireEvent.change(select(), { target: { value: 'synthetic' } });

    expect(screen.getByTestId('rating-source').textContent).toBe('synthetic');
    expect(JSON.parse(screen.getByTestId('api-filters').textContent)).toMatchObject({ ratingSource: 'synthetic', page: 1 });
    expect(kpiFilters()).toEqual([{ ratingSource: 'synthetic' }, { ratingSource: 'synthetic' }]);
    expect(screen.getByTestId('page').textContent).toBe('1');
  });

  it('"اصل" sends real; back to "تمام" clears it', () => {
    renderBar(true);

    fireEvent.change(select(), { target: { value: 'real' } });
    expect(screen.getByTestId('rating-source').textContent).toBe('real');

    fireEvent.change(select(), { target: { value: '' } });
    expect(screen.getByTestId('rating-source').textContent).toBe('');
    expect(kpiFilters()).toEqual([{}, {}]);
  });

  it('reflects a value already in the URL, and "تمام فلٹرز صاف کریں" clears it', () => {
    renderBar(true, '/?ratingSource=real');
    expect(select()).toHaveValue('real');

    fireEvent.click(screen.getByText('تمام فلٹرز صاف کریں'));

    expect(select()).toHaveValue('');
  });
});
