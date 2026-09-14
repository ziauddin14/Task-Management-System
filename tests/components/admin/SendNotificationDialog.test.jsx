import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SendNotificationDialog from '../../../src/components/admin/SendNotificationDialog.jsx';

vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({ items: [{ id: 'u1', name: 'Ali' }, { id: 'u2', name: 'Bilal' }], meta: {} }),
}));
vi.mock('../../../src/services/tasks.api.js', () => ({
  getTasks: vi.fn().mockResolvedValue({
    items: [{ id: 't1', title: 'Sample task', codeNumber: '260901' }],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
  }),
}));
vi.mock('../../../src/services/notifications.api.js', () => ({
  sendAdminNotification: vi.fn(),
  sendTaskReminder: vi.fn(),
  getAdminNotificationHistory: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { getUsers } from '../../../src/services/users.api.js';
import { getTasks } from '../../../src/services/tasks.api.js';
import { sendAdminNotification, sendTaskReminder } from '../../../src/services/notifications.api.js';
import toast from 'react-hot-toast';

function renderDialog(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SendNotificationDialog isOpen onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('SendNotificationDialog', () => {
  beforeEach(() => {
    getUsers.mockClear();
    getTasks.mockClear();
    sendAdminNotification.mockReset();
    sendTaskReminder.mockReset();
    toast.success.mockClear();
  });

  it('opens with "تمام ذمہ داران" selected by default when no task is supplied, and the submit button starts disabled', () => {
    renderDialog();

    expect(screen.getByText('نئی اطلاع بھیجیں')).toBeInTheDocument();
    expect(screen.getByLabelText('تمام ذمہ داران')).toBeChecked();
    expect(screen.getByRole('button', { name: 'اطلاع بھیجیں' })).toBeDisabled();
  });

  it('enables submit once a template is chosen for the default "all" recipient type', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText('پیغام کا ٹیمپلیٹ'), { target: { value: 'GENERAL_REMINDER' } });

    expect(screen.getByRole('button', { name: 'اطلاع بھیجیں' })).not.toBeDisabled();
  });

  it('enables submit with only a custom message, no template', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText('اپنا پیغام لکھیں'), { target: { value: 'میرا پیغام' } });

    expect(screen.getByRole('button', { name: 'اطلاع بھیجیں' })).not.toBeDisabled();
  });

  it('switching to "مخصوص ذمہ دار" shows the user selector and requires a selection before submit is enabled', async () => {
    renderDialog();

    fireEvent.click(screen.getByLabelText('مخصوص ذمہ دار'));
    fireEvent.change(screen.getByLabelText('پیغام کا ٹیمپلیٹ'), { target: { value: 'GENERAL_REMINDER' } });

    expect(screen.getByRole('button', { name: 'اطلاع بھیجیں' })).toBeDisabled(); // no user chosen yet
    const select = await screen.findByLabelText('ذمہ دار منتخب کریں');
    expect(await within(select).findByText('Ali')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'u1' } });

    expect(screen.getByRole('button', { name: 'اطلاع بھیجیں' })).not.toBeDisabled();
  });

  it('switching to "مخصوص Task" shows a task search box; selecting a result shows the recipient preview text', async () => {
    renderDialog();

    fireEvent.click(screen.getByLabelText('مخصوص Task'));
    fireEvent.change(screen.getByLabelText('کام تلاش کریں'), { target: { value: 'Sample' } });

    const resultButton = await screen.findByText('Sample task');
    fireEvent.click(resultButton);

    expect(screen.getByText('یہ اطلاع اس کام کے تمام فعال ذمہ داران کو بھیجی جائے گی۔')).toBeInTheDocument();
  });

  it('when a task prop is supplied (row-triggered), the recipient-type picker is hidden and the task is shown read-only', () => {
    renderDialog({ task: { id: 't1', title: 'Row task', codeNumber: '260901' } });

    expect(screen.getByText('یاددہانی بھیجیں')).toBeInTheDocument();
    expect(screen.queryByLabelText('تمام ذمہ داران')).not.toBeInTheDocument();
    expect(screen.getByText('260901')).toBeInTheDocument();
    expect(screen.getByText('Row task')).toBeInTheDocument();
  });

  it('submits Flow A ("all") with the resolved payload and shows a success toast, then closes', async () => {
    sendAdminNotification.mockResolvedValue({ batchId: 'b1', recipientsResolved: 3, createdCount: 3, failures: [] });
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.change(screen.getByLabelText('پیغام کا ٹیمپلیٹ'), { target: { value: 'GENERAL_REMINDER' } });
    fireEvent.click(screen.getByRole('button', { name: 'اطلاع بھیجیں' }));

    await waitFor(() =>
      expect(sendAdminNotification).toHaveBeenCalledWith({ recipientType: 'all', templateKey: 'GENERAL_REMINDER', message: undefined })
    );
    expect(toast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('submits Flow B ("user") with the selected userId', async () => {
    sendAdminNotification.mockResolvedValue({ batchId: 'b1', recipientsResolved: 1, createdCount: 1, failures: [] });
    renderDialog();

    fireEvent.click(screen.getByLabelText('مخصوص ذمہ دار'));
    const select = await screen.findByLabelText('ذمہ دار منتخب کریں');
    fireEvent.change(select, { target: { value: 'u1' } });
    fireEvent.change(screen.getByLabelText('اپنا پیغام لکھیں'), { target: { value: 'سلام' } });
    fireEvent.click(screen.getByRole('button', { name: 'اطلاع بھیجیں' }));

    await waitFor(() =>
      expect(sendAdminNotification).toHaveBeenCalledWith({ recipientType: 'user', userId: 'u1', templateKey: undefined, message: 'سلام' })
    );
  });

  it('row-triggered submit (Flow C) calls sendTaskReminder with the pre-supplied task id, not sendAdminNotification', async () => {
    sendTaskReminder.mockResolvedValue({ batchId: 'b1', recipientsResolved: 2, createdCount: 2, failures: [] });
    renderDialog({ task: { id: 't1', title: 'Row task', codeNumber: '260901' } });

    fireEvent.change(screen.getByLabelText('پیغام کا ٹیمپلیٹ'), { target: { value: 'DEADLINE_APPROACHING' } });
    fireEvent.click(screen.getByRole('button', { name: 'اطلاع بھیجیں' }));

    await waitFor(() =>
      expect(sendTaskReminder).toHaveBeenCalledWith('t1', { templateKey: 'DEADLINE_APPROACHING', message: undefined })
    );
    expect(sendAdminNotification).not.toHaveBeenCalled();
  });

  it('shows a loading label and disables the button while the request is in flight (double-submit prevention)', async () => {
    let resolveSend;
    sendAdminNotification.mockReturnValue(new Promise((resolve) => { resolveSend = resolve; }));
    renderDialog();

    fireEvent.change(screen.getByLabelText('پیغام کا ٹیمپلیٹ'), { target: { value: 'GENERAL_REMINDER' } });
    fireEvent.click(screen.getByRole('button', { name: 'اطلاع بھیجیں' }));

    expect(await screen.findByRole('button', { name: 'بھیجا جا رہا ہے۔۔۔' })).toBeDisabled();
    expect(sendAdminNotification).toHaveBeenCalledTimes(1);

    // A second click attempt while pending must not fire a second request.
    fireEvent.click(screen.getByRole('button', { name: 'بھیجا جا رہا ہے۔۔۔' }));
    expect(sendAdminNotification).toHaveBeenCalledTimes(1);

    resolveSend({ batchId: 'b1', recipientsResolved: 1, createdCount: 1, failures: [] });
  });

  it('on failure, keeps the dialog open and preserves what the admin typed (does not silently reset)', async () => {
    sendAdminNotification.mockRejectedValue(new Error('Server error'));
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.change(screen.getByLabelText('اپنا پیغام لکھیں'), { target: { value: 'یہ پیغام محفوظ رہنا چاہیے' } });
    fireEvent.click(screen.getByRole('button', { name: 'اطلاع بھیجیں' }));

    await waitFor(() => expect(sendAdminNotification).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('اپنا پیغام لکھیں')).toHaveValue('یہ پیغام محفوظ رہنا چاہیے');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('resets all fields when reopened fresh (not opened with a task) after a prior open', () => {
    const { rerender } = renderDialog({ isOpen: false });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={queryClient}>
        <SendNotificationDialog isOpen onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText('تمام ذمہ داران')).toBeChecked();
    expect(screen.getByLabelText('اپنا پیغام لکھیں')).toHaveValue('');
  });

  it('toggles the inline sending-history panel (general mode only)', async () => {
    renderDialog();

    expect(screen.queryByText('ابھی تک کوئی اطلاع نہیں بھیجی گئی۔')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('بھیجنے کی سرگزشت دیکھیں'));

    expect(await screen.findByText('ابھی تک کوئی اطلاع نہیں بھیجی گئی۔')).toBeInTheDocument();
  });

  it('does not show the history toggle when opened row-triggered (task supplied)', () => {
    renderDialog({ task: { id: 't1', title: 'Row task', codeNumber: '260901' } });

    expect(screen.queryByText('بھیجنے کی سرگزشت دیکھیں')).not.toBeInTheDocument();
  });
});
