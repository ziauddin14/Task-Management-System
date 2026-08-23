import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrintView from '../../../src/components/dashboard/PrintView.jsx';

const task = {
  id: 't1',
  codeNumber: '260801',
  title: 'A sample task',
  assignees: [{ id: 'u1', name: 'Ali' }],
  responsibility: 'IT',
  deadline: '2026-09-01T00:00:00.000Z',
  status: 'ongoing',
  timeStatus: { type: 'remaining', days: 5 },
  completionPercent: 40,
  performanceRating: '-',
};

const allVisible = () => true;

// docs/07-frontend-foundation.md §9 — denser, read-only variant: no action buttons/columns.
describe('PrintView', () => {
  it('renders task data but no Update/Previous Updates/Edit/Close action buttons', () => {
    render(<PrintView tasks={[task]} isVisible={allVisible} />);

    expect(screen.getByText('260801')).toBeInTheDocument();
    expect(screen.getByText('A sample task')).toBeInTheDocument();
    expect(screen.queryByText('Update')).not.toBeInTheDocument();
    expect(screen.queryByText('Purani Updates')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('respects column visibility like the regular table', () => {
    render(<PrintView tasks={[task]} isVisible={(key) => key !== 'responsibility'} />);
    expect(screen.queryByText('IT')).not.toBeInTheDocument();
  });

  it('shows an EmptyState when there are no tasks', () => {
    render(<PrintView tasks={[]} isVisible={allVisible} />);
    expect(screen.getByText('Koi kaam is filter se mutabiq nahi mila.')).toBeInTheDocument();
  });
});
