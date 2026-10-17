import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '../../src/layouts/AppLayout.jsx';
import { useAuthStore } from '../../src/store/authStore.js';
import { setViewportWidth, resetViewport } from '../helpers/viewport.js';

// The activity log's two touches on the app shell: the Admin-only navigation entry (sidebar and
// "مزید" sheet), and the fire-and-forget logout notice from both logout buttons.
vi.mock('../../src/services/notifications.api.js', () => ({
  getUnreadNotificationCount: vi.fn().mockResolvedValue({ count: 0 }),
  getNotifications: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock('../../src/services/auth.api.js', () => ({ notifyLogout: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { notifyLogout } from '../../src/services/auth.api.js';

function renderLayout(role) {
  useAuthStore.getState().login({ id: 'u1', name: 'Zia', responsibility: 'IT', role }, `jwt-${role}`);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppLayout — activity log', () => {
  beforeEach(() => {
    notifyLogout.mockReset();
    mockNavigate.mockReset();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });
  afterEach(() => resetViewport());

  describe('desktop', () => {
    it('an Admin gets the "ایکٹیویٹی لاگ" sidebar link; a normal user does not', () => {
      const { unmount } = renderLayout('admin');
      expect(screen.getByRole('link', { name: 'ایکٹیویٹی لاگ', hidden: true })).toHaveAttribute('href', '/activity');
      unmount();

      renderLayout('user');
      expect(screen.queryByRole('link', { name: 'ایکٹیویٹی لاگ', hidden: true })).not.toBeInTheDocument();
    });

    it('logout sends the notice with the session token first, then logs out as always', () => {
      let tokenInStoreAtCall;
      notifyLogout.mockImplementation(() => {
        tokenInStoreAtCall = useAuthStore.getState().token;
      });
      renderLayout('user');

      fireEvent.click(screen.getByRole('button', { name: 'لاگ آؤٹ', hidden: true }));

      expect(notifyLogout).toHaveBeenCalledTimes(1);
      expect(notifyLogout).toHaveBeenCalledWith('jwt-user');
      expect(tokenInStoreAtCall).toBe('jwt-user'); // sent before the store was cleared
      expect(useAuthStore.getState()).toMatchObject({ token: null, isAuthenticated: false });
      expect(mockNavigate).toHaveBeenCalledWith('/login');
      expect(notifyLogout.mock.invocationCallOrder[0]).toBeLessThan(mockNavigate.mock.invocationCallOrder[0]);
    });
  });

  describe('mobile', () => {
    beforeEach(() => setViewportWidth(390));
    const openMore = () => fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'مینو' }));
    const moreSheet = () => screen.getByRole('dialog', { name: 'مزید' });

    it('an Admin gets the "ایکٹیویٹی لاگ" row in the "مزید" sheet; a normal user does not', () => {
      const { unmount } = renderLayout('admin');
      openMore();
      expect(within(moreSheet()).getByRole('link', { name: 'ایکٹیویٹی لاگ' })).toHaveAttribute('href', '/activity');
      unmount();

      renderLayout('user');
      openMore();
      expect(within(moreSheet()).queryByRole('link', { name: 'ایکٹیویٹی لاگ' })).not.toBeInTheDocument();
    });

    it('logout from the sheet sends the same notice, then logs out as always', () => {
      renderLayout('admin');
      openMore();
      fireEvent.click(within(moreSheet()).getByRole('button', { name: 'لاگ آؤٹ' }));

      expect(notifyLogout).toHaveBeenCalledWith('jwt-admin');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
