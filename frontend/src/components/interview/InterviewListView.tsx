import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Video,
  Search,
  Filter,
  Plus,
  FileCheck,
} from 'lucide-react';
import { InterviewEvent, InterviewStatus } from './InterviewTypes';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';

export interface InterviewListViewProps {
  interviews: InterviewEvent[];
  onSelectInterview?: (interview: InterviewEvent) => void;
  onScheduleNew?: () => void;
  onOpenScorecard?: (interview: InterviewEvent) => void;
  className?: string;
}

export const InterviewListView: React.FC<InterviewListViewProps> = ({
  interviews,
  onSelectInterview,
  onScheduleNew,
  onOpenScorecard,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Filtered interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      // Status filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCandidate = item.candidateName.toLowerCase().includes(q);
        const matchRole = item.candidateRole.toLowerCase().includes(q);
        const matchInterviewer = item.interviewer.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        if (!matchCandidate && !matchRole && !matchInterviewer && !matchTitle) return false;
      }

      return true;
    });
  }, [interviews, statusFilter, typeFilter, searchQuery]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredInterviews.length / itemsPerPage);
  const paginatedInterviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInterviews.slice(start, start + itemsPerPage);
  }, [filteredInterviews, currentPage]);

  const formatDateTime = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const dateFormatted = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const startTimeStr = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    const endTimeStr = end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    return `${dateFormatted} • ${startTimeStr} - ${endTimeStr} UTC`;
  };

  const getStatusBadge = (status: InterviewStatus) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="primary" size="sm">Scheduled</Badge>;
      case 'COMPLETED':
        return <Badge variant="success" size="sm">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" size="sm">Cancelled</Badge>;
      case 'RESCHEDULED':
        return <Badge variant="warning" size="sm">Rescheduled</Badge>;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search interviews by candidate, title, or interviewer..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 placeholder:text-slate-400"
              aria-label="Search interviews list"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              aria-label="Filter by interview status"
            >
              <option value="ALL">All Statuses ({interviews.length})</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Round Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            aria-label="Filter by interview round type"
          >
            <option value="ALL">All Round Types</option>
            <option value="SCREENING">Screening</option>
            <option value="TECHNICAL">Technical Coding</option>
            <option value="SYSTEM_DESIGN">System Design</option>
            <option value="BEHAVIORAL">Behavioral</option>
            <option value="MANAGEMENT">Management</option>
            <option value="FINAL">Final Round</option>
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
          <span className="font-medium">
            Showing <strong className="text-slate-800">{filteredInterviews.length}</strong> of{' '}
            <strong className="text-slate-800">{interviews.length}</strong> interviews
          </span>
        </div>
      </div>

      {/* ARIA Live Region for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        Showing page {currentPage} of {totalPages || 1}, {filteredInterviews.length} total interviews matching criteria.
      </div>

      {/* List Content */}
      {filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No interviews match your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                ? 'Try adjusting your search query, status selector, or round type filter to see results.'
                : 'No interview sessions are currently scheduled. Use the Schedule button to coordinate your first interview.'}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            {(searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            )}
            {onScheduleNew && (
              <Button
                variant="primary"
                size="sm"
                onClick={onScheduleNew}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Schedule Interview
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {paginatedInterviews.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectInterview?.(item)}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:border-purple-300 hover:shadow-md transition cursor-pointer space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {item.type}
                    </span>
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(item.scheduledStart, item.scheduledEnd)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 pt-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">
                    Candidate: <strong className="text-slate-800">{item.candidateName}</strong> — {item.candidateRole}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start">
                  <a
                    href={item.locationOrLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Meeting</span>
                  </a>

                  {onOpenScorecard && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScorecard(item);
                      }}
                      leftIcon={<FileCheck className="w-3.5 h-3.5 text-slate-500" />}
                    >
                      Scorecard
                    </Button>
                  )}
                </div>
              </div>

              {/* Interviewer & Notes Banner */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                    {item.interviewer
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')}
                  </div>
                  <span>
                    Lead Interviewer: <strong className="text-slate-800">{item.interviewer}</strong>
                    {item.interviewerRole && ` (${item.interviewerRole})`}
                  </span>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-slate-400 truncate max-w-md italic">
                    "{item.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong className="text-slate-800">
                  {Math.min(currentPage * itemsPerPage, filteredInterviews.length)}
                </strong>{' '}
                of <strong className="text-slate-800">{filteredInterviews.length}</strong> interviews
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
