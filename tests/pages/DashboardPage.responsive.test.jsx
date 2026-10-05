import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { setViewportWidth, resetViewport } from '../helpers/viewport.js';

// One page, two layouts. From 768px up it is the desktop dashboard exactly as before (KPI cards,
// filter bar and the task TABLE on "/"). Below 768px it is two bottom-tab destinations: "/" shows
// the KPIs alone and "/tasks" the task list as cards.
const { summary, overdueTask, syntheticTask } = vi.hoisted(() => ({
  summary: {
    byStatus: {
      ongoing: { count: 3, percent: 2 },
      pending: { count: 53, percent: 35 },
      complete: { count: 0, percent: 0 },
      closed: { count: 96, percent: 63 },
    },
    byPerformance: {},
    total: 152,
    ratings: {
      bands: { excellent: { count: 0, percent: 0 }, good: { count: 81, percent: 55 }, fair: { count: 6, percent: 4 }, weak: { count: 60, percent: 41 } },
      ratedCount: 147,
      unratedCount: 5,
      syntheticCount: 134,
      averageEffectivePercent: 62.4,
      overallQuality: { band: 'weak', percent: 62.4 },
    },
  },
  overdueTask: {
    id: 't1',
    codeNumber: '250110',
    title: 'Overdue task',
    assignees: [{ id: 'u1', name: 'Ali' }],
    responsibility: 'IT',
    deadline: '2025-01-31T00:00:00.000Z',
    lastUpdateAt: null,
    status: 'pending',
    timeStatus: { type: 'overdue', days: 613 },
    completionPercent: 25,
    performanceRating: '-',
  },
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
}));

const twoTasks = { items: [overdueTask, syntheticTask], meta: { page: 1, limit: 25, total: 2, totalPages: 1 } };

vi.mock('../../src/services/dashboard.api.js', () => ({ getDashboardSummary: vi.fn() }));
vi.mock('../../src/services/tasks.api.js', () => ({
  getTasks: vi.fn(),
  getTask: vi.fn(),
  closeTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  editSyntheticRating: vi.fn(),
  removeSyntheticRating: vi.fn(),
}));
vi.mock('../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [{ id: 'u1', name: 'Ali' }], meta: {} }) }));
vi.mock('../../src/services/taskUpdates.api.js', () => ({
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } }),
  createTaskUpdate: vi.fn(),
}));
vi.mock('../../src/services/reports.api.js', () => ({ exportReport: vi.fn(), exportUserSummary: vi.fn(), triggerReminders: vi.fn() }));
vi.mock('../../src/services/notifications.api.js', () => ({
  sendAdminNotification: vi.fn(),
  sendTaskReminder: vi.fn(),
  getAdminNotificationHistory: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
}));
vi.mock('../../src/services/lookupLists.api.js', () => ({ getLookupList: vi.fn().mockResolvedValue({ items: [] }) }));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

import { getTasks, getTask } from '../../src/services/tasks.api.js';
import { getDashboardSummary } from '../../src/services/dashboard.api.js';

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

function renderApp(url = '/', role = 'admin') {
  useAuthStore.getState().login({ id: 'me', name: 'Admin', role }, 'jwt');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Where />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<DashboardPage view="tasks" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const where = () => screen.getByTestId('where').textContent;
const cards = () => screen.queryAllByRole('article');
const tilesRegion = () => screen.queryByRole('region', { name: 'کاموں کی صورتحال' });
const lastTaskFilters = () => getTasks.mock.calls[getTasks.mock.calls.length - 1][0];

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  window.localStorage.clear();
  getDashboardSummary.mockReset();
  getDashboardSummary.mockResolvedValue(summary);
  getTasks.mockReset();
  getTasks.mockResolvedValue(twoTasks);
  getTask.mockReset();
  getTask.mockImplementation((id) => Promise.resolve(id === 't2' ? syntheticTask : overdueTask));
  window.scrollTo = vi.fn();
});
afterEach(() => {
  resetViewport();
});

