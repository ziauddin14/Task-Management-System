import React from 'react'; // explicit import — see src/App.jsx's comment for why
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import ProtectedRoute from '../components/common/ProtectedRoute.jsx';
import RoleGuard from '../components/common/RoleGuard.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import UsersPage from '../pages/UsersPage.jsx';
import UserSummaryReportPage from '../pages/UserSummaryReportPage.jsx';
import UnauthorizedPage from '../pages/UnauthorizedPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';

// docs/07-frontend-foundation.md §5: "/login ... Public; redirects to / if already
// authenticated." Kept as a tiny wrapper here rather than inside LoginPage itself, consistent
// with "no route's protection logic duplicated inside the page component."
function LoginRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage />;
}

// docs/07-frontend-foundation.md §5 — the exact routing table, using placeholder pages for now
// (Phase 10.1 scope). ProtectedRoute/RoleGuard are real and functional.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          <Route element={<RoleGuard role="admin" />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/reports/user-summary" element={<UserSummaryReportPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
