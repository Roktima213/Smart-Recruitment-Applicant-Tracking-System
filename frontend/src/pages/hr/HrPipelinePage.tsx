import React, { useState } from 'react';
import {
  Search,
  Briefcase,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ApplicationStage,
  PipelineApplication,
  PipelineKanbanBoard,
  StageTransitionModal,
} from '../../components/pipeline';
import { usePipeline } from '../../hooks/usePipeline';
import { useToast } from '../../context/ToastContext';

export const HrPipelinePage: React.FC = () => {
  const {
    applications,
    loading,
    updatingAppId,
    fetchPipeline,
    transitionStage,
  } = usePipeline();
  const toast = useToast();

  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Transition Modal State
  const [modalApp, setModalApp] = useState<PipelineApplication | null>(null);
  const [modalTargetStage, setModalTargetStage] = useState<ApplicationStage | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered applications
  const filteredApplications = applications.filter((app) => {
    if (selectedJobFilter !== 'ALL' && app.jobId !== selectedJobFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.candidate.name.toLowerCase().includes(q);
      const matchRole = (app.candidate.headline || '').toLowerCase().includes(q);
      const matchJob = app.job.title.toLowerCase().includes(q);
      return matchName || matchRole || matchJob;
    }
    return true;
  });

  const uniqueJobs = Array.from(
    new Map(applications.map((app) => [app.job.id, app.job])).values()
  );

  const handleOpenTransitionModal = (
    application: PipelineApplication,
    targetStage?: ApplicationStage
  ) => {
    setModalApp(application);
    setModalTargetStage(targetStage);
    setIsModalOpen(true);
  };

  const handleConfirmTransition = async (targetStage: ApplicationStage, reason: string) => {
    if (!modalApp) return;

    setIsSubmitting(true);
    try {
      const success = await transitionStage(modalApp.id, targetStage, reason);
      if (success) {
        setIsModalOpen(false);
        setModalApp(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Recruitment Pipeline Board</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Interactive Kanban
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Stage transitions enforce row-locking concurrency and immutable audit logging.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={() => fetchPipeline()}
            disabled={loading}
            className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition"
            title="Refresh Pipeline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-brand-200 w-44"
            />
          </div>

          {/* Job Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedJobFilter}
              onChange={(e) => setSelectedJobFilter(e.target.value)}
              className="text-xs text-slate-700 font-medium bg-transparent border-none focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Active Jobs ({applications.length})</option>
              {uniqueJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading Skeleton or Kanban Board */}
      {loading && applications.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-2" />
          <p className="text-xs font-semibold text-slate-600">Loading pipeline board...</p>
        </div>
      ) : (
        <PipelineKanbanBoard
          applications={filteredApplications}
          onRequestTransition={handleOpenTransitionModal}
          updatingAppId={updatingAppId}
          onIllegalDropAttempt={(msg) => toast.error(msg)}
        />
      )}

      {/* Transition Modal */}
      {modalApp && (
        <StageTransitionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setModalApp(null);
          }}
          candidateName={modalApp.candidate.name}
          jobTitle={modalApp.job.title}
          currentStage={modalApp.currentStage}
          targetStage={modalTargetStage}
          onConfirm={handleConfirmTransition}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
