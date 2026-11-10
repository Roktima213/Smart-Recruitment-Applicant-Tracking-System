import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();
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
      <Navbar currentUser={currentUser} onLogout={signOut} />

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
