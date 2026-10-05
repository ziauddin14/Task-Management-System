import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FilterSheet from '../../../src/components/mobile/FilterSheet.jsx';

const users = [
  { id: 'u1', name: 'Ali' },
  { id: 'u2', name: 'Bilal' },
];

function renderSheet(props = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const utils = render(<FilterSheet isOpen onClose={onClose} params={{}} onApply={onApply} isAdmin users={users} {...props} />);
  return { ...utils, onApply, onClose };
}
const sheet = () => screen.getByRole('dialog', { name: 'فلٹر' });
const group = (legend) => within(sheet()).getByRole('group', { name: legend });
const chip = (legend, label) => within(group(legend)).getByRole('button', { name: label });
const apply = () => fireEvent.click(within(sheet()).getByRole('button', { name: 'لاگو کریں' }));

// The mobile filter controls: every dashboard filter in one bottom sheet. It edits a draft and
// hands the whole of it over as ONE patch — nothing changes until "لاگو کریں".
describe('FilterSheet', () => {
  // "Now" is fixed (a Tuesday), so the quick date ranges are exact.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 10, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('what it offers', () => {
    it('is a dialog titled "فلٹر" holding every existing filter: status, rating, rating source, zimmedar, date field and range', () => {
      renderSheet();

      expect(within(group('کام کی کیفیت')).getAllByRole('button').map((b) => b.textContent)).toEqual(['پینڈنگ', 'جاری', 'کلوز', 'مکمل']);
      expect(within(group('کارکردگی')).getAllByRole('button').map((b) => b.textContent)).toEqual(['ممتاز', 'بہتر', 'مناسب', 'کمزور', 'بغیر درجہ بندی']);
      expect(within(group('درجہ بندی کی قسم')).getAllByRole('button').map((b) => b.textContent)).toEqual(['تخمینی', 'اصل']);
      expect(within(screen.getByLabelText('ذمہ دار')).getAllByRole('option').map((o) => o.textContent)).toEqual(['تمام ذمہ داران', 'Ali', 'Bilal']);
      expect(within(screen.getByLabelText('تاریخ کی قسم')).getAllByRole('option').map((o) => o.textContent)).toEqual(['آخری تاریخ', 'تاریخِ اندراج']);
      expect(screen.getByLabelText('از تاریخ')).toHaveAttribute('type', 'date');
      expect(screen.getByLabelText('تا تاریخ')).toHaveAttribute('type', 'date');
    });

    it('offers the quick date ranges the filter model supports: آج، اس ہفتے، اس ماہ', () => {
      renderSheet();
      expect(within(group('تاریخ')).getAllByRole('button').map((b) => b.textContent)).toEqual(['آج', 'اس ہفتے', 'اس ماہ']);
    });

    it('a normal user gets no zimmedar filter (the server already limits them to their own tasks)', () => {
      renderSheet({ isAdmin: false });
      expect(screen.queryByLabelText('ذمہ دار')).not.toBeInTheDocument();
      expect(group('کام کی کیفیت')).toBeInTheDocument();
    });

    it('renders nothing while closed', () => {
      renderSheet({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('opens showing the filters in force', () => {
    it('marks the chosen status, rating and source, and fills the select and the dates', () => {
      renderSheet({
        params: { status: 'pending', performanceRating: 'weak', ratingSource: 'synthetic', assigneeId: 'u2', dateType: 'entry', from: '2026-01-01', to: '2026-03-31' },
      });

      expect(chip('کام کی کیفیت', 'پینڈنگ')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('کام کی کیفیت', 'جاری')).toHaveAttribute('aria-pressed', 'false');
      expect(chip('کارکردگی', 'کمزور')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('درجہ بندی کی قسم', 'تخمینی')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('ذمہ دار')).toHaveValue('u2');
      expect(screen.getByLabelText('تاریخ کی قسم')).toHaveValue('entry');
      expect(screen.getByLabelText('از تاریخ')).toHaveValue('2026-01-01');
      expect(screen.getByLabelText('تا تاریخ')).toHaveValue('2026-03-31');
    });

    it('the "unrated" rating filter ("-") shows as "بغیر درجہ بندی"', () => {
      renderSheet({ params: { performanceRating: '-' } });
      expect(chip('کارکردگی', 'بغیر درجہ بندی')).toHaveAttribute('aria-pressed', 'true');
    });

    it('the date field defaults to the deadline', () => {
      renderSheet();
      expect(screen.getByLabelText('تاریخ کی قسم')).toHaveValue('deadline');
    });
  });

  describe('apply', () => {
    it('nothing is applied while choosing — only "لاگو کریں" hands the filters over, as ONE patch, and closes the sheet', () => {
      const { onApply, onClose } = renderSheet();

      fireEvent.click(chip('کام کی کیفیت', 'پینڈنگ'));
      fireEvent.click(chip('کارکردگی', 'کمزور'));
      fireEvent.click(chip('درجہ بندی کی قسم', 'تخمینی'));
      fireEvent.change(screen.getByLabelText('ذمہ دار'), { target: { value: 'u1' } });
      expect(onApply).not.toHaveBeenCalled();

      apply();

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith({
        status: 'pending',
        performanceRating: 'weak',
        ratingSource: 'synthetic',
        assigneeId: 'u1',
        dateType: undefined, // no range chosen: the date field alone filters nothing
        from: undefined,
        to: undefined,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('tapping the chosen chip again clears that filter', () => {
      const { onApply } = renderSheet({ params: { status: 'pending', performanceRating: 'weak' } });

      fireEvent.click(chip('کام کی کیفیت', 'پینڈنگ'));
      expect(chip('کام کی کیفیت', 'پینڈنگ')).toHaveAttribute('aria-pressed', 'false');
      apply();

      expect(onApply.mock.calls[0][0]).toMatchObject({ status: undefined, performanceRating: 'weak' });
    });

    it('choosing another chip in the same group replaces the choice (one status at a time, as the API takes)', () => {
      const { onApply } = renderSheet({ params: { status: 'pending' } });

      fireEvent.click(chip('کام کی کیفیت', 'کلوز'));
      expect(chip('کام کی کیفیت', 'پینڈنگ')).toHaveAttribute('aria-pressed', 'false');
      apply();

      expect(onApply.mock.calls[0][0].status).toBe('closed');
    });

    it('a custom range on the entry date goes out as dateType + from + to', () => {
      const { onApply } = renderSheet();

      fireEvent.change(screen.getByLabelText('تاریخ کی قسم'), { target: { value: 'entry' } });
      fireEvent.change(screen.getByLabelText('از تاریخ'), { target: { value: '2026-01-01' } });
      fireEvent.change(screen.getByLabelText('تا تاریخ'), { target: { value: '2026-03-31' } });
      apply();

      expect(onApply.mock.calls[0][0]).toMatchObject({ dateType: 'entry', from: '2026-01-01', to: '2026-03-31' });
    });

    it('an open-ended range (only "from") is allowed', () => {
      const { onApply } = renderSheet();
      fireEvent.change(screen.getByLabelText('از تاریخ'), { target: { value: '2026-01-01' } });
      apply();
      expect(onApply.mock.calls[0][0]).toMatchObject({ dateType: 'deadline', from: '2026-01-01', to: undefined });
    });
  });

  describe('quick date ranges', () => {
    it('"آج" fills both dates with today', () => {
      const { onApply } = renderSheet();
      fireEvent.click(chip('تاریخ', 'آج'));

      expect(screen.getByLabelText('از تاریخ')).toHaveValue('2026-10-06');
      expect(screen.getByLabelText('تا تاریخ')).toHaveValue('2026-10-06');
      expect(chip('تاریخ', 'آج')).toHaveAttribute('aria-pressed', 'true');
      apply();
      expect(onApply.mock.calls[0][0]).toMatchObject({ dateType: 'deadline', from: '2026-10-06', to: '2026-10-06' });
    });

    it('"اس ہفتے" is Monday to Sunday of the current week', () => {
      renderSheet();
      fireEvent.click(chip('تاریخ', 'اس ہفتے'));
      expect(screen.getByLabelText('از تاریخ')).toHaveValue('2026-10-05');
      expect(screen.getByLabelText('تا تاریخ')).toHaveValue('2026-10-11');
    });

    it('"اس ماہ" is the first to the last day of the current month', () => {
      renderSheet();
      fireEvent.click(chip('تاریخ', 'اس ماہ'));
      expect(screen.getByLabelText('از تاریخ')).toHaveValue('2026-10-01');
      expect(screen.getByLabelText('تا تاریخ')).toHaveValue('2026-10-31');
    });

    it('a range already in force that equals a quick range shows that chip as chosen; tapping it clears the dates', () => {
      renderSheet({ params: { from: '2026-10-01', to: '2026-10-31' } });
      expect(chip('تاریخ', 'اس ماہ')).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(chip('تاریخ', 'اس ماہ'));

      expect(screen.getByLabelText('از تاریخ')).toHaveValue('');
      expect(screen.getByLabelText('تا تاریخ')).toHaveValue('');
    });

    it('applies to whichever date field is chosen', () => {
      const { onApply } = renderSheet();
      fireEvent.change(screen.getByLabelText('تاریخ کی قسم'), { target: { value: 'entry' } });
      fireEvent.click(chip('تاریخ', 'اس ماہ'));
      apply();
      expect(onApply.mock.calls[0][0]).toMatchObject({ dateType: 'entry', from: '2026-10-01', to: '2026-10-31' });
    });

    it('editing a date by hand un-marks the quick range', () => {
      renderSheet();
      fireEvent.click(chip('تاریخ', 'اس ماہ'));
      fireEvent.change(screen.getByLabelText('تا تاریخ'), { target: { value: '2026-10-20' } });
      expect(chip('تاریخ', 'اس ماہ')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('clear', () => {
    it('"صاف کریں" removes every filter the sheet holds — in one patch — and closes it', () => {
      const { onApply, onClose } = renderSheet({
        params: { status: 'pending', performanceRating: 'weak', ratingSource: 'real', assigneeId: 'u1', from: '2026-01-01', search: 'audit' },
      });

      fireEvent.click(within(sheet()).getByRole('button', { name: 'صاف کریں' }));

      expect(onApply).toHaveBeenCalledTimes(1);
      expect(onApply).toHaveBeenCalledWith({
        status: undefined,
        performanceRating: undefined,
        ratingSource: undefined,
        assigneeId: undefined,
        dateType: undefined,
        from: undefined,
        to: undefined,
        responsibility: undefined,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('leaves the search text alone (it has its own field)', () => {
      const { onApply } = renderSheet({ params: { search: 'audit', status: 'pending' } });
      fireEvent.click(within(sheet()).getByRole('button', { name: 'صاف کریں' }));
      expect(onApply.mock.calls[0][0]).not.toHaveProperty('search');
    });
  });

  describe('closing without applying', () => {
    it('the close button and the backdrop close it and apply nothing', () => {
      const { onApply, onClose } = renderSheet();
      fireEvent.click(chip('کام کی کیفیت', 'پینڈنگ'));

      const [backdrop, closeButton] = screen.getAllByRole('button', { name: 'بند کریں' });
      fireEvent.click(closeButton);
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onApply).not.toHaveBeenCalled();
    });

    it('Escape closes it', () => {
      const { onClose } = renderSheet();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('abandoned choices are forgotten: reopening shows the filters actually in force', () => {
      const params = { status: 'pending' };
      const { rerender } = renderSheet({ params });
      fireEvent.click(chip('کام کی کیفیت', 'کلوز'));
      expect(chip('کام کی کیفیت', 'کلوز')).toHaveAttribute('aria-pressed', 'true');

      rerender(<FilterSheet isOpen={false} onClose={vi.fn()} params={params} onApply={vi.fn()} isAdmin users={users} />);
      rerender(<FilterSheet isOpen onClose={vi.fn()} params={params} onApply={vi.fn()} isAdmin users={users} />);

      expect(chip('کام کی کیفیت', 'پینڈنگ')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('کام کی کیفیت', 'کلوز')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('as a sheet', () => {
    it('is modal, takes focus when it opens, and keeps its two buttons outside the scrolling area', () => {
      renderSheet();
      expect(sheet()).toHaveAttribute('aria-modal', 'true');
      expect(sheet()).toHaveFocus();
      const scroller = sheet().querySelector('.overflow-y-auto');
      expect(scroller).not.toContainElement(within(sheet()).getByRole('button', { name: 'لاگو کریں' }));
      expect(scroller).toContainElement(screen.getByLabelText('از تاریخ'));
    });

    it('every choice is a real button of at least 44px', () => {
      renderSheet();
      within(group('کام کی کیفیت')).getAllByRole('button').forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
        expect(button).toHaveClass('h-tk-touch');
      });
    });
  });
});
