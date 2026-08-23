import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskFormModal from '../../../src/components/task/TaskFormModal.jsx';

vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({
    items: [
      { id: 'u1', name: 'Ali' },
      { id: 'u2', name: 'Bilal' },
    ],
    meta: {},
  }),
}));
vi.mock('../../../src/services/lookupLists.api.js', () => ({
  getLookupList: vi.fn().mockResolvedValue([{ id: 'r1', value: 'IT', isActive: true }]),
}));
vi.mock('../../../src/services/tasks.api.js', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 't1', title: 'New Task' }),
  updateTask: vi.fn().mockResolvedValue({ id: 't1', title: 'Updated Task' }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createTask, updateTask } from '../../../src/services/tasks.api.js';
import toast from 'react-hot-toast';

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskFormModal isOpen onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

const existingTask = {
  id: 't1',
  title: 'Existing task',
  assignees: [{ id: 'u1', name: 'Ali' }],
  responsibility: 'IT',
  deadline: '2020-01-01T00:00:00.000Z', // deliberately in the past
};

function pastDate() {
  return '2020-01-01';
}

function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().slice(0, 10);
}

describe('TaskFormModal (docs/09-frontend-features.md §2, §10)', () => {
  beforeEach(() => {
    createTask.mockClear();
    updateTask.mockClear();
    toast.success.mockClear();
  });

  it('create mode: submitting empty shows required-field errors and does not call createTask', async () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('At least one assignee is required')).toBeInTheDocument();
    expect(screen.getByText('Responsibility is required')).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it('create mode: rejects a past deadline', async () => {
    renderModal({ mode: 'create' });

    fireEvent.change(screen.getByLabelText('Kaam (Title)'), { target: { value: 'My new task' } });
    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: pastDate() } });

    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('Deadline aaj ya us ke baad honi chahiye')).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it('edit mode: allows a past deadline (correcting an already-overdue task)', async () => {
    renderModal({ mode: 'edit', task: existingTask });

    await screen.findByDisplayValue('Existing task');
    expect(screen.getByLabelText('Deadline')).toHaveValue('2020-01-01');

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith('t1', expect.objectContaining({ deadline: '2020-01-01' })));
    expect(screen.queryByText('Deadline aaj ya us ke baad honi chahiye')).not.toBeInTheDocument();
  });

  it('create mode: a valid submission calls createTask, toasts the documented message, and closes', async () => {
    const onClose = vi.fn();
    renderModal({ mode: 'create', onClose });

    fireEvent.change(screen.getByLabelText('Kaam (Title)'), { target: { value: 'My new task' } });
    fireEvent.click(await screen.findByText('Ali'));

    const responsibilitySelect = screen.getByLabelText('Zimmedari');
    await waitFor(() => expect(screen.getByText('IT')).toBeInTheDocument());
    fireEvent.change(responsibilitySelect, { target: { value: 'IT' } });

    fireEvent.change(screen.getByLabelText('Deadline'), { target: { value: futureDate() } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith({
        title: 'My new task',
        assignees: ['u1'],
        responsibility: 'IT',
        deadline: futureDate(),
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Kaam kamyabi se bana diya gaya');
    expect(onClose).toHaveBeenCalled();
  });

  it('assignee chip can be removed by clicking its × button', async () => {
    renderModal({ mode: 'edit', task: existingTask });

    await screen.findByDisplayValue('Existing task');
    // The chip only resolves the assignee's name once useAssignableUsers' fetch lands (it looks
    // the id up in `users?.items`) — wait for that before asserting the chip/its remove button.
    expect(await screen.findByLabelText('Ali hataayein')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Ali hataayein'));

    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByText('At least one assignee is required')).toBeInTheDocument();
  });
});
