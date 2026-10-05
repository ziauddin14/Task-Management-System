import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatusTiles from '../../../src/components/mobile/StatusTiles.jsx';

// The summary's byStatus block (asked for WITHOUT the status filter) — the live figures.
const byStatus = {
  ongoing: { count: 3, percent: 2 },
  pending: { count: 53, percent: 35 },
  complete: { count: 0, percent: 0 },
  closed: { count: 96, percent: 63 },
};
const hrefForStatus = (status) => `/tasks?status=${status}`;

function renderTiles(props = {}) {
  return render(
    <MemoryRouter>
      <StatusTiles byStatus={byStatus} total={152} hrefForStatus={hrefForStatus} {...props} />
    </MemoryRouter>
  );
}
const tiles = () => within(screen.getByRole('list')).getAllByRole('link');

describe('StatusTiles — the mobile dashboard\'s "کاموں کی صورتحال" 2x2 grid', () => {
  it('shows the four statuses in the mockup\'s order: پینڈنگ، جاری، کلوز، مکمل', () => {
    renderTiles();
    expect(tiles().map((tile) => tile.getAttribute('href'))).toEqual([
      '/tasks?status=pending',
      '/tasks?status=ongoing',
      '/tasks?status=closed',
      '/tasks?status=complete',
    ]);
  });

  it('each tile carries its label, count and percent', () => {
    renderTiles();
    const [pending, ongoing, closed, complete] = tiles();

    expect(pending).toHaveTextContent('پینڈنگ');
    expect(pending).toHaveTextContent('53');
    expect(pending).toHaveTextContent('35%');
    expect(ongoing).toHaveTextContent('جاری');
    expect(ongoing).toHaveTextContent('3');
    expect(ongoing).toHaveTextContent('2%');
    expect(closed).toHaveTextContent('96');
    expect(closed).toHaveTextContent('63%');
    expect(complete).toHaveTextContent('مکمل');
    expect(complete).toHaveTextContent('0%');
  });

  it('the total sits in the section header: "کل N"', () => {
    renderTiles();
    const section = screen.getByRole('region', { name: 'کاموں کی صورتحال' });
    expect(within(section).getByText('کل 152')).toBeInTheDocument();
  });

  it('is a 2-column grid', () => {
    renderTiles();
    expect(screen.getByRole('list')).toHaveClass('grid', 'grid-cols-2');
  });

  it('a tile is a real link to the task list filtered to its status, named for a screen reader', () => {
    renderTiles();
    const pending = screen.getByRole('link', { name: 'پینڈنگ: 53 کام، 35 فیصد' });
    expect(pending).toHaveAttribute('href', '/tasks?status=pending');
  });

  it('each status has its own colour, from the design tokens', () => {
    renderTiles();
    const [pending, ongoing, closed, complete] = tiles();
    expect(within(pending).getByText('53')).toHaveClass('text-tk-pending-accent');
    expect(within(ongoing).getByText('3')).toHaveClass('text-tk-ongoing-text');
    expect(within(closed).getByText('96')).toHaveClass('text-tk-closed-text');
    expect(within(complete).getByText('0')).toHaveClass('text-tk-complete-text');
  });

  it('marks the tile whose status is the current filter — and only that one', () => {
    renderTiles({ activeStatus: 'pending' });
    const [pending, ...others] = tiles();
    expect(pending).toHaveAttribute('aria-current', 'true');
    expect(pending).toHaveClass('ring-2');
    others.forEach((tile) => {
      expect(tile).not.toHaveAttribute('aria-current');
      expect(tile).not.toHaveClass('ring-2');
    });
  });

  it('with a status as the filter the other tiles still show their own figures (the data is not narrowed by it)', () => {
    renderTiles({ activeStatus: 'pending' });
    expect(tiles()[2]).toHaveTextContent('96');
    expect(screen.getByText('کل 152')).toBeInTheDocument();
  });

  it('a status the summary does not mention reads 0 and 0%', () => {
    renderTiles({ byStatus: { pending: { count: 4, percent: 100 } }, total: 4 });
    const [, ongoing] = tiles();
    expect(ongoing).toHaveTextContent('0');
    expect(ongoing).toHaveTextContent('0%');
  });

  it('is marked busy while a newer summary is loading, and keeps its figures', () => {
    renderTiles({ isRefreshing: true });
    expect(screen.getByRole('region', { name: 'کاموں کی صورتحال' })).toHaveAttribute('aria-busy', 'true');
    expect(tiles()[0]).toHaveTextContent('53');
  });

  it('renders nothing until the summary has arrived', () => {
    const { container } = renderTiles({ byStatus: undefined });
    expect(container).toBeEmptyDOMElement();
  });
});
