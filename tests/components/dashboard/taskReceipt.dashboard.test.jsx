import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskTable from '../../../src/components/dashboard/TaskTable.jsx';
import FilterBar from '../../../src/components/dashboard/FilterBar.jsx';
import FilterSheet from '../../../src/components/mobile/FilterSheet.jsx';
import PreviousUpdatesModal from '../../../src/components/task/PreviousUpdatesModal.jsx';
import { useColumnVisibility } from '../../../src/hooks/useColumnVisibility.js';
import { useDashboardFilters } from '../../../src/hooks/useDashboardFilters.js';
import { isExcludedFromExport } from '../../../src/hooks/useExportNodeAsImage.js';
import { COLUMN_DEFINITIONS } from '../../../src/utils/dashboardColumns.js';
import { useAuthStore } from '../../../src/store/authStore.js';

vi.mock('../../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('../../../src/services/tasks.api.js', () => ({ acknowledgeTask: vi.fn(), getTask: vi.fn() }));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } }),
  createTaskUpdate: vi.fn(),
}));
const mockHtml2canvas = vi.fn().mockResolvedValue({ toBlob: (cb) => cb(new Blob(['x'], { type: 'image/png' })) });
vi.mock('html2canvas', () => ({ default: (...args) => mockHtml2canvas(...args) }));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
import { getTask } from '../../../src/services/tasks.api.js';

// Task receipt on the desktop dashboard: the "وصولی" column, the receipt filter (URL, table, KPI
// cards), the mobile filter sheet's group, and the Task Details row kept out of the PNG export.

const ACKED_AT = '2026-10-14T05:30:00.000Z';
const base = {
  codeNumber: '261001',
  title: 'کام',
  assignees: [{ id: 'u1', name: 'زید' }],
  responsibility: 'R',
  deadline: '2026-10-20T00:00:00.000Z',
  lastUpdateAt: null,
  status: 'ongoing',
  timeStatus: { type: 'remaining', days: 5 },
  completionPercent: 0,
  performanceRating: '-',
};
const person = (name, acknowledgedAt = null) => ({ id: name, user: { id: name, name }, assignedAt: ACKED_AT, acknowledgedAt, remindersSent: 0 });
const forAdmin = (id, people) => ({ ...base, id, codeNumber: id, myReceipt: null, receipt: people && { required: people.length, acknowledged: people.filter((p) => p.acknowledgedAt).length, people } });
const forUser = (id, myReceipt, extra = {}) => ({ ...base, id, codeNumber: id, receipt: null, myReceipt, ...extra });

function Harness(props) {
  const columnVisibility = useColumnVisibility('dashboard.visibleColumns.v1', COLUMN_DEFINITIONS);
  return (
    <>
      <TaskTable columnVisibility={columnVisibility} {...props} />
      <button type="button" onClick={() => columnVisibility.toggleColumn('receipt')}>
        toggle receipt
      </button>
    </>
  );
}
function renderTable(tasks, isAdmin) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const noop = vi.fn();
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness
        tasks={tasks}
        meta={{ totalPages: 1 }}
        isAdmin={isAdmin}
        page={1}
        pageSize={25}
        onPageChange={noop}
        onPageSizeChange={noop}
        onEdit={noop}
        onUpdate={noop}
        onViewUpdates={noop}
        onSendReminder={noop}
        onEditSyntheticRating={noop}
        sortBy="deadline"
        sortOrder="asc"
        onSortChange={noop}
      />
    </QueryClientProvider>
  );
}
const cellOf = (code) => screen.getByText(code).closest('tr').querySelector('[data-receipt-cell]');

beforeEach(() => {
  window.localStorage.clear();
  mockHtml2canvas.mockClear();
});

