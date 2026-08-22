import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../../src/routes/AppRoutes.jsx';
import { useAuthStore } from '../../src/store/authStore.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('AppRoutes (docs/07-frontend-foundation.md §5)', () => {
  beforeEach(() => resetStore());

  it('/login renders LoginPage when unauthenticated', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('/login redirects to / when already authenticated', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt');
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('/ redirects to /login when unauthenticated', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
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
