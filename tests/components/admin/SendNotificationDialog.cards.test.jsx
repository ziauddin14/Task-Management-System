import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SendNotificationDialog from '../../../src/components/admin/SendNotificationDialog.jsx';

vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({ items: [{ id: 'u1', name: 'Ali' }, { id: 'u2', name: 'Bilal' }], meta: {} }),
}));
vi.mock('../../../src/services/tasks.api.js', () => ({
  getTasks: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } }),
}));
vi.mock('../../../src/services/notifications.api.js', () => ({
  sendAdminNotification: vi.fn().mockResolvedValue({}),
  sendTaskReminder: vi.fn(),
  getAdminNotificationHistory: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { sendAdminNotification } from '../../../src/services/notifications.api.js';

function renderDialog(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SendNotificationDialog isOpen onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

const radios = () => screen.getAllByRole('radio');
const card = (value) => document.querySelector(`[data-recipient-card="${value}"]`);

// Redesign: the three recipient choices are selectable cards — and still real radio inputs.
describe('SendNotificationDialog — the recipient cards still behave as radios', () => {
  beforeEach(() => {
    sendAdminNotification.mockClear();
  });

  it('there are exactly three radios in one group, with the names they always had', () => {
    renderDialog();
    expect(radios()).toHaveLength(3);
    radios().forEach((radio) => {
      expect(radio).toHaveAttribute('type', 'radio');
      expect(radio).toHaveAttribute('name', 'recipientType');
    });
    expect(screen.getByRole('radio', { name: 'تمام ذمہ داران' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'مخصوص ذمہ دار' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'مخصوص Task' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'وصول کنندہ' })).toBeInTheDocument();
  });

  it('each radio is only visually hidden (still focusable), and its card is its <label>', () => {
    renderDialog();
    radios().forEach((radio) => {
      expect(radio).toHaveClass('sr-only');
      expect(radio).not.toHaveAttribute('hidden');
      expect(radio).not.toBeDisabled();
      const label = document.querySelector(`label[for="${radio.id}"]`);
      expect(label).toHaveAttribute('data-recipient-card');
      // The one-line hint describes the radio without becoming part of its name.
      expect(document.getElementById(radio.getAttribute('aria-describedby'))).not.toBeNull();
    });
  });

  it('exactly one is checked at a time: choosing a card checks its radio and unchecks the others', () => {
    renderDialog();
    const [all, user, task] = radios();
    expect([all.checked, user.checked, task.checked]).toEqual([true, false, false]);

    fireEvent.click(card('user')); // clicking the card = clicking its label
    expect([all.checked, user.checked, task.checked]).toEqual([false, true, false]);

    fireEvent.click(task); // or the radio itself (keyboard: arrow keys move within the group)
    expect([all.checked, user.checked, task.checked]).toEqual([false, false, true]);
  });

  it('the chosen card — and only it — has the green border, the tint and the filled dot', () => {
    renderDialog();
    expect(card('all')).toHaveClass('border-tk-green-700', 'bg-tk-hover');
    expect(card('all').querySelector('[data-recipient-dot]')).not.toBeNull();
    expect(card('user')).not.toHaveClass('border-tk-green-700');

    fireEvent.click(card('user'));

    expect(card('user')).toHaveClass('border-tk-green-700', 'bg-tk-hover');
    expect(card('user')).toHaveAttribute('data-selected', 'true');
    expect(card('user').querySelector('[data-recipient-dot]')).not.toBeNull();
    expect(card('all')).not.toHaveClass('border-tk-green-700');
    expect(card('all').querySelector('[data-recipient-dot]')).toBeNull();
    expect(document.querySelectorAll('[data-recipient-dot]')).toHaveLength(1);
  });

  it('choosing a card still drives the rest of the form exactly as before', async () => {
    renderDialog();
    expect(screen.queryByLabelText('ذمہ دار منتخب کریں')).not.toBeInTheDocument();

    fireEvent.click(card('user'));
    expect(await screen.findByLabelText('ذمہ دار منتخب کریں')).toBeInTheDocument();

    fireEvent.click(card('task'));
    expect(screen.queryByLabelText('ذمہ دار منتخب کریں')).not.toBeInTheDocument();
    expect(screen.getByLabelText('کام تلاش کریں')).toBeInTheDocument();
  });

  it('the send button keeps its rule: disabled (and dimmed) until there is content; then it sends to "all"', async () => {
    renderDialog();
    const send = screen.getByRole('button', { name: 'اطلاع بھیجیں' });
    expect(send).toBeDisabled();
    expect(send).toHaveClass('disabled:opacity-45', 'disabled:shadow-none');

    fireEvent.change(screen.getByLabelText('اپنا پیغام لکھیں'), { target: { value: 'سلام' } });
    expect(send).toBeEnabled();
    fireEvent.click(send);

    await waitFor(() => expect(sendAdminNotification).toHaveBeenCalledWith({ recipientType: 'all', templateKey: undefined, message: 'سلام' }));
  });

  it('no character counter was added: the message field has no maximum length to count against', () => {
    renderDialog();
    expect(screen.getByLabelText('اپنا پیغام لکھیں')).not.toHaveAttribute('maxlength');
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).not.toBeInTheDocument();
  });

  it('opened from a task row there are no cards at all — it is locked to that task, as before', () => {
    renderDialog({ task: { id: 't1', codeNumber: '260901', title: 'Sample task' } });
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText('260901')).toBeInTheDocument();
  });
});
