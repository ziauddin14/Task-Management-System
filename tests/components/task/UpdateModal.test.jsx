import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UpdateModal from '../../../src/components/task/UpdateModal.jsx';

vi.mock('../../../src/services/tasks.api.js', () => ({
  getTask: vi.fn().mockResolvedValue({
    id: 't1',
    codeNumber: '260801',
    title: 'Sample task',
    deadline: '2026-09-01T00:00:00.000Z',
    status: 'ongoing',
    performanceRating: '-',
    completionPercent: 40,
    timeStatus: { type: 'remaining', days: 5 },
  }),
  updateTask: vi.fn().mockResolvedValue({ id: 't1', status: 'ongoing' }),
  closeTask: vi.fn(),
}));
vi.mock('../../../src/services/taskUpdates.api.js', () => ({
  createTaskUpdate: vi.fn().mockResolvedValue({
    update: { id: 'u1' },
    task: { id: 't1', title: 'Sample task', completionPercent: 70, status: 'ongoing' },
  }),
  getTaskUpdates: vi.fn().mockResolvedValue({ items: [], meta: { page: 1, totalPages: 1 } }),
}));
vi.mock('../../../src/services/uploads.api.js', () => ({ uploadAttachment: vi.fn() }));
vi.mock('../../../src/services/users.api.js', () => ({
  getUsers: vi.fn().mockResolvedValue({
    items: [
      { id: 'u1', name: 'Ali', responsibility: 'IT', isActive: true },
      { id: 'u2', name: 'Bilal', responsibility: 'Media', isActive: true },
    ],
    meta: {},
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { createTaskUpdate } from '../../../src/services/taskUpdates.api.js';
import { getTaskUpdates } from '../../../src/services/taskUpdates.api.js';
import { getTask, updateTask, closeTask } from '../../../src/services/tasks.api.js';
import { getUsers } from '../../../src/services/users.api.js';
import { uploadAttachment } from '../../../src/services/uploads.api.js';
import toast from 'react-hot-toast';

const CLOSE_QUESTION = 'اس کام کو بند کرنے کے بعد کوئی نئی اپڈیٹ درج نہیں کی جا سکے گی۔ کیا واقعی بند کرنا چاہتے ہیں؟';
const DESCRIPTION_ERROR = 'تفصیل کم از کم 3 حروف کی ہونی چاہیے';
const button = (name) => screen.getByRole('button', { name });
const typeReply = (text, percent) => {
  if (text !== undefined) fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: text } });
  if (percent !== undefined) fireEvent.change(screen.getByLabelText('تکمیل فیصد'), { target: { value: String(percent) } });
};
const selectFile = (file) => fireEvent.change(screen.getByLabelText('منسلکہ فائل'), { target: { files: [file] } });

function renderModal(props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UpdateModal isOpen taskId="t1" onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('UpdateModal (docs/08-ui-ux.md §7, docs/09-frontend-features.md §3)', () => {
  beforeEach(() => {
    createTaskUpdate.mockClear();
    getTaskUpdates.mockClear();
    updateTask.mockClear();
    getUsers.mockClear();
    toast.success.mockClear();
    closeTask.mockReset();
    closeTask.mockResolvedValue({ id: 't1', codeNumber: '260801', title: 'Sample task', status: 'closed', completionPercent: 40 });
    uploadAttachment.mockReset();
  });

  it('pre-fills completion % from the task and shows the read-only header', async () => {
    renderModal();
    expect(await screen.findByText('Sample task')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(40));
  });

  it('rejects a description under 3 characters', async () => {
    renderModal();
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByText('محفوظ کریں'));

    expect(await screen.findByText('تفصیل کم از کم 3 حروف کی ہونی چاہیے')).toBeInTheDocument();
    expect(createTaskUpdate).not.toHaveBeenCalled();
  });

  it('the % slider and number input stay in sync', async () => {
    renderModal();
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('Completion % slider'), { target: { value: '75' } });
    expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(75);
  });

  it("a normal user's valid submission (no attachment) calls createTaskUpdate, toasts, and closes — as always", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await screen.findByText('Sample task');

    fireEvent.change(screen.getByLabelText('تفصیل'), { target: { value: 'Made real progress today' } });
    fireEvent.click(screen.getByText('محفوظ کریں'));

    await waitFor(() =>
      expect(createTaskUpdate).toHaveBeenCalledWith('t1', { description: 'Made real progress today', completionPercent: 40 })
    );
    expect(toast.success).toHaveBeenCalledWith('اپڈیٹ محفوظ ہو گئی');
    expect(onClose).toHaveBeenCalled();
  });

  it('lazily fetches Previous Updates only after "Purani Updates dekhein" is clicked', async () => {
    renderModal();
    await screen.findByText('Sample task');

    expect(getTaskUpdates).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('پرانی اپڈیٹس دیکھیں'));

    await waitFor(() => expect(getTaskUpdates).toHaveBeenCalled());
    expect(screen.getByText('پرانی اپڈیٹس چھپائیں')).toBeInTheDocument();
  });

  // Prompt — Close Task moved here from the table row, as a third footer button next to
  // Save/Cancel; same Admin-only / not-already-closed visibility rule as before.
  describe('Close Task footer button', () => {
    it('is not shown for a non-Admin user', async () => {
      renderModal({ isAdmin: false });
      await screen.findByText('Sample task');
      expect(screen.queryByText('کام بند کریں')).not.toBeInTheDocument();
    });

    it('Admin + not-already-closed task: shows the button, which opens the inline close step (the existing wording)', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');

      fireEvent.click(button('کام بند کریں'));

      expect(await screen.findByText(CLOSE_QUESTION)).toBeInTheDocument();
      expect(button('ہاں، بند کریں')).toBeInTheDocument();
      // The same dialog — no second one on top — and the form is out of view, not gone.
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(screen.queryByRole('button', { name: 'محفوظ کریں' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('تفصیل', { selector: 'textarea' })).toBeInTheDocument();
      expect(closeTask).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('Admin + already-closed task: the button is hidden entirely (not just disabled)', async () => {
      getTask.mockResolvedValueOnce({
        id: 't1',
        codeNumber: '260801',
        title: 'Sample task',
        deadline: '2026-09-01T00:00:00.000Z',
        status: 'closed',
        performanceRating: '-',
        completionPercent: 100,
        timeStatus: { type: 'early', days: 1 },
      });
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      expect(screen.queryByText('کام بند کریں')).not.toBeInTheDocument();
    });
  });

  // Prompt — reassign mid-task without losing update history; same Admin-only/not-closed
  // visibility rule as Close Task, and "نہیں" leads to the same close step (no duplicated flow).
  describe('Change Assignee footer button', () => {
    it('is not shown for a non-Admin user', async () => {
      renderModal({ isAdmin: false });
      await screen.findByText('Sample task');
      expect(screen.queryByText('ذمہ دار تبدیل کریں')).not.toBeInTheDocument();
    });

    it('Admin + already-closed task: the button is hidden entirely', async () => {
      getTask.mockResolvedValueOnce({
        id: 't1',
        codeNumber: '260801',
        title: 'Sample task',
        deadline: '2026-09-01T00:00:00.000Z',
        status: 'closed',
        performanceRating: '-',
        completionPercent: 100,
        timeStatus: { type: 'early', days: 1 },
      });
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      expect(screen.queryByText('ذمہ دار تبدیل کریں')).not.toBeInTheDocument();
    });

    it('opens the inline confirmation question first, before any dropdown is shown', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));

      expect(screen.getByText('کیا آپ یہ کام کسی دوسرے ذمہ دار کو دینا چاہتے ہیں؟')).toBeInTheDocument();
      expect(screen.queryByLabelText('نیا ذمہ دار منتخب کریں')).not.toBeInTheDocument();
      expect(getUsers).not.toHaveBeenCalled();
    });

    it('"نہیں" leads to the close step — the exact same flow as the standalone Close Task button', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('نہیں'));

      expect(await screen.findByText(CLOSE_QUESTION)).toBeInTheDocument();
      fireEvent.click(button('ہاں، بند کریں'));
      await waitFor(() => expect(closeTask).toHaveBeenCalledWith('t1'));
      expect(updateTask).not.toHaveBeenCalled();
    });

    it('"ہاں" reveals a dropdown sourced from the same assignable-users data as the Naya Kaam form', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));

      const select = await screen.findByLabelText('نیا ذمہ دار منتخب کریں');
      expect(getUsers).toHaveBeenCalledWith({ role: 'user', isActive: true });
      expect(screen.getByText('Ali')).toBeInTheDocument();
      expect(screen.getByText('Bilal')).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });

    // Prompt — a read-only field next to the dropdown auto-fills from the SELECTED person's own
    // User.responsibility (no separate input/selection of its own).
    it('shows a read-only Zimmedari field that auto-fills from the selected person, not before', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));
      const select = await screen.findByLabelText('نیا ذمہ دار منتخب کریں');

      const responsibilityField = screen.getByLabelText('ذمہ داری');
      expect(responsibilityField).toHaveTextContent('—');

      fireEvent.change(select, { target: { value: 'u2' } });
      expect(responsibilityField).toHaveTextContent('Media');

      fireEvent.change(select, { target: { value: 'u1' } });
      expect(responsibilityField).toHaveTextContent('IT');
    });

    it('selecting a person and saving replaces assignees, leaves status untouched, toasts, and closes — without posting a TaskUpdate', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));
      const select = await screen.findByLabelText('نیا ذمہ دار منتخب کریں');
      fireEvent.change(select, { target: { value: 'u2' } });
      fireEvent.click(screen.getByText('محفوظ کریں'));

      await waitFor(() => expect(updateTask).toHaveBeenCalledWith('t1', { assignees: ['u2'] }));
      expect(createTaskUpdate).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('ذمہ دار تبدیل کر دیا گیا');
      expect(onClose).toHaveBeenCalled();
    });

    it('Save stays disabled until a person is actually selected', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');

      fireEvent.click(screen.getByText('ذمہ دار تبدیل کریں'));
      fireEvent.click(screen.getByText('ہاں'));
      await screen.findByLabelText('نیا ذمہ دار منتخب کریں');

      expect(screen.getByText('محفوظ کریں')).toBeDisabled();
    });
  });

  // An admin's save no longer closes the dialog — so the task can be closed right here afterwards,
  // without finding it again in a list it may have left.
  describe("an admin's save keeps the dialog open", () => {
    it('saves, toasts, stays open: an empty form, the percent as saved, "اپڈیٹ محفوظ ہو گئی" in view', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');

      typeReply('آج کافی کام ہوا', 70);
      fireEvent.click(button('محفوظ کریں'));

      await waitFor(() => expect(createTaskUpdate).toHaveBeenCalledWith('t1', { description: 'آج کافی کام ہوا', completionPercent: 70 }));
      expect(toast.success).toHaveBeenCalledWith('اپڈیٹ محفوظ ہو گئی');
      expect(await screen.findByText('اپڈیٹ محفوظ ہو گئی')).toHaveAttribute('role', 'status');
      expect(screen.getByLabelText('تفصیل')).toHaveValue('');
      expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(70);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('never posts the same reply twice: saving the emptied form again shows the message and posts nothing', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply('آج کافی کام ہوا', 70);
      fireEvent.click(button('محفوظ کریں'));
      await screen.findByText('اپڈیٹ محفوظ ہو گئی');

      fireEvent.click(button('محفوظ کریں'));

      expect(await screen.findByText(DESCRIPTION_ERROR)).toBeInTheDocument();
      expect(createTaskUpdate).toHaveBeenCalledTimes(1);
    });

    it('the attachment goes with the save once, then the picker is fresh again', async () => {
      uploadAttachment.mockResolvedValue({ driveFileId: 'd1', fileName: 'report.pdf', url: 'https://drive/d1' });
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply('رپورٹ لگا دی', 70);
      selectFile(new File(['x'], 'report.pdf', { type: 'application/pdf' }));
      await waitFor(() => expect(button('محفوظ کریں')).not.toBeDisabled());
      expect(screen.getByText('report.pdf')).toBeInTheDocument();

      fireEvent.click(button('محفوظ کریں'));

      await waitFor(() =>
        expect(createTaskUpdate).toHaveBeenCalledWith('t1', {
          description: 'رپورٹ لگا دی',
          completionPercent: 70,
          attachment: { driveFileId: 'd1', fileName: 'report.pdf', url: 'https://drive/d1' },
        })
      );
      await screen.findByText('اپڈیٹ محفوظ ہو گئی');
      expect(screen.queryByText('report.pdf')).not.toBeInTheDocument();
    });

    it('the saved line goes once a new reply is started', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply('آج کافی کام ہوا', 70);
      fireEvent.click(button('محفوظ کریں'));
      await screen.findByText('اپڈیٹ محفوظ ہو گئی');

      typeReply('اگلی بات');

      expect(screen.queryByText('اپڈیٹ محفوظ ہو گئی')).not.toBeInTheDocument();
    });

    it('then closing from the same dialog: the saved reply is not sent again — a plain close', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');
      typeReply('آج کافی کام ہوا', 70);
      fireEvent.click(button('محفوظ کریں'));
      await screen.findByText('اپڈیٹ محفوظ ہو گئی');

      fireEvent.click(button('کام بند کریں'));
      fireEvent.click(await screen.findByRole('button', { name: 'ہاں، بند کریں' }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(closeTask).toHaveBeenCalledTimes(1);
      expect(closeTask.mock.calls[0]).toEqual(['t1']);
      expect(createTaskUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('closing with what is typed (decision 6)', () => {
    it('nothing typed: a plain close, without a body, and the dialog closes', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');

      fireEvent.click(button('کام بند کریں'));
      expect(document.querySelector('[data-final-reply]')).toBeNull();
      fireEvent.click(button('ہاں، بند کریں'));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(closeTask.mock.calls[0]).toEqual(['t1']);
    });

    it('a typed reply goes WITH the close, in the same request — shown in the step, never posted on its own', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');
      typeReply('  حتمی جواب: باقی کام اگلے ماہ  ', 70);

      fireEvent.click(button('کام بند کریں'));

      const preview = await screen.findByText('حتمی جواب: باقی کام اگلے ماہ');
      expect(preview.closest('[data-final-reply]')).toHaveTextContent('70%');
      fireEvent.click(button('ہاں، بند کریں'));

      await waitFor(() => expect(closeTask).toHaveBeenCalledWith('t1', { description: 'حتمی جواب: باقی کام اگلے ماہ', completionPercent: 70 }));
      expect(createTaskUpdate).not.toHaveBeenCalled();
      await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('an attachment goes with the reply', async () => {
      uploadAttachment.mockResolvedValue({ driveFileId: 'd1', fileName: 'report.pdf', url: 'https://drive/d1' });
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply('رپورٹ ساتھ ہے', 90);
      selectFile(new File(['x'], 'report.pdf', { type: 'application/pdf' }));
      await waitFor(() => expect(button('کام بند کریں')).not.toBeDisabled());

      fireEvent.click(button('کام بند کریں'));
      fireEvent.click(await screen.findByRole('button', { name: 'ہاں، بند کریں' }));

      await waitFor(() =>
        expect(closeTask).toHaveBeenCalledWith('t1', {
          description: 'رپورٹ ساتھ ہے',
          completionPercent: 90,
          attachment: { driveFileId: 'd1', fileName: 'report.pdf', url: 'https://drive/d1' },
        })
      );
    });

    it('only the percent changed, no description: the form message shows, no step, nothing closed', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply(undefined, 70);

      fireEvent.click(button('کام بند کریں'));

      expect(await screen.findByText(DESCRIPTION_ERROR)).toBeInTheDocument();
      expect(screen.queryByText(CLOSE_QUESTION)).not.toBeInTheDocument();
      expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(70);
      expect(closeTask).not.toHaveBeenCalled();
    });

    it('a description under 3 characters: the form message shows, no step', async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply('ok', 70);

      fireEvent.click(button('کام بند کریں'));

      expect(await screen.findByText(DESCRIPTION_ERROR)).toBeInTheDocument();
      expect(screen.queryByText(CLOSE_QUESTION)).not.toBeInTheDocument();
      expect(closeTask).not.toHaveBeenCalled();
    });

    it('Escape in the step closes only the step: the dialog stays, the draft is intact', async () => {
      const onClose = vi.fn();
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');
      typeReply('حتمی جواب', 70);
      fireEvent.click(button('کام بند کریں'));
      await screen.findByText(CLOSE_QUESTION);

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByText(CLOSE_QUESTION)).not.toBeInTheDocument());
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText('تفصیل')).toHaveValue('حتمی جواب');
      expect(screen.getByLabelText('تکمیل فیصد')).toHaveValue(70);
      await waitFor(() => expect(button('کام بند کریں')).toHaveFocus()); // focus moves in an effect
      expect(closeTask).not.toHaveBeenCalled();
    });

    it("the step's own منسوخ کریں goes back to the form, also with the draft intact; the step opens on it", async () => {
      renderModal({ isAdmin: true });
      await screen.findByText('Sample task');
      typeReply('حتمی جواب', 70);
      fireEvent.click(button('کام بند کریں'));
      await screen.findByText(CLOSE_QUESTION);
      await waitFor(() => expect(button('منسوخ کریں')).toHaveFocus()); // focus moves in an effect

      fireEvent.click(button('منسوخ کریں'));

      expect(screen.queryByText(CLOSE_QUESTION)).not.toBeInTheDocument();
      expect(screen.getByLabelText('تفصیل')).toHaveValue('حتمی جواب');
    });

    it('a failed close keeps the step and the draft; trying again closes', async () => {
      const onClose = vi.fn();
      closeTask.mockRejectedValueOnce(new Error('نیٹ ورک کا مسئلہ'));
      renderModal({ isAdmin: true, onClose });
      await screen.findByText('Sample task');
      typeReply('حتمی جواب', 70);
      fireEvent.click(button('کام بند کریں'));

      fireEvent.click(await screen.findByRole('button', { name: 'ہاں، بند کریں' }));
      await waitFor(() => expect(closeTask).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(button('ہاں، بند کریں')).not.toBeDisabled());
      expect(screen.getByText(CLOSE_QUESTION)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByLabelText('تفصیل', { selector: 'textarea' })).toHaveValue('حتمی جواب');

      fireEvent.click(button('ہاں، بند کریں'));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(closeTask).toHaveBeenCalledTimes(2);
      expect(closeTask.mock.calls[1]).toEqual(['t1', { description: 'حتمی جواب', completionPercent: 70 }]);
    });
  });
});
