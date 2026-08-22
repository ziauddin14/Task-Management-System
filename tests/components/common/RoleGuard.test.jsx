import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleGuard from '../../../src/components/common/RoleGuard.jsx';
import { useAuthStore } from '../../../src/store/authStore.js';

function resetStore() {
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
}

function renderGuarded(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        <Route element={<RoleGuard role="admin" />}>
          <Route path="/users" element={<div>Users Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('RoleGuard', () => {
  beforeEach(() => resetStore());

  it('redirects to /unauthorized when the role does not match', () => {
    useAuthStore.getState().login({ id: '1', name: 'Om', role: 'user' }, 'jwt-abc');
    renderGuarded('/users');
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
  });

  it('redirects to /unauthorized when there is no user at all', () => {
    renderGuarded('/users');
    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
  });

  it('renders the guarded content when the role matches', () => {
    useAuthStore.getState().login({ id: '1', name: 'Admin', role: 'admin' }, 'jwt-abc');
    renderGuarded('/users');
    expect(screen.getByText('Users Page')).toBeInTheDocument();
  });
});
