import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AcknowledgeButton from '../../../src/components/task/AcknowledgeButton.jsx';
import ReceiptStatus from '../../../src/components/task/ReceiptStatus.jsx';
import ReceiptDetailRow from '../../../src/components/task/ReceiptDetailRow.jsx';
import NotificationItem from '../../../src/components/common/NotificationItem.jsx';
import TaskCard from '../../../src/components/mobile/TaskCard.jsx';
import TaskActionSheet from '../../../src/components/mobile/TaskActionSheet.jsx';
import { useAuthStore } from '../../../src/store/authStore.js';

vi.mock('../../../src/services/tasks.api.js', () => ({ acknowledgeTask: vi.fn() }));
import { acknowledgeTask } from '../../../src/services/tasks.api.js';

// Task receipt in the UI: the "وصول کر لیا" button, the admin status chip and its popover, the
// bell's notification row, the phone's card and sheet, and the Task Details row.

const ACKED_AT = '2026-10-14T05:30:00.000Z';
const baseTask = {
  id: 't1',
  codeNumber: '261001',
  title: 'نیا کام',
  assignees: [{ id: 'u1', name: 'زید' }],
  responsibility: 'R',
  deadline: '2026-10-20T00:00:00.000Z',
  status: 'ongoing',
  completionPercent: 0,
  performanceRating: '-',
  timeStatus: { type: 'remaining', days: 5 },
};
const userTask = (acknowledgedAt = null, extra = {}) => ({ ...baseTask, receipt: null, myReceipt: { assignedAt: ACKED_AT, acknowledgedAt }, ...extra });
const adminTask = (people) => ({
  ...baseTask,
  myReceipt: null,
  receipt: { required: people.length, acknowledged: people.filter((p) => p.acknowledgedAt).length, people },
});
const person = (name, acknowledgedAt = null) => ({ id: name, user: { id: name, name }, assignedAt: ACKED_AT, acknowledgedAt, remindersSent: 0 });

function renderWithClient(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  return { ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>), queryClient, invalidate };
}

beforeEach(() => {
  acknowledgeTask.mockReset();
  useAuthStore.setState({ user: { id: 'u1', role: 'user', name: 'زید' }, token: 't', isAuthenticated: true });
});

