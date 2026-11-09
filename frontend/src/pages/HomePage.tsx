import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import {
  Briefcase,
  Users,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Server,
  FileCode,
} from 'lucide-react';
import axios from 'axios';

interface HealthData {
  status: string;
  uptime: number;
  environment: string;
  service: string;
}

export const HomePage: React.FC = () => {
  const [backendHealth, setBackendHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    // Check backend health endpoint
    axios
      .get('/api/health')
      .then((res) => {
        setBackendHealth(res.data);
        setLoadingHealth(false);
      })
      .catch((err) => {
        setHealthError(err.message || 'Could not connect to backend');
        setLoadingHealth(false);
      });
  }, []);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-50/50 via-white to-slate-50 border-b border-slate-200 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            Floor 1 Monorepo Starter Initialized
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Streamlined Hiring for High-Velocity Teams
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Full-stack Applicant Tracking System engineered with Express, PostgreSQL, Firebase Auth Emulator, and React Vite.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to={ROUTES.JOBS}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold shadow-md shadow-brand-500/25 hover:bg-brand-700 transition"
            >
              <Briefcase className="w-5 h-5" />
              Explore Openings
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to={ROUTES.HR_PIPELINE}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm"
            >
              <Users className="w-5 h-5 text-slate-500" />
              HR Workspace
            </Link>
          </div>

          {/* Backend Connectivity Status Badge */}
          <div className="pt-8 max-w-md mx-auto">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Backend Connection
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {loadingHealth ? (
                      <span className="text-slate-400">Pinging /api/health...</span>
                    ) : backendHealth ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 inline" /> Online ({backendHealth.status})
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs">{healthError}</span>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded text-slate-600">
                PORT 5000
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Engineered for Every Stage of Recruitment
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Contract-first development connecting candidates, recruiters, and hiring managers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Candidate Experience</h3>
            <p className="text-sm text-slate-600">
              Frictionless application submission, resume upload with 5 MB quota, and real-time application stage tracking.
            </p>
            <div className="pt-2">
              <Link to={ROUTES.CANDIDATE} className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                View Candidate Portal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-brand-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">HR Hiring Pipeline</h3>
            <p className="text-sm text-slate-600">
              Interactive Kanban board with 6 stages: Applied, Screening, Interview, Offer, Hired, and Rejected.
            </p>
            <div className="pt-2">
              <Link to={ROUTES.HR_PIPELINE} className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                Open Pipeline Board <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Enterprise Security</h3>
            <p className="text-sm text-slate-600">
              Firebase Auth with Custom Claims for RBAC, local Auth Emulator on 9099, Helmet HTTP headers, and strict CORS.
            </p>
            <div className="pt-2">
              <Link to={ROUTES.ADMIN} className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                Admin Console <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Spec Notice */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-brand-300">
              <FileCode className="w-4 h-4" /> Day 1 Starter Skeleton Active
            </div>
            <h3 className="text-xl font-bold">25-Day Milestone Architecture</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              Clean separation of concerns with TypeScript backend, React frontend, and local Firebase Auth emulator.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={ROUTES.REGISTER}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 font-semibold text-sm transition"
            >
              Create Account
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-sm border border-slate-700 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
