import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from './constants/routes';
import { AppLayout } from './components/layout/AppLayout';

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
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Public & Candidate Routes */}
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.JOBS} element={<JobsPage />} />
          <Route path={ROUTES.CANDIDATE} element={<CandidateDashboardPage />} />

          {/* HR Workspace Routes */}
          <Route path={ROUTES.HR_JOBS} element={<HrJobsPage />} />
          <Route path={ROUTES.HR_PIPELINE} element={<HrPipelinePage />} />
          <Route path={ROUTES.HR_INTERVIEWS} element={<HrInterviewsPage />} />
          <Route path={ROUTES.HR_OFFERS} element={<HrOffersPage />} />
          <Route path={ROUTES.HR_ANALYTICS} element={<HrAnalyticsPage />} />

          {/* Admin & Security Routes */}
          <Route path={ROUTES.ADMIN} element={<AdminPage />} />

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
