import React from 'react';
import {
  X,
  Mail,
  Briefcase,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  User,
  Download,
} from 'lucide-react';
import {
  PipelineApplication,
  PIPELINE_COLUMNS,
  ALLOWED_NEXT_STAGES,
} from './types';

interface CandidateDossierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  application: PipelineApplication | null;
  onAdvanceClick?: (application: PipelineApplication) => void;
  onRejectClick?: (application: PipelineApplication) => void;
  onDownloadResume?: (resumeId: string, fileName?: string) => void;
  isDownloadingResume?: boolean;
}

export const CandidateDossierDrawer: React.FC<CandidateDossierDrawerProps> = ({
  isOpen,
  onClose,
  application,
  onAdvanceClick,
  onRejectClick,
  onDownloadResume,
  isDownloadingResume = false,
}) => {
  if (!isOpen || !application) return null;

  const currentStageDef = PIPELINE_COLUMNS.find((c) => c.id === application.currentStage);
  const allowedNext = ALLOWED_NEXT_STAGES[application.currentStage] || [];
  const canAdvance = allowedNext.some((s) => s !== 'REJECTED');
  const canReject = application.currentStage !== 'REJECTED';

  const formattedAppliedDate = new Date(application.appliedAt).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 font-bold text-lg flex items-center justify-center border border-brand-200 shadow-xs">
              {application.candidate.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{application.candidate.name}</h2>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${currentStageDef?.badgeBg}`}>
                  {currentStageDef?.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {application.candidate.headline || application.job.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Contact & Job Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Position Applied
              </span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{application.job.title}</span>
              </p>
              <p className="text-[11px] text-slate-500">{application.job.department || 'General'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Submission Date
              </span>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedAppliedDate}</span>
              </p>
              <p className="text-[11px] text-slate-500">Source: Direct Portal</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
              Candidate Contact
            </h3>
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{application.candidate.email}</span>
                </div>
                <a
                  href={`mailto:${application.candidate.email}`}
                  className="text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-0.5"
                >
                  Email <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Skills Profile */}
          {application.candidate.skills && application.candidate.skills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Key Skills & Competencies
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {application.candidate.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-800 border border-brand-200 rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resume Document Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
              Attached Resume
            </h3>
            {application.resumeId ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                    PDF
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {application.resumeFileName || 'Candidate_Resume.pdf'}
                    </p>
                    <p className="text-[11px] text-slate-400">Ownership-protected secure download</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onDownloadResume?.(application.resumeId!, application.resumeFileName || undefined)
                  }
                  disabled={isDownloadingResume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloadingResume ? 'Downloading...' : 'Download'}</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No resume file attached to application.</p>
            )}
          </div>

          {/* Cover Letter */}
          {application.coverLetter && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Cover Letter Note
              </h3>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {application.coverLetter}
              </div>
            </div>
          )}

          {/* Stage Audit History Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Stage Transition Timeline (Audit History)
              </h3>
              <span className="text-[11px] font-medium text-slate-400">
                {application.stageHistory?.length || 1} records
              </span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {application.stageHistory && application.stageHistory.length > 0 ? (
                application.stageHistory.map((history, idx) => {
                  const toStageDef = PIPELINE_COLUMNS.find((c) => c.id === history.toStage);
                  const formattedDate = new Date(history.changedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div key={history.id || idx} className="relative space-y-1 text-xs">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-white" />

                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${toStageDef?.badgeBg}`}>
                          {history.fromStage ? `${history.fromStage} ➔ ${history.toStage}` : history.toStage}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">
                        "{history.reason || 'Stage updated'}"
                      </p>

                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-slate-400" />
                        <span>Changed by {history.changedBy || 'Recruiter'}</span>
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="relative space-y-1 text-xs">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    APPLIED
                  </span>
                  <p className="text-xs text-slate-700 font-medium">"Initial application submission"</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Candidate self-service</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
          {canReject && (
            <button
              type="button"
              onClick={() => onRejectClick?.(application)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200"
            >
              Reject Candidate
            </button>
          )}

          {canAdvance && (
            <button
              type="button"
              onClick={() => onAdvanceClick?.(application)}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span>Advance Stage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
