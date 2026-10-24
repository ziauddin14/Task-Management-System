import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import UpdateModal from '../../../src/components/task/UpdateModal.jsx';
import { REOPEN_WARNING } from '../../../src/utils/taskDisplay.js';
import { NOTIFICATION_TYPES, getNotificationIcon } from '../../../src/utils/notificationTypes.js';

vi.mock('../../../src/services/tasks.api.js', () => ({ getTask: vi.fn(), updateTask: vi.fn() }));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  createTaskUpdate: vi.fn().mockResolvedValue({ update: { id: 'u1' }, task: { id: 't1', status: 'pending', completionPercent: 0 } }),
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }),
}));
vi.mock('../../../src/services/uploads.api.js', () => ({ uploadAttachment: vi.fn() }));
vi.mock('../../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { getTask } from '../../../src/services/tasks.api.js';
import { createTaskUpdate } from '../../../src/services/taskUpdates.api.js';

const task = (status, completionPercent) => ({
  id: 't1',
  codeNumber: '261006',
  title: 'گھریلو صدقہ بکس کی پلاننگ',
  deadline: '2026-10-21T00:00:00.000Z',
  status,
  performanceRating: status === 'complete' ? 'excellent' : '-',
  completionPercent,
  timeStatus: status === 'complete' ? { type: 'early', days: 0 } : { type: 'remaining', days: 3 },
});

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UpdateModal isOpen taskId="t1" onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

// Reopening a completed task: any role that can post an update reopens it with a percent below
// 100, and the update form says so while the task is complete — the owner-approved wording.
describe('the update form while a task is complete', () => {
  beforeEach(() => {
    getTask.mockReset();
    createTaskUpdate.mockClear();
  });

  it('the approved wording', () => {
    expect(REOPEN_WARNING).toBe('یہ کام مکمل ہو چکا ہے۔ 100 سے کم فیصد درج کرنے پر یہ دوبارہ کھل جائے گا۔');
  });

  it('a complete task shows the warning, for a user as for an admin', async () => {
    getTask.mockResolvedValue(task('complete', 100));
    const { unmount } = renderModal();
    expect(await screen.findByRole('note')).toHaveTextContent(REOPEN_WARNING);
    unmount();

    renderModal({ isAdmin: true, onCloseTask: vi.fn() });
    expect(await screen.findByRole('note')).toHaveTextContent(REOPEN_WARNING);
  });

  it('an open task shows no warning', async () => {
    getTask.mockResolvedValue(task('pending', 40));
    renderModal();
    await screen.findByText('گھریلو صدقہ بکس کی پلاننگ');
    await waitFor(() => expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(40));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(REOPEN_WARNING)).not.toBeInTheDocument();
  });

  it('the warning never blocks: an update below 100% on a complete task is sent as entered', async () => {
    getTask.mockResolvedValue(task('complete', 100));
    renderModal();
    await screen.findByRole('note');
    await waitFor(() => expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(100));

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'دوبارہ دیکھنا ہے' } });
    fireEvent.change(screen.getByLabelText('تکمیل فیصد'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));

    await waitFor(() => expect(createTaskUpdate).toHaveBeenCalled());
    expect(createTaskUpdate.mock.calls[0][1]).toMatchObject({ description: 'دوبارہ دیکھنا ہے', completionPercent: 0 });
  });
});

describe('the TASK_REOPENED notice', () => {
  it('has its own icon in the bell', () => {
    expect(NOTIFICATION_TYPES.TASK_REOPENED).toBe('TASK_REOPENED');
    expect(getNotificationIcon('TASK_REOPENED')).toBe(RotateCcw);
  });
});
