import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import { useAuthStore } from '../../src/store/authStore.js';

// vi.mock() factories are hoisted above top-level const declarations, so any fixture a factory
// needs must be created via vi.hoisted() (runs before the hoisted mocks) rather than a plain
// const declared later in the file — a plain const would hit the TDZ at mock-eval time.
const { summary, sampleTask } = vi.hoisted(() => ({
  summary: {
    byStatus: {
      ongoing: { count: 8, percent: 32 },
      pending: { count: 3, percent: 12 },
      complete: { count: 10, percent: 40 },
      closed: { count: 4, percent: 16 },
    },
    byPerformance: {
      excellent: { count: 6, percent: 24 },
      good: { count: 5, percent: 20 },
      fair: { count: 2, percent: 8 },
      weak: { count: 1, percent: 4 },
      notApplicable: { count: 11, percent: 44 },
    },
    total: 25,
  },
  sampleTask: {
    id: 't1',
    codeNumber: '260801',
    title: 'Sample task',
    assignees: [{ id: 'u1', name: 'Ali' }],
    responsibility: 'IT',
    deadline: '2026-09-01T00:00:00.000Z',
    lastUpdateAt: null,
    status: 'ongoing',
    timeStatus: { type: 'remaining', days: 5 },
    completionPercent: 20,
    performanceRating: '-',
  },
}));

