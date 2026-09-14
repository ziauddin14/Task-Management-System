import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationDrawer from '../../../src/components/common/NotificationDrawer.jsx';

vi.mock('../../../src/services/notifications.api.js', () => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../../src/services/notifications.api.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeNotification(overrides = {}) {
  return {
    id: 'n1',
    type: 'TASK_OVERDUE',
    title: 'کام میں تاخیر ہو چکی ہے',
    message: 'براہ کرم فوری طور پر اس کی صورتحال اپڈیٹ کریں۔',
    taskId: null,
    isRead: false,
    createdAt: '2026-09-14T09:30:00.000Z',
    metadata: {},
    ...overrides,
  };
}

function renderDrawer(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationDrawer isOpen onClose={vi.fn()} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('NotificationDrawer', () => {
  beforeEach(() => {
    getNotifications.mockReset();
    markNotificationRead.mockReset();
    markAllNotificationsRead.mockReset();
    mockNavigate.mockReset();
  });

  it('shows a loading state while the first page is in flight', () => {
    getNotifications.mockReturnValue(new Promise(() => {})); // never resolves
    renderDrawer();

    expect(screen.getByRole('status')).toBeInTheDocument(); // Spinner
  });

  it('shows the empty state when there are no notifications', async () => {
    getNotifications.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    renderDrawer();

    expect(await screen.findByText('کوئی اطلاع موجود نہیں۔')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    getNotifications.mockRejectedValue(new Error('network error'));
    renderDrawer();

    expect(await screen.findByText('اطلاعات لوڈ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔')).toBeInTheDocument();
  });

  it('renders the fetched notifications', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification()],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderDrawer();

    expect(await screen.findByText('کام میں تاخیر ہو چکی ہے')).toBeInTheDocument();
  });

  it('only fetches when the drawer is open', () => {
    getNotifications.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    renderDrawer({ isOpen: false });

    expect(getNotifications).not.toHaveBeenCalled();
  });

  it('shows "Mark All as Read" only when there is at least one unread notification', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification({ isRead: true, readAt: '2026-09-14T10:00:00.000Z' })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderDrawer();

    await screen.findByText('کام میں تاخیر ہو چکی ہے');
    expect(screen.queryByText('سب کو پڑھا ہوا نشان زد کریں')).not.toBeInTheDocument();
  });

  it('clicking "Mark All as Read" calls the mutation', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification()],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    markAllNotificationsRead.mockResolvedValue({ updatedCount: 1 });
    renderDrawer();

    fireEvent.click(await screen.findByText('سب کو پڑھا ہوا نشان زد کریں'));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
  });

  it('clicking an unread notification marks it read and closes the drawer', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification()],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    markNotificationRead.mockResolvedValue(makeNotification({ isRead: true }));
    const onClose = vi.fn();
    renderDrawer({ onClose });

    fireEvent.click(await screen.findByText('کام میں تاخیر ہو چکی ہے'));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('n1'));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking an already-read notification does not re-call markRead', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification({ isRead: true, readAt: '2026-09-14T10:00:00.000Z' })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderDrawer();

    fireEvent.click(await screen.findByText('کام میں تاخیر ہو چکی ہے'));

    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  it('does not navigate when the notification has no task-linked metadata (Phase 1 — no invented navigation)', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification({ taskId: 'task1', metadata: {} })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    markNotificationRead.mockResolvedValue({});
    renderDrawer();

    fireEvent.click(await screen.findByText('کام میں تاخیر ہو چکی ہے'));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows "مزید دیکھیں" when there are more pages, and loads the next page on click', async () => {
    getNotifications.mockImplementation(({ page }) =>
      Promise.resolve({
        items: [makeNotification({ id: `n${page}`, title: `Item ${page}` })],
        meta: { page, limit: 20, total: 2, totalPages: 2 },
      })
    );
    renderDrawer();

    await screen.findByText('Item 1');
    fireEvent.click(screen.getByText('مزید دیکھیں'));

    expect(await screen.findByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument(); // accumulated, not replaced
  });

  it('resets to page 1 with a fresh list each time the drawer re-opens', async () => {
    getNotifications.mockResolvedValue({
      items: [makeNotification()],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const { rerender } = renderDrawer({ isOpen: false });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotificationDrawer isOpen onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(getNotifications).toHaveBeenCalledWith({ page: 1, limit: 20 }));
  });

  it('closes when the header X close button is clicked', () => {
    getNotifications.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    const onClose = vi.fn();
    renderDrawer({ onClose });

    // Both the header's X button and the backdrop share this accessible name (both mean "close
    // the notifications panel") — the X button is first in DOM order.
    const [closeButton] = screen.getAllByLabelText('اطلاعات بند کریں');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', () => {
    getNotifications.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    const onClose = vi.fn();
    renderDrawer({ onClose });

    const backdropButtons = screen.getAllByLabelText('اطلاعات بند کریں');
    fireEvent.click(backdropButtons[backdropButtons.length - 1]);

    expect(onClose).toHaveBeenCalled();
  });
});
