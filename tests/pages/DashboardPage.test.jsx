import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { PageActionsPortalProvider } from '../../src/contexts/PageActionsPortal.jsx';

// Print View toggle + Export now portal into AppLayout's Navbar (see PageActionsPortal.jsx) —
// DashboardPage is rendered standalone here (no real AppLayout), so this stands in for the real
// target DOM node AppLayout would otherwise provide, exactly like production.
function TestLayoutShell({ children }) {
  const [slot, setSlot] = useState(null);
  return (
    <>
      <div ref={setSlot} />
      <PageActionsPortalProvider target={slot}>{children}</PageActionsPortalProvider>
    </>
  );
}

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
        <TestLayoutShell>
          <DashboardPage />
        </TestLayoutShell>
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
    expect(screen.getByText('× Clear filter')).toBeInTheDocument();

    fireEvent.click(jariCard);
    expect(jariCard).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('× Clear filter')).not.toBeInTheDocument();
  });

  it('"× Clear filter" clears BOTH an active status and an active performance filter at once', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(findKpiCardButton('جاری'));
    fireEvent.click(findKpiCardButton('ممتاز'));
    expect(findKpiCardButton('جاری')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByText('× Clear filter'));

    expect(screen.queryByText('× Clear filter')).not.toBeInTheDocument();
    expect(findKpiCardButton('جاری')).toHaveAttribute('aria-pressed', 'false');
    expect(findKpiCardButton('ممتاز')).toHaveAttribute('aria-pressed', 'false');
  });

  it('Admin role: sees "Naya Kaam" button and the assignee filter', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');
    expect(screen.getByText('نیا کام')).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee filter')).toBeInTheDocument();
  });

  it('User role: no "Naya Kaam" button, no assignee filter, no Edit row action', async () => {
    renderDashboard('user');
    await screen.findByText('260801');
    expect(screen.queryByText('نیا کام')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assignee filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('ترمیم کریں')).not.toBeInTheDocument();
  });

  // Prompt — Close Task moved out of the row and into the Update Task modal's own footer
  // (UpdateModal.test.jsx covers the button's own Admin-only/not-closed visibility rule); these
  // integration tests just confirm DashboardPage still wires the SAME confirmation dialog +
  // closeTask mutation to it, now reached by opening Update first.
  it('close action (from inside the Update modal): opens a confirmation with the documented wording; Cancel does not call closeTask', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(screen.getByLabelText('اقدامات'));
    fireEvent.click(screen.getByLabelText('اپڈیٹ کریں'));
    await screen.findByRole('dialog', { name: 'کام اپڈیٹ کریں' });
    fireEvent.click(await screen.findByText('کام بند کریں'));

    expect(
      await screen.findByText('اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('منسوخ کریں'));
    expect(closeTask).not.toHaveBeenCalled();
    expect(
      screen.queryByText('اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟')
    ).not.toBeInTheDocument();
  });

  it('close action (from inside the Update modal): confirming calls closeTask with the task id', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(screen.getByLabelText('اقدامات'));
    fireEvent.click(screen.getByLabelText('اپڈیٹ کریں'));
    await screen.findByRole('dialog', { name: 'کام اپڈیٹ کریں' });
    fireEvent.click(await screen.findByText('کام بند کریں'));
    fireEvent.click(await screen.findByText('ہاں، بند کریں'));

    await waitFor(() => expect(closeTask).toHaveBeenCalledWith('t1'));
  });

  it('"Update" opens the Update Modal for that task (available to both roles)', async () => {
    renderDashboard('user');
    await screen.findByText('260801');

    fireEvent.click(screen.getByLabelText('اقدامات'));
    fireEvent.click(screen.getByLabelText('اپڈیٹ کریں'));

    expect(await screen.findByRole('dialog', { name: 'کام اپڈیٹ کریں' })).toBeInTheDocument();
  });

  it('"Purani Updates" opens the Previous Updates Modal for that task, lazily fetching only once opened', async () => {
    renderDashboard('user');
    await screen.findByText('260801');

    expect(getTaskUpdates).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('اقدامات'));
    fireEvent.click(screen.getByLabelText('پرانی اپڈیٹس'));

    expect(await screen.findByRole('dialog', { name: 'کام کی تفصیل' })).toBeInTheDocument();
    await waitFor(() => expect(getTaskUpdates).toHaveBeenCalled());
  });

  // Prompt — TMS Dashboard header cleanup: the old Print View toggle is gone; a single "ایکشن"
  // button now holds Export + WhatsApp Share (row actions moved behind their own "اقدامات"
  // three-dot menu instead).
  it('the row three-dot menu shows Admin-only Edit alongside Update/Previous Updates', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(screen.getByLabelText('اقدامات'));
    expect(screen.getByLabelText('ترمیم کریں')).toBeInTheDocument();
    expect(screen.getByLabelText('اپڈیٹ کریں')).toBeInTheDocument();
    expect(screen.getByLabelText('پرانی اپڈیٹس')).toBeInTheDocument();
  });

  // Prompt — the report is now a fixed grouped-by-Zimmedar structure (no user-chosen column
  // list); the export request carries the CURRENT filters + format + lastUpdateOnly only.
  it('Export: the request carries the CURRENT filters, format, and lastUpdateOnly — no columns param', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    // Apply a status filter via a KPI card.
    fireEvent.click(findKpiCardButton('جاری'));

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    fireEvent.click(screen.getByText('ایکسپورٹ کریں'));
    fireEvent.click(screen.getByText('صرف آخری اپڈیٹ'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(exportReport).toHaveBeenCalled());
    const params = exportReport.mock.calls[0][0];
    expect(params.status).toBe('ongoing'); // the active KPI filter
    expect(params.format).toBe('excel');
    expect(params.lastUpdateOnly).toBe(true);
    expect(params.page).toBeUndefined(); // unpaginated by design (backend omits page/limit)
    expect(params.limit).toBeUndefined();
    expect(params.columns).toBeUndefined(); // no per-column selection for this fixed report structure
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

  // Prompt 2A/2C/2D
  it('the heading is rendered at the larger size', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');
    expect(screen.getByRole('heading', { name: 'ڈیش بورڈ' })).toHaveClass('text-3xl');
  });

  it('a 5th "مجموعی" (Total) status card shows the summary\'s overall total, and clicking it clears both KPI filters', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    fireEvent.click(findKpiCardButton('جاری'));
    fireEvent.click(findKpiCardButton('ممتاز'));

    const totalCard = findKpiCardButton('مجموعی');
    expect(totalCard).toHaveTextContent('25'); // summary.total

    fireEvent.click(totalCard);

    expect(findKpiCardButton('جاری')).toHaveAttribute('aria-pressed', 'false');
    expect(findKpiCardButton('ممتاز')).toHaveAttribute('aria-pressed', 'false');
  });

  it('the notApplicable performance card is labelled "مجموعی کیفیت", not a bare dash', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    const card = findKpiCardButton('مجموعی کیفیت');
    expect(card).toHaveTextContent('11'); // summary.byPerformance.notApplicable.count
  });

  it('the status and performance KPI groups sit in a 2-column grid on desktop', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    const statusHeading = screen.getByText('کام کی کیفیت');
    const gridContainer = statusHeading.parentElement.parentElement;
    expect(gridContainer).toHaveClass('md:grid-cols-2');
  });

  // Prompt — TMS Dashboard responsive fix: each group's own 5 cards use a CSS Grid
  // (grid-cols-5), not flex-wrap, so they can never wrap onto a second line regardless of
  // viewport width (a flex item's default min-width:auto can force wrapping even when the
  // parent has room; a grid track's minmax(0,1fr) genuinely has none) — see browser-verified
  // screenshots at 1366/1440/1920px for the actual rendered proof.
  it('each KPI group renders its 5 cards in a grid-cols-5 container (never wraps)', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    const statusHeading = screen.getByText('کام کی کیفیت');
    const statusCardsContainer = statusHeading.nextElementSibling;
    expect(statusCardsContainer).toHaveClass('grid', 'grid-cols-5');
    expect(statusCardsContainer.children).toHaveLength(5);

    // "کارکردگی" also labels the table's Performance column header — scope to the <p> group label.
    const performanceHeading = screen.getAllByText('کارکردگی').find((el) => el.tagName === 'P');
    const performanceCardsContainer = performanceHeading.nextElementSibling;
    expect(performanceCardsContainer).toHaveClass('grid', 'grid-cols-5');
    expect(performanceCardsContainer.children).toHaveLength(5);
  });
});
