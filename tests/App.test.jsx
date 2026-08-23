import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App, { queryClient } from '../src/App.jsx';
import { useAuthStore } from '../src/store/authStore.js';

vi.mock('../src/services/auth.api.js', () => ({
  getCurrentUser: vi.fn(),
  loginWithGoogle: vi.fn(),
}));
import { getCurrentUser } from '../src/services/auth.api.js';

// Phase 10.3: DashboardPage (rendered once session restore succeeds, below) now fetches real
// data via useTasks/useDashboardSummary/useAssignableUsers/useLookupList. Left unmocked, those
// hooks would hit real (failing) network calls and keep DashboardPage's own role="status"
// spinners mounted indefinitely — colliding with this file's own role="status" checks, which are
// about the SessionGate's loading indicator specifically, not DashboardPage's. Mocked to
// resolved/empty data so DashboardPage settles immediately, same as every other dependency here.
vi.mock('../src/services/tasks.api.js', () => ({
  getTasks: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 1 } }),
  getTask: vi.fn(),
  closeTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));
vi.mock('../src/services/dashboard.api.js', () => ({
  getDashboardSummary: vi.fn().mockResolvedValue({ byStatus: {}, byPerformance: {}, total: 0 }),
}));
vi.mock('../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('../src/services/lookupLists.api.js', () => ({ getLookupList: vi.fn().mockResolvedValue([]) }));
// UpdateModal/PreviousUpdatesModal are always mounted on DashboardPage now (Phase 10.4), but stay
// closed here (no task selected) — their useTask/useTaskUpdates calls are disabled, so these
// never actually fire. Mocked anyway for the same reason as the block above: keeps the module
// import itself safe regardless of internal enabled-gating.
vi.mock('../src/services/taskUpdates.api.js', () => ({ getTaskUpdates: vi.fn(), createTaskUpdate: vi.fn() }));

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

// @react-oauth/google is mocked globally (src/setupTests.js), so LoginPage renders safely here.
describe('App — session restore sequence (docs/11-auth.md §4)', () => {
  beforeEach(() => {
    resetStore();
    getCurrentUser.mockReset();
    // App.jsx's queryClient is a module-level singleton shared by every render across this whole
    // file — with useCurrentUser's staleTime:Infinity, a prior test's cached ['currentUser'] data
    // would otherwise never go stale and this test would never even attempt to fetch.
    queryClient.clear();
    window.history.pushState({}, '', '/');
  });

  it('no token on mount: goes straight to the login screen, no loading flash, and never calls GET /auth/me', async () => {
    render(<App />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Task Management System' })).toBeInTheDocument();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it('token present + GET /auth/me succeeds: shows a full-screen loading state first, then the app', async () => {
    useAuthStore.setState({ token: 'jwt-abc', user: null, isAuthenticated: true });
    getCurrentUser.mockResolvedValue({ id: '1', name: 'Om', role: 'user' });

    render(<App />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('token present + GET /auth/me fails: the loading gate resolves rather than hanging forever', async () => {
    useAuthStore.setState({ token: 'jwt-stale', user: null, isAuthenticated: true });
    getCurrentUser.mockRejectedValue(Object.assign(new Error('Session expired.'), { code: 'UNAUTHORIZED' }));

    render(<App />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    // Mocking auth.api.js directly (rather than the real apiClient's HTTP call) means this
    // rejection never actually passes through the real response interceptor, so authStore.
    // isAuthenticated is deliberately left untouched here — that interceptor behavior (clearing
    // the store, redirecting) is the response interceptor's own job and is already exhaustively
    // covered by tests/services/apiClient.test.js (Phase 10.1). This test only proves the
    // session-restore gate itself doesn't hang when the session-restore fetch fails, i.e. that
    // this flow reaches past it. Longer timeout: the global queryClient's retry:1 default
    // (docs/10-api-integration.md §2) means this query retries once with a ~1s backoff delay
    // before actually settling to an error state.
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 3000 });
  });
});
