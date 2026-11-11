import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Building2, 
  ChevronRight, 
  SlidersHorizontal,
  X,
  Sparkles
} from 'lucide-react';
import { useJobs } from '../hooks/useJobs';
import { SkeletonCard } from '../components/ui/Skeleton';
import { Pagination } from '../components/ui/Pagination';

const DEPARTMENTS = [
  'All Departments',
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Infrastructure',
  'Operations',
  'Human Resources',
  'Finance',
];

const EMPLOYMENT_TYPES = [
  'All Types',
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
];

export const JobsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [selectedType, setSelectedType] = useState('All Types');
  const [locationQuery, setLocationQuery] = useState('');

  const {
    jobs,
    loading,
    pagination,
    updateFilters,
  } = useJobs({
    status: 'PUBLISHED',
    limit: 12,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      q: searchTerm || undefined,
      department: selectedDept !== 'All Departments' ? selectedDept : undefined,
      location: locationQuery || undefined,
      page: 1,
    });
  };

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    updateFilters({
      department: dept !== 'All Departments' ? dept : undefined,
      page: 1,
    });
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    updateFilters({
      employment_type: type !== 'All Types' ? type : undefined,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDept('All Departments');
    setSelectedType('All Types');
    setLocationQuery('');
    updateFilters({
      q: undefined,
      department: undefined,
      location: undefined,
      employment_type: undefined,
      status: 'PUBLISHED',
      page: 1,
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    updateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (min == null && max == null) return 'Competitive';
    if (min === 0 && (max === 0 || max == null)) return 'Unpaid / Volunteer';
    if (min != null && max == null) return `From $${(min / 1000).toFixed(0)}k`;
    if (min == null && max != null) return `Up to $${(max / 1000).toFixed(0)}k`;
    return `$${(min! / 1000).toFixed(0)}k - $${(max! / 1000).toFixed(0)}k`;
  };

  const filteredJobs = jobs.filter((job) => {
    if (selectedType !== 'All Types') {
      return job.employment_type?.toLowerCase().includes(selectedType.toLowerCase());
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          Live Career Opportunities
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find Your Next Calling
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Browse verified, open requisitions across engineering, design, marketing, and operations.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by job title, department, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>

          <div className="relative sm:w-60">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Location or Remote..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition shadow-sm shrink-0"
          >
            Find Positions
          </button>
        </form>

        {/* Dropdown Filters & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium inline-flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters:
            </span>

            <select
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {(searchTerm || selectedDept !== 'All Departments' || selectedType !== 'All Types' || locationQuery) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 px-2 py-1 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
                Reset filters
              </button>
            )}
          </div>

          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800">{pagination.total || filteredJobs.length}</span> open positions
          </div>
        </div>
      </div>

      {/* Job Cards Directory */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">No open positions found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              We couldn't find any job requisitions matching your current search filters. Try clearing your filters or checking back soon.
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-brand-50 text-brand-600 hover:bg-brand-100 font-semibold text-xs rounded-lg transition"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    {job.company_name?.charAt(0) || 'J'}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {job.department || 'General'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-600 transition line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium inline-flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {job.company_name || 'Hiring Company'}
                  </p>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job.location}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {job.employment_type}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100">
                <div className="text-xs">
                  <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Salary</p>
                  <p className="font-bold text-slate-800">{formatSalary(job.salary_min, job.salary_max)}</p>
                </div>

                <Link
                  to={`/jobs/${job.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-brand-600 hover:text-white text-slate-700 font-medium text-xs rounded-lg transition"
                >
                  View Details
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="pt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default JobsPage;
