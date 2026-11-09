import React, { useState } from 'react';
import { Search, MapPin, DollarSign, Clock, Building2, ChevronRight } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  department: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  postedAt: string;
}

const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    company: 'TechCorp Labs',
    location: 'Remote, US',
    type: 'Full-time',
    salary: '$130k - $160k',
    postedAt: '2 days ago',
  },
  {
    id: 'job-2',
    title: 'DevOps & Cloud Architect',
    department: 'Infrastructure',
    company: 'NextGen Cloud',
    location: 'San Francisco, CA (Hybrid)',
    type: 'Full-time',
    salary: '$150k - $185k',
    postedAt: 'Just now',
  },
  {
    id: 'job-3',
    title: 'Product Marketing Manager',
    department: 'Marketing',
    company: 'Apex Digital',
    location: 'New York, NY',
    type: 'Full-time',
    salary: '$110k - $135k',
    postedAt: '3 days ago',
  },
  {
    id: 'job-4',
    title: 'UI/UX Product Designer',
    department: 'Design',
    company: 'Creative Studios',
    location: 'Remote',
    type: 'Contract',
    salary: '$80/hr - $100/hr',
    postedAt: '5 days ago',
  },
];

export const JobsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = MOCK_JOBS.filter(
    (j) =>
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Explore Career Opportunities
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Find your next role with top engineering and product teams.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by job title, department, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg transition shrink-0">
          Find Jobs
        </button>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Showing {filteredJobs.length} active positions</span>
          <span>Sorted by most recent</span>
        </div>

        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100">
                  {job.department}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{job.postedAt}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 hover:text-brand-600 cursor-pointer">
                {job.title}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {job.company}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {job.type}
                </span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  {job.salary}
                </span>
              </div>
            </div>

            <button
              onClick={() => alert(`[Day 1 Prototype] Application modal for ${job.title} opens in Day 3!`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition shrink-0 self-end sm:self-center"
            >
              Apply Now
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
