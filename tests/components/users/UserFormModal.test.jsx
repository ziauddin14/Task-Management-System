import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserFormModal from '../../../src/components/users/UserFormModal.jsx';

vi.mock('../../../src/services/users.api.js', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUsers: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createUser, updateUser } from '../../../src/services/users.api.js';
import toast from 'react-hot-toast';

const existingUser = { id: 'u1', name: 'Ali', email: 'ali@example.com', responsibility: 'IT', role: 'user', isActive: true };

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserFormModal isOpen onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('UserFormModal (docs/08-ui-ux.md §8, docs/09-frontend-features.md §9)', () => {
  beforeEach(() => {
    createUser.mockReset();
    updateUser.mockReset();
    toast.success.mockClear();
  });

  it('create mode: submitting empty shows required-field errors and does not call createUser', async () => {
    renderModal({ mode: 'create' });

    fireEvent.click(screen.getByText('محفوظ کریں'));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('A valid email is required')).toBeInTheDocument();
    expect(screen.getByText('Responsibility is required')).toBeInTheDocument();
    expect(createUser).not.toHaveBeenCalled();
  });

  it('create mode: a valid submission calls createUser (no isActive field) and closes', async () => {
    createUser.mockResolvedValue({ id: 'u2', name: 'Bilal' });
    const onClose = vi.fn();
    renderModal({ mode: 'create', onClose });

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'Bilal' } });
    fireEvent.change(screen.getByLabelText('ای میل'), { target: { value: 'bilal@example.com' } });
    fireEvent.change(screen.getByLabelText('ذمہ داری'), { target: { value: 'IT' } });

    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({ name: 'Bilal', email: 'bilal@example.com', responsibility: 'IT', role: 'user' })
    );
    expect(toast.success).toHaveBeenCalledWith('User kamyabi se bana diya gaya');
    expect(onClose).toHaveBeenCalled();
  });

  it('create mode: a duplicate email (409) shows an inline error under Email, not just a toast', async () => {
    createUser.mockRejectedValue(Object.assign(new Error('Yeh email pehle se register hai'), { code: 'DUPLICATE_EMAIL' }));
    renderModal({ mode: 'create' });

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'Bilal' } });
    fireEvent.change(screen.getByLabelText('ای میل'), { target: { value: 'bilal@example.com' } });
    fireEvent.change(screen.getByLabelText('ذمہ داری'), { target: { value: 'IT' } });

    fireEvent.click(screen.getByText('محفوظ کریں'));

    expect(await screen.findByText('Yeh email pehle se register hai')).toBeInTheDocument();
  });

  it('edit mode: Email is disabled and pre-filled; other fields pre-fill from the user', async () => {
    renderModal({ mode: 'edit', user: existingUser });

    expect(await screen.findByDisplayValue('Ali')).toBeInTheDocument();
    const emailInput = screen.getByLabelText('ای میل');
    expect(emailInput).toHaveValue('ali@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('edit mode: an unrelated field change saves directly, no confirmation needed', async () => {
    updateUser.mockResolvedValue({ ...existingUser, name: 'Ali Updated' });
    renderModal({ mode: 'edit', user: existingUser });

    await screen.findByDisplayValue('Ali');
    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'Ali Updated' } });
    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith('u1', { name: 'Ali Updated', responsibility: 'IT', role: 'user', isActive: true })
    );
  });

  it('edit mode: unchecking Active shows a confirmation; Cancel does not call updateUser', async () => {
    renderModal({ mode: 'edit', user: existingUser });

    await screen.findByDisplayValue('Ali');
    fireEvent.click(screen.getByLabelText('فعال'));
    fireEvent.click(screen.getByText('محفوظ کریں'));

    const confirmDialog = await screen.findByRole('dialog', { name: 'User Band Karein' });
    expect(
      within(confirmDialog).getByText('اس صارف کو بند کرنے سے وہ اب لاگ ان نہیں کر سکیں گے۔ کیا جاری رکھیں؟')
    ).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();

    fireEvent.click(within(confirmDialog).getByText('منسوخ کریں'));
    expect(updateUser).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'User Band Karein' })).not.toBeInTheDocument();
  });

  it('edit mode: confirming the deactivation calls updateUser with isActive:false', async () => {
    updateUser.mockResolvedValue({ ...existingUser, isActive: false });
    renderModal({ mode: 'edit', user: existingUser });

    await screen.findByDisplayValue('Ali');
    fireEvent.click(screen.getByLabelText('فعال'));
    fireEvent.click(screen.getByText('محفوظ کریں'));
    fireEvent.click(await screen.findByText('Haan, Jari Rakhein'));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith('u1', { name: 'Ali', responsibility: 'IT', role: 'user', isActive: false })
    );
  });
});