describe('TaskTable — the "وصولی" column', () => {
  it('admin: the status of each task; "-" on a task without receipts', () => {
    renderTable(
      [
        forAdmin('A1', [person('زید', ACKED_AT), person('عمر', ACKED_AT)]),
        forAdmin('A2', [person('زید'), person('عمر')]),
        forAdmin('A3', [person('زید', ACKED_AT), person('عمر')]),
        forAdmin('A4', null),
      ],
      true
    );

    expect(screen.getByRole('columnheader', { name: 'وصولی' })).toBeInTheDocument();
    expect(cellOf('A1')).toHaveTextContent('✓ وصول شدہ');
    expect(cellOf('A2')).toHaveTextContent('وصول نہیں ہوا');
    expect(cellOf('A3')).toHaveTextContent('2 میں سے 1 نے وصول کیا');
    expect(cellOf('A4')).toHaveTextContent('-');
  });

  it('admin: the chip opens a popover with names and times', () => {
    renderTable([forAdmin('A3', [person('زید', ACKED_AT), person('عمر')])], true);
    fireEvent.click(within(cellOf('A3')).getByRole('button', { name: '2 میں سے 1 نے وصول کیا' }));
    const popover = screen.getByRole('dialog', { name: 'وصولی' });
    expect(popover).toHaveTextContent('زید');
    expect(popover).toHaveTextContent('14-10-26');
    expect(popover).toHaveTextContent('عمر');
    expect(popover).toHaveTextContent('وصول نہیں ہوا');
  });

  it('user: the button on their open receipt, "✓ وصول شدہ" once confirmed, nothing on a closed unconfirmed task or an old one', () => {
    renderTable(
      [
        forUser('U1', { assignedAt: ACKED_AT, acknowledgedAt: null }),
        forUser('U2', { assignedAt: ACKED_AT, acknowledgedAt: ACKED_AT }),
        forUser('U3', { assignedAt: ACKED_AT, acknowledgedAt: null }, { status: 'closed' }),
        forUser('U4', null),
      ],
      false
    );

    expect(within(cellOf('U1')).getByRole('button', { name: 'وصول کر لیا' })).toBeInTheDocument();
    expect(cellOf('U2')).toHaveTextContent('✓ وصول شدہ');
    expect(within(cellOf('U3')).queryByRole('button')).not.toBeInTheDocument();
    expect(cellOf('U4')).toHaveTextContent('-');
  });

  it('can be hidden like any other column', () => {
    renderTable([forAdmin('A1', [person('زید')])], true);
    fireEvent.click(screen.getByText('toggle receipt'));
    expect(screen.queryByRole('columnheader', { name: 'وصولی' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-receipt-cell]')).toBeNull();
  });
});

describe('the receipt filter', () => {
  function wrapper({ children }) {
    return <MemoryRouter initialEntries={['/?page=2']}>{children}</MemoryRouter>;
  }

  it('lives in the URL and reaches the table AND both groups of KPI cards', () => {
    const { result } = renderHook(() => useDashboardFilters(25), { wrapper });
    act(() => result.current.setFilter('receipt', 'not_received'));

    expect(result.current.params.receipt).toBe('not_received');
    expect(result.current.page).toBe(1);
    expect(result.current.apiFilters.receipt).toBe('not_received');
    expect(result.current.statusSummaryFilters.receipt).toBe('not_received');
    expect(result.current.ratingSummaryFilters.receipt).toBe('not_received');
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => result.current.clearAllFilters());
    expect(result.current.params.receipt).toBeUndefined();
  });

  function FilterBarHarness({ isAdmin, showReceiptFilter }) {
    const filtersHook = useDashboardFilters(25);
    return (
      <>
        <FilterBar filtersHook={filtersHook} isAdmin={isAdmin} showReceiptFilter={showReceiptFilter} />
        <div data-testid="receipt-param">{filtersHook.params.receipt || ''}</div>
      </>
    );
  }
  function renderBar(props) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <FilterBarHarness {...props} />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it('desktop filter bar: "وصولی" with three choices for an admin, written to the URL, shown as a chip', () => {
    renderBar({ isAdmin: true, showReceiptFilter: true });
    const select = screen.getByLabelText('Receipt filter');
    expect([...select.options].map((o) => o.textContent)).toEqual(['وصولی', 'وصول شدہ', 'وصول نہیں ہوا', 'جزوی']);

    fireEvent.change(select, { target: { value: 'partial' } });

    expect(screen.getByTestId('receipt-param')).toHaveTextContent('partial');
    expect(screen.getByRole('button', { name: 'جزوی — فلٹر ہٹائیں' })).toBeInTheDocument();
  });

  it('a user is not offered "جزوی"; and nothing is offered until the backend sends receipts', () => {
    const { unmount } = renderBar({ isAdmin: false, showReceiptFilter: true });
    expect([...screen.getByLabelText('Receipt filter').options].map((o) => o.value)).toEqual(['', 'received', 'not_received']);
    unmount();
    renderBar({ isAdmin: true, showReceiptFilter: false });
    expect(screen.queryByLabelText('Receipt filter')).not.toBeInTheDocument();
  });

  it('mobile filter sheet: a "وصولی" group, applied with the rest', () => {
    const onApply = vi.fn();
    render(<FilterSheet isOpen onClose={vi.fn()} params={{}} onApply={onApply} isAdmin={false} showReceiptFilter />);
    const group = screen.getByRole('group', { name: 'وصولی' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['وصول شدہ', 'وصول نہیں ہوا']);

    fireEvent.click(within(group).getByRole('button', { name: 'وصول نہیں ہوا' }));
    fireEvent.click(screen.getByRole('button', { name: 'لاگو کریں' }));

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ receipt: 'not_received' }));
  });

  it('mobile filter sheet: no group until the backend sends receipts', () => {
    render(<FilterSheet isOpen onClose={vi.fn()} params={{}} onApply={vi.fn()} isAdmin showReceiptFilter={false} />);
    expect(screen.queryByRole('group', { name: 'وصولی' })).not.toBeInTheDocument();
  });
});

