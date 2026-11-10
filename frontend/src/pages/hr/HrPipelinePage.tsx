import React from 'react';
import { Users, Filter } from 'lucide-react';

type ApplicationStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'SELECTED' | 'OFFERED' | 'REJECTED';

interface Stage {
  id: ApplicationStage;
  name: string;
  count: number;
  candidates: {
    id: string;
    name: string;
    role: string;
    matchScore: number;
    rating: string;
  }[];
}

const INITIAL_STAGES: Stage[] = [
  {
    id: 'APPLIED',
    name: 'Applied',
    count: 2,
    candidates: [
      { id: 'c1', name: 'Alex Morgan', role: 'Full Stack Engineer', matchScore: 92, rating: 'Strong' },
      { id: 'c2', name: 'Samira Khan', role: 'DevOps Architect', matchScore: 88, rating: 'Good' },
    ],
  },
  {
    id: 'SCREENING',
    name: 'Screening',
    count: 1,
    candidates: [
      { id: 'c3', name: 'David Lee', role: 'Full Stack Engineer', matchScore: 85, rating: 'Review' },
    ],
  },
  {
    id: 'INTERVIEW',
    name: 'Interview',
    count: 1,
    candidates: [
      { id: 'c4', name: 'Elena Rostova', role: 'Product Designer', matchScore: 95, rating: 'Top' },
    ],
  },
  {
    id: 'SELECTED',
    name: 'Selected',
    count: 1,
    candidates: [
      { id: 'c5', name: 'Carlos Mendez', role: 'Cloud Engineer', matchScore: 90, rating: 'Selected' },
    ],
  },
  {
    id: 'OFFERED',
    name: 'Offered',
    count: 1,
    candidates: [
      { id: 'c6', name: 'Zack Taylor', role: 'Full Stack Engineer', matchScore: 94, rating: 'Offer Sent' },
    ],
  },
  {
    id: 'REJECTED',
    name: 'Rejected',
    count: 0,
    candidates: [],
  },
];

export const HrPipelinePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hiring Pipeline Board</h1>
          <p className="text-sm text-slate-500">
            Interactive recruitment funnel across all active job postings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm">
            <Filter className="w-3.5 h-3.5" />
            Filter by Job
          </button>
        </div>
      </div>

      {/* Kanban Column View */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {INITIAL_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="bg-slate-100/70 rounded-xl p-3 border border-slate-200 flex flex-col min-w-[220px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
              <span className="font-semibold text-xs text-slate-700 uppercase tracking-wide">
                {stage.name}
              </span>
              <span className="w-5 h-5 rounded-full bg-white text-slate-700 text-xs font-bold flex items-center justify-center border border-slate-200 shadow-xs">
                {stage.count}
              </span>
            </div>

            {/* Candidate Cards */}
            <div className="space-y-2 flex-1">
              {stage.candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs hover:border-brand-300 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-xs text-slate-900">{cand.name}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700">
                      {cand.matchScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{cand.role}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> 1 eval
                    </span>
                    <span className="font-medium text-slate-600">{cand.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
