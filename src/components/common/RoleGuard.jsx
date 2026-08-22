import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

// docs/07-frontend-foundation.md §5: wraps the role check (e.g. /users, /reports/user-summary —
// Admin only). Assumes ProtectedRoute has already established isAuthenticated; this only adds
// the role condition on top, composed as a nested route in AppRoutes.jsx.
function RoleGuard({ role }) {
  const user = useAuthStore((state) => state.user);

  if (!user || user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

export default RoleGuard;
