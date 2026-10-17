import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../../src/pages/DashboardPage.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { setViewportWidth, resetViewport } from '../helpers/viewport.js';

// The one thing the activity log adds to the dashboard: the Admin-only inactivity alert, on the
// desktop and the mobile dashboard alike — and nothing at all for anyone else, when nobody is
// inactive, or when the activity summary cannot be read.
const { summary } = vi.hoisted(() => ({
  summary: {
    byStatus: {
      ongoing: { count: 1, percent: 50 },
      pending: { count: 0, percent: 0 },
      complete: { count: 0, percent: 0 },
      closed: { count: 1, percent: 50 },
    },
    byPerformance: {},
    total: 2,
    ratings: {
      bands: { excellent: { count: 0, percent: 0 }, good: { count: 1, percent: 100 }, fair: { count: 0, percent: 0 }, weak: { count: 0, percent: 0 } },
      ratedCount: 1,
      unratedCount: 1,
      syntheticCount: 0,
      averageEffectivePercent: 80,
      overallQuality: { band: 'good', percent: 80 },
    },
  },
}));

vi.mock('../../src/services/dashboard.api.js', () => ({ getDashboardSummary: vi.fn() }));
vi.mock('../../src/services/tasks.api.js', () => ({
  getTasks: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 1 } }),
  getTask: vi.fn(),
  closeTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  editSyntheticRating: vi.fn(),
  removeSyntheticRating: vi.fn(),
}));
vi.mock('../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('../../src/services/reports.api.js', () => ({ exportReport: vi.fn(), exportUserSummary: vi.fn(), triggerReminders: vi.fn() }));
vi.mock('../../src/services/notifications.api.js', () => ({
  sendAdminNotification: vi.fn(),
  sendTaskReminder: vi.fn(),
  getAdminNotificationHistory: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
}));
vi.mock('../../src/services/lookupLists.api.js', () => ({ getLookupList: vi.fn().mockResolvedValue({ items: [] }) }));
vi.mock('../../src/services/activity.api.js', () => ({ getActivitySummary: vi.fn() }));

import { getDashboardSummary } from '../../src/services/dashboard.api.js';
import { getActivitySummary } from '../../src/services/activity.api.js';

function renderDashboard(role) {
  useAuthStore.getState().login({ id: 'me', name: 'Someone', role }, 'jwt');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const alertLink = () => screen.queryByRole('link', { name: /دن سے غیر متحرک/ });

beforeEach(() => {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  window.localStorage.clear();
  window.scrollTo = vi.fn();
  getDashboardSummary.mockReset().mockResolvedValue(summary);
  getActivitySummary.mockReset().mockResolvedValue({ inactiveCount: 2, inactivityDays: 7 });
});
afterEach(() => resetViewport());

describe.each([
  ['desktop', 1366],
  ['mobile', 390],
])('DashboardPage (%s) — the inactivity alert', (_label, width) => {
  beforeEach(() => setViewportWidth(width));

  it('an Admin sees it when accounts are inactive, linking to the filtered activity log', async () => {
    renderDashboard('admin');
    const link = await screen.findByRole('link', { name: /2 صارفین 7 دن سے غیر متحرک ہیں/ });
    expect(link).toHaveAttribute('href', '/activity?inactive=1');
    expect(link).toHaveTextContent('دیکھیں');
  });

  it('a normal user never sees it and never asks for it', async () => {
    renderDashboard('user');
    await waitFor(() => expect(getDashboardSummary).toHaveBeenCalled());
    expect(alertLink()).not.toBeInTheDocument();
    expect(getActivitySummary).not.toHaveBeenCalled();
  });

  it('hidden when nobody is inactive', async () => {
    getActivitySummary.mockResolvedValue({ inactiveCount: 0, inactivityDays: 7 });
    renderDashboard('admin');
    await waitFor(() => expect(getActivitySummary).toHaveBeenCalled());
    await waitFor(() => expect(getDashboardSummary).toHaveBeenCalled());
    expect(alertLink()).not.toBeInTheDocument();
  });

  it('hidden — and the dashboard unharmed — when the activity summary fails', async () => {
    getActivitySummary.mockRejectedValue(new Error('Not found'));
    renderDashboard('admin');
    await waitFor(() => expect(getActivitySummary).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(alertLink()).not.toBeInTheDocument();
    expect(screen.getAllByText(/ڈیش بورڈ/).length).toBeGreaterThan(0);
  });
});
