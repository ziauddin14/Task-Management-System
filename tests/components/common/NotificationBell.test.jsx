import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationBell from '../../../src/components/common/NotificationBell.jsx';

vi.mock('../../../src/services/notifications.api.js', () => ({
  getUnreadNotificationCount: vi.fn(),
  getNotifications: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { getUnreadNotificationCount } from '../../../src/services/notifications.api.js';

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    getUnreadNotificationCount.mockReset();
  });

  it('renders the bell with no badge when the unread count is 0', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 0 });
    renderBell();

    await waitFor(() => expect(getUnreadNotificationCount).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'اطلاعات' })).toBeInTheDocument();
  });

  it('renders the exact unread count in the badge when between 1 and 9', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 4 });
    renderBell();

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اطلاعات، 4 نہ پڑھی گئی' })).toBeInTheDocument();
  });

  it('caps the visible badge at "9+" once the count exceeds 9', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 23 });
    renderBell();

    expect(await screen.findByText('9+')).toBeInTheDocument();
    expect(screen.queryByText('23')).not.toBeInTheDocument();
  });

  it('opens the notification drawer when clicked', async () => {
    getUnreadNotificationCount.mockResolvedValue({ count: 0 });
    renderBell();
    await waitFor(() => expect(getUnreadNotificationCount).toHaveBeenCalled());

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'اطلاعات' }));

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'false');
  });

  it('does not crash and shows no badge when the unread-count request fails', async () => {
    getUnreadNotificationCount.mockRejectedValue(new Error('network error'));
    renderBell();

    await waitFor(() => expect(getUnreadNotificationCount).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'اطلاعات' })).toBeInTheDocument();
  });
});
