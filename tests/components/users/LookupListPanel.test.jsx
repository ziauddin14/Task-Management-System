import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LookupListPanel from '../../../src/components/users/LookupListPanel.jsx';

vi.mock('../../../src/services/lookupLists.api.js', () => ({
  getLookupList: vi.fn().mockResolvedValue([
    { id: 'r1', listType: 'responsibility', value: 'IT', isActive: true, sortOrder: 0 },
    { id: 'r2', listType: 'responsibility', value: 'Finance', isActive: true, sortOrder: 1 },
  ]),
  createLookupValue: vi.fn(),
  updateLookupValue: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createLookupValue, updateLookupValue } from '../../../src/services/lookupLists.api.js';
import toast from 'react-hot-toast';

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LookupListPanel />
    </QueryClientProvider>
  );
}

describe('LookupListPanel (Phase 10.5 §1 placement decision, docs/09-frontend-features.md §10)', () => {
  beforeEach(() => {
    createLookupValue.mockReset();
    updateLookupValue.mockReset();
    toast.success.mockClear();
  });

  it('renders the active values list', async () => {
    renderPanel();
    expect(await screen.findByText('IT')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('adding a value calls createLookupValue and clears the input on success', async () => {
    createLookupValue.mockResolvedValue({ id: 'r3', listType: 'responsibility', value: 'HR' });
    renderPanel();
    await screen.findByText('IT');

    fireEvent.change(screen.getByLabelText('نئی ذمہ داری'), { target: { value: 'HR' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => expect(createLookupValue).toHaveBeenCalledWith({ listType: 'responsibility', value: 'HR' }));
    expect(toast.success).toHaveBeenCalledWith('ویلیو شامل کر دی گئی');
    expect(screen.getByLabelText('نئی ذمہ داری')).toHaveValue('');
  });

  it('a duplicate value (409) shows an inline error under the add-value input, not just a toast', async () => {
    createLookupValue.mockRejectedValue(
      Object.assign(new Error('Yeh value pehle se is list mein maujood hai.'), { code: 'DUPLICATE_LOOKUP_VALUE' })
    );
    renderPanel();
    await screen.findByText('IT');

    fireEvent.change(screen.getByLabelText('نئی ذمہ داری'), { target: { value: 'IT' } });
    fireEvent.click(screen.getByText('Add'));

    expect(await screen.findByText('Yeh value pehle se is list mein maujood hai.')).toBeInTheDocument();
  });

  it('inline edit: changing the value and saving calls updateLookupValue', async () => {
    updateLookupValue.mockResolvedValue({ id: 'r1', listType: 'responsibility', value: 'Information Technology', sortOrder: 0 });
    renderPanel();
    await screen.findByText('IT');

    fireEvent.click(screen.getAllByText('ترمیم کریں')[0]);
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'Information Technology' } });
    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() =>
      expect(updateLookupValue).toHaveBeenCalledWith('r1', { value: 'Information Technology', sortOrder: 0 })
    );
  });

  it('deactivate: shows a confirmation naming the reactivation limitation; Cancel does not call updateLookupValue', async () => {
    renderPanel();
    await screen.findByText('IT');

    fireEvent.click(screen.getAllByText('Deactivate')[0]);

    expect(
      await screen.findByText(
        'اس ویلیو کو بند کرنے کے بعد اسے دوبارہ ایکٹیو کرنا فی الحال اس اسکرین سے ممکن نہیں (صرف ایکٹیو ویلیوز یہاں دکھائی دیتی ہیں)۔ واقعی بند کرنا چاہتے ہیں؟'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('منسوخ کریں'));
    expect(updateLookupValue).not.toHaveBeenCalled();
  });

  it('deactivate: confirming calls updateLookupValue with isActive:false', async () => {
    updateLookupValue.mockResolvedValue({ id: 'r1', listType: 'responsibility', value: 'IT', isActive: false });
    renderPanel();
    await screen.findByText('IT');

    fireEvent.click(screen.getAllByText('Deactivate')[0]);
    fireEvent.click(await screen.findByText('ہاں، بند کریں'));

    await waitFor(() => expect(updateLookupValue).toHaveBeenCalledWith('r1', { isActive: false }));
  });
});
