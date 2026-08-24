import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotFoundPage from '../../src/pages/NotFoundPage.jsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// docs/08-ui-ux.md §11 — short Urdu message + a button back to the Dashboard.
describe('NotFoundPage', () => {
  beforeEach(() => mockNavigate.mockReset());

  it('renders the documented Urdu message', () => {
    render(<NotFoundPage />);
    expect(screen.getByText('یہ صفحہ نہیں ملا')).toBeInTheDocument();
  });

  it('the button navigates back to the Dashboard', () => {
    render(<NotFoundPage />);
    fireEvent.click(screen.getByText('ڈیش بورڈ پر جائیں'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
