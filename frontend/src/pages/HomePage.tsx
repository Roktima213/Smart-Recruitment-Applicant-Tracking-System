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
  Database,
  Layers,
  Sparkles,
  Lock,
} from 'lucide-react';
import axios from 'axios';
import { Button, Badge, Modal, Input, Select } from '../components/ui';
import { isEmulatorActive } from '../config/firebaseClient';

interface HealthData {
  status?: string;
  uptime?: number;
  environment?: string;
  service?: string;
  success?: boolean;
  message?: string;
}

export const HomePage: React.FC = () => {
  const [backendHealth, setBackendHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Day 3 Interactive Modal Test State
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const [demoRole, setDemoRole] = useState('CANDIDATE');
  const [btnLoading, setBtnLoading] = useState(false);

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

  const handleSimulateAction = () => {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      setDemoModalOpen(false);
    }, 1200);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-brand-50/50 via-white to-slate-50 border-b border-slate-200 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            Floor 3 Active — Schema & UI Primitives Integrated
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Streamlined Hiring for High-Velocity Teams
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Full-stack Applicant Tracking System engineered with Express, PostgreSQL 15, Firebase Auth Emulator, and React Vite.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to={ROUTES.JOBS}>
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Openings
              </Button>
            </Link>

            <Link to={ROUTES.HR_PIPELINE}>
              <Button variant="outline" size="lg" leftIcon={<Users className="w-5 h-5" />}>
                HR Workspace
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="lg"
              leftIcon={<Sparkles className="w-4 h-4 text-brand-600" />}
              onClick={() => setDemoModalOpen(true)}
            >
              Test Day 3 Modal Primitive
            </Button>
          </div>

          {/* System Connectivity Diagnostics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-3xl mx-auto text-left">
            {/* Backend API Probe */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Express API
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {loadingHealth ? (
                      <span className="text-slate-400">Pinging :5000...</span>
                    ) : backendHealth ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4 inline" /> Online
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs">{healthError}</span>
                    )}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded text-slate-600">
                :5000
              </span>
            </div>

            {/* PostgreSQL Database Schema */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    PostgreSQL Schema
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    Day 2 & 3 Migrations
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-emerald-50 text-emerald-700 rounded font-semibold">
                7 Tables
              </span>
            </div>

            {/* Firebase Auth Emulator */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Auth Emulator
                  </p>
                  <p className="text-sm font-semibold text-purple-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 inline" /> {isEmulatorActive() ? 'Connected' : 'Configured'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-purple-50 text-purple-700 rounded font-semibold">
                :9099
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Day 2 & Day 3 Interactive Showcase Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            Live Implementation Gallery
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Day 2 & Day 3 Architectural Deliverables
          </h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base">
            Verify the database schemas, UI component primitives, and client SDK integration added across Floors 2 and 3.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: Day 3 UI Primitives Showcase */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-600" />
                  Day 3: Reusable UI Primitives
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                  Frontend 1
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Standardized design system primitives for buttons, form controls, badges, and modals.
              </p>
            </div>

            {/* Badge Showcase */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Application Stage Badges (Live Component)
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="APPLIED" dot>Applied</Badge>
                <Badge variant="SCREENING" dot>Screening</Badge>
                <Badge variant="INTERVIEW" dot>Interview</Badge>
                <Badge variant="SELECTED" dot>Selected</Badge>
                <Badge variant="OFFERED" dot>Offered</Badge>
                <Badge variant="REJECTED" dot>Rejected</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Job Lifecycle Badges (Live Component)
              </label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="DRAFT">Draft</Badge>
                <Badge variant="PUBLISHED">Published</Badge>
                <Badge variant="CLOSED">Closed</Badge>
                <Badge variant="ARCHIVED">Archived</Badge>
              </div>
            </div>

            {/* Button Showcase */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Interactive Buttons
              </label>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" size="sm">Primary</Button>
                <Button variant="secondary" size="sm">Secondary</Button>
                <Button variant="outline" size="sm">Outline</Button>
                <Button variant="danger" size="sm">Danger</Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={btnLoading}
                  onClick={() => {
                    setBtnLoading(true);
                    setTimeout(() => setBtnLoading(false), 1500);
                  }}
                >
                  {btnLoading ? 'Processing' : 'Click for Spinner'}
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2: Day 2 & Day 3 Database & Cloud Architecture */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" />
                  Day 2 & 3: Relational SQL DDL & Cloud Storage
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Backend & Cloud
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Relational tables, foreign key constraints, triggers, and storage policies.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  001
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">001_users_companies.sql</p>
                  <p className="text-slate-600 mt-0.5">
                    Tables: <code className="text-brand-600 font-semibold">companies</code>, <code className="text-brand-600 font-semibold">users</code>, <code className="text-brand-600 font-semibold">user_role</code> ENUM (ADMIN, HR, CANDIDATE), automated timestamp triggers.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  002
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">002_jobs_candidates_applications.sql</p>
                  <p className="text-slate-600 mt-0.5">
                    Tables: <code className="text-emerald-700 font-semibold">jobs</code>, <code className="text-emerald-700 font-semibold">candidate_profiles</code>, <code className="text-emerald-700 font-semibold">resume_metadata</code>, <code className="text-emerald-700 font-semibold">applications</code>, <code className="text-emerald-700 font-semibold">application_stage_history</code>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  IAM
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">Private Resume Storage & Migration Runner</p>
                  <p className="text-slate-600 mt-0.5">
                    UUID file obfuscation, SHA-256 integrity, 5 MB quota, and automated <code className="text-purple-700 font-semibold">scripts/migrate.ts</code> runner.
                  </p>
                </div>
              </div>
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
              Interactive Kanban board with 6 stages: Applied, Screening, Interview, Selected, Offered, and Rejected.
            </p>
            <div className="pt-2">
              <Link to={ROUTES.HR_PIPELINE} className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                Open Pipeline Board <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Admin Governance</h3>
            <p className="text-sm text-slate-600">
              User and company management, role assignment with custom claims, and system-wide audit activity feed.
            </p>
            <div className="pt-2">
              <Link to={ROUTES.ADMIN} className="text-sm font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                Manage Organization <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Day 3 Modal Primitive Dialog */}
      <Modal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="Day 3 Modal Primitive Demo"
        subtitle="Accessible dialog component rendered with custom input and select primitives"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDemoModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={btnLoading}
              onClick={handleSimulateAction}
            >
              Submit Application
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Candidate Full Name"
            placeholder="e.g. Alex Johnson"
            value={demoInput}
            onChange={(e) => setDemoInput(e.target.value)}
            helperText="Input component handles labels, focus states, and validation."
          />

          <Select
            label="Preferred Role Category"
            value={demoRole}
            onChange={(e) => setDemoRole(e.target.value)}
            options={[
              { value: 'CANDIDATE', label: 'Software Engineer (Frontend)' },
              { value: 'HR', label: 'Backend Developer (Node.js)' },
              { value: 'ADMIN', label: 'DevOps / Cloud Architect' },
            ]}
            helperText="Select component populated with recruitment role options."
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <strong>Modal Features Tested:</strong> Escape key listener, backdrop blur dismissal, focus trap, and body scroll lock.
          </div>
        </div>
      </Modal>
    </div>
  );
};
