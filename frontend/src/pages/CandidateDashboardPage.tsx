import React from 'react';
import { FileText, Clock, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

export const CandidateDashboardPage: React.FC = () => {
  const applications = [
    {
      id: 'app-1',
      jobTitle: 'Senior Full Stack Engineer',
      company: 'TechCorp Labs',
      stage: 'Technical Interview',
      stageColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      submittedOn: 'Nov 02, 2026',
      nextAction: 'Interview scheduled for Nov 11, 2026 at 2:00 PM EST',
    },
    {
      id: 'app-2',
      jobTitle: 'DevOps & Cloud Architect',
      company: 'NextGen Cloud',
      stage: 'Application Screening',
      stageColor: 'bg-amber-50 text-amber-700 border-amber-200',
      submittedOn: 'Nov 05, 2026',
      nextAction: 'Resume under review by engineering lead',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate Application Portal
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Track your job applications, interview timelines, and resume status.
          </p>
        </div>
        <button
          onClick={() => alert('[Day 1 Prototype] Resume upload will be active in Floor 3.')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition self-start"
        >
          <FileText className="w-4 h-4" />
          Update Master Resume (5 MB max)
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Active Applications</p>
            <p className="text-2xl font-bold text-slate-900">2</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Upcoming Interviews</p>
            <p className="text-2xl font-bold text-slate-900">1</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Profile Completion</p>
            <p className="text-2xl font-bold text-emerald-600">100%</p>
          </div>
        </div>
      </div>

      {/* Application List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Your Applications</h2>
          <span className="text-xs text-slate-400">2 In Progress</span>
        </div>

        <div className="divide-y divide-slate-100">
          {applications.map((app) => (
            <div key={app.id} className="p-6 hover:bg-slate-50/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{app.jobTitle}</h3>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600">{app.company}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${app.stageColor}`}>
                    {app.stage}
                  </span>
                  <span className="text-xs text-slate-400">Applied {app.submittedOn}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-2">
                  <AlertCircle className="w-3.5 h-3.5 text-brand-600" />
                  <span>{app.nextAction}</span>
                </div>
              </div>

              <button className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition self-start md:self-center">
                Application Details
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
