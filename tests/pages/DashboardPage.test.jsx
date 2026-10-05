import React, { useState } from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
const { summary, sampleTask, syntheticTask } = vi.hoisted(() => ({
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
    // docs/05-apis.md §8 — the rating KPIs: bands as shares of the 14 RATED tasks (not of all 25).
    ratings: {
      bands: {
        excellent: { count: 6, percent: 43 },
        good: { count: 5, percent: 36 },
        fair: { count: 2, percent: 14 },
        weak: { count: 1, percent: 7 },
      },
      ratedCount: 14,
      unratedCount: 11,
      syntheticCount: 3,
      averageEffectivePercent: 84.6,
      overallQuality: { band: 'good', percent: 84.6 },
    },
  },
  // A closed task at a REAL 0% whose "بہتر" rating is developer-assigned from an assumed 80%.
  syntheticTask: {
    id: 't2',
    codeNumber: '250103',
    title: 'Synthetic task',
    assignees: [{ id: 'u1', name: 'Ali' }],
    responsibility: 'IT',
    deadline: '2025-03-31T00:00:00.000Z',
    lastUpdateAt: '2025-04-20T00:00:00.000Z',
    status: 'closed',
    timeStatus: { type: 'late', days: 20 },
    completionPercent: 0,
    performanceRating: 'good',
    syntheticRating: { isSynthetic: true, assumedPercent: 80, assignedAt: '2026-10-05T09:20:22.000Z' },
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
  editSyntheticRating: vi.fn(),
  removeSyntheticRating: vi.fn(),
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
// Phase 2 — SendNotificationDialog is now always mounted (admin-gated, inert while closed) inside
// DashboardPage. Mocked defensively so any test that opens it never hits a real network call,
// mirroring AppLayout.test.jsx's own precedent for NotificationBell in Phase 1.
vi.mock('../../src/services/notifications.api.js', () => ({
  sendAdminNotification: vi.fn(),
  sendTaskReminder: vi.fn(),
  getAdminNotificationHistory: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { closeTask, getTasks, editSyntheticRating } from '../../src/services/tasks.api.js';
import { getDashboardSummary } from '../../src/services/dashboard.api.js';
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
    getDashboardSummary.mockClear();
    editSyntheticRating.mockReset();
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

  // Prompt — "کالمز" lives INSIDE the existing "ایکشن" dropdown, not as a separate standalone
  // button anywhere else on the page; toggling a column there must actually hide/show it in the
  // real TaskTable (same columnVisibility instance, not a disconnected copy).
  it('the "ایکشن" menu\'s "کالمز" item toggles column visibility in the real table; no standalone Columns button exists elsewhere', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    // No standalone Columns control anywhere on the page before opening ایکشن.
    expect(screen.queryByLabelText('Columns')).not.toBeInTheDocument();

    expect(screen.getByText('ذمہ داری')).toBeInTheDocument(); // Responsibility column header, visible by default

    fireEvent.click(screen.getByRole('button', { name: 'ایکشن' }));
    fireEvent.click(screen.getByText('کالمز'));

    // "ذمہ داری" now matches twice — the table's own <th> and the کالمز checklist's <label> — so
    // pick the checklist one specifically rather than assuming there's only one match.
    expect(screen.getAllByText('ذمہ داری')).toHaveLength(2);
    const responsibilityLabel = screen.getAllByText('ذمہ داری').map((el) => el.closest('label')).find(Boolean);
    const responsibilityCheckbox = responsibilityLabel.querySelector('input');
    expect(responsibilityCheckbox).toBeChecked();
    fireEvent.click(responsibilityCheckbox);

    // Only the checklist's own label remains — the table's <th> actually disappeared.
    expect(screen.getAllByText('ذمہ داری')).toHaveLength(1);
    expect(screen.getByText('260801')).toBeInTheDocument(); // rest of the table/data untouched
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

  // ---- KPI redesign: the "کارکردگی" group ------------------------------------------------------
  describe('rating KPIs (کارکردگی)', () => {
    const lastSummaryFilters = () => getDashboardSummary.mock.calls[getDashboardSummary.mock.calls.length - 1][0];

    it('four band cards show the count and the share of the RATED tasks — not of all tasks', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      // 6 of the 14 rated tasks = 43% (it would be 24% of all 25 — the old, misleading figure).
      expect(findKpiCardButton('ممتاز')).toHaveTextContent('6');
      expect(findKpiCardButton('ممتاز')).toHaveTextContent('43%');
      expect(findKpiCardButton('بہتر')).toHaveTextContent('36%');
      expect(findKpiCardButton('مناسب')).toHaveTextContent('14%');
      expect(findKpiCardButton('کمزور')).toHaveTextContent('7%');
    });

    it('the "مجموعی کیفیت" card shows the overall band and the average percent', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      const overall = screen.getByRole('group', { name: 'مجموعی کیفیت' });
      expect(overall).toHaveTextContent('بہتر');
      expect(overall).toHaveTextContent('84.6%');
    });

    it('REPLACES the old card that showed the number of UNRATED tasks as "مجموعی کیفیت"', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      const overall = screen.getByRole('group', { name: 'مجموعی کیفیت' });
      // It is no longer a filter button, and it does not carry the unrated count (11) or its 44%.
      expect(overall.tagName).not.toBe('BUTTON');
      expect(overall).not.toHaveTextContent('11');
      expect(overall).not.toHaveTextContent('44%');
      expect(screen.getAllByText('مجموعی کیفیت')).toHaveLength(1);
    });

    it('says how many of the rated tasks are synthetic, and how many tasks are unrated', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      expect(screen.getByText('14 میں سے 3 تخمینی')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 11' })).toBeInTheDocument();
    });

    it('the unrated line lists those tasks when clicked (the rating filter "-"), and toggles off again', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      const unrated = screen.getByRole('button', { name: 'بغیر درجہ بندی: 11' });
      fireEvent.click(unrated);
      await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ performanceRating: '-' })));
      expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 11' })).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(screen.getByRole('button', { name: 'بغیر درجہ بندی: 11' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 11' })).toHaveAttribute('aria-pressed', 'false'));
    });

    it('asks the summary endpoint with no filter at first — never with sort or paging params', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      expect(getDashboardSummary).toHaveBeenCalledTimes(1);
      expect(getDashboardSummary).toHaveBeenCalledWith({});
    });

    it('the KPI cards follow the dashboard filters: a status filter is sent to the summary endpoint', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(findKpiCardButton('پینڈنگ'));

      await waitFor(() => expect(lastSummaryFilters()).toEqual({ status: 'pending' }));
      await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' })));
    });

    it('...and the zimmedar, synthetic/real, date and search filters too — the same state the table uses', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.change(screen.getByLabelText('Assignee filter'), { target: { value: 'u1' } });
      fireEvent.change(screen.getByLabelText('Rating source filter'), { target: { value: 'synthetic' } });
      fireEvent.change(screen.getByLabelText('از تاریخ'), { target: { value: '2026-01-01' } });

      await waitFor(() => expect(lastSummaryFilters()).toEqual({ assigneeId: 'u1', ratingSource: 'synthetic', deadlineFrom: '2026-01-01' }));
      await waitFor(() =>
        expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ assigneeId: 'u1', ratingSource: 'synthetic', deadlineFrom: '2026-01-01' }))
      );
    });

    it('clicking a band card filters the TABLE by that rating, but the band cards are not asked to — the other cards keep their values', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');
      fireEvent.click(findKpiCardButton('پینڈنگ'));
      await waitFor(() => expect(lastSummaryFilters()).toEqual({ status: 'pending' }));
      const bandRequests = () => getDashboardSummary.mock.calls.filter(([filters]) => filters.status === 'pending');
      expect(bandRequests()).toHaveLength(1);

      fireEvent.click(findKpiCardButton('بہتر'));

      await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ performanceRating: 'good', status: 'pending' })));
      expect(findKpiCardButton('بہتر')).toHaveAttribute('aria-pressed', 'true');
      // The band cards' own request (everything except the rating) did not change, so it is not
      // repeated; the one new request is the STATUS cards', which do follow the rating.
      await waitFor(() => expect(lastSummaryFilters()).toEqual({ performanceRating: 'good' }));
      expect(bandRequests()).toHaveLength(1);
      bandRequests().forEach(([filters]) => expect(filters).not.toHaveProperty('performanceRating'));
      // Every band card still shows its own figure.
      expect(findKpiCardButton('ممتاز')).toHaveTextContent('6');
      expect(findKpiCardButton('مناسب')).toHaveTextContent('2');
      expect(findKpiCardButton('کمزور')).toHaveTextContent('1');
    });

    it('paging or sorting the table does not refetch the KPIs', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');
      const callsBefore = getDashboardSummary.mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: /آخری تاریخ/ }));

      await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'deadline', sortOrder: 'desc' })));
      expect(getDashboardSummary.mock.calls).toHaveLength(callsBefore);
    });

    it('a normal user gets the same four band cards and their own overall quality (the scope is the server\'s)', async () => {
      renderDashboard('user');
      await screen.findByText('260801');

      ['ممتاز', 'بہتر', 'مناسب', 'کمزور'].forEach((label) => expect(findKpiCardButton(label)).toBeInTheDocument());
      expect(screen.getByRole('group', { name: 'مجموعی کیفیت' })).toHaveTextContent('84.6%');
      expect(getDashboardSummary).toHaveBeenCalledWith({});
      // A user has no zimmedar filter to send — the server limits them to their own tasks.
      expect(screen.queryByLabelText('Assignee filter')).not.toBeInTheDocument();
    });

    it('with nothing rated, the overall card shows a dash — not 0% — and the band cards carry no percent', async () => {
      getDashboardSummary.mockResolvedValueOnce({
        ...summary,
        ratings: {
          bands: { excellent: { count: 0, percent: 0 }, good: { count: 0, percent: 0 }, fair: { count: 0, percent: 0 }, weak: { count: 0, percent: 0 } },
          ratedCount: 0,
          unratedCount: 25,
          syntheticCount: 0,
          averageEffectivePercent: null,
          overallQuality: null,
        },
      });
      renderDashboard('admin');
      await screen.findByText('260801');

      const overall = screen.getByRole('group', { name: 'مجموعی کیفیت' });
      expect(overall).toHaveTextContent('—');
      expect(overall).not.toHaveTextContent('%');
      expect(findKpiCardButton('ممتاز')).not.toHaveTextContent('%');
      expect(screen.queryByText(/میں سے/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'بغیر درجہ بندی: 25' })).toBeInTheDocument();
    });
  });

  // ---- Each KPI group ignores its OWN filter and follows every other one -----------------------
  describe('status KPIs (کام کی کیفیت) ignore the status filter — the same rule as the band cards', () => {
    // What the server answers for each filter set (docs/05-apis.md §8): byStatus/total follow every
    // filter sent; the `ratings` block follows every filter except the rating.
    const pendingOnly = {
      ...summary,
      byStatus: { pending: { count: 3, percent: 100 } },
      total: 3,
      ratings: {
        bands: { excellent: { count: 0, percent: 0 }, good: { count: 0, percent: 0 }, fair: { count: 0, percent: 0 }, weak: { count: 2, percent: 100 } },
        ratedCount: 2,
        unratedCount: 1,
        syntheticCount: 2,
        averageEffectivePercent: 40,
        overallQuality: { band: 'weak', percent: 40 },
      },
    };
    const goodOnly = { ...summary, byStatus: { complete: { count: 1, percent: 20 }, closed: { count: 4, percent: 80 } }, total: 5 };

    beforeEach(() => {
      getDashboardSummary.mockImplementation((filters = {}) => {
        if (filters.status === 'pending') return Promise.resolve(pendingOnly);
        if (filters.performanceRating === 'good') return Promise.resolve(goodOnly);
        return Promise.resolve(summary);
      });
    });
    afterEach(() => {
      getDashboardSummary.mockReset();
      getDashboardSummary.mockResolvedValue(summary);
    });

    it('clicking a status card filters the TABLE, but the status cards keep showing the whole distribution', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(findKpiCardButton('پینڈنگ'));

      await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' })));
      // The band cards DID follow the status filter (the answer for status=pending has arrived)...
      await waitFor(() => expect(findKpiCardButton('کمزور')).toHaveTextContent('100%'));
      expect(screen.getByRole('group', { name: 'مجموعی کیفیت' })).toHaveTextContent('40%');
      // ...while the status cards did not collapse to "پینڈنگ 3, everything else 0".
      expect(findKpiCardButton('پینڈنگ')).toHaveAttribute('aria-pressed', 'true');
      expect(findKpiCardButton('پینڈنگ')).toHaveTextContent('3');
      expect(findKpiCardButton('پینڈنگ')).toHaveTextContent('12%');
      expect(findKpiCardButton('جاری')).toHaveTextContent('8');
      expect(findKpiCardButton('مکمل')).toHaveTextContent('10');
      expect(findKpiCardButton('کلوز')).toHaveTextContent('4');
      expect(findKpiCardButton('مجموعی')).toHaveTextContent('25');
    });

    it('the status cards are never asked for with the status filter — choosing a status sends them no new request', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');
      expect(getDashboardSummary.mock.calls).toEqual([[{}]]);

      fireEvent.click(findKpiCardButton('پینڈنگ'));

      // The only new request is the band cards' (which follow the status); the status cards' own
      // filters are still {} — already on screen.
      await waitFor(() => expect(getDashboardSummary.mock.calls).toEqual([[{}], [{ status: 'pending' }]]));
    });

    it('every OTHER filter still applies to them: choosing a band narrows the status cards to that band', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(findKpiCardButton('بہتر'));

      await waitFor(() => expect(getDashboardSummary).toHaveBeenLastCalledWith({ performanceRating: 'good' }));
      await waitFor(() => expect(findKpiCardButton('مجموعی')).toHaveTextContent('5'));
      expect(findKpiCardButton('کلوز')).toHaveTextContent('4');
      expect(findKpiCardButton('مکمل')).toHaveTextContent('1');
      expect(findKpiCardButton('جاری')).toHaveTextContent('0');
      // ...and the band cards, whose own filter it is, keep the whole distribution.
      expect(findKpiCardButton('بہتر')).toHaveAttribute('aria-pressed', 'true');
      expect(findKpiCardButton('ممتاز')).toHaveTextContent('6');
      expect(findKpiCardButton('بہتر')).toHaveTextContent('5');
      expect(findKpiCardButton('کمزور')).toHaveTextContent('1');
    });

    it('with a status AND a band chosen, each group is asked without its own filter — no request carries both', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(findKpiCardButton('پینڈنگ'));
      await waitFor(() => expect(getDashboardSummary).toHaveBeenLastCalledWith({ status: 'pending' }));
      fireEvent.click(findKpiCardButton('بہتر'));

      await waitFor(() => expect(getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending', performanceRating: 'good' })));
      await waitFor(() => expect(getDashboardSummary).toHaveBeenLastCalledWith({ performanceRating: 'good' }));
      getDashboardSummary.mock.calls.forEach(([filters]) => expect('status' in filters && 'performanceRating' in filters).toBe(false));
      // Status cards: the "بہتر" tasks by status. Band cards: the "پینڈنگ" tasks by band.
      await waitFor(() => expect(findKpiCardButton('مجموعی')).toHaveTextContent('5'));
      expect(findKpiCardButton('کمزور')).toHaveTextContent('100%');
    });

    it('zimmedar, synthetic/real and the other filters go to BOTH groups (one shared request)', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');
      const callsBefore = getDashboardSummary.mock.calls.length;

      fireEvent.change(screen.getByLabelText('Assignee filter'), { target: { value: 'u1' } });

      await waitFor(() => expect(getDashboardSummary).toHaveBeenLastCalledWith({ assigneeId: 'u1' }));
      expect(getDashboardSummary.mock.calls).toHaveLength(callsBefore + 1);
    });

    it('a normal user gets the same behaviour', async () => {
      renderDashboard('user');
      await screen.findByText('260801');

      fireEvent.click(findKpiCardButton('پینڈنگ'));

      await waitFor(() => expect(findKpiCardButton('کمزور')).toHaveTextContent('100%'));
      expect(findKpiCardButton('جاری')).toHaveTextContent('8');
      expect(findKpiCardButton('مجموعی')).toHaveTextContent('25');
    });
  });

  // ---- The "تخمینی" marker and the admin-only edit, from the dashboard --------------------------
  describe('synthetic ratings in the task table', () => {
    function withSyntheticRow() {
      getTasks.mockResolvedValue({ items: [syntheticTask], meta: { page: 1, limit: 25, total: 1, totalPages: 1 } });
    }
    afterEach(() => {
      getTasks.mockResolvedValue({ items: [sampleTask], meta: { page: 1, limit: 25, total: 1, totalPages: 1 } });
    });

    it('a synthetic rating carries the "تخمینی" badge; the REAL completion percent is shown unchanged', async () => {
      withSyntheticRow();
      renderDashboard('user');
      const row = (await screen.findByText('250103')).closest('tr');

      expect(row).toHaveTextContent('بہتر');
      expect(row).toHaveTextContent('0%'); // the real figure, not the assumed 80
      const badge = screen.getByRole('button', { name: /تخمینی درجہ بندی/ });
      expect(row).toContainElement(badge);
      expect(badge).toHaveAttribute('title', 'تخمینی 80%');
      fireEvent.click(badge); // tap, for touch screens
      expect(badge).toHaveTextContent('تخمینی 80%');
    });

    it('admin: the row menu offers "تخمینی درجہ بندی تبدیل کریں", which opens the edit dialog for that task', async () => {
      withSyntheticRow();
      renderDashboard('admin');
      await screen.findByText('250103');

      fireEvent.click(screen.getByLabelText('اقدامات'));
      fireEvent.click(screen.getByRole('button', { name: 'تخمینی درجہ بندی تبدیل کریں' }));

      const dialog = await screen.findByRole('dialog', { name: 'تخمینی درجہ بندی تبدیل کریں' });
      expect(dialog).toHaveTextContent('250103');
      expect(screen.getByLabelText(/نیا فرض کردہ فیصد/)).toHaveValue(80);
    });

    it('a normal user never gets that menu item', async () => {
      withSyntheticRow();
      renderDashboard('user');
      await screen.findByText('250103');

      fireEvent.click(screen.getByLabelText('اقدامات'));

      expect(screen.getByRole('button', { name: 'پرانی اپڈیٹس' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'تخمینی درجہ بندی تبدیل کریں' })).not.toBeInTheDocument();
    });

    it('admin: the item is not offered on a task whose rating is not synthetic', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(screen.getByLabelText('اقدامات'));

      expect(screen.getByRole('button', { name: 'ترمیم کریں' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'تخمینی درجہ بندی تبدیل کریں' })).not.toBeInTheDocument();
    });
  });

  it('the status and performance KPI groups sit in a 2-column grid on desktop', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    const statusHeading = screen.getByText('کام کی کیفیت');
    const gridContainer = statusHeading.parentElement.parentElement;
    expect(gridContainer).toHaveClass('xl:grid-cols-2');
  });

  // Prompt — TMS Dashboard responsive fix: each group's own 5 cards use a CSS Grid (a grid
  // track's minmax(0,1fr) genuinely has a zero min-width floor, unlike a flex item's
  // min-width:auto), so they never wrap via a layout bug — but the column COUNT itself is now
  // responsive on purpose (2-up on a phone, 3-up on a tablet, the original one-row-of-5 from
  // `md`/768px up unchanged) rather than "grid-cols-5 regardless of viewport width", which
  // crushed 5 Urdu-labeled cards into unreadable slivers below ~480px — see browser-verified
  // screenshots at 375/768/1366/1920px for the actual rendered proof.
  it('each KPI group renders its 5 cards in a responsive grid (2-up mobile, 3-up tablet, 5-up desktop)', async () => {
    renderDashboard('admin');
    await screen.findByText('260801');

    const statusHeading = screen.getByText('کام کی کیفیت');
    const statusCardsContainer = statusHeading.nextElementSibling;
    expect(statusCardsContainer).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-5');
    expect(statusCardsContainer.children).toHaveLength(5);

    // "کارکردگی" also labels the table's Performance column header — scope to the <p> group label.
    const performanceHeading = screen.getAllByText('کارکردگی').find((el) => el.tagName === 'P');
    // Four band cards + the overall-quality card (the grid is the group's first child; the
    // synthetic / unrated line sits under it).
    const performanceCardsContainer = performanceHeading.nextElementSibling.firstElementChild;
    expect(performanceCardsContainer).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-5');
    expect(performanceCardsContainer.children).toHaveLength(5);
  });

  // Phase 2 (locked blueprint §5/§19) — "نئی اطلاع بھیجیں" is a distinct action from the existing
  // "یاد دہانیاں بھیجیں", which keeps its Phase 3 meaning ("run the automatic reminder scan now")
  // completely untouched by this addition.
  describe('نئی اطلاع بھیجیں (Phase 2 manual notification composer)', () => {
    it('admin sees both buttons, distinctly, and only "نئی اطلاع بھیجیں" opens SendNotificationDialog', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      expect(screen.getByRole('button', { name: /یاد دہانیاں بھیجیں/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /نئی اطلاع بھیجیں/ })).toBeInTheDocument();
      // "تمام ذمہ داران" already appears elsewhere on the page (FilterBar's assignee-filter
      // <option>) — the dialog-specific check is the radio INPUT's own label, not the bare text.
      expect(screen.queryByLabelText('تمام ذمہ داران')).not.toBeInTheDocument(); // dialog not open yet

      fireEvent.click(screen.getByRole('button', { name: /نئی اطلاع بھیجیں/ }));

      expect(await screen.findByLabelText('تمام ذمہ داران')).toBeInTheDocument();
    });

    it('clicking "یاد دہانیاں بھیجیں" still only triggers the existing trigger-reminders mutation, never opens the new dialog', async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(screen.getByRole('button', { name: /یاد دہانیاں بھیجیں/ }));

      await waitFor(() => expect(triggerReminders).toHaveBeenCalled());
      expect(screen.queryByLabelText('تمام ذمہ داران')).not.toBeInTheDocument();
    });

    it('a non-admin user sees neither button', async () => {
      renderDashboard('user');
      await screen.findByText('260801');

      expect(screen.queryByRole('button', { name: /یاد دہانیاں بھیجیں/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /نئی اطلاع بھیجیں/ })).not.toBeInTheDocument();
    });

    it("the task row's یاددہانی بھیجیں action opens the SAME dialog locked to that task (Flow C)", async () => {
      renderDashboard('admin');
      await screen.findByText('260801');

      fireEvent.click(screen.getByLabelText('اقدامات'));
      fireEvent.click(screen.getByLabelText('یاددہانی بھیجیں'));

      // Row-triggered mode: no recipient-type picker, the task is shown read-only instead.
      expect(await screen.findByText('یاددہانی بھیجیں', { selector: 'h2' })).toBeInTheDocument();
      expect(screen.queryByLabelText('تمام ذمہ داران')).not.toBeInTheDocument();
    });
  });
});