vi.mock('../../src/services/dashboard.api.js', () => ({ getDashboardSummary: vi.fn().mockResolvedValue(summary) }));
vi.mock('../../src/services/tasks.api.js', () => ({
  getTasks: vi.fn().mockResolvedValue({ items: [sampleTask], meta: { page: 1, limit: 25, total: 1, totalPages: 1 } }),
  getTask: vi.fn().mockResolvedValue(sampleTask),
  closeTask: vi.fn().mockResolvedValue({ ...sampleTask, status: 'closed' }),
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock('../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({ items: [{ id: 'u1', name: 'Ali' }], meta: {} }),
}));
vi.mock('../../src/services/lookupLists.api.js', () => ({
  getLookupList: vi.fn().mockResolvedValue([{ id: 'r1', value: 'IT', isActive: true }]),
}));
vi.mock('../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } }),
  createTaskUpdate: vi.fn(),
}));
vi.mock('../../src/services/reports.api.js', () => ({
  exportReport: vi.fn().mockResolvedValue(new Blob(['x'])),
  exportUserSummary: vi.fn(),
  triggerReminders: vi.fn().mockResolvedValue({ remindersSent: 3 }),
}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { closeTask } from '../../src/services/tasks.api.js';
import { getTaskUpdates } from '../../src/services/taskUpdates.api.js';
import { exportReport, triggerReminders } from '../../src/services/reports.api.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function renderDashboard(role = 'user') {
  useAuthStore.getState().login({ id: 'admin1', name: 'Admin', role }, 'jwt');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage (docs/08-ui-ux.md §3-6, docs/09-frontend-features.md §2, §6)', () => {
  beforeEach(() => {
    resetStore();
    window.localStorage.clear();
    closeTask.mockClear();
    getTaskUpdates.mockClear();
    exportReport.mockClear();
    triggerReminders.mockClear();
  });

  function findKpiCardButton(label) {
    const match = screen.getAllByText(label).map((el) => el.closest('button')).find(Boolean);
    if (!match) throw new Error(`No KPI card button found for label "${label}"`);
    return match;
  }

  it('renders KPI cards from the summary and the task table', async () => {
    renderDashboard('admin');
    expect(await screen.findByText('260801')).toBeInTheDocument();
    const jariCard = findKpiCardButton('جاری');
    expect(jariCard).toHaveTextContent('8');
  });

  it('clicking a KPI card marks it active and applies the filter; clicking again clears it', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    const jariCard = findKpiCardButton('جاری');
    expect(jariCard).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(jariCard);
    expect(jariCard).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Status filter')).toHaveValue('ongoing');
    expect(screen.getByText('× Clear filter')).toBeInTheDocument();

    fireEvent.click(jariCard);
    expect(jariCard).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Status filter')).toHaveValue('');
  });

  it('"× Clear filter" clears BOTH an active status and an active performance filter at once', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(findKpiCardButton('جاری'));
    fireEvent.click(findKpiCardButton('ممتاز'));
    expect(screen.getByLabelText('Status filter')).toHaveValue('ongoing');

    fireEvent.click(screen.getByText('× Clear filter'));

    expect(screen.getByLabelText('Status filter')).toHaveValue('');
    expect(findKpiCardButton('جاری')).toHaveAttribute('aria-pressed', 'false');
    expect(findKpiCardButton('ممتاز')).toHaveAttribute('aria-pressed', 'false');
  });

  it('Admin role: sees "Naya Kaam" button and the assignee filter', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');
    expect(screen.getByText('نیا کام')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee filter')).toBeInTheDocument();
  });

  it('User role: no "Naya Kaam" button, no assignee filter, no Edit/Close row actions', async () => {
    renderDashboard('user');
    await screen.findByText('260801');
    expect(screen.queryByText('نیا کام')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assignee filter')).not.toBeInTheDocument();
    expect(screen.queryByText('ترمیم کریں')).not.toBeInTheDocument();
    expect(screen.queryByText('کام بند کریں')).not.toBeInTheDocument();
  });

  it('close action: opens a confirmation with the documented wording; Cancel does not call closeTask', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('کام بند کریں'));
    expect(
      screen.getByText('اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('منسوخ کریں'));
    expect(closeTask).not.toHaveBeenCalled();
    expect(
      screen.queryByText('اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟')
    ).not.toBeInTheDocument();
  });

  it('close action: confirming calls closeTask with the task id', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('کام بند کریں'));
    fireEvent.click(screen.getByText('Haan, Close Karein'));

    await waitFor(() => expect(closeTask).toHaveBeenCalledWith('t1'));
  });

  it('"Update" opens the Update Modal for that task (available to both roles)', async () => {
    renderDashboard('user');
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('اپڈیٹ کریں'));

    expect(await screen.findByRole('dialog', { name: 'Kaam Update Karein' })).toBeInTheDocument();
  });

  it('"Purani Updates" opens the Previous Updates Modal for that task, lazily fetching only once opened', async () => {
    renderDashboard('user');
    await screen.findByText('260801');

    expect(getTaskUpdates).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('پرانی اپڈیٹس'));

    expect(await screen.findByRole('dialog', { name: 'پرانی اپڈیٹس' })).toBeInTheDocument();
    await waitFor(() => expect(getTaskUpdates).toHaveBeenCalled());
  });

  it('Print View toggle switches the table into the denser read-only variant', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');
    expect(screen.getByText('ترمیم کریں')).toBeInTheDocument(); // regular TaskTable's Admin action

    fireEvent.click(screen.getByText('پرنٹ ویو'));

    expect(screen.queryByText('ترمیم کریں')).not.toBeInTheDocument();
    expect(screen.queryByText('اپڈیٹ کریں')).not.toBeInTheDocument();
    expect(screen.getByText('260801')).toBeInTheDocument(); // task data itself still shows
  });

  it('Export: the request carries the CURRENT filters and visible-columns state, not re-asked of the user', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    // Apply a status filter via a KPI card, and hide the "Zimmedari" (responsibility) column.
    fireEvent.click(findKpiCardButton('جاری'));
    fireEvent.click(screen.getByLabelText('Columns'));
    fireEvent.click(screen.getByLabelText('ذمہ داری'));

    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(exportReport).toHaveBeenCalled());
    const params = exportReport.mock.calls[0][0];
    expect(params.status).toBe('ongoing'); // the active KPI filter
    expect(params.format).toBe('excel');
    expect(params.reportType).toBe('summary');
    expect(params.page).toBeUndefined(); // unpaginated by design (backend omits page/limit)
    expect(params.limit).toBeUndefined();
    const columns = params.columns.split(',');
    expect(columns).not.toContain('responsibility'); // hidden column excluded
    expect(columns).toContain('codeNumber'); // locked column still included
  });

  it('Admin-only "Reminders Bhejein" button triggers the reminder job and toasts the count', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(screen.getByText('یاد دہانیاں بھیجیں'));

    await waitFor(() => expect(triggerReminders).toHaveBeenCalled());
  });

  it('User role: no "Reminders Bhejein" button', async () => {
    renderDashboard('user');
    await screen.findByText('260801');
    expect(screen.queryByText('یاد دہانیاں بھیجیں')).not.toBeInTheDocument();
  });
});
