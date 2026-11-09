import React from 'react';
import { Calendar, Video, User } from 'lucide-react';

export const HrInterviewsPage: React.FC = () => {
  const interviews = [
    {
      id: 'int-1',
      candidateName: 'Alex Morgan',
      role: 'Senior Full Stack Engineer',
      type: 'Technical System Design',
      interviewer: 'Ranadeep (Hiring Manager)',
      date: 'Today, 2:00 PM - 3:00 PM EST',
      status: 'Confirmed',
    },
    {
      id: 'int-2',
      candidateName: 'Samira Khan',
      role: 'DevOps & Cloud Architect',
      type: 'Kubernetes & Infrastructure Deep Dive',
      interviewer: 'Cloud Engineer',
      date: 'Tomorrow, 10:30 AM - 11:30 AM EST',
      status: 'Scheduled',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Schedules</h1>
          <p className="text-sm text-slate-500">
            Coordinate interview rounds, interviewer assignments, and candidate scorecards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {interviews.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  {item.type}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-2">{item.candidateName}</h3>
                <p className="text-xs text-slate-500">{item.role}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Interviewer: {item.interviewer}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition">
                <Video className="w-3.5 h-3.5" />
                Join Video Bridge
              </button>
              <button className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition">
                Scorecard
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
