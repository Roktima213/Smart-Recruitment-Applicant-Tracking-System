import React from 'react';
import { Plus, Briefcase, Users, MoreHorizontal } from 'lucide-react';

export const HrJobsPage: React.FC = () => {
  const jobs = [
    {
      id: 'REQ-101',
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      applicantsCount: 24,
      status: 'Active',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      createdDate: '2026-11-01',
    },
    {
      id: 'REQ-102',
      title: 'DevOps & Cloud Architect',
      department: 'Infrastructure',
      applicantsCount: 12,
      status: 'Active',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      createdDate: '2026-11-03',
    },
    {
      id: 'REQ-103',
      title: 'Product Marketing Manager',
      department: 'Marketing',
      applicantsCount: 8,
      status: 'Draft',
      statusColor: 'bg-slate-100 text-slate-700 border-slate-200',
      createdDate: '2026-11-07',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Requisitions</h1>
          <p className="text-sm text-slate-500">Create, publish, and manage hiring requisitions.</p>
        </div>
        <button
          onClick={() => alert('[Day 1 Prototype] Job requisition creation wizard opens in Floor 6.')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-sm transition self-start"
        >
          <Plus className="w-4 h-4" />
          Create New Requisition
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3">Requisition & Role</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Total Candidates</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-400 font-mono">{job.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{job.department}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      <Users className="w-3 h-3 text-slate-500" />
                      {job.applicantsCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${job.statusColor}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{job.createdDate}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
