import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, LogIn } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-lg w-full text-center bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-100 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 tracking-wider uppercase mb-3">
          Error 403 • Access Restricted
        </span>

        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Privilege Required
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          You don't have the appropriate RBAC permissions to access this route or administrative dashboard.
          {isAuthenticated && role && (
            <span className="block mt-2 font-medium text-slate-700">
              Current Session: <span className="font-semibold text-slate-900">{user?.email}</span> (Role: <span className="uppercase text-brand-600 font-bold">{role}</span>)
            </span>
          )}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>

          <Link to="/">
            <Button variant="outline" size="md" leftIcon={<Home className="w-4 h-4" />}>
              Home
            </Button>
          </Link>

          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="primary" size="md" leftIcon={<LogIn className="w-4 h-4" />}>
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
