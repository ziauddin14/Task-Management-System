import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityLogPage from '../../src/pages/ActivityLogPage.jsx';
import { setViewportWidth, resetViewport } from '../helpers/viewport.js';

// Fictional people and times only.
const { SUMMARY, ROWS } = vi.hoisted(() => ({
  SUMMARY: { inactivityDays: 7, baselineAt: '2026-09-01T00:00:00.000Z', totalActive: 3, activeToday: 1, activeThisWeek: 2, inactiveCount: 2 },
  ROWS: [
    {
      id: 'u1',
      name: 'Silent Sana',
      responsibility: 'Accounts',
      role: 'user',
      isActive: true,
      lastLoginAt: null,
      lastActiveAt: null,
      lastAction: null,
      noActivityRecorded: true,
      daysSinceActivity: 46,
      isInactive: true,
    },
    {
      id: 'u2',
      name: 'Quiet Qasim',
      responsibility: 'IT',
      role: 'admin',
      isActive: true,
      lastLoginAt: '2026-09-20T05:00:00.000Z',
      lastActiveAt: '2026-09-20T05:30:00.000Z',
      lastAction: { type: 'TASK_UPDATE_CREATED', at: '2026-09-20T05:30:00.000Z', taskCode: '261001' },
      noActivityRecorded: false,
      daysSinceActivity: 27,
      isInactive: true,
    },
    {
      id: 'u3',
      name: 'Busy Bilal',
      responsibility: 'Media',
      role: 'user',
      isActive: true,
      lastLoginAt: '2026-10-16T19:01:00.000Z',
      lastActiveAt: '2026-10-17T06:00:00.000Z',
      lastAction: { type: 'TASK_CLOSED', at: '2026-10-17T05:00:00.000Z', taskCode: '261002' },
      noActivityRecorded: false,
      daysSinceActivity: 0,
      isInactive: false,
    },
  ],
}));

vi.mock('../../src/services/activity.api.js', () => ({
  getActivitySummary: vi.fn(),
  getActivityUsers: vi.fn(),
  getUserActivityEvents: vi.fn(),
  getUserActivityHistory: vi.fn(),
  getActivitySettings: vi.fn(),
  updateActivitySettings: vi.fn(),
}));

import { getActivitySummary, getActivityUsers, getUserActivityEvents, getUserActivityHistory } from '../../src/services/activity.api.js';

const META = { page: 1, limit: 25, total: 3, totalPages: 1, inactivityDays: 7, baselineAt: SUMMARY.baselineAt };

function renderPage(url = '/activity') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <ActivityLogPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const lastUsersParams = () => getActivityUsers.mock.calls.at(-1)[0];

