
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const { user, dbUser, signOut } = useAuth();

  // Show sidebar on HR and Admin routes
  const isWorkspaceRoute =
    location.pathname.startsWith('/hr') || location.pathname === '/admin';

  const currentUser = dbUser
    ? {
        uid: dbUser.firebase_uid,
        email: dbUser.email,
        fullName: dbUser.full_name,
        role: dbUser.role,
        avatarUrl: dbUser.avatar_url,
      }
    : user
    ? {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName,
        role: 'CANDIDATE',
        avatarUrl: user.photoURL,
      }
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentUser={currentUser}
        onLogout={signOut}
        isWorkspaceRoute={isWorkspaceRoute}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
      />

      <div className="flex-1 flex w-full relative">
        {isWorkspaceRoute && (
          <>
            {/* Desktop persistent sidebar */}
            <div className="hidden lg:block shrink-0">
              {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
            </div>

            {/* Mobile / Tablet slide-out drawer with backdrop */}
            {sidebarOpen && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                  onClick={() => setSidebarOpen(false)}
                />
                <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-10">
                  <Sidebar onClose={() => setSidebarOpen(false)} />
                </div>
              </div>
            )}
          </>
        )}

        <main
          className={`flex-1 min-w-0 w-full overflow-x-hidden ${
            isWorkspaceRoute ? 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto' : ''
          }`}
        >
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
};