describe('Task Details — the receipt row is on screen only, never in the exported PNG', () => {
  function renderDetails() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <PreviousUpdatesModal isOpen taskId="t1" onClose={vi.fn()} />
      </QueryClientProvider>
    );
  }

  it('a new task shows the row; the export leaves it out of the image', async () => {
    useAuthStore.setState({ user: { id: 'a1', role: 'admin', name: 'Admin' }, token: 't', isAuthenticated: true });
    getTask.mockResolvedValue(forAdmin('261001', [person('زید', ACKED_AT), person('عمر')]));
    renderDetails();

    await screen.findByText('2 میں سے 1 نے وصول کیا');
    const row = document.querySelector('[data-receipt-detail]');
    expect(row).toBeInTheDocument();

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    await waitFor(() => expect(mockHtml2canvas).toHaveBeenCalled());

    const [node, options] = mockHtml2canvas.mock.calls[0];
    expect(node).toContainElement(row);
    expect(options.ignoreElements(row)).toBe(true);
    expect(options.ignoreElements(node)).toBe(false);
    expect(options.ignoreElements(screen.getByText('261001'))).toBe(false);
  });

  it('an old task shows no row at all', async () => {
    useAuthStore.setState({ user: { id: 'a1', role: 'admin', name: 'Admin' }, token: 't', isAuthenticated: true });
    getTask.mockResolvedValue({ ...base, id: 't1', codeNumber: '250001', receipt: null, myReceipt: null });
    renderDetails();
    await screen.findByText('250001');
    expect(document.querySelector('[data-receipt-detail]')).toBeNull();
  });

  it('isExcludedFromExport only matches what is marked data-export-exclude', () => {
    const marked = document.createElement('div');
    marked.setAttribute('data-export-exclude', '');
    expect(isExcludedFromExport(marked)).toBe(true);
    expect(isExcludedFromExport(document.createElement('div'))).toBe(false);
    expect(isExcludedFromExport(document.createTextNode('x'))).toBe(false);
  });
});