describe('ActivityLogPage', () => {
  beforeEach(() => {
    getActivitySummary.mockReset().mockResolvedValue(SUMMARY);
    getActivityUsers.mockReset().mockResolvedValue({ items: ROWS, meta: META });
    getUserActivityEvents.mockReset().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
    getUserActivityHistory.mockReset().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  });
  afterEach(() => resetViewport());

  it('shows the title, the three figures and the columns in order', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'ایکٹیویٹی لاگ' })).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: 'آج متحرک: 1' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'اس ہفتے متحرک: 2' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '7 دن سے زیادہ غیر متحرک: 2' })).toHaveClass('bg-tk-weak-tint');

    await screen.findByText('Silent Sana');
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'نام',
      'ذمہ داری',
      'آخری لاگ ان',
      'آخری ایکٹیویٹی',
      'آخری اقدام',
      'ایکٹیویٹی کے بغیر دن',
    ]);
  });

  it('tints and badges the inactive rows; nothing recorded is said neutrally; times are Pakistan time', async () => {
    renderPage();
    const silentRow = (await screen.findByText('Silent Sana')).closest('tr');
    expect(silentRow).toHaveClass('bg-tk-weak-tint');
    expect(within(silentRow).getByText('غیر متحرک')).toBeInTheDocument();
    expect(within(silentRow).getByText('ریکارڈ نہیں')).toBeInTheDocument();
    expect(within(silentRow).getByText('01-09-26 سے کوئی ایکٹیویٹی ریکارڈ نہیں ہوئی')).toBeInTheDocument();
    expect(within(silentRow).getByText('46')).toBeInTheDocument();

    const quietRow = screen.getByText('Quiet Qasim').closest('tr');
    expect(within(quietRow).getByText('20-09-26, 10:00')).toBeInTheDocument(); // last login, 05:00 UTC
    expect(within(quietRow).getByText(/اپڈیٹ درج کی/)).toBeInTheDocument();
    expect(within(quietRow).getByText('261001')).toBeInTheDocument();

    const busyRow = screen.getByText('Busy Bilal').closest('tr');
    expect(busyRow).not.toHaveClass('bg-tk-weak-tint');
    expect(within(busyRow).queryByText('غیر متحرک')).not.toBeInTheDocument();
    expect(within(busyRow).getByText('17-10-26, 00:01')).toBeInTheDocument(); // just after Pakistan midnight
    // The inactivity badge is never the "deactivated" word.
    expect(screen.queryByText('غیر فعال')).not.toBeInTheDocument();
  });

  it('a deactivated account found by a search is shown as "غیر فعال", never flagged', async () => {
    getActivityUsers.mockResolvedValue({
      items: [{ ...ROWS[2], id: 'u9', name: 'Gone Ghazala', isActive: false, isInactive: false, daysSinceActivity: 90 }],
      meta: { ...META, total: 1 },
    });
    renderPage();
    const row = (await screen.findByText('Gone Ghazala')).closest('tr');
    expect(within(row).getByText('غیر فعال')).toBeInTheDocument();
    expect(within(row).queryByText('غیر متحرک')).not.toBeInTheDocument();
    expect(row).not.toHaveClass('bg-tk-weak-tint');
  });

  it('"صرف غیر متحرک" asks for the flagged accounts only, and ?inactive=1 opens with it on', async () => {
    renderPage();
    await screen.findByText('Silent Sana');
    expect(lastUsersParams().inactiveOnly).toBeUndefined();

    const toggle = screen.getByRole('button', { name: 'صرف غیر متحرک' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ inactiveOnly: 'true', page: 1 }));
  });

  it('opens with the filter on when the dashboard alert linked here', async () => {
    renderPage('/activity?inactive=1');
    expect(screen.getByRole('button', { name: 'صرف غیر متحرک' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ inactiveOnly: 'true' }));
  });

  it('the search is sent (debounced) to the server', async () => {
    renderPage();
    await screen.findByText('Silent Sana');
    fireEvent.change(screen.getByRole('searchbox', { name: 'نام یا ای میل تلاش کریں' }), { target: { value: 'qasim' } });
    await waitFor(() => expect(lastUsersParams()).toMatchObject({ search: 'qasim', page: 1 }), { timeout: 2000 });
  });

  it('a name opens that person\'s timeline dialog', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Quiet Qasim' }));
    expect(await screen.findByRole('dialog', { name: 'Quiet Qasim — ایکٹیویٹی' })).toBeInTheDocument();
    await waitFor(() => expect(getUserActivityEvents).toHaveBeenCalledWith('u2', expect.objectContaining({ page: 1 })));
  });

  it('when the backend has no activity log (or it fails): a calm message, no figures, no crash', async () => {
    getActivitySummary.mockRejectedValue(new Error('Not found'));
    getActivityUsers.mockRejectedValue(new Error('Not found'));
    renderPage();
    expect(await screen.findByText('صارفین لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /آج متحرک/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ایکٹیویٹی لاگ' })).toBeInTheDocument();
  });

  it('shows the loading phrase while the list loads', () => {
    getActivityUsers.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('صارفین لوڈ ہو رہے ہیں…');
  });

  it('on a phone each account is a card (tinted when inactive) that opens the timeline', async () => {
    setViewportWidth(390);
    renderPage();
    const card = (await screen.findByText('Silent Sana')).closest('button');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(card).toHaveClass('bg-tk-weak-tint');
    expect(within(card).getByText('غیر متحرک')).toBeInTheDocument();
    expect(within(card).getByText('آخری لاگ ان')).toBeInTheDocument();
    fireEvent.click(card);
    expect(await screen.findByRole('dialog', { name: 'Silent Sana — ایکٹیویٹی' })).toBeInTheDocument();
  });
});
