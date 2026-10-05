import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SyntheticRatingDialog from '../../../src/components/task/SyntheticRatingDialog.jsx';

vi.mock('../../../src/services/tasks.api.js', () => ({
  editSyntheticRating: vi.fn(),
  removeSyntheticRating: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { editSyntheticRating, removeSyntheticRating } from '../../../src/services/tasks.api.js';
import toast from 'react-hot-toast';

// A closed task at a REAL 0% whose "بہتر" rating is developer-assigned from an assumed 80%.
const task = {
  id: 't2',
  codeNumber: '250103',
  title: 'میننجمنٹ مل کر ذمہ داران کو بہتر کریں',
  status: 'closed',
  completionPercent: 0,
  performanceRating: 'good',
  syntheticRating: {
    isSynthetic: true,
    assumedPercent: 80,
    assignedAt: '2026-10-05T09:20:22.000Z',
    history: [{ at: '2026-10-05T09:20:22.000Z', by: 'system:script', fromPercent: null, toPercent: 80, fromRating: '-', toRating: 'good', note: 'initial synthetic rating' }],
  },
};

function renderDialog(props = {}) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <SyntheticRatingDialog isOpen onClose={onClose} task={task} {...props} />
    </QueryClientProvider>
  );
  return { ...utils, onClose, queryClient, invalidate };
}
const percentInput = () => screen.getByLabelText(/نیا فرض کردہ فیصد/);
const saveButton = () => screen.getByRole('button', { name: 'محفوظ کریں' });
const preview = () => document.getElementById('synthetic-percent-preview');

describe('SyntheticRatingDialog (admin: change a synthetic rating)', () => {
  beforeEach(() => {
    editSyntheticRating.mockReset();
    removeSyntheticRating.mockReset();
    toast.success.mockClear();
  });

  it('is titled "تخمینی درجہ بندی تبدیل کریں" and names the task', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'تخمینی درجہ بندی تبدیل کریں' });
    expect(dialog).toHaveTextContent('250103');
    expect(dialog).toHaveTextContent('میننجمنٹ مل کر ذمہ داران کو بہتر کریں');
  });

  it('shows the REAL completion percent and the current synthetic rating side by side — the real one is not editable', () => {
    renderDialog();

    const real = screen.getByText('اصل تکمیل فیصد').parentElement;
    const current = screen.getByText('موجودہ تخمینی درجہ بندی').parentElement;
    expect(real).toHaveTextContent('0%');
    expect(current).toHaveTextContent('بہتر');
    expect(current).toHaveTextContent('80%');
    // The only number field is the assumed percent.
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
  });

  it('starts with the current assumed percent, limited to 0–100', () => {
    renderDialog();
    expect(percentInput()).toHaveValue(80);
    expect(percentInput()).toHaveAttribute('min', '0');
    expect(percentInput()).toHaveAttribute('max', '100');
  });

  it.each([
    ['95', 'ممتاز'],
    ['90', 'ممتاز'],
    ['89', 'بہتر'],
    ['80', 'بہتر'],
    ['79', 'مناسب'],
    ['70', 'مناسب'],
    ['69', 'کمزور'],
    ['0', 'کمزور'],
  ])('live preview: typing %s shows the band "%s"', (typed, label) => {
    renderDialog();
    fireEvent.change(percentInput(), { target: { value: typed } });
    expect(preview()).toHaveTextContent(`نتیجہ:${label}`);
  });

  it.each(['', '-1', '101', '250'])('an invalid percent (%j) shows a message and cannot be saved', (typed) => {
    renderDialog();
    fireEvent.change(percentInput(), { target: { value: typed } });

    expect(preview()).toHaveTextContent('0 سے 100 کے درمیان فیصد درج کریں');
    expect(saveButton()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(editSyntheticRating).not.toHaveBeenCalled();
  });

  it('saving sends only the assumed percent (and the note) for that task, then closes with a confirmation', async () => {
    editSyntheticRating.mockResolvedValue({ ...task, performanceRating: 'excellent', syntheticRating: { ...task.syntheticRating, assumedPercent: 92 } });
    const { onClose } = renderDialog();

    fireEvent.change(percentInput(), { target: { value: '92' } });
    fireEvent.change(screen.getByLabelText('نوٹ (اختیاری)'), { target: { value: '  جائزے کے بعد  ' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(editSyntheticRating).toHaveBeenCalledWith('t2', { assumedPercent: 92, note: 'جائزے کے بعد' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('تخمینی درجہ بندی تبدیل کر دی گئی');
    expect(removeSyntheticRating).not.toHaveBeenCalled();
  });

  it('sends no note when none was typed', async () => {
    editSyntheticRating.mockResolvedValue(task);
    renderDialog();

    fireEvent.change(percentInput(), { target: { value: '55' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(editSyntheticRating).toHaveBeenCalledWith('t2', { assumedPercent: 55, note: undefined }));
  });

  it('refreshes the task list and the KPI summary after a save', async () => {
    editSyntheticRating.mockResolvedValue(task);
    const { invalidate, queryClient } = renderDialog();

    fireEvent.change(percentInput(), { target: { value: '60' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(queryClient.getQueryData(['task', 't2'])).toEqual(task);
  });

  it('while saving: the button keeps its label, is busy and disabled, and the shared loading phrase shows', async () => {
    let resolveSave;
    editSyntheticRating.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    const { container } = renderDialog();

    fireEvent.change(percentInput(), { target: { value: '85' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveButton()).toHaveAttribute('aria-busy', 'true'));
    expect(saveButton()).toBeDisabled();
    expect(saveButton()).toHaveTextContent('محفوظ کریں');
    expect(container.ownerDocument.querySelector('[data-busy-strip] [data-phrase-line]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'ہٹائیں' })).toBeDisabled();
    fireEvent.click(saveButton());
    expect(editSyntheticRating).toHaveBeenCalledTimes(1);

    resolveSave(task);
  });

  it('if the save fails the dialog stays open with what was typed', async () => {
    editSyntheticRating.mockRejectedValue(new Error('This task does not have a synthetic rating.'));
    const { onClose } = renderDialog();

    fireEvent.change(percentInput(), { target: { value: '33' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(editSyntheticRating).toHaveBeenCalled());
    await waitFor(() => expect(saveButton()).not.toHaveAttribute('aria-busy'));
    expect(onClose).not.toHaveBeenCalled();
    expect(percentInput()).toHaveValue(33);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('"منسوخ کریں" closes without saving', () => {
    const { onClose } = renderDialog();
    fireEvent.change(percentInput(), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'منسوخ کریں' }));
    expect(onClose).toHaveBeenCalled();
    expect(editSyntheticRating).not.toHaveBeenCalled();
  });

  describe('"ہٹائیں" — remove the synthetic rating', () => {
    it('asks for confirmation first, and removes nothing until confirmed', () => {
      renderDialog();

      fireEvent.click(screen.getByRole('button', { name: 'ہٹائیں' }));

      const confirm = screen.getByRole('dialog', { name: 'تخمینی درجہ بندی ہٹائیں' });
      expect(confirm).toHaveTextContent('250103');
      expect(confirm).toHaveTextContent('بغیر درجہ بندی');
      expect(confirm).toHaveTextContent('اصل تکمیل فیصد اور کیفیت میں کوئی تبدیلی نہیں ہوگی');
      expect(removeSyntheticRating).not.toHaveBeenCalled();
    });

    it('cancelling the confirmation returns to the edit dialog, nothing removed', () => {
      const { onClose } = renderDialog();
      fireEvent.click(screen.getByRole('button', { name: 'ہٹائیں' }));

      fireEvent.click(within(screen.getByRole('dialog', { name: 'تخمینی درجہ بندی ہٹائیں' })).getByRole('button', { name: 'منسوخ کریں' }));

      expect(screen.getByRole('dialog', { name: 'تخمینی درجہ بندی تبدیل کریں' })).toBeInTheDocument();
      expect(removeSyntheticRating).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('confirming calls the remove endpoint for that task, then closes with a confirmation', async () => {
      removeSyntheticRating.mockResolvedValue({ ...task, performanceRating: '-', syntheticRating: { ...task.syntheticRating, isSynthetic: false } });
      const { onClose, invalidate } = renderDialog();

      fireEvent.change(screen.getByLabelText('نوٹ (اختیاری)'), { target: { value: 'غلطی سے لگی تھی' } });
      fireEvent.click(screen.getByRole('button', { name: 'ہٹائیں' }));
      fireEvent.click(screen.getByRole('button', { name: 'ہاں، ہٹائیں' }));

      await waitFor(() => expect(removeSyntheticRating).toHaveBeenCalledWith('t2', { note: 'غلطی سے لگی تھی' }));
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith('تخمینی درجہ بندی ہٹا دی گئی');
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboardSummary'] });
      expect(editSyntheticRating).not.toHaveBeenCalled();
    });

    it('if the removal fails, it goes back to the edit dialog and stays open', async () => {
      removeSyntheticRating.mockRejectedValue(new Error('Server error'));
      const { onClose } = renderDialog();

      fireEvent.click(screen.getByRole('button', { name: 'ہٹائیں' }));
      fireEvent.click(screen.getByRole('button', { name: 'ہاں، ہٹائیں' }));

      expect(await screen.findByRole('dialog', { name: 'تخمینی درجہ بندی تبدیل کریں' })).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  it('lists the change history an admin is sent, newest first', () => {
    const history = [
      ...task.syntheticRating.history,
      { at: '2026-10-06T10:00:00.000Z', by: 'admin-id', fromPercent: 80, toPercent: 60, fromRating: 'good', toRating: 'weak', note: 'کم کیا گیا' },
    ];
    renderDialog({ task: { ...task, syntheticRating: { ...task.syntheticRating, history } } });

    expect(screen.getByText('تبدیلیوں کی سرگزشت (2)')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('80% → 60%');
    expect(items[0]).toHaveTextContent('کم کیا گیا');
    expect(items[1]).toHaveTextContent('—% → 80%');
  });

  it('shows no history section when none was sent', () => {
    renderDialog({ task: { ...task, syntheticRating: { isSynthetic: true, assumedPercent: 80, assignedAt: task.syntheticRating.assignedAt } } });
    expect(screen.queryByText(/تبدیلیوں کی سرگزشت/)).not.toBeInTheDocument();
  });

  it('re-opened for another task, it starts from that task\'s percent with an empty note', () => {
    const { rerender, queryClient } = renderDialog();
    fireEvent.change(percentInput(), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('نوٹ (اختیاری)'), { target: { value: 'draft' } });

    const other = { ...task, id: 't9', codeNumber: '250124', performanceRating: 'weak', syntheticRating: { isSynthetic: true, assumedPercent: 40, assignedAt: task.syntheticRating.assignedAt } };
    rerender(
      <QueryClientProvider client={queryClient}>
        <SyntheticRatingDialog isOpen onClose={vi.fn()} task={other} />
      </QueryClientProvider>
    );

    expect(percentInput()).toHaveValue(40);
    expect(screen.getByLabelText('نوٹ (اختیاری)')).toHaveValue('');
  });

  it('renders nothing when closed, or with no task', () => {
    const { container } = renderDialog({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    const { container: noTask } = renderDialog({ task: null });
    expect(noTask).toBeEmptyDOMElement();
  });
});
