import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import UpdateModal from '../../../src/components/task/UpdateModal.jsx';
import { REOPEN_ADMIN_ONLY_NOTE, REOPEN_WARNING } from '../../../src/utils/taskDisplay.js';
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

// Reopening a completed task: only an admin may (an update below 100%). The update form says so
// while the task is complete — the admin's warning, or for anyone else the approved note with the
// percent fixed at 100 (they may still post 100%). The backend refuses below 100% anyway.
const slider = () => screen.getByLabelText('Completion % slider');
const percent = () => screen.getByLabelText('تکمیل فیصد');

describe('the update form while a task is complete', () => {
  beforeEach(() => {
    getTask.mockReset();
    createTaskUpdate.mockClear();
  });

  it('the approved wording', () => {
    expect(REOPEN_WARNING).toBe('یہ کام مکمل ہو چکا ہے۔ 100 سے کم فیصد درج کرنے پر یہ دوبارہ کھل جائے گا۔');
    expect(REOPEN_ADMIN_ONLY_NOTE).toBe('مکمل کام میں 100 سے کم فیصد صرف ایڈمن درج کر سکتا ہے۔');
  });

  it('admin: the warning, and the percent stays free', async () => {
    getTask.mockResolvedValue(task('complete', 100));
    renderModal({ isAdmin: true, onCloseTask: vi.fn() });

    expect(await screen.findByRole('note')).toHaveTextContent(REOPEN_WARNING);
    expect(slider()).not.toBeDisabled();
    expect(percent()).not.toHaveAttribute('readonly');
  });

  it('admin: an update below 100% on a complete task is sent as entered', async () => {
    getTask.mockResolvedValue(task('complete', 100));
    renderModal({ isAdmin: true, onCloseTask: vi.fn() });
    await screen.findByRole('note');
    await waitFor(() => expect(percent()).toHaveValue(100));

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'دوبارہ دیکھنا ہے' } });
    fireEvent.change(percent(), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));

    await waitFor(() => expect(createTaskUpdate).toHaveBeenCalled());
    expect(createTaskUpdate.mock.calls[0][1]).toMatchObject({ description: 'دوبارہ دیکھنا ہے', completionPercent: 0 });
  });

  it('non-admin: the approved note instead of the warning, and the percent fixed at 100', async () => {
    getTask.mockResolvedValue(task('complete', 100));
    renderModal();

    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent(REOPEN_ADMIN_ONLY_NOTE);
    expect(note).not.toHaveTextContent(REOPEN_WARNING);
    await waitFor(() => expect(percent()).toHaveValue(100));
    expect(percent()).toHaveAttribute('readonly');
    expect(slider()).toBeDisabled();
  });

  it('non-admin: a task left complete below 100% still starts at 100', async () => {
    getTask.mockResolvedValue(task('complete', 0));
    renderModal();
    await screen.findByRole('note');

    await waitFor(() => expect(percent()).toHaveValue(100));
  });

  it('non-admin: the update is sent at 100%', async () => {
    getTask.mockResolvedValue(task('complete', 100));
    renderModal();
    await screen.findByRole('note');
    await waitFor(() => expect(percent()).toHaveValue(100));

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'تصویر شامل کر دی' } });
    // A browser does not let anyone type into the read-only field; even a forced change is not sent.
    fireEvent.change(percent(), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));

    await waitFor(() => expect(createTaskUpdate).toHaveBeenCalled());
    expect(createTaskUpdate.mock.calls[0][1]).toMatchObject({ description: 'تصویر شامل کر دی', completionPercent: 100 });
  });

  it('an open task: no note, and the percent is free for everyone', async () => {
    getTask.mockResolvedValue(task('pending', 40));
    renderModal();
    await screen.findByText('گھریلو صدقہ بکس کی پلاننگ');
    await waitFor(() => expect(percent()).toHaveValue(40));

    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(slider()).not.toBeDisabled();
    expect(percent()).not.toHaveAttribute('readonly');
  });
});

describe('the TASK_REOPENED notice', () => {
  it('has its own icon in the bell', () => {
    expect(NOTIFICATION_TYPES.TASK_REOPENED).toBe('TASK_REOPENED');
    expect(getNotificationIcon('TASK_REOPENED')).toBe(RotateCcw);
  });
});
