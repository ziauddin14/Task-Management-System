import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PreviousUpdatesContent from '../../../src/components/task/PreviousUpdatesContent.jsx';
import PreviousUpdatesModal from '../../../src/components/task/PreviousUpdatesModal.jsx';

vi.mock('../../../src/services/tasks.api.js', () => ({
  getTask: vi.fn().mockResolvedValue({
    id: 't1',
    codeNumber: '260801',
    title: 'Sample task',
    deadline: '2026-09-01T00:00:00.000Z',
    status: 'ongoing',
    performanceRating: '-',
    timeStatus: { type: 'remaining', days: 5 },
  }),
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({ getTaskUpdates: vi.fn(), createTaskUpdate: vi.fn() }));
import { getTaskUpdates } from '../../../src/services/taskUpdates.api.js';

function page1() {
  return {
    items: [
      {
        id: 'up2',
        description: 'Second update',
        completionPercent: 60,
        attachment: { driveFileId: 'd1', fileName: 'proof.pdf', url: 'https://drive/d1' },
        updatedBy: { name: 'Ali', role: 'user' },
        createdAt: '2026-08-20T10:00:00.000Z',
      },
      {
        id: 'up1',
        description: 'First update',
        completionPercent: 30,
        attachment: null,
        updatedBy: { name: 'Admin User', role: 'admin' },
        createdAt: '2026-08-19T10:00:00.000Z',
      },
    ],
    meta: { page: 1, limit: 10, total: 12, totalPages: 2 },
  };
}

function page2() {
  return {
    items: [
      {
        id: 'up0',
        description: 'Oldest update',
        completionPercent: 10,
        attachment: null,
        updatedBy: { name: 'Ali', role: 'user' },
        createdAt: '2026-08-18T10:00:00.000Z',
      },
    ],
    meta: { page: 2, limit: 10, total: 12, totalPages: 2 },
  };
}

function renderContent(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PreviousUpdatesContent (docs/08-ui-ux.md §7, docs/09-frontend-features.md §4)', () => {
  beforeEach(() => getTaskUpdates.mockReset());

  it('shows the EmptyState when there are no updates yet', async () => {
    getTaskUpdates.mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1, total: 0 } });
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    expect(await screen.findByText('ابھی تک کوئی اپڈیٹ نہیں دی گئی۔')).toBeInTheDocument();
  });

  it('renders newest-first history, read-only (no edit/delete controls anywhere)', async () => {
    getTaskUpdates.mockResolvedValue(page1());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    const firstEntry = await screen.findByText('Second update');
    expect(firstEntry).toBeInTheDocument();
    expect(screen.getByText('First update')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    // Attachment renders as a clickable chip/button, never a raw pasted URL.
    const attachmentLink = screen.getByText('proof.pdf');
    expect(attachmentLink.closest('a')).toHaveAttribute('href', 'https://drive/d1');
  });

  it('"Purani updates aur dekhein" loads and APPENDS the next page rather than replacing it', async () => {
    getTaskUpdates.mockResolvedValueOnce(page1()).mockResolvedValueOnce(page2());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    await screen.findByText('Second update');
    expect(screen.queryByText('Oldest update')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('مزید پرانی اپڈیٹس دیکھیں'));

    await waitFor(() => expect(screen.getByText('Oldest update')).toBeInTheDocument());
    // The first page's entries are still there — appended, not replaced.
    expect(screen.getByText('Second update')).toBeInTheDocument();
    expect(screen.getByText('First update')).toBeInTheDocument();
    expect(getTaskUpdates).toHaveBeenCalledTimes(2);
  });

  it('does not show "load more" once every page has been fetched', async () => {
    getTaskUpdates.mockResolvedValue({ ...page1(), meta: { page: 1, totalPages: 1, total: 2 } });
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    await screen.findByText('Second update');
    expect(screen.queryByText('مزید پرانی اپڈیٹس دیکھیں')).not.toBeInTheDocument();
  });

  it('is shared between its own modal and (implicitly) the Update Modal inline expansion — only fetches once mounted', async () => {
    getTaskUpdates.mockResolvedValue(page1());
    renderContent(<PreviousUpdatesModal isOpen taskId="t1" onClose={vi.fn()} />);

    expect(await screen.findByText('Second update')).toBeInTheDocument();
    expect(getTaskUpdates).toHaveBeenCalledWith('t1', { page: 1, limit: 10 });
  });

  it('is not fetched at all when the modal is closed', () => {
    renderContent(<PreviousUpdatesModal isOpen={false} taskId="t1" onClose={vi.fn()} />);
    expect(getTaskUpdates).not.toHaveBeenCalled();
  });
});
