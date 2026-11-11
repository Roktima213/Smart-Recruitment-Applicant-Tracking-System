import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from './constants/routes';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { NetworkStatusBanner } from './components/common/NetworkStatusBanner';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Page Views
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { JobsPage } from './pages/JobsPage';
import { CandidateDashboardPage } from './pages/CandidateDashboardPage';
import { HrJobsPage } from './pages/hr/HrJobsPage';
import { HrPipelinePage } from './pages/hr/HrPipelinePage';
import { HrInterviewsPage } from './pages/hr/HrInterviewsPage';
import { HrOffersPage } from './pages/hr/HrOffersPage';
import { HrAnalyticsPage } from './pages/hr/HrAnalyticsPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <NetworkStatusBanner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route element={<AppLayout />}>
            {/* Public Routes */}
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            <Route path={ROUTES.JOBS} element={<JobsPage />} />

            {/* Candidate Portal (Authenticated) */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'HR', 'CANDIDATE']} />}>
              <Route path={ROUTES.CANDIDATE} element={<CandidateDashboardPage />} />
            </Route>

            {/* HR Workspace Routes (HR and ADMIN only) */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'HR']} />}>
              <Route path={ROUTES.HR_JOBS} element={<HrJobsPage />} />
              <Route path={ROUTES.HR_PIPELINE} element={<HrPipelinePage />} />
              <Route path={ROUTES.HR_INTERVIEWS} element={<HrInterviewsPage />} />
              <Route path={ROUTES.HR_OFFERS} element={<HrOffersPage />} />
              <Route path={ROUTES.HR_ANALYTICS} element={<HrAnalyticsPage />} />
            </Route>

            {/* Admin Security Routes (ADMIN only) */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path={ROUTES.ADMIN} element={<AdminPage />} />
            </Route>

            {/* Fallback 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ToastProvider>
  );
};

export default App;
