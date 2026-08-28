import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    completionPercent: 40,
    performanceRating: '-',
    timeStatus: { type: 'remaining', days: 5 },
  }),
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({ getTaskUpdates: vi.fn(), createTaskUpdate: vi.fn() }));
import { getTaskUpdates } from '../../../src/services/taskUpdates.api.js';

// Prompt 5A — the more recent entry (4:30 PM) sorted ahead of the earlier same-day one (1:00 PM),
// which in turn sorts ahead of an entry from the day before — exactly the ordering the backend
// already guarantees (taskUpdate.service.js sorts createdAt:-1), reflected here in mock order.
function page1() {
  return {
    items: [
      {
        id: 'up2',
        description: 'Second update',
        completionPercent: 60,
        attachment: { driveFileId: 'd1', fileName: 'proof.pdf', url: 'https://drive/d1' },
        updatedBy: { name: 'Ali', role: 'user', responsibility: 'IT' },
        createdAt: '2026-08-28T16:30:00.000Z',
      },
      {
        id: 'up1',
        description: 'First update',
        completionPercent: 30,
        attachment: null,
        updatedBy: { name: 'Admin User', role: 'admin', responsibility: 'Management' },
        createdAt: '2026-08-28T13:00:00.000Z',
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
        updatedBy: { name: 'Ali', role: 'user', responsibility: 'IT' },
        createdAt: '2026-08-27T10:00:00.000Z',
      },
    ],
    meta: { page: 2, limit: 10, total: 12, totalPages: 2 },
  };
}

function renderContent(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function updatesTable() {
  // The second <table> on the page — the first is always the 5-column summary table.
  return screen.getAllByRole('table')[1];
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

  // Prompt 5A.3 — strictly date+time descending: the 4:30 PM entry (up2) must render as the FIRST
  // data row, ahead of the same-day 1:00 PM entry (up1), which in turn is ahead of the previous
  // day's entry (up0, loaded via "load more"). The component does no client-side re-sort — this
  // confirms the backend's own order is what actually reaches the DOM, row for row.
  it('renders update rows in strict date+time-descending order', async () => {
    getTaskUpdates.mockResolvedValueOnce(page1()).mockResolvedValueOnce(page2());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    await screen.findByText('Second update');
    fireEvent.click(screen.getByText('مزید پرانی اپڈیٹس دیکھیں'));
    await waitFor(() => expect(screen.getByText('Oldest update')).toBeInTheDocument());

    const bodyRows = within(updatesTable()).getAllByRole('row').slice(1); // drop the header row
    const descriptions = bodyRows.map((row) => within(row).getByText(/update$/).textContent);
    expect(descriptions).toEqual(['Second update', 'First update', 'Oldest update']);
  });

  it('"mazeed purani updates" loads and APPENDS the next page rather than replacing it', async () => {
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

  // Prompt 5A.2 — 5-column summary table: کام کوڈ, کام, آخری تاریخ, باقی دن, تکمیل فیصد.
  it('renders the 5-column summary table with Code Number, title, Deadline, days-remaining, and Completion %', async () => {
    getTaskUpdates.mockResolvedValue(page1());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    await screen.findByText('Second update');
    const summaryTable = screen.getAllByRole('table')[0];
    const headers = within(summaryTable).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['کام کوڈ', 'کام', 'آخری تاریخ', 'باقی دن', 'تکمیل فیصد']);

    expect(within(summaryTable).getByText('260801')).toBeInTheDocument();
    expect(within(summaryTable).getByText('Sample task')).toBeInTheDocument();
    expect(within(summaryTable).getByText('01 Sep 2026')).toBeInTheDocument();
    expect(within(summaryTable).getByText('5 دن باقی')).toBeInTheDocument();
    expect(within(summaryTable).getByText('40%')).toBeInTheDocument();
  });

  // Prompt 5A.3 — each update row: تاریخ, وقت, اپڈیٹ کرنے والے کا نام اور کردار, ذمہ داری,
  // وضاحت, تکمیل فیصد, اٹیچمنٹ, in that column order.
  it('renders the updates table with the required columns, in the required order', async () => {
    getTaskUpdates.mockResolvedValue(page1());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    await screen.findByText('Second update');
    const headers = within(updatesTable()).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual(['تاریخ', 'وقت', 'اپڈیٹ کرنے والا', 'ذمہ داری', 'وضاحت', 'تکمیل فیصد', 'اٹیچمنٹ']);

    const row = within(updatesTable()).getByText('Second update').closest('tr');
    // Local-time display, mirroring how formatDate/formatTime already render everywhere else in
    // this app — 2026-08-28T16:30:00.000Z is 21:30 in this test environment's timezone.
    expect(within(row).getByText('28 Aug 2026')).toBeInTheDocument();
    expect(within(row).getByText('21:30')).toBeInTheDocument();
    expect(within(row).getByText('Ali (User)')).toBeInTheDocument();
    expect(within(row).getByText('IT')).toBeInTheDocument();
    expect(within(row).getByText('60%')).toBeInTheDocument();
  });

  it('labels an admin-authored update with "(Admin)"', async () => {
    getTaskUpdates.mockResolvedValue(page1());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    const row = (await screen.findByText('First update')).closest('tr');
    expect(within(row).getByText('Admin User (Admin)')).toBeInTheDocument();
    expect(within(row).getByText('Management')).toBeInTheDocument();
  });

  it('shows an explicit "no attachment" value when an update has none', async () => {
    getTaskUpdates.mockResolvedValue(page1());
    renderContent(<PreviousUpdatesContent taskId="t1" />);

    await screen.findByText('First update');
    expect(screen.getByText('کوئی اٹیچمنٹ نہیں')).toBeInTheDocument();
  });
});