describe('AcknowledgeButton — "وصول کر لیا"', () => {
  it('confirms the task, keeps its label while busy (disabled, aria-busy, loading phrase), then shows "✓ وصول شدہ"', async () => {
    let resolve;
    acknowledgeTask.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { invalidate } = renderWithClient(<AcknowledgeButton taskId="t1" />);

    const button = screen.getByRole('button', { name: 'وصول کر لیا' });
    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('وصول کر لیا');
    expect(document.querySelector('[data-phrase-line]')).not.toBeNull();
    expect(acknowledgeTask).toHaveBeenCalledWith('t1');
    fireEvent.click(button);
    expect(acknowledgeTask).toHaveBeenCalledTimes(1);

    resolve(userTask(ACKED_AT));
    expect(await screen.findByText('✓ وصول شدہ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'وصول کر لیا' })).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] });
  });

  it('if it fails the button is usable again', async () => {
    acknowledgeTask.mockRejectedValue(new Error('x'));
    renderWithClient(<AcknowledgeButton taskId="t1" />);
    const button = screen.getByRole('button', { name: 'وصول کر لیا' });
    fireEvent.click(button);
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    expect(button).toBeEnabled();
  });

  it('on the sheet it is full width and carries the loading phrase inside', async () => {
    acknowledgeTask.mockReturnValue(new Promise(() => {}));
    renderWithClient(<AcknowledgeButton taskId="t1" size="sheet" />);
    const button = screen.getByRole('button', { name: 'وصول کر لیا' });
    expect(button).toHaveClass('w-full');
    fireEvent.click(button);
    await waitFor(() => expect(button.querySelector('[data-phrase-line]')).not.toBeNull());
  });
});

describe('ReceiptStatus — the admin chip and its popover', () => {
  it('shows the state and, opened, who has and who has not confirmed (with the time)', () => {
    render(<ReceiptStatus task={adminTask([person('زید', ACKED_AT), person('عمر')])} withPopover />);

    const chip = screen.getByRole('button', { name: '2 میں سے 1 نے وصول کیا' });
    fireEvent.click(chip);

    const popover = screen.getByRole('dialog', { name: 'وصولی' });
    const rows = within(popover).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('زید');
    expect(rows[0]).toHaveTextContent('✓ وصول شدہ');
    expect(rows[0]).toHaveTextContent('14-10-26');
    expect(rows[1]).toHaveTextContent('عمر');
    expect(rows[1]).toHaveTextContent('وصول نہیں ہوا');
  });

  it('nothing at all for a task without receipts', () => {
    const { container } = render(<ReceiptStatus task={{ ...baseTask, receipt: null }} withPopover />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('NotificationItem — the bell', () => {
  const notice = (receipt, extra = {}) => ({
    id: 'n1',
    type: 'TASK_ASSIGNED',
    title: 'نیا کام سونپا گیا',
    message: 'Admin نے آپ کو یہ کام سونپا ہے: …',
    taskId: 't1',
    isRead: false,
    createdAt: ACKED_AT,
    metadata: { taskCodeNumber: '261001' },
    receipt,
    ...extra,
  });

  it('an open assignment notice has "وصول کر لیا" BESIDE the row\'s own button, not inside it', async () => {
    const onClick = vi.fn();
    renderWithClient(<NotificationItem notification={notice({ acknowledgedAt: null, canAcknowledge: true })} onClick={onClick} />);

    const ack = screen.getByRole('button', { name: 'وصول کر لیا' });
    const row = screen.getByRole('button', { name: /نیا کام سونپا گیا/ });
    expect(row).not.toContainElement(ack);
    acknowledgeTask.mockReturnValue(new Promise(() => {}));
    fireEvent.click(ack);
    await waitFor(() => expect(acknowledgeTask).toHaveBeenCalledWith('t1'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('a confirmed one shows "✓ وصول شدہ" and no button', () => {
    renderWithClient(<NotificationItem notification={notice({ acknowledgedAt: ACKED_AT, canAcknowledge: false })} onClick={vi.fn()} />);
    expect(screen.getByText('✓ وصول شدہ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'وصول کر لیا' })).not.toBeInTheDocument();
  });

  it('every other notification — and one from a backend without receipts — is exactly the old row', () => {
    const { container } = render(
      <ul>
        <NotificationItem notification={notice(null, { type: 'ADMIN_BROADCAST' })} onClick={vi.fn()} />
        <NotificationItem notification={notice(undefined)} onClick={vi.fn()} />
        <NotificationItem notification={notice({ acknowledgedAt: null, canAcknowledge: false })} onClick={vi.fn()} />
      </ul>
    );
    container.querySelectorAll('li').forEach((li) => {
      expect(li.children).toHaveLength(1);
      expect(li.firstElementChild.tagName).toBe('BUTTON');
      expect(li.firstElementChild).toHaveClass('w-full');
    });
  });
});

describe('TaskCard — the phone', () => {
  it('a user with an open receipt gets "وصول کر لیا" at the bottom of the card, above the card\'s own touch target', () => {
    renderWithClient(<TaskCard task={userTask()} onOpen={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'وصول کر لیا' });
    expect(button.closest('div.relative')).toHaveClass('z-[1]');
    expect(screen.queryByText('✓ وصول شدہ')).not.toBeInTheDocument();
  });

  it('once confirmed: "✓ وصول شدہ" with the other chips, no button', () => {
    renderWithClient(<TaskCard task={userTask(ACKED_AT)} onOpen={vi.fn()} />);
    expect(screen.getByText('✓ وصول شدہ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'وصول کر لیا' })).not.toBeInTheDocument();
  });

  it('a closed task that was never confirmed: no button', () => {
    renderWithClient(<TaskCard task={userTask(null, { status: 'closed' })} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'وصول کر لیا' })).not.toBeInTheDocument();
  });

  it('an admin sees the status chip; an old task shows nothing of it', () => {
    const { rerender } = renderWithClient(<TaskCard task={adminTask([person('زید'), person('عمر')])} onOpen={vi.fn()} isAdmin />);
    expect(screen.getByText('وصول نہیں ہوا')).toBeInTheDocument();
    rerender(<TaskCard task={{ ...baseTask }} onOpen={vi.fn()} isAdmin />);
    expect(screen.queryByText('وصول نہیں ہوا')).not.toBeInTheDocument();
    expect(document.querySelector('[data-receipt-status]')).toBeNull();
  });
});

describe('TaskActionSheet — the phone\'s task sheet', () => {
  const handlers = { onClose: vi.fn(), onUpdate: vi.fn(), onViewUpdates: vi.fn(), onEdit: vi.fn(), onSendReminder: vi.fn(), onEditSyntheticRating: vi.fn() };

  it('"وصول کر لیا" is the FIRST action while the person\'s receipt is open', () => {
    renderWithClient(<TaskActionSheet task={userTask()} isAdmin={false} {...handlers} />);
    const sheet = screen.getByRole('dialog');
    const actions = within(sheet).getAllByRole('button').filter((b) => b.textContent.trim() && !b.getAttribute('aria-label'));
    expect(actions[0]).toHaveTextContent('وصول کر لیا');
    expect(within(sheet).getByText('وصولی')).toBeInTheDocument();
  });

  it('an admin sees who has and who has not confirmed', () => {
    renderWithClient(<TaskActionSheet task={adminTask([person('زید', ACKED_AT), person('عمر')])} isAdmin {...handlers} />);
    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByText('2 میں سے 1 نے وصول کیا')).toBeInTheDocument();
    const people = sheet.querySelector('[data-receipt-people]');
    expect(people).toHaveTextContent('زید');
    expect(people).toHaveTextContent('عمر');
    expect(within(sheet).queryByRole('button', { name: 'وصول کر لیا' })).not.toBeInTheDocument();
  });
});

describe('ReceiptDetailRow — the one row added to Task Details', () => {
  it('admin: the status and every person; marked to stay out of the PNG export', () => {
    useAuthStore.setState({ user: { id: 'a1', role: 'admin', name: 'Admin' } });
    render(<ReceiptDetailRow task={adminTask([person('زید', ACKED_AT), person('عمر')])} />);
    const row = document.querySelector('[data-receipt-detail]');
    expect(row).toHaveAttribute('data-export-exclude');
    expect(row).toHaveTextContent('وصولی:');
    expect(row).toHaveTextContent('2 میں سے 1 نے وصول کیا');
    expect(row).toHaveTextContent('عمر');
  });

  it('user: their own state only', () => {
    render(<ReceiptDetailRow task={userTask()} />);
    expect(document.querySelector('[data-receipt-detail]')).toHaveTextContent('وصول نہیں ہوا');
  });

  it('renders NOTHING for a task from before the feature (or from a backend without receipts)', () => {
    const { container } = render(<ReceiptDetailRow task={{ ...baseTask, receipt: null, myReceipt: null }} />);
    expect(container).toBeEmptyDOMElement();
    const { container: noFields } = render(<ReceiptDetailRow task={baseTask} />);
    expect(noFields).toBeEmptyDOMElement();
  });
});
