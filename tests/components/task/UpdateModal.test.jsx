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
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  createTaskUpdate: vi.fn().mockResolvedValue({
    update: { id: 'u1' },
    task: { id: 't1', title: 'Sample task', completionPercent: 70, status: 'ongoing' },
  }),
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }),
}));
vi.mock('../../../src/services/uploads.api.js', () => ({ uploadAttachment: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createTaskUpdate } from '../../../src/services/taskUpdates.api.js';
import { getTaskUpdates } from '../../../src/services/taskUpdates.api.js';
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
    toast.success.mockClear();
  });

  it('pre-fills completion % from the task and shows the read-only header', async () => {
    renderModal();
    expect(await screen.findByText('Sample task')).toBeInTheDocument();
    expect(screen.getByLabelText('Completion %')).toHaveValue(40);
  });

  it('rejects a description under 3 characters', async () => {
    renderModal();
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('Description kam az kam 3 harf ki honi chahiye')).toBeInTheDocument();
    expect(createTaskUpdate).not.toHaveBeenCalled();
  });

  it('the % slider and number input stay in sync', async () => {
    renderModal();
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('Completion % slider'), { target: { value: '75' } });
    expect(screen.getByLabelText('Completion %')).toHaveValue(75);
  });

  it('a valid submission (no attachment) calls createTaskUpdate, toasts, and closes', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Made real progress today' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(createTaskUpdate).toHaveBeenCalledWith('t1', { description: 'Made real progress today', completionPercent: 40 })
    );
    expect(toast.success).toHaveBeenCalledWith('Update save ho gayi');
    expect(onClose).toHaveBeenCalled();
  });

  it('lazily fetches Previous Updates only after "Purani Updates dekhein" is clicked', async () => {
    renderModal();
    await screen.findByText('Sample task');

    expect(getTaskUpdates).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Purani Updates dekhein'));

    await waitFor(() => expect(getTaskUpdates).toHaveBeenCalled());
    expect(screen.getByText('Purani Updates chupayein')).toBeInTheDocument();
  });
});
