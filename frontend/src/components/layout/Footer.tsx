import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { Briefcase, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-600 text-white">
                <Briefcase className="w-4 h-4" />
              </span>
              <span>Smart Recruitment & ATS</span>
            </div>
            <p className="text-sm text-slate-500 max-w-md">
              Enterprise-grade recruitment platform built with Express, PostgreSQL, Firebase Auth, and React Vite. 25-day rapid development architecture.
            </p>
          </div>

          {/* Candidate Links */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Candidate Zone
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={ROUTES.JOBS} className="text-slate-600 hover:text-brand-600 transition">
                  Browse Openings
                </Link>
              </li>
              <li>
                <Link to={ROUTES.CANDIDATE} className="text-slate-600 hover:text-brand-600 transition">
                  Candidate Dashboard
                </Link>
              </li>
              <li>
                <Link to={ROUTES.LOGIN} className="text-slate-600 hover:text-brand-600 transition">
                  Applicant Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Enterprise & HR */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Enterprise & HR
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to={ROUTES.HR_PIPELINE} className="text-slate-600 hover:text-brand-600 transition">
                  Candidate Pipeline
                </Link>
              </li>
              <li>
                <Link to={ROUTES.HR_JOBS} className="text-slate-600 hover:text-brand-600 transition">
                  Post Requisition
                </Link>
              </li>
              <li>
                <Link to={ROUTES.ADMIN} className="text-slate-600 hover:text-brand-600 transition">
                  Security & Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Smart ATS Team. Day 1 Foundation Release.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Firebase Auth Emulator Verified
            </span>
            <span>REST API :5000</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
