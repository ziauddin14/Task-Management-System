import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SyntheticRatingDialog from '../../../src/components/task/SyntheticRatingDialog.jsx';
import { finalRatingFor } from '../../../src/utils/taskDisplay.js';

vi.mock('../../../src/services/tasks.api.js', () => ({ editSyntheticRating: vi.fn(), removeSyntheticRating: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { editSyntheticRating } from '../../../src/services/tasks.api.js';

// Saving an estimate makes it FINAL, and a final rating is rated like a real one with the percent
// entered: ONE level down when the task was completed late; no downgrade while the task is open.
// The dialog's preview and its confirmation show the band that will be saved.
const HINT = 'تاخیر کی وجہ سے ایک درجہ کم';
const SENTENCE = 'کام تاخیر سے مکمل ہوا تھا، اس لیے درجہ بندی ایک درجہ کم رکھی گئی ہے۔';
const BASE_TEXT = (code, band, percent) =>
  `کام ${code} کی درجہ بندی ${band} (${percent}%) حتمی ہو جائے گی۔ اس کے بعد یہ تخمینی نہیں رہے گی اور اسے دوبارہ تبدیل یا ہٹایا نہیں جا سکے گا۔`;

const estimate = (extra) => ({
  id: 't9',
  codeNumber: '250129',
  title: 'ایک پرانا کام',
  status: 'closed',
  completionPercent: 0,
  performanceRating: 'good',
  timeStatus: { type: 'late', days: 117 },
  syntheticRating: { isSynthetic: true, isFinal: false, assumedPercent: 80, assignedAt: '2026-10-05T00:00:00.000Z', history: [] },
  ...extra,
});
const LATE = estimate();
const ON_TIME = estimate({ codeNumber: '250130', timeStatus: { type: 'early', days: 3 } });
const OPEN_OVERDUE = estimate({ codeNumber: '250131', status: 'pending', timeStatus: { type: 'overdue', days: 60 } });

function renderDialog(task) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SyntheticRatingDialog isOpen onClose={vi.fn()} task={task} />
    </QueryClientProvider>
  );
}
const type = (value) => fireEvent.change(screen.getByLabelText(/نیا فرض کردہ فیصد/), { target: { value } });
const preview = () => document.getElementById('synthetic-percent-preview');
const saveAndOpenConfirm = () => fireEvent.click(screen.getByRole('button', { name: 'محفوظ کریں' }));
const confirmText = () => screen.getByRole('dialog', { name: 'تخمینی درجہ بندی تبدیل کریں' }).querySelector('p').textContent;

describe('finalRatingFor — the frontend copy of the late rule', () => {
  it.each([
    [90, 'good', true],
    [80, 'fair', true],
    [70, 'weak', true],
    [60, 'weak', false], // کمزور stays کمزور — nothing was lowered
  ])('%s%% on a task completed late -> %s (lowered: %s)', (percent, band, downgraded) => {
    expect(finalRatingFor(percent, LATE)).toEqual({ band, downgraded });
    expect(finalRatingFor(percent, { ...LATE, status: 'complete' })).toEqual({ band, downgraded });
  });

  it.each([
    [90, 'excellent'],
    [80, 'good'],
    [70, 'fair'],
    [60, 'weak'],
  ])('%s%% on time -> %s, and the same on an open overdue task (no downgrade while open)', (percent, band) => {
    expect(finalRatingFor(percent, ON_TIME)).toEqual({ band, downgraded: false });
    expect(finalRatingFor(percent, OPEN_OVERDUE)).toEqual({ band, downgraded: false });
  });

  it('a task completed exactly on the due date, or with no time status, is not late', () => {
    expect(finalRatingFor(90, estimate({ timeStatus: { type: 'early', days: 0 } }))).toEqual({ band: 'excellent', downgraded: false });
    expect(finalRatingFor(90, estimate({ timeStatus: undefined }))).toEqual({ band: 'excellent', downgraded: false });
  });
});

describe('the dialog preview', () => {
  it('late task, 90%: بہتر, with the approved hint', () => {
    renderDialog(LATE);
    type('90');
    expect(preview()).toHaveTextContent('بہتر');
    expect(preview()).not.toHaveTextContent('ممتاز');
    expect(preview().querySelector('[data-late-downgrade-hint]')).toHaveTextContent(HINT);
  });

  it('late task, 60%: کمزور, and no hint — nothing was lowered', () => {
    renderDialog(LATE);
    type('60');
    expect(preview()).toHaveTextContent('کمزور');
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('on-time task and open overdue task, 90%: ممتاز, no hint', () => {
    renderDialog(ON_TIME);
    type('90');
    expect(preview()).toHaveTextContent('ممتاز');
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });

  it('an open overdue task gets no downgrade while it is open', () => {
    renderDialog(OPEN_OVERDUE);
    type('90');
    expect(preview()).toHaveTextContent('ممتاز');
    expect(screen.queryByText(HINT)).not.toBeInTheDocument();
  });
});

describe('the confirmation', () => {
  beforeEach(() => editSyntheticRating.mockReset());

  it('late task, 90%: the band after the downgrade, then the approved sentence, then the question', () => {
    renderDialog(LATE);
    type('90');
    saveAndOpenConfirm();
    expect(confirmText()).toBe(`${BASE_TEXT('250129', 'بہتر', 90)} ${SENTENCE} کیا جاری رکھیں؟`);
  });

  it('late task, 80% and 70%: مناسب and کمزور, each with the sentence', () => {
    renderDialog(LATE);
    type('80');
    saveAndOpenConfirm();
    expect(confirmText()).toBe(`${BASE_TEXT('250129', 'مناسب', 80)} ${SENTENCE} کیا جاری رکھیں؟`);
    fireEvent.click(screen.getByRole('button', { name: 'منسوخ کریں' }));
    type('70');
    saveAndOpenConfirm();
    expect(confirmText()).toBe(`${BASE_TEXT('250129', 'کمزور', 70)} ${SENTENCE} کیا جاری رکھیں؟`);
  });

  it('late task, 60%: کمزور and no added sentence — nothing was lowered', () => {
    renderDialog(LATE);
    type('60');
    saveAndOpenConfirm();
    expect(confirmText()).toBe(`${BASE_TEXT('250129', 'کمزور', 60)} کیا جاری رکھیں؟`);
  });

  it('on time, 90%: ممتاز and exactly the approved text', () => {
    renderDialog(ON_TIME);
    type('90');
    saveAndOpenConfirm();
    expect(confirmText()).toBe(`${BASE_TEXT('250130', 'ممتاز', 90)} کیا جاری رکھیں؟`);
  });

  it('confirming sends the percent the admin entered — never the band', async () => {
    editSyntheticRating.mockResolvedValue({ ...LATE, performanceRating: 'good' });
    renderDialog(LATE);
    type('90');
    saveAndOpenConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'ہاں، حتمی کریں' }));
    await waitFor(() => expect(editSyntheticRating).toHaveBeenCalledWith('t9', { assumedPercent: 90, note: undefined }));
  });
});
