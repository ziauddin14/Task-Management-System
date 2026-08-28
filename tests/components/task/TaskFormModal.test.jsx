import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskFormModal from '../../../src/components/task/TaskFormModal.jsx';

// Prompt 3C — responsibility no longer comes from a separate lookupLists mock; it's derived from
// these same users' `responsibility` fields.
const mockGetUsers = vi.fn().mockResolvedValue({
  items: [
    { id: 'u1', name: 'Ali', responsibility: 'IT' },
    { id: 'u2', name: 'Bilal', responsibility: 'HR' },
  ],
  meta: {},
});
vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: (...args) => mockGetUsers(...args),
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
    mockGetUsers.mockReset().mockResolvedValue({
      items: [
        { id: 'u1', name: 'Ali', responsibility: 'IT' },
        { id: 'u2', name: 'Bilal', responsibility: 'HR' },
      ],
      meta: {},
    });
  });

  it('create mode: submitting empty shows required-field errors and does not call createTask', async () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByText('محفوظ کریں'));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('At least one assignee is required')).toBeInTheDocument();
    expect(screen.getByText('Responsibility is required')).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it('create mode: rejects a past deadline', async () => {
    renderModal({ mode: 'create' });

    fireEvent.change(screen.getByLabelText('کام کا عنوان'), { target: { value: 'My new task' } });
    fireEvent.change(screen.getByLabelText('آخری تاریخ'), { target: { value: pastDate() } });

    fireEvent.click(screen.getByText('محفوظ کریں'));

    expect(await screen.findByText('Deadline aaj ya us ke baad honi chahiye')).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it('edit mode: allows a past deadline (correcting an already-overdue task)', async () => {
    renderModal({ mode: 'edit', task: existingTask });

    await screen.findByDisplayValue('Existing task');
    expect(screen.getByLabelText('آخری تاریخ')).toHaveValue('2020-01-01');

    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() => expect(updateTask).toHaveBeenCalledWith('t1', expect.objectContaining({ deadline: '2020-01-01' })));
    expect(screen.queryByText('Deadline aaj ya us ke baad honi chahiye')).not.toBeInTheDocument();
  });

  it('create mode: a valid submission calls createTask, toasts the documented message, and closes', async () => {
    const onClose = vi.fn();
    renderModal({ mode: 'create', onClose });

    fireEvent.change(screen.getByLabelText('کام کا عنوان'), { target: { value: 'My new task' } });
    fireEvent.click(await screen.findByText('Ali'));

    const responsibilitySelect = screen.getByLabelText('ذمہ داری');
    await waitFor(() => expect(screen.getByText('IT')).toBeInTheDocument());
    fireEvent.change(responsibilitySelect, { target: { value: 'IT' } });

    fireEvent.change(screen.getByLabelText('آخری تاریخ'), { target: { value: futureDate() } });

    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() =>
      expect(createTask).toHaveBeenCalledWith({
        title: 'My new task',
        assignees: ['u1'],
        responsibility: 'IT',
        deadline: futureDate(),
      })
    );
    expect(toast.success).toHaveBeenCalledWith('کام کامیابی سے بنا دیا گیا');
    expect(onClose).toHaveBeenCalled();
  });

  it('assignee chip can be removed by clicking its × button', async () => {
    renderModal({ mode: 'edit', task: existingTask });

    await screen.findByDisplayValue('Existing task');
    // The chip only resolves the assignee's name once useAssignableUsers' fetch lands (it looks
    // the id up in `users?.items`) — wait for that before asserting the chip/its remove button.
    expect(await screen.findByLabelText('Ali hataayein')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Ali hataayein'));

    fireEvent.click(screen.getByText('محفوظ کریں'));
    expect(await screen.findByText('At least one assignee is required')).toBeInTheDocument();
  });

  // Prompt 3B — the assignee list must show an explicit state for loading/error/empty instead of
  // silently rendering nothing, which is indistinguishable from "broken".
  describe('assignee list feedback states', () => {
    it('shows a loading message while users are still being fetched', async () => {
      let resolveUsers;
      mockGetUsers.mockReset().mockReturnValue(new Promise((resolve) => { resolveUsers = resolve; }));
      renderModal({ mode: 'create' });

      expect(screen.getByText('لوڈ ہو رہا ہے…')).toBeInTheDocument();

      resolveUsers({ items: [{ id: 'u1', name: 'Ali', responsibility: 'IT' }], meta: {} });
      await screen.findByText('Ali');
    });

    it('shows an error message if the users request fails', async () => {
      mockGetUsers.mockReset().mockRejectedValue(new Error('network down'));
      renderModal({ mode: 'create' });

      expect(await screen.findByText('یوزرز لوڈ نہیں ہو سکے')).toBeInTheDocument();
    });

    it('shows an empty message when there are no active assignable users', async () => {
      mockGetUsers.mockReset().mockResolvedValue({ items: [], meta: {} });
      renderModal({ mode: 'create' });

      expect(await screen.findByText('کوئی یوزر نہیں ملا')).toBeInTheDocument();
    });
  });

  // Prompt 3C — Responsibility dropdown options come from distinct `responsibility` values already
  // present among the active Users fetched via useAssignableUsers(), not a separate LookupList.
  describe('responsibility options sourced from Users data', () => {
    it('offers each distinct responsibility value exactly once, deduplicated', async () => {
      mockGetUsers.mockReset().mockResolvedValue({
        items: [
          { id: 'u1', name: 'Ali', responsibility: 'IT' },
          { id: 'u2', name: 'Bilal', responsibility: 'IT' },
          { id: 'u3', name: 'Zain', responsibility: 'HR' },
        ],
        meta: {},
      });
      renderModal({ mode: 'create' });

      await screen.findByText('Ali');
      const responsibilitySelect = screen.getByLabelText('ذمہ داری');
      const optionTexts = Array.from(responsibilitySelect.querySelectorAll('option')).map((o) => o.textContent);
      expect(optionTexts.filter((t) => t === 'IT')).toHaveLength(1);
      expect(optionTexts).toContain('HR');
    });

    it('edit mode keeps the task\'s current responsibility selectable even if no active user carries it anymore', async () => {
      mockGetUsers.mockReset().mockResolvedValue({
        items: [{ id: 'u1', name: 'Ali', responsibility: 'HR' }],
        meta: {},
      });
      renderModal({ mode: 'edit', task: { ...existingTask, responsibility: 'Retired Role' } });

      await screen.findByDisplayValue('Existing task');
      expect(screen.getByLabelText('ذمہ داری')).toHaveValue('Retired Role');
      expect(screen.getByText('Retired Role')).toBeInTheDocument();
    });
  });
});