describe('DashboardPage at 768px and wider — the desktop layout, unchanged (regression)', () => {
  it.each([[768], [1024], [1280]])('%ipx: "/" renders the task TABLE, with the KPI cards and the filter bar on the same page', async (width) => {
    setViewportWidth(width);
    const { container } = renderApp('/');

    expect(await screen.findByText('250110')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Overdue task')).toBeInTheDocument();
    expect(within(table).getAllByRole('row').length).toBeGreaterThanOrEqual(3); // header + 2 tasks
    // The desktop KPI cards and the inline filter bar...
    expect(screen.getByRole('heading', { name: 'ڈیش بورڈ' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'مجموعی کیفیت' })).toHaveTextContent('62.4%');
    expect(screen.getByLabelText('Rating source filter')).toBeInTheDocument();
    // ...and none of the mobile screen's parts.
    expect(cards()).toHaveLength(0);
    expect(tilesRegion()).not.toBeInTheDocument();
    expect(container.querySelector('[data-ring-arc]')).toBeNull();
    expect(screen.queryByRole('button', { name: /^فلٹر/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'صفحات' })).not.toBeInTheDocument();
    // Both the list and the summary are fetched, as before.
    expect(getTasks).toHaveBeenCalled();
    expect(getDashboardSummary).toHaveBeenCalledWith({});
  });

  it('with no matchMedia at all (the default in this test environment) it is the desktop layout too', async () => {
    renderApp('/');
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it('"/tasks" is a phone-only destination: here it redirects to "/" and keeps the filters', async () => {
    setViewportWidth(1024);
    renderApp('/tasks?status=pending&search=audit');

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(where()).toBe('/?status=pending&search=audit');
    expect(lastTaskFilters()).toMatchObject({ status: 'pending', search: 'audit' });
  });

  it('the row actions are still the table\'s own menu (no card sheet)', async () => {
    setViewportWidth(1280);
    renderApp('/');
    await screen.findByText('250110');

    fireEvent.click(screen.getAllByLabelText('اقدامات')[0]);

    expect(screen.getByLabelText('اپڈیٹ کریں')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /^کام 25/ })).not.toBeInTheDocument();
  });
});

describe('DashboardPage below 768px — the dashboard tab ("/")', () => {
  it.each([[320], [375], [390], [767]])('%ipx: shows the KPIs alone — hero, delay banner, status tiles — and no task list', async (width) => {
    setViewportWidth(width);
    const { container } = renderApp('/');

    const hero = await screen.findByRole('region', { name: 'مجموعی کیفیت' });
    expect(hero).toHaveTextContent('کمزور');
    expect(hero).toHaveTextContent('اوسط 62.4%');
    expect(hero).toHaveTextContent('147 درجہ بند کاموں کی بنیاد پر');
    expect(hero).toHaveTextContent('134 تخمینی');
    expect(hero).toHaveTextContent('13 اصل');
    expect(container.querySelector('[data-ring-arc]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /53 کام تاخیر کا شکار ہیں/ })).toHaveAttribute('href', '/tasks?status=pending');
    expect(within(tilesRegion()).getAllByRole('link')).toHaveLength(4);
    expect(within(tilesRegion()).getByText('کل 152')).toBeInTheDocument();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(0);
    // It fetches only what it shows: the summary, not a page of tasks.
    expect(getTasks).not.toHaveBeenCalled();
  });

  it('follows the dashboard filters by the existing rule: each group is asked without its own filter', async () => {
    setViewportWidth(375);
    renderApp('/?status=pending&performanceRating=weak&assigneeId=u1');
    await screen.findByRole('region', { name: 'مجموعی کیفیت' });

    const asked = getDashboardSummary.mock.calls.map(([filters]) => filters);
    expect(asked).toContainEqual({ performanceRating: 'weak', assigneeId: 'u1' }); // the status tiles: no status filter
    expect(asked).toContainEqual({ status: 'pending', assigneeId: 'u1' }); // the rating hero: no rating filter
    expect(asked).toHaveLength(2);
  });

  it('shows the filters in force as removable chips, so narrowed figures are never mistaken for the whole', async () => {
    setViewportWidth(375);
    renderApp('/?status=pending&search=audit');
    await screen.findByRole('region', { name: 'مجموعی کیفیت' });

    fireEvent.click(screen.getByRole('button', { name: 'پینڈنگ — فلٹر ہٹائیں' }));

    expect(where()).toBe('/?search=audit');
    expect(screen.getByRole('button', { name: 'تلاش: audit — فلٹر ہٹائیں' })).toBeInTheDocument();
  });

  it('a status tile opens the task list filtered to that status, keeping the other filters', async () => {
    setViewportWidth(375);
    renderApp('/?ratingSource=synthetic');
    await screen.findByRole('region', { name: 'مجموعی کیفیت' });

    fireEvent.click(screen.getByRole('link', { name: 'کلوز: 96 کام، 63 فیصد' }));

    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(where()).toBe('/tasks?ratingSource=synthetic&status=closed');
    expect(lastTaskFilters()).toMatchObject({ ratingSource: 'synthetic', status: 'closed' });
  });

  it('"بغیر درجہ بندی" opens the task list filtered to the unrated tasks', async () => {
    setViewportWidth(375);
    renderApp('/');
    const hero = await screen.findByRole('region', { name: 'مجموعی کیفیت' });

    fireEvent.click(within(hero).getByRole('link', { name: 'بغیر درجہ بندی: 5' }));

    await waitFor(() => expect(where()).toBe('/tasks?performanceRating=-'));
    await waitFor(() => expect(lastTaskFilters()).toMatchObject({ performanceRating: '-' }));
  });

  it('a normal user gets the same screen for their own tasks — and no "نیا کام" button', async () => {
    setViewportWidth(375);
    renderApp('/', 'user');

    expect(await screen.findByRole('region', { name: 'مجموعی کیفیت' })).toBeInTheDocument();
    expect(tilesRegion()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'نیا کام' })).not.toBeInTheDocument();
    expect(getDashboardSummary).toHaveBeenCalledWith({}); // the server limits a user to their own tasks
  });

  it('an Admin gets the floating "نیا کام" button, which opens the existing task form', async () => {
    setViewportWidth(375);
    renderApp('/', 'admin');
    await screen.findByRole('region', { name: 'مجموعی کیفیت' });

    fireEvent.click(screen.getByRole('button', { name: 'نیا کام' }));

    expect(await screen.findByRole('dialog', { name: 'نیا کام' })).toBeInTheDocument();
  });

  it('loads with the shared loading phrase', () => {
    setViewportWidth(375);
    getDashboardSummary.mockReturnValue(new Promise(() => {}));
    const { container } = renderApp('/');
    expect(container.querySelector('[data-phrase-line]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('خلاصہ لوڈ ہو رہا ہے');
  });
});

describe('DashboardPage below 768px — the tasks tab ("/tasks")', () => {
  it.each([[320], [375], [390], [767]])('%ipx: shows the tasks as cards — no table, no KPI cards', async (width) => {
    setViewportWidth(width);
    const { container } = renderApp('/tasks');

    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(cards()[0]).toHaveTextContent('250110');
    expect(cards()[0]).toHaveTextContent('Overdue task');
    expect(screen.getByText('2 کام')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'مجموعی کیفیت' })).not.toBeInTheDocument();
    expect(tilesRegion()).not.toBeInTheDocument();
    expect(container.querySelector('[data-ring-arc]')).toBeNull();
    // It fetches only what it shows: the list, not the summary.
    expect(getDashboardSummary).not.toHaveBeenCalled();
  });

  it('the cards carry the overdue pill, the "تخمینی" marker and the REAL completion percent', async () => {
    setViewportWidth(375);
    renderApp('/tasks');
    await waitFor(() => expect(cards()).toHaveLength(2));
    const [overdue, synthetic] = cards();

    expect(overdue.querySelector('[data-overdue-pill]')).toHaveTextContent('تاخیر');
    expect(overdue.querySelector('[data-completion-percent]')).toHaveTextContent(/^25%$/);
    expect(synthetic.querySelector('[data-overdue-pill]')).toBeNull();
    expect(synthetic.querySelector('[data-rating-chip]')).toHaveTextContent('بہتر');
    expect(synthetic.querySelector('[data-synthetic-marker]')).toHaveTextContent('تخمینی');
    expect(synthetic.querySelector('[data-completion-percent]')).toHaveTextContent(/^0%$/); // not the assumed 80
  });

  it('reads the same filters from the URL as the desktop table does', async () => {
    setViewportWidth(375);
    renderApp('/tasks?status=pending&performanceRating=weak&ratingSource=synthetic&from=2026-01-01');
    await waitFor(() => expect(cards()).toHaveLength(2));

    expect(lastTaskFilters()).toMatchObject({ status: 'pending', performanceRating: 'weak', ratingSource: 'synthetic', deadlineFrom: '2026-01-01', page: 1 });
    expect(screen.getByRole('button', { name: 'فلٹر، 4 فعال' })).toBeInTheDocument();
  });

  describe('opening a task', () => {
    async function openCard(index, role = 'admin') {
      setViewportWidth(375);
      renderApp('/tasks', role);
      await waitFor(() => expect(cards()).toHaveLength(2));
      fireEvent.click(within(cards()[index]).getByRole('button'));
      return screen.findByRole('dialog', { name: index === 0 ? 'کام 250110' : 'کام 250103' });
    }
    const actions = (sheet) => within(sheet).getAllByRole('button').map((b) => b.textContent).filter((text) => text);

    it('a tap opens the task\'s details and actions', async () => {
      const sheet = await openCard(0);
      expect(sheet).toHaveTextContent('Overdue task');
      expect(sheet).toHaveTextContent('613 دن تاخیر سے');
      expect(sheet).toHaveTextContent('25%');
    });

    it('a normal user can update and view — and nothing Admin-only', async () => {
      const sheet = await openCard(0, 'user');
      expect(actions(sheet)).toEqual(['اپڈیٹ کریں', 'کام کی تفصیل اور پرانی اپڈیٹس']);
    });

    it('an Admin also reaches edit and send-reminder there', async () => {
      const sheet = await openCard(0, 'admin');
      expect(actions(sheet)).toEqual(['اپڈیٹ کریں', 'کام کی تفصیل اور پرانی اپڈیٹس', 'ترمیم کریں', 'یاددہانی بھیجیں']);
    });

    it('an Admin reaches the "تخمینی" rating editor on a task that has a synthetic rating — and only there', async () => {
      const sheet = await openCard(1, 'admin');
      expect(sheet).toHaveTextContent('تخمینی — فرض کردہ 80%');
      expect(actions(sheet)).toContain('تخمینی درجہ بندی تبدیل کریں');

      fireEvent.click(within(sheet).getByRole('button', { name: 'تخمینی درجہ بندی تبدیل کریں' }));

      expect(await screen.findByRole('dialog', { name: 'تخمینی درجہ بندی تبدیل کریں' })).toHaveTextContent('250103');
      expect(screen.queryByRole('dialog', { name: 'کام 250103' })).not.toBeInTheDocument(); // the sheet handed over
    });

    it('a closed task cannot be updated or edited from the sheet either', async () => {
      const sheet = await openCard(1, 'admin');
      expect(within(sheet).getByRole('button', { name: 'اپڈیٹ کریں' })).toBeDisabled();
      expect(within(sheet).getByRole('button', { name: 'ترمیم کریں' })).toBeDisabled();
      expect(within(sheet).getByRole('button', { name: 'کام کی تفصیل اور پرانی اپڈیٹس' })).toBeEnabled();
    });

    it('"اپڈیٹ کریں" hands over to the existing update dialog', async () => {
      const sheet = await openCard(0, 'user');
      fireEvent.click(within(sheet).getByRole('button', { name: 'اپڈیٹ کریں' }));

      expect(await screen.findByRole('dialog', { name: 'کام اپڈیٹ کریں' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'کام 250110' })).not.toBeInTheDocument();
      await waitFor(() => expect(getTask).toHaveBeenCalledWith('t1'));
    });

    it('"کام کی تفصیل اور پرانی اپڈیٹس" hands over to the existing details dialog', async () => {
      const sheet = await openCard(0, 'user');
      fireEvent.click(within(sheet).getByRole('button', { name: 'کام کی تفصیل اور پرانی اپڈیٹس' }));
      expect(await screen.findByRole('dialog', { name: 'کام کی تفصیل' })).toBeInTheDocument();
    });
  });

  describe('paging and sorting', () => {
    beforeEach(() => {
      getTasks.mockResolvedValue({ items: [overdueTask, syntheticTask], meta: { page: 1, limit: 25, total: 60, totalPages: 3 } });
    });

    it('previous / next at the bottom of the list: "اگلا" asks for the next page and returns to the top', async () => {
      setViewportWidth(375);
      renderApp('/tasks?status=pending');
      await waitFor(() => expect(cards()).toHaveLength(2));
      const pager = screen.getByRole('navigation', { name: 'صفحات' });
      expect(pager).toHaveTextContent('1 / 3');
      expect(within(pager).getByRole('button', { name: 'پچھلا' })).toBeDisabled();

      fireEvent.click(within(pager).getByRole('button', { name: 'اگلا' }));

      await waitFor(() => expect(lastTaskFilters()).toMatchObject({ page: 2, status: 'pending' }));
      expect(where()).toBe('/tasks?status=pending&page=2');
      await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 0));
    });

    it('keeps the page-size choice (the same 10 / 25 / 50 preference as the table)', async () => {
      setViewportWidth(375);
      renderApp('/tasks');
      await waitFor(() => expect(cards()).toHaveLength(2));
      const size = within(screen.getByRole('navigation', { name: 'صفحات' })).getByRole('combobox');
      expect(within(size).getAllByRole('option').map((o) => o.textContent)).toEqual(['10', '25', '50']);

      fireEvent.change(size, { target: { value: '50' } });

      await waitFor(() => expect(lastTaskFilters()).toMatchObject({ limit: 50 }));
    });

    it('a card list has no column headers, so sorting has its own control', async () => {
      setViewportWidth(375);
      renderApp('/tasks');
      await waitFor(() => expect(cards()).toHaveLength(2));

      const sortField = screen.getByLabelText('ترتیب');
      sortField.focus();
      fireEvent.change(sortField, { target: { value: 'completionPercent' } });
      await waitFor(() => expect(lastTaskFilters()).toMatchObject({ sortBy: 'completionPercent', sortOrder: 'asc' }));
      // The control stays mounted (and focused) while the re-sorted list loads.
      expect(screen.getByLabelText('ترتیب')).toBe(sortField);
      expect(sortField).toHaveFocus();
      expect(sortField).toHaveValue('completionPercent');

      fireEvent.click(screen.getByRole('button', { name: /الٹنے کے لیے دبائیں/ }));
      await waitFor(() => expect(lastTaskFilters()).toMatchObject({ sortBy: 'completionPercent', sortOrder: 'desc' }));
    });
  });

  describe('empty and loading states', () => {
    it('no task matches the filters: a short message and "فلٹر صاف کریں", which clears them all', async () => {
      setViewportWidth(375);
      getTasks.mockResolvedValue({ items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 1 } });
      renderApp('/tasks?status=complete&search=xyz');

      expect(await screen.findByText('اس فلٹر سے کوئی کام نہیں ملا')).toBeInTheDocument();
      expect(cards()).toHaveLength(0);

      fireEvent.click(screen.getByRole('button', { name: 'فلٹر صاف کریں' }));

      expect(where()).toBe('/tasks');
    });

    it('no tasks at all (nothing filtered): says so, with no "clear filters" button to press', async () => {
      setViewportWidth(375);
      getTasks.mockResolvedValue({ items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 1 } });
      renderApp('/tasks');

      expect(await screen.findByText('ابھی کوئی کام موجود نہیں')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'فلٹر صاف کریں' })).not.toBeInTheDocument();
    });

    it('loads with the shared loading phrase', () => {
      setViewportWidth(375);
      getTasks.mockReturnValue(new Promise(() => {}));
      const { container } = renderApp('/tasks');
      expect(container.querySelector('[data-phrase-line]')).not.toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('کام لوڈ ہو رہے ہیں');
    });

    it('a failed load says so instead of showing an empty list', async () => {
      setViewportWidth(375);
      getTasks.mockRejectedValue(new Error('boom'));
      renderApp('/tasks');
      expect(await screen.findByText('کام لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔')).toBeInTheDocument();
    });
  });

  it('an Admin has the floating "نیا کام" button here too; a normal user does not', async () => {
    setViewportWidth(375);
    const admin = renderApp('/tasks', 'admin');
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.getByRole('button', { name: 'نیا کام' })).toBeInTheDocument();
    admin.unmount();

    renderApp('/tasks', 'user');
    await waitFor(() => expect(cards()).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'نیا کام' })).not.toBeInTheDocument();
  });
});
