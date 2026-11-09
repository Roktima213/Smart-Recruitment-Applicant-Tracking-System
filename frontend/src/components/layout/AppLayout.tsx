import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  // Show sidebar on HR and Admin routes
  const isWorkspaceRoute =
    location.pathname.startsWith('/hr') || location.pathname === '/admin';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <div className="flex-1 flex w-full">
        {isWorkspaceRoute && <Sidebar />}

        <main className={`flex-1 ${isWorkspaceRoute ? 'p-6 lg:p-8 max-w-7xl' : ''}`}>
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
};
