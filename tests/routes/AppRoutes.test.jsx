import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from '../../src/routes/AppRoutes.jsx';
import { useAuthStore } from '../../src/store/authStore.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

// Phase 10.2 note: LoginPage now calls useLoginWithGoogle() (a real React Query mutation) and
// AppLayout calls useQueryClient() — both need a real QueryClientProvider in the tree to render
// without throwing. @react-oauth/google itself is mocked globally (src/setupTests.js).
function renderAt(path) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppRoutes (docs/07-frontend-foundation.md §5)', () => {
  beforeEach(() => resetStore());

  it('/login renders LoginPage when unauthenticated', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Task Management System' })).toBeInTheDocument();
  });

  it('/login redirects to / when already authenticated', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt');
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('/ redirects to /login when unauthenticated', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Task Management System' })).toBeInTheDocument();
  });

  it('/ renders DashboardPage for any authenticated role', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt');
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('/users renders UsersPage for an admin', () => {
    useAuthStore.getState().login({ id: '1', name: 'Admin', role: 'admin' }, 'jwt');
    renderAt('/users');
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
  });

  it('/users redirects a non-admin User to /unauthorized', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt');
    renderAt('/users');
    expect(screen.getByRole('heading', { name: 'Unauthorized' })).toBeInTheDocument();
  });

  it('/users redirects an unauthenticated visitor to /login (ProtectedRoute wraps RoleGuard)', () => {
    renderAt('/users');
    expect(screen.getByRole('heading', { name: 'Task Management System' })).toBeInTheDocument();
  });

  it('/reports/user-summary renders UserSummaryReportPage for an admin', () => {
    useAuthStore.getState().login({ id: '1', name: 'Admin', role: 'admin' }, 'jwt');
    renderAt('/reports/user-summary');
    expect(screen.getByRole('heading', { name: 'User Summary Report' })).toBeInTheDocument();
  });

  it('/unauthorized renders UnauthorizedPage directly (public)', () => {
    renderAt('/unauthorized');
    expect(screen.getByRole('heading', { name: 'Unauthorized' })).toBeInTheDocument();
  });

  it('an unknown path renders NotFoundPage', () => {
    renderAt('/this-does-not-exist');
    expect(screen.getByRole('heading', { name: 'Not Found' })).toBeInTheDocument();
  });
});
