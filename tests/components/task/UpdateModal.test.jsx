import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UpdateModal from '../../../src/components/task/UpdateModal.jsx';

vi.mock('../../../src/services/tasks.api.js', () => ({
  getTask: vi.fn().mockResolvedValue({
    id: 't1',
    codeNumber: '260801',
    title: 'Sample task',
    deadline: '2026-09-01T00:00:00.000Z',
    status: 'ongoing',
    performanceRating: '-',
    completionPercent: 40,
    timeStatus: { type: 'remaining', days: 5 },
  }),
  updateTask: vi.fn().mockResolvedValue({ id: 't1', status: 'ongoing' }),
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  createTaskUpdate: vi.fn().mockResolvedValue({
    update: { id: 'u1' },
    task: { id: 't1', title: 'Sample task', completionPercent: 70, status: 'ongoing' },
  }),
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }),
}));
vi.mock('../../../src/services/uploads.api.js', () => ({ uploadAttachment: vi.fn() }));
vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({
    items: [
      { id: 'u1', name: 'Ali', responsibility: 'IT', isActive: true },
      { id: 'u2', name: 'Bilal', responsibility: 'Media', isActive: true },
    ],
    meta: {},
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createTaskUpdate } from '../../../src/services/taskUpdates.api.js';
import { getTaskUpdates } from '../../../src/services/taskUpdates.api.js';
import { getTask, updateTask } from '../../../src/services/tasks.api.js';
import { getUsers } from '../../../src/services/users.api.js';
import toast from 'react-hot-toast';

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UpdateModal isOpen taskId="t1" onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('UpdateModal (docs/08-ui-ux.md §7, docs/09-frontend-features.md §3)', () => {
  beforeEach(() => {
    createTaskUpdate.mockClear();
    getTaskUpdates.mockClear();
    updateTask.mockClear();
    getUsers.mockClear();
    toast.success.mockClear();
  });

  it('pre-fills completion % from the task and shows the read-only header', async () => {
    renderModal();
    expect(await screen.findByText('Sample task')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(40));
  });

  it('rejects a description under 3 characters', async () => {
    renderModal();
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByText('محفوظ کریں'));

    expect(await screen.findByText('تفصیل کم از کم 3 حروف کی ہونی چاہیے')).toBeInTheDocument();
    expect(createTaskUpdate).not.toHaveBeenCalled();
  });

  it('the % slider and number input stay in sync', async () => {
    renderModal();
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('Completion % slider'), { target: { value: '75' } });
    expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(75);
  });

  it('a valid submission (no attachment) calls createTaskUpdate, toasts, and closes', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'Made real progress today' } });
    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() =>
      expect(createTaskUpdate).toHaveBeenCalledWith('t1', { description: 'Made real progress today', completionPercent: 40 })
    );
    expect(toast.success).toHaveBeenCalledWith('اپڈیٹ محفوظ ہو گئی');
    expect(onClose).toHaveBeenCalled();
  });

  it('lazily fetches Previous Updates only after "Purani Updates dekhein" is clicked', async () => {
    renderModal();
    await screen.findByText('Sample task');

    expect(getTaskUpdates).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('پرانی اپڈیٹس دیکھیں'));

    await waitFor(() => expect(getTaskUpdates).toHaveBeenCalled());
    expect(screen.getByText('پرانی اپڈیٹس چھپائیں')).toBeInTheDocument();
  });

  // Prompt — Close Task moved here from the table row, as a third footer button next to
  // Save/Cancel; same Admin-only / not-already-closed visibility rule as before.
  describe('Close Task footer button', () => {
    it('is not shown for a non-Admin user', async () => {
      renderModal({ isAdmin: false });
      await screen.findByText('Sample task');
      expect(screen.queryByText('کام بند کریں')).not.toBeInTheDocument();
    });

    it('Admin + not-already-closed task: shows the button and calls onCloseTask on click', async () => {
      const onCloseTask = vi.fn();
      renderModal({ isAdmin: true, onCloseTask });
      await screen.findByText('Sample task');

      const closeButton = screen.getByText('کام بند کریں');
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(onCloseTask).toHaveBeenCalled();
    });

    it('Admin + already-closed task: the button is hidden entirely (not just disabled)', async () => {
      getTask.mockResolvedValueOnce({
        id: 't1',
        codeNumber: '260801',
        title: 'Sample task',
        deadline: '2026-09-01T00:00:00.000Z',
        status: 'closed',
        performanceRating: '-',
        completionPercent: 100,
        timeStatus: { type: 'early', days: 1 },
      });
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      expect(screen.queryByText('کام بند کریں')).not.toBeInTheDocument();
    });
  });

  // Prompt — reassign mid-task without losing update history; same Admin-only/not-closed
  // visibility rule as Close Task, and "نہیں" reuses onCloseTask directly (no duplicated flow).
  describe('Change Assignee footer button', () => {
    it('is not shown for a non-Admin user', async () => {
      renderModal({ isAdmin: false });
      await screen.findByText('Sample task');
      expect(screen.queryByText('ذمہ دار تبدیل کریں')).not.toBeInTheDocument();
    });

    it('Admin + already-closed task: the button is hidden entirely', async () => {
      getTask.mockResolvedValueOnce({
        id: 't1',
        codeNumber: '260801',
        title: 'Sample task',
        deadline: '2026-09-01T00:00:00.000Z',
        status: 'closed',
        performanceRating: '-',
        completionPercent: 100,
        timeStatus: { type: 'early', days: 1 },
      });
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      expect(screen.queryByText('ذمہ دار تبدیل کریں')).not.toBeInTheDocument();
    });

    it('opens the inline confirmation question first, before any dropdown is shown', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));

      expect(screen.getByText('کیا آپ یہ کام کسی دوسرے ذمہ دار کو دینا چاہتے ہیں؟')).toBeInTheDocument();
      expect(screen.queryByLabelText('نیا ذمہ دار منتخب کریں')).not.toBeInTheDocument();
      expect(getUsers).not.toHaveBeenCalled();
    });

    it('"نہیں" calls onCloseTask directly — the exact same trigger as the standalone Close Task button', async () => {
      const onCloseTask = vi.fn();
      renderModal({ isAdmin: true, onCloseTask });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('نہیں'));

      expect(onCloseTask).toHaveBeenCalled();
      expect(updateTask).not.toHaveBeenCalled();
    });

    it('"ہاں" reveals a dropdown sourced from the same assignable-users data as the Naya Kaam form', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));

      const select = await screen.findByLabelText('نیا ذمہ دار منتخب کریں');
      expect(getUsers).toHaveBeenCalledWith({ role: 'user', isActive: true });
      expect(screen.getByText('Ali')).toBeInTheDocument();
      expect(screen.getByText('Bilal')).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });

    it('selecting a person and saving replaces assignees, leaves status untouched, toasts, and closes — without posting a TaskUpdate', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));
      const select = await screen.findByLabelText('نیا ذمہ دار منتخب کریں');
      fireEvent.change(select, { target: { value: 'u2' } });
      fireEvent.click(screen.getByText('محفوظ کریں'));

      await waitFor(() => expect(updateTask).toHaveBeenCalledWith('t1', { assignees: ['u2'] }));
      expect(createTaskUpdate).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('ذمہ دار تبدیل کر دیا گیا');
      expect(onClose).toHaveBeenCalled();
    });

    it('Save stays disabled until a person is actually selected', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));
      await screen.findByLabelText('نیا ذمہ دار منتخب کریں');

      expect(screen.getByText('محفوظ کریں')).toBeDisabled();
    });
  });
});
