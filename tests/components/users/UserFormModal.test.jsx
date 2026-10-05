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
    expect(toast.success).toHaveBeenCalledWith('صارف کامیابی سے بنا دیا گیا');
    expect(onClose).toHaveBeenCalled();
  });

  // The Save button used to stay enabled for the whole request: the submit handler did not return
  // the save's promise, so react-hook-form's isSubmitting flipped back at once.
  it('create mode: Save is busy (disabled, aria-busy) for as long as the request runs, then the modal closes', async () => {
    let resolveCreate;
    createUser.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const onClose = vi.fn();
    renderModal({ mode: 'create', onClose });
    const save = screen.getByRole('button', { name: 'محفوظ کریں' });
    expect(save).toBeEnabled();

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'Bilal' } });
    fireEvent.change(screen.getByLabelText('ای میل'), { target: { value: 'bilal@example.com' } });
    fireEvent.change(screen.getByLabelText('ذمہ داری'), { target: { value: 'IT' } });
    fireEvent.click(save);

    await waitFor(() => expect(createUser).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(save).toBeDisabled());
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toHaveTextContent('محفوظ کریں'); // the label does not change while busy
    expect(onClose).not.toHaveBeenCalled();

    // A second press while busy cannot send the request again.
    fireEvent.click(save);
    expect(createUser).toHaveBeenCalledTimes(1);

    resolveCreate({ id: 'u2', name: 'Bilal' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(save).toBeEnabled();
    expect(save).not.toHaveAttribute('aria-busy', 'true');
  });

  it('create mode: Save becomes usable again after a failed request', async () => {
    let rejectCreate;
    createUser.mockReturnValue(new Promise((_resolve, reject) => { rejectCreate = reject; }));
    renderModal({ mode: 'create' });
    const save = screen.getByRole('button', { name: 'محفوظ کریں' });

    fireEvent.change(screen.getByLabelText('نام'), { target: { value: 'Bilal' } });
    fireEvent.change(screen.getByLabelText('ای میل'), { target: { value: 'bilal@example.com' } });
    fireEvent.change(screen.getByLabelText('ذمہ داری'), { target: { value: 'IT' } });
    fireEvent.click(save);
    await waitFor(() => expect(save).toBeDisabled());

    rejectCreate(Object.assign(new Error('Yeh email pehle se register hai'), { code: 'DUPLICATE_EMAIL' }));

    expect(await screen.findByText('Yeh email pehle se register hai')).toBeInTheDocument();
    await waitFor(() => expect(save).toBeEnabled());
  });

  it('edit mode: Save is also busy during the save that follows the deactivation confirmation', async () => {
    let resolveUpdate;
    updateUser.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    const onClose = vi.fn();
    renderModal({ mode: 'edit', user: existingUser, onClose });
    await screen.findByDisplayValue('Ali');
    const save = screen.getByRole('button', { name: 'محفوظ کریں' });

    fireEvent.click(screen.getByLabelText('فعال'));
    fireEvent.click(save);
    // Waiting for the confirmation is not "saving": nothing has been sent yet.
    const confirm = await screen.findByText('ہاں، جاری رکھیں');
    expect(updateUser).not.toHaveBeenCalled();
    await waitFor(() => expect(save).toBeEnabled());

    fireEvent.click(confirm);

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(save).toBeDisabled());
    expect(save).toHaveAttribute('aria-busy', 'true');

    resolveUpdate({ ...existingUser, isActive: false });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
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

    const confirmDialog = await screen.findByRole('dialog', { name: 'صارف بند کریں' });
    expect(
      within(confirmDialog).getByText('اس صارف کو بند کرنے سے وہ اب لاگ ان نہیں کر سکیں گے۔ کیا جاری رکھیں؟')
    ).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();

    fireEvent.click(within(confirmDialog).getByText('منسوخ کریں'));
    expect(updateUser).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'صارف بند کریں' })).not.toBeInTheDocument();
  });

  it('edit mode: confirming the deactivation calls updateUser with isActive:false', async () => {
    updateUser.mockResolvedValue({ ...existingUser, isActive: false });
    renderModal({ mode: 'edit', user: existingUser });

    await screen.findByDisplayValue('Ali');
    fireEvent.click(screen.getByLabelText('فعال'));
    fireEvent.click(screen.getByText('محفوظ کریں'));
    fireEvent.click(await screen.findByText('ہاں، جاری رکھیں'));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith('u1', { name: 'Ali', responsibility: 'IT', role: 'user', isActive: false })
    );
  });
});
