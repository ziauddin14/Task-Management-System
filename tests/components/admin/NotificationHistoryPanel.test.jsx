import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationHistoryPanel from '../../../src/components/admin/NotificationHistoryPanel.jsx';

vi.mock('../../../src/services/notifications.api.js', () => ({
  getAdminNotificationHistory: vi.fn(),
}));

import { getAdminNotificationHistory } from '../../../src/services/notifications.api.js';

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationHistoryPanel />
    </QueryClientProvider>
  );
}

function makeBatch(overrides = {}) {
  return {
    batchId: 'b1',
    createdAt: '2026-09-14T09:30:00.000Z',
    createdBy: { id: 'a1', name: 'Admin Person' },
    recipientMode: 'all',
    targetUser: null,
    targetTask: null,
    templateKey: 'GENERAL_REMINDER',
    message: 'براہ کرم اپنے تمام کاموں کی تازہ ترین اپڈیٹ فراہم کریں۔',
    recipientsResolved: 5,
    createdCount: 5,
    failures: [],
    ...overrides,
  };
}

describe('NotificationHistoryPanel', () => {
  beforeEach(() => {
    getAdminNotificationHistory.mockReset();
  });

  it('shows a loading state', () => {
    getAdminNotificationHistory.mockReturnValue(new Promise(() => {}));
    renderPanel();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the empty state when there is no history', async () => {
    getAdminNotificationHistory.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    renderPanel();
    expect(await screen.findByText('ابھی تک کوئی اطلاع نہیں بھیجی گئی۔')).toBeInTheDocument();
  });

  it('shows an error state on failure', async () => {
    getAdminNotificationHistory.mockRejectedValue(new Error('network error'));
    renderPanel();
    expect(await screen.findByText('سرگزشت لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔')).toBeInTheDocument();
  });

  it('renders a broadcast row with "تمام ذمہ داران" as the recipient', async () => {
    getAdminNotificationHistory.mockResolvedValue({ items: [makeBatch()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    renderPanel();

    // "تمام ذمہ داران" renders in BOTH the نوعیت and وصول کنندہ cells for a broadcast row; "5"
    // renders in BOTH the recipientsResolved and createdCount cells (no failures in this fixture).
    expect(await screen.findAllByText('تمام ذمہ داران')).toHaveLength(2);
    expect(screen.getByText('Admin Person')).toBeInTheDocument();
    expect(screen.getAllByText('5')).toHaveLength(2);
  });

  it('renders a specific-user row with the target user\'s name', async () => {
    getAdminNotificationHistory.mockResolvedValue({
      items: [makeBatch({ recipientMode: 'user', targetUser: { id: 'u1', name: 'Ali' }, recipientsResolved: 1, createdCount: 1 })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderPanel();

    expect(await screen.findByText('Ali')).toBeInTheDocument();
  });

  it('renders a task-reminder row with the task title and code number', async () => {
    getAdminNotificationHistory.mockResolvedValue({
      items: [
        makeBatch({
          recipientMode: 'task',
          targetTask: { id: 't1', title: 'Sample task', codeNumber: '260901' },
          recipientsResolved: 2,
          createdCount: 2,
        }),
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderPanel();

    expect(await screen.findByText('Sample task (260901)')).toBeInTheDocument();
  });

  it('shows a non-zero failed count distinctly when createdCount is less than recipientsResolved', async () => {
    getAdminNotificationHistory.mockResolvedValue({
      items: [makeBatch({ recipientsResolved: 5, createdCount: 3 })],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderPanel();

    await screen.findAllByText('تمام ذمہ داران');
    // recipientsResolved(5), createdCount(3), failed(2) all rendered as separate cells.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('paginates via prev/next, fetching the next page on click', async () => {
    getAdminNotificationHistory.mockImplementation(({ page }) =>
      Promise.resolve({
        items: [makeBatch({ batchId: `b${page}`, message: `Message ${page}` })],
        meta: { page, limit: 20, total: 2, totalPages: 2 },
      })
    );
    renderPanel();

    await screen.findByText('Message 1');
    fireEvent.click(screen.getByText('آگے'));

    await waitFor(() => expect(getAdminNotificationHistory).toHaveBeenCalledWith({ page: 2, limit: 20 }));
    expect(await screen.findByText('Message 2')).toBeInTheDocument();
  });
});
