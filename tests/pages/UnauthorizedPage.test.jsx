import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnauthorizedPage from '../../src/pages/UnauthorizedPage.jsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// docs/08-ui-ux.md §11 — short Urdu message + a button back to the Dashboard.
describe('UnauthorizedPage', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('renders the documented Urdu message', () => {
    render(<UnauthorizedPage />);
    expect(screen.getByText('Aap ko is safhe tak rasai nahi hai.')).toBeInTheDocument();
  });

  it('the button navigates back to the Dashboard', () => {
    render(<UnauthorizedPage />);
    fireEvent.click(screen.getByText('Dashboard par jayein'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
