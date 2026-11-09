import React from 'react';
import { BarChart3, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';

export const HrAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recruitment Analytics & Insights</h1>
        <p className="text-sm text-slate-500">
          Track hiring velocity, pipeline conversion rates, and time-to-hire metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Time to Hire</span>
            <Clock className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">18.4 Days</p>
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> -3.2 days vs last month
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Offer Acceptance</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">87.5%</p>
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +5% above industry benchmark
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Applications</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">142</p>
          <p className="text-xs text-slate-500">Across 3 open requisitions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Pipeline Velocity</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">4.1 Days / Stage</p>
          <p className="text-xs text-slate-500">Optimal throughput</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Application Funnel Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Applied', count: 142, percentage: '100%', color: 'bg-brand-500' },
            { label: 'Screened', count: 68, percentage: '48%', color: 'bg-indigo-500' },
            { label: 'Technical Interview', count: 28, percentage: '20%', color: 'bg-blue-500' },
            { label: 'Offer Sent', count: 8, percentage: '6%', color: 'bg-amber-500' },
            { label: 'Hired', count: 6, percentage: '4.2%', color: 'bg-emerald-500' },
          ].map((bar) => (
            <div key={bar.label} className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>{bar.label} ({bar.count})</span>
                <span>{bar.percentage}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${bar.color}`} style={{ width: bar.percentage }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
