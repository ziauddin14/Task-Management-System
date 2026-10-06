import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import UserTable from '../../../src/components/users/UserTable.jsx';
import { setViewportWidth, resetViewport } from '../../helpers/viewport.js';

const users = [
  { id: 'u1', name: 'Ali', responsibility: 'نگران مجلس عشر', email: 'ali@example.com', role: 'user', isActive: true },
  { id: 'u2', name: 'Bilal', responsibility: 'IT', email: 'bilal@example.com', role: 'admin', isActive: false },
];

// The redesigned users list (approved mockup "5 — صارفین"): a restyle — every column is still there.
describe('UserTable', () => {
  afterEach(() => resetViewport());

  it('a row renders EVERY column: name, ذمہ داری, email, role, status and the edit action', () => {
    render(<UserTable users={users} onEdit={vi.fn()} />);

    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['نام', 'ذمہ داری', 'ای میل', 'کردار', 'کیفیت', 'اقدامات']);
    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Ali', 'نگران مجلس عشر', 'ali@example.com', 'user', 'فعال', 'ترمیم کریں']);
    expect(within(second).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Bilal', 'IT', 'bilal@example.com', 'admin', 'غیر فعال', 'ترمیم کریں']);
  });

  it('the name has an initial beside it that is NOT part of the page text; the email reads left-to-right', () => {
    render(<UserTable users={users} onEdit={vi.fn()} />);
    const [, first] = screen.getAllByRole('row');
    const [nameCell, , emailCell] = within(first).getAllByRole('cell');

    const avatar = nameCell.querySelector('[data-initial]');
    expect(avatar).toHaveAttribute('data-initial', 'A');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toBeEmptyDOMElement(); // the letter is drawn by CSS, so "Ali" stays the only text
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(emailCell).toHaveAttribute('dir', 'ltr');
    expect(emailCell).toHaveClass('text-right');
  });

  it('role and status are chips: User blue, Admin green; فعال green with a dot, غیر فعال grey', () => {
    render(<UserTable users={users} onEdit={vi.fn()} />);
    expect(screen.getByText('user')).toHaveClass('bg-tk-ongoing-tint', 'text-tk-ongoing-text', 'capitalize');
    expect(screen.getByText('admin')).toHaveClass('bg-tk-closed-tint');
    expect(screen.getByText('فعال')).toHaveClass('bg-tk-closed-tint');
    expect(screen.getByText('غیر فعال')).toHaveClass('bg-tk-track');
  });

  it('"ترمیم کریں" still hands that user to onEdit', () => {
    const onEdit = vi.fn();
    render(<UserTable users={users} onEdit={onEdit} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'ترمیم کریں' })[1]);
    expect(onEdit).toHaveBeenCalledWith(users[1]);
  });

  it('the loading, error and empty states are what they were', () => {
    const { rerender, container } = render(<UserTable users={[]} isLoading onEdit={vi.fn()} />);
    expect(container.querySelector('[data-phrase-line]')).not.toBeNull();

    rerender(<UserTable users={[]} isError onEdit={vi.fn()} />);
    expect(screen.getByText('صارفین لوڈ نہیں ہو سکے۔ دوبارہ کوشش کریں۔')).toBeInTheDocument();

    rerender(<UserTable users={[]} onEdit={vi.fn()} />);
    expect(screen.getByText('اس تلاش سے مطابقت رکھنے والا کوئی صارف نہیں ملا۔')).toBeInTheDocument();
  });

  it('below 768px each user is a stacked card carrying the same six pieces — no table', () => {
    setViewportWidth(390);
    const onEdit = vi.fn();
    const { container } = render(<UserTable users={users} onEdit={onEdit} />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = container.querySelectorAll('[data-user-cards] > li');
    expect(cards).toHaveLength(2);
    ['Ali', 'نگران مجلس عشر', 'ali@example.com', 'user', 'فعال', 'ترمیم کریں'].forEach((piece) => expect(cards[0]).toHaveTextContent(piece));
    fireEvent.click(within(cards[0]).getByRole('button', { name: 'ترمیم کریں' }));
    expect(onEdit).toHaveBeenCalledWith(users[0]);
    expect(within(cards[0]).getByRole('button', { name: 'ترمیم کریں' })).toHaveClass('h-tk-touch');
  });

  it.each([[768], [1366]])('at %ipx it is the table', (width) => {
    setViewportWidth(width);
    render(<UserTable users={users} onEdit={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
