import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';

// docs/07-frontend-foundation.md §5: wraps the auth check, composed around routes in
// AppRoutes.jsx — no route's protection logic is duplicated inside a page component itself.
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
