import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../../../src/components/mobile/TaskCard.jsx';

// An open task past its deadline: status "پینڈنگ", time status "overdue".
const overdueTask = {
  id: 't1',
  codeNumber: '250110',
  title: 'سال 2025 میں تعمیرات کے 452 بستے بڑھا کر 626 کرنے ہیں۔',
  assignees: [{ id: 'u1', name: 'Ali' }],
  responsibility: 'نگران مجلس عطیات بکس',
  deadline: '2025-01-31T00:00:00.000Z',
  lastUpdateAt: '2025-01-15T00:00:00.000Z',
  status: 'pending',
  timeStatus: { type: 'overdue', days: 613 },
  completionPercent: 25,
  performanceRating: '-',
};

// A closed task at a REAL 0% whose "بہتر" rating is developer-assigned from an assumed 80%.
const syntheticTask = {
  id: 't2',
  codeNumber: '250103',
  title: 'Synthetic task',
  assignees: [{ id: 'u1', name: 'Ali' }, { id: 'u2', name: 'Bilal' }, { id: 'u3', name: 'Chand' }],
  deadline: '2025-03-31T00:00:00.000Z',
  status: 'closed',
  timeStatus: { type: 'late', days: 20 },
  completionPercent: 0,
  performanceRating: 'good',
  syntheticRating: { isSynthetic: true, assumedPercent: 80, assignedAt: '2026-10-05T09:20:22.000Z' },
};

const realRatedTask = { ...syntheticTask, id: 't3', codeNumber: '260201', completionPercent: 95, performanceRating: 'excellent', syntheticRating: null, timeStatus: { type: 'early', days: 2 } };

function renderCard(task, onOpen = vi.fn()) {
  const utils = render(<TaskCard task={task} onOpen={onOpen} />);
  return { ...utils, onOpen };
}

describe('TaskCard — one task as a card (the mobile replacement for a table row)', () => {
  it('row 1: the status chip, in the status colour, and the task code', () => {
    renderCard(overdueTask);
    const status = screen.getByText('پینڈنگ');
    expect(status).toHaveClass('bg-tk-pending-bg', 'text-tk-pending-text', 'rounded-tk-pill');
    expect(screen.getByText('250110')).toBeInTheDocument();
  });

  it('the title is shown in full text, clamped to three lines', () => {
    renderCard(overdueTask);
    const title = screen.getByRole('button', { name: overdueTask.title });
    expect(title).toHaveClass('line-clamp-3');
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('text-[16px]', 'font-semibold');
  });

  it('meta row: the zimmedar and the deadline (DD-MM-YY)', () => {
    renderCard(overdueTask);
    expect(screen.getByText('Ali')).toBeInTheDocument();
    expect(screen.getByText('31-01-25')).toBeInTheDocument();
  });

  it('several zimmedar: the first two by name, then how many more', () => {
    renderCard(syntheticTask);
    expect(screen.getByText('Ali، Bilal +1')).toBeInTheDocument();
  });

  describe('overdue', () => {
    it('an open task past its deadline carries the red "تاخیر" pill', () => {
      const { container } = renderCard(overdueTask);
      const pill = container.querySelector('[data-overdue-pill]');
      expect(pill).toHaveTextContent('تاخیر');
      expect(pill).toHaveClass('bg-tk-danger-bg', 'text-tk-danger');
      expect(pill).toHaveAttribute('title', '613 دن تاخیر سے');
    });

    it.each([
      ['still has days left', { type: 'remaining', days: 5 }],
      ['is due today', { type: 'remaining', days: 0 }],
      ['was finished late (it is no longer open)', { type: 'late', days: 20 }],
      ['was finished early', { type: 'early', days: 2 }],
    ])('no pill for a task that %s', (_label, timeStatus) => {
      const { container } = renderCard({ ...overdueTask, timeStatus });
      expect(container.querySelector('[data-overdue-pill]')).toBeNull();
    });

    it('no pill when the task carries no time status at all', () => {
      const { container } = renderCard({ ...overdueTask, timeStatus: undefined });
      expect(container.querySelector('[data-overdue-pill]')).toBeNull();
    });
  });

  describe('rating chip and the "تخمینی" marker', () => {
    it('a synthetic rating: the band, marked "تخمینی", in the band colour with a dashed outline', () => {
      const { container } = renderCard(syntheticTask);
      const chip = container.querySelector('[data-rating-chip]');
      expect(chip).toHaveTextContent('بہتر');
      expect(chip).toHaveTextContent('تخمینی');
      expect(chip).toHaveClass('bg-tk-good-bg', 'text-tk-good', 'border-dashed');
      expect(container.querySelector('[data-synthetic-marker]')).not.toBeNull();
    });

    it('a real rating: the band alone — no marker, no dashed outline', () => {
      const { container } = renderCard(realRatedTask);
      const chip = container.querySelector('[data-rating-chip]');
      expect(chip).toHaveTextContent(/^ممتاز$/);
      expect(chip).toHaveClass('bg-tk-excellent-bg', 'text-tk-excellent');
      expect(chip).not.toHaveClass('border-dashed');
      expect(container.querySelector('[data-synthetic-marker]')).toBeNull();
      expect(screen.queryByText(/تخمینی/)).not.toBeInTheDocument();
    });

    it('a rating that was synthetic but has since been replaced by a real one is not marked', () => {
      const { container } = renderCard({ ...syntheticTask, syntheticRating: { isSynthetic: false, assumedPercent: 80 } });
      expect(container.querySelector('[data-synthetic-marker]')).toBeNull();
    });

    it('an unrated task has no rating chip', () => {
      const { container } = renderCard(overdueTask);
      expect(container.querySelector('[data-rating-chip]')).toBeNull();
    });
  });

  describe('progress bar — always the REAL completion percent', () => {
    it('shows the task\'s own percent, as text and as the bar\'s value and width', () => {
      const { container } = renderCard(overdueTask);
      const bar = screen.getByRole('progressbar', { name: 'تکمیل' });
      expect(bar).toHaveAttribute('aria-valuenow', '25');
      expect(bar.firstElementChild).toHaveStyle({ width: '25%' });
      expect(container.querySelector('[data-completion-percent]')).toHaveTextContent(/^25%$/);
    });

    it('a synthetic rating never replaces it: a real 0% rated from an assumed 80% still reads 0%', () => {
      const { container } = renderCard(syntheticTask);
      const bar = screen.getByRole('progressbar', { name: 'تکمیل' });
      expect(bar).toHaveAttribute('aria-valuenow', '0');
      expect(bar.firstElementChild).toHaveStyle({ width: '0%' });
      expect(container.querySelector('[data-completion-percent]')).toHaveTextContent(/^0%$/);
      // The assumed 80 appears nowhere on the card.
      expect(container).not.toHaveTextContent('80');
    });

    it('a task with no percent recorded reads 0%', () => {
      const { container } = renderCard({ ...overdueTask, completionPercent: undefined });
      expect(container.querySelector('[data-completion-percent]')).toHaveTextContent(/^0%$/);
    });
  });

  describe('opening', () => {
    it('a tap opens the task: onOpen is called with that task', () => {
      const { onOpen } = renderCard(overdueTask);
      fireEvent.click(screen.getByRole('button', { name: overdueTask.title }));
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(onOpen).toHaveBeenCalledWith(overdueTask);
    });

    it('the whole card is that one real button — its hit area is stretched over the card, and nothing else in it is interactive', () => {
      renderCard(syntheticTask);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAttribute('type', 'button');
      expect(buttons[0]).toHaveClass('after:absolute', 'after:inset-0');
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
