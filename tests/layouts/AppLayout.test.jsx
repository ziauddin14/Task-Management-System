import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '../../src/layouts/AppLayout.jsx';
import { useAuthStore } from '../../src/store/authStore.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function renderLayout() {
  const queryClient = new QueryClient();
  const clearSpy = vi.spyOn(queryClient, 'clear');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { clearSpy };
}

describe('AppLayout (docs/07-frontend-foundation.md §2, docs/11-auth.md §5)', () => {
  beforeEach(() => {
    resetStore();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    delete window.google;
  });

  it("renders the authenticated user's name and role from authStore", () => {
    useAuthStore.getState().login({ id: '1', name: 'Om Prakash', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByRole('button', { name: /Om Prakash/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Om Prakash/i }));
    
    // Once open, the dropdown shows 'User' (capitalized)
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('renders the page content passed through the Outlet', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('logout runs all four documented steps, in the documented order', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');
    const disableAutoSelect = vi.fn();
    window.google = { accounts: { id: { disableAutoSelect } } };
    const { clearSpy } = renderLayout();

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Om/i }));
    fireEvent.click(screen.getByText('لاگ آؤٹ'));

    // Step 1: authStore (and its persisted localStorage entry) cleared.
    expect(logoutSpy).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ user: null, token: null, isAuthenticated: false });
    expect(JSON.parse(localStorage.getItem('auth-storage')).state).toMatchObject({
      token: null,
      user: null,
      isAuthenticated: false,
    });
    // Step 2: queryClient.clear() called.
    expect(clearSpy).toHaveBeenCalled();
    // Step 3: disableAutoSelect() called (guarded elsewhere — see the next test).
    expect(disableAutoSelect).toHaveBeenCalled();
    // Step 4: redirected to /login.
    expect(mockNavigate).toHaveBeenCalledWith('/login');

    // Order: strictly increasing invocation order across the four spies.
    const order = [logoutSpy, clearSpy, disableAutoSelect, mockNavigate].map(
      (fn) => fn.mock.invocationCallOrder[0]
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('logout does not throw when window.google is unavailable (guarded call)', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /Om/i }));
    expect(() => fireEvent.click(screen.getByText('لاگ آؤٹ'))).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it("renders the user's responsibility alongside name and role when present", () => {
    useAuthStore.getState().login(
      { id: '1', name: 'Om Prakash', role: 'user', responsibility: 'IT' },
      'jwt-abc'
    );
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /Om Prakash/i }));
    expect(screen.getByText('IT (User)')).toBeInTheDocument();
  });

  it('admin role: both nav links are rendered in the header', () => {
    useAuthStore.getState().login({ id: '2', name: 'Admin', role: 'admin' }, 'jwt-admin');
    renderLayout();

    expect(screen.getAllByRole('link', { name: /تمام یوزرز/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /یوزر سمری رپورٹ/i }).length).toBeGreaterThan(0);
  });

  it('user role: admin nav links are NOT rendered', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.queryByRole('link', { name: /تمام یوزرز/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /یوزر سمری رپورٹ/i })).not.toBeInTheDocument();
  });
});
