import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UpdateModal from '../../../src/components/task/UpdateModal.jsx';

vi.mock('../../../src/services/tasks.api.js', () => ({
  getTask: vi.fn().mockResolvedValue({ id: 't1', codeNumber: '260801', title: 'Sample task', status: 'ongoing', performanceRating: '-', completionPercent: 40, timeStatus: { type: 'remaining', days: 5 } }),
  updateTask: vi.fn(),
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  createTaskUpdate: vi.fn().mockResolvedValue({ update: { id: 'u1' }, task: { id: 't1' } }),
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }),
}));
vi.mock('../../../src/services/uploads.api.js', () => ({ uploadAttachment: vi.fn() }));
vi.mock('../../../src/services/users.api.js', () => ({ getUsers: vi.fn().mockResolvedValue({ items: [], meta: {} }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createTaskUpdate } from '../../../src/services/taskUpdates.api.js';

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UpdateModal isOpen taskId="t1" onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

const slider = () => screen.getByLabelText('Completion % slider');
const numberBox = () => screen.getByLabelText('تکمیل فیصد');

// Redesign: a styled slider and a 76px value box — two views of the one form value.
describe('UpdateModal — the slider and the number box stay in sync', () => {
  beforeEach(() => {
    createTaskUpdate.mockClear();
  });

  it('both open on the task\'s current percent', async () => {
    renderModal();
    await waitFor(() => expect(numberBox()).toHaveValue(40));
    expect(slider()).toHaveValue('40');
    expect(slider().style.getPropertyValue('--tk-range')).toBe('40%'); // the track is filled to the value
  });

  it('moving the slider updates the number box', async () => {
    renderModal();
    await waitFor(() => expect(numberBox()).toHaveValue(40));

    fireEvent.change(slider(), { target: { value: '75' } });

    expect(numberBox()).toHaveValue(75);
    expect(slider()).toHaveValue('75');
    expect(slider().style.getPropertyValue('--tk-range')).toBe('75%');
  });

  it('typing in the number box moves the slider', async () => {
    renderModal();
    await waitFor(() => expect(numberBox()).toHaveValue(40));

    fireEvent.change(numberBox(), { target: { value: '20' } });

    await waitFor(() => expect(slider()).toHaveValue('20'));
    expect(slider().style.getPropertyValue('--tk-range')).toBe('20%');
  });

  it('whichever was used last, the SAME value is what gets saved', async () => {
    renderModal();
    await waitFor(() => expect(numberBox()).toHaveValue(40));
    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'پیش رفت ہوئی' } });

    fireEvent.change(numberBox(), { target: { value: '55' } });
    fireEvent.change(slider(), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));

    await waitFor(() => expect(createTaskUpdate).toHaveBeenCalledTimes(1));
    expect(createTaskUpdate.mock.calls[0][1]).toMatchObject({ description: 'پیش رفت ہوئی', completionPercent: 90 });
  });

  it('the slider keeps its range and its name; the box keeps its limits', async () => {
    renderModal();
    await waitFor(() => expect(numberBox()).toHaveValue(40));

    expect(slider()).toHaveAttribute('type', 'range');
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '100');
    expect(slider()).toHaveClass('tk-range');
    expect(numberBox()).toHaveAttribute('type', 'number');
    expect(numberBox()).toHaveAttribute('min', '0');
    expect(numberBox()).toHaveAttribute('max', '100');
    expect(numberBox()).toHaveClass('w-[76px]');
  });

  it('the footer: save, cancel — and for an Admin on an open task, reassign (amber) and close (danger)', async () => {
    const onCloseTask = vi.fn();
    renderModal({ isAdmin: true, onCloseTask });
    await waitFor(() => expect(numberBox()).toHaveValue(40));

    expect(screen.getByRole('button', { name: 'محفوظ کریں' })).toHaveClass('flex-1', 'bg-tk-green-700');
    expect(screen.getByRole('button', { name: 'منسوخ کریں' })).toHaveClass('border-tk-line-btn');
    expect(screen.getByRole('button', { name: 'ذمہ دار تبدیل کریں' })).toHaveClass('bg-tk-amber-bg', 'text-tk-amber-text');
    const close = screen.getByRole('button', { name: 'کام بند کریں' });
    expect(close).toHaveClass('bg-tk-danger-bg', 'text-tk-danger');
    expect(close.parentElement).toHaveClass('flex-wrap'); // the row wraps on a narrow screen

    fireEvent.click(close);
    expect(onCloseTask).toHaveBeenCalledTimes(1); // the existing confirm flow takes over
  });

  it('a normal user gets only save and cancel', async () => {
    renderModal({ isAdmin: false });
    await waitFor(() => expect(numberBox()).toHaveValue(40));
    expect(screen.queryByRole('button', { name: 'ذمہ دار تبدیل کریں' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'کام بند کریں' })).not.toBeInTheDocument();
  });

  it('the attachment picker is a dashed drop area over the same hidden file input', async () => {
    renderModal();
    await waitFor(() => expect(numberBox()).toHaveValue(40));
    expect(screen.getByRole('button', { name: /اٹیچمنٹ لگائیں/ })).toHaveClass('border-dashed');
    const fileInput = screen.getByLabelText('منسلکہ فائل');
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveClass('hidden');
  });
});
