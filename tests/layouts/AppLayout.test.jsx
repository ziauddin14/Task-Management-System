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
            <Route path="/users" element={<div>Users Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { clearSpy };
}

// docs/08-ui-ux.md §3 item 1 — persistent left sidebar (Sidebar.jsx) + header showing the user's
// name + responsibility directly (not hidden in a dropdown); Logout lives at the bottom of the
// sidebar now.
describe('AppLayout (docs/08-ui-ux.md §3, docs/11-auth.md §5)', () => {
  beforeEach(() => {
    resetStore();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    delete window.google;
  });

  it("renders the authenticated user's name directly in the header, not inside a button/dropdown", () => {
    useAuthStore.getState().login({ id: '1', name: 'Om Prakash', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByText('Om Prakash')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Om Prakash/i })).not.toBeInTheDocument();
  });

  it('shows the responsibility in brackets right next to the name when present', () => {
    useAuthStore.getState().login({ id: '1', name: 'Zia Uddin', role: 'user', responsibility: 'AI Automation Engineer' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByText('Zia Uddin (AI Automation Engineer)')).toBeInTheDocument();
  });

  it('omits the brackets entirely when the user has no responsibility set', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om Prakash', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByText('Om Prakash')).toBeInTheDocument();
    expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
  });

  it('renders the page content passed through the Outlet', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('logout (in the sidebar) runs all four documented steps, in the documented order', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');
    const disableAutoSelect = vi.fn();
    window.google = { accounts: { id: { disableAutoSelect } } };
    const { clearSpy } = renderLayout();

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

    expect(() => fireEvent.click(screen.getByText('لاگ آؤٹ'))).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('the sidebar always shows the Dashboard link, for every role', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByRole('link', { name: /ڈیش بورڈ/i, hidden: true })).toHaveAttribute('href', '/');
  });

  it('admin role: both Admin-only sidebar links are rendered', () => {
    useAuthStore.getState().login({ id: '2', name: 'Admin', role: 'admin' }, 'jwt-admin');
    renderLayout();

    expect(screen.getByRole('link', { name: /تمام یوزرز/i, hidden: true })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: /یوزر سمری رپورٹ/i, hidden: true })).toHaveAttribute('href', '/reports/user-summary');
  });

  it('user role: Admin-only sidebar links are NOT rendered', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.queryByRole('link', { name: /تمام یوزرز/i, hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /یوزر سمری رپورٹ/i, hidden: true })).not.toBeInTheDocument();
  });

  it('mobile: the sidebar starts closed (aria-hidden) and the hamburger button opens it (shows the backdrop)', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByLabelText('Band karein')).not.toBeInTheDocument(); // no backdrop yet

    fireEvent.click(screen.getByLabelText('Menu kholein'));

    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'false');
  });

  it('mobile: clicking the backdrop closes the sidebar again', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderLayout();

    fireEvent.click(screen.getByLabelText('Menu kholein'));
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(screen.getByLabelText('Band karein'));
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });

  it('clicking a sidebar link closes the mobile drawer', () => {
    useAuthStore.getState().login({ id: '2', name: 'Admin', role: 'admin' }, 'jwt-admin');
    renderLayout();

    fireEvent.click(screen.getByLabelText('Menu kholein'));
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'false');

    fireEvent.click(screen.getByRole('link', { name: /تمام یوزرز/i, hidden: true }));
    expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('aria-hidden', 'true');
  });
});
