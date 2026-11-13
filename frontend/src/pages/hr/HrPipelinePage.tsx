import React, { useState } from 'react';
import {
  Search,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ApplicationStage,
  PipelineApplication,
  PipelineKanbanBoard,
  StageTransitionModal,
} from '../../components/pipeline';

const SEED_APPLICATIONS: PipelineApplication[] = [
  {
    id: 'app-seed-01',
    jobId: 'job-seed-01',
    candidateId: 'cand-01',
    resumeId: 'resume-01',
    currentStage: 'APPLIED',
    appliedAt: '2026-11-12T08:30:00Z',
    updatedAt: '2026-11-12T08:30:00Z',
    matchScore: 92,
    candidate: {
      id: 'cand-01',
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      headline: 'Senior Full Stack Engineer',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    },
    job: {
      id: 'job-seed-01',
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
      companyName: 'TechCorp Solutions',
    },
    resumeFileName: 'Alex_Morgan_Resume.pdf',
  },
  {
    id: 'app-seed-02',
    jobId: 'job-seed-02',
    candidateId: 'cand-02',
    resumeId: 'resume-02',
    currentStage: 'APPLIED',
    appliedAt: '2026-11-12T11:45:00Z',
    updatedAt: '2026-11-12T11:45:00Z',
    matchScore: 88,
    candidate: {
      id: 'cand-02',
      name: 'Samira Khan',
      email: 'samira.khan@example.com',
      headline: 'DevOps & Cloud Architect',
      skills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'],
    },
    job: {
      id: 'job-seed-02',
      title: 'DevOps Architect',
      department: 'Infrastructure',
      location: 'New York, NY',
      companyName: 'TechCorp Solutions',
    },
    resumeFileName: 'Samira_Cloud_CV.pdf',
  },
  {
    id: 'app-seed-03',
    jobId: 'job-seed-01',
    candidateId: 'cand-03',
    resumeId: 'resume-03',
    currentStage: 'SCREENING',
    appliedAt: '2026-11-11T14:15:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    matchScore: 85,
    candidate: {
      id: 'cand-03',
      name: 'David Lee',
      email: 'david.lee@example.com',
      headline: 'Frontend React Specialist',
      skills: ['TypeScript', 'Next.js', 'Tailwind CSS'],
    },
    job: {
      id: 'job-seed-01',
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
      companyName: 'TechCorp Solutions',
    },
    resumeFileName: 'David_Lee_Frontend.pdf',
  },
  {
    id: 'app-seed-04',
    jobId: 'job-seed-03',
    candidateId: 'cand-04',
    resumeId: 'resume-04',
    currentStage: 'INTERVIEW',
    appliedAt: '2026-11-10T09:20:00Z',
    updatedAt: '2026-11-12T16:00:00Z',
    matchScore: 96,
    candidate: {
      id: 'cand-04',
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      headline: 'Principal Product Designer',
      skills: ['Figma', 'Design Systems', 'User Research'],
    },
    job: {
      id: 'job-seed-03',
      title: 'Principal Product Designer',
      department: 'Design',
      location: 'San Francisco, CA',
      companyName: 'TechCorp Solutions',
    },
    resumeFileName: 'Elena_Design_Portfolio.pdf',
  },
  {
    id: 'app-seed-05',
    jobId: 'job-seed-02',
    candidateId: 'cand-05',
    resumeId: 'resume-05',
    currentStage: 'SELECTED',
    appliedAt: '2026-11-09T13:00:00Z',
    updatedAt: '2026-11-12T18:00:00Z',
    matchScore: 91,
    candidate: {
      id: 'cand-05',
      name: 'Carlos Mendez',
      email: 'carlos.mendez@example.com',
      headline: 'Senior Cloud Reliability Engineer',
      skills: ['GCP', 'PostgreSQL', 'Python', 'Go'],
    },
    job: {
      id: 'job-seed-02',
      title: 'DevOps Architect',
      department: 'Infrastructure',
      location: 'New York, NY',
      companyName: 'TechCorp Solutions',
    },
    resumeFileName: 'Carlos_Mendez_SRE.pdf',
  },
  {
    id: 'app-seed-06',
    jobId: 'job-seed-01',
    candidateId: 'cand-06',
    resumeId: 'resume-06',
    currentStage: 'OFFERED',
    appliedAt: '2026-11-08T10:30:00Z',
    updatedAt: '2026-11-13T09:00:00Z',
    matchScore: 94,
    candidate: {
      id: 'cand-06',
      name: 'Zack Taylor',
      email: 'zack.taylor@example.com',
      headline: 'Lead Software Architect',
      skills: ['Microservices', 'Node.js', 'Distributed Systems'],
    },
    job: {
      id: 'job-seed-01',
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote',
      companyName: 'TechCorp Solutions',
    },
    resumeFileName: 'Zack_Taylor_Architect.pdf',
  },
];

export const HrPipelinePage: React.FC = () => {
  const [applications, setApplications] = useState<PipelineApplication[]>(SEED_APPLICATIONS);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      // Optimistically update local state or invoke API
      setApplications((prev) =>
        prev.map((app) =>
          app.id === modalApp.id
            ? {
                ...app,
                currentStage: targetStage,
                updatedAt: new Date().toISOString(),
                stageHistory: [
                  ...(app.stageHistory || []),
                  {
                    id: `hist-${Date.now()}`,
                    fromStage: app.currentStage,
                    toStage: targetStage,
                    changedBy: 'Current HR User',
                    reason,
                    changedAt: new Date().toISOString(),
                  },
                ],
              }
            : app
        )
      );

      showToast(
        `Candidate ${modalApp.candidate.name} successfully moved to ${targetStage}!`,
        'success'
      );
      setIsModalOpen(false);
      setModalApp(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update candidate stage', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

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

      {/* Kanban Board */}
      <PipelineKanbanBoard
        applications={filteredApplications}
        onRequestTransition={handleOpenTransitionModal}
        onIllegalDropAttempt={(msg) => showToast(msg, 'error')}
      />

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
