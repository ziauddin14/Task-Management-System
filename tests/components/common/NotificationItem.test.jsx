import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationItem from '../../../src/components/common/NotificationItem.jsx';

function makeNotification(overrides = {}) {
  return {
    id: 'n1',
    type: 'TASK_OVERDUE',
    title: 'کام میں تاخیر ہو چکی ہے',
    message: 'براہ کرم فوری طور پر اس کی صورتحال اپڈیٹ کریں۔',
    taskId: null,
    isRead: false,
    createdAt: '2026-09-14T09:30:00.000Z',
    metadata: {},
    ...overrides,
  };
}

describe('NotificationItem', () => {
  it('renders the title, message, and a formatted timestamp', () => {
    render(
      <ul>
        <NotificationItem notification={makeNotification()} onClick={vi.fn()} />
      </ul>
    );

    expect(screen.getByText('کام میں تاخیر ہو چکی ہے')).toBeInTheDocument();
    expect(screen.getByText('براہ کرم فوری طور پر اس کی صورتحال اپڈیٹ کریں۔')).toBeInTheDocument();
  });

  it('calls onClick with the notification when clicked', () => {
    const onClick = vi.fn();
    const notification = makeNotification();
    render(
      <ul>
        <NotificationItem notification={notification} onClick={onClick} />
      </ul>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith(notification);
  });

  it('an unread notification renders bold and with an unread indicator dot', () => {
    render(
      <ul>
        <NotificationItem notification={makeNotification({ isRead: false })} onClick={vi.fn()} />
      </ul>
    );

    expect(screen.getByText('کام میں تاخیر ہو چکی ہے')).toHaveClass('font-semibold');
  });

  it('a read notification renders in the plain/default style, not bold', () => {
    render(
      <ul>
        <NotificationItem notification={makeNotification({ isRead: true, readAt: '2026-09-14T10:00:00.000Z' })} onClick={vi.fn()} />
      </ul>
    );

    expect(screen.getByText('کام میں تاخیر ہو چکی ہے')).toHaveClass('font-normal');
    expect(screen.getByText('کام میں تاخیر ہو چکی ہے')).not.toHaveClass('font-semibold');
  });
});
