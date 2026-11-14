import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Download,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Video,
  XCircle,
  Briefcase,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFERED'
  | 'REJECTED';

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  companyLogo?: string;
  location: string;
  stage: ApplicationStage;
  submittedOn: string;
  submittedAtIso?: string;
  nextAction: string;
  interviewDate?: string;
  interviewType?: string;
  interviewer?: string;
  salaryRange?: string;
  department?: string;
  resumeId?: string;
  resumeFileName?: string;
  resumeFileSize?: number;
  atsScore?: number;
  coverNotes?: string;
  lastUpdated?: string;
}

export interface ApplicationStatusCardProps {
  application: ApplicationRecord;
  onWithdraw?: (applicationId: string) => void;
  onViewDetails?: (application: ApplicationRecord) => void;
  className?: string;
}

// Recruitment Stage Stepper Steps
const STAGES_ORDER: { key: ApplicationStage; label: string; desc: string }[] = [
  { key: 'APPLIED', label: 'Applied', desc: 'Application Received' },
  { key: 'SCREENING', label: 'Screening', desc: 'Profile & Resume Review' },
  { key: 'INTERVIEW', label: 'Interview', desc: 'Technical & Team Rounds' },
  { key: 'OFFERED', label: 'Decision', desc: 'Offer Extended' },
];

export const ApplicationStatusCard: React.FC<ApplicationStatusCardProps> = ({
  application,
  onWithdraw,
  onViewDetails,
  className = '',
}) => {
  const toast = useToast();
  const [isCoverNotesExpanded, setIsCoverNotesExpanded] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '2.34 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Determine stage progression index (0 to 3)
  const getStageIndex = (stage: ApplicationStage): number => {
    switch (stage) {
      case 'APPLIED':
        return 0;
      case 'SCREENING':
        return 1;
      case 'INTERVIEW':
        return 2;
      case 'SELECTED':
      case 'OFFERED':
        return 3;
      case 'REJECTED':
        return 1; // Positioned where rejection occurred
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(application.stage);
  const isRejected = application.stage === 'REJECTED';
  const isOffered = application.stage === 'OFFERED' || application.stage === 'SELECTED';


  // Resume Download Handler
  const handleDownloadResume = async () => {
    const resumeId = application.resumeId;

    if (!resumeId) {
      toast.error(
        'No resume is attached to this application.',
        'Download Unavailable'
      );
      return;
    }

    if (isDownloadingResume) return;

    setIsDownloadingResume(true);

    const fileName =
      application.resumeFileName ||
      `${application.jobTitle.replace(/\s+/g, '_')}_Resume.pdf`;

    let downloadUrl: string | null = null;

    try {
      const response = await apiClient.get(
        `/resumes/${resumeId}/download`,
        { responseType: 'blob' }
      );

      const contentType = response.headers['content-type'];

      downloadUrl = window.URL.createObjectURL(
        new Blob([response.data], {
          type:
            typeof contentType === 'string'
              ? contentType
              : 'application/pdf',
        })
      );

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`Downloaded ${fileName}`, 'Resume Downloaded');
    } catch {
      toast.error(
        'Failed to download the resume. Please try again.',
        'Download Failed'
      );
    } finally {
      if (downloadUrl !== null) {
        const urlToRevoke = downloadUrl;

        window.setTimeout(() => {
          window.URL.revokeObjectURL(urlToRevoke);
        }, 1000);
      }

      setIsDownloadingResume(false);
    }
  };

  // Withdraw Application Handler
  const handleConfirmWithdraw = () => {
    setIsWithdrawModalOpen(false);
    if (onWithdraw) {
      onWithdraw(application.id);
    }
    toast.info(`Application for ${application.jobTitle} has been withdrawn.`, 'Application Withdrawn');
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all overflow-hidden ${className}`}
    >
      {/* ------------------------------------------------------------------- */}
      {/* CARD HEADER: Job, Company, Badges */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-5 bg-gradient-to-r from-white via-slate-50/30 to-white">
        <div className="flex items-start gap-4">
          {/* Company Avatar / Logo */}
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
            {application.companyLogo ? (
              <img
                src={application.companyLogo}
                alt={application.company}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              application.company.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to={`/jobs/${application.jobId}`}
                className="font-bold text-slate-900 text-lg hover:text-brand-600 transition tracking-tight flex items-center gap-1.5 group"
              >
                {application.jobTitle}
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 transition" />
              </Link>
              <Badge variant={application.stage} size="sm" dot>
                {application.stage}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {application.company}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {application.location}
              </span>
              {application.department && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {application.department}
                  </span>
                </>
              )}
              {application.salaryRange && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-slate-800">{application.salaryRange}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Date Submitted & Quick Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-2 shrink-0 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Applied on {application.submittedOn}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onViewDetails) {
                  onViewDetails(application);
                } else {
                  setIsTimelineModalOpen(true);
                }
              }}
              rightIcon={<ChevronRight className="w-3 h-3" />}
            >
              Details
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* RECRUITMENT STAGE STEPPER / PIPELINE PROGRESS TRACKER */}
      {/* ------------------------------------------------------------------- */}
      <div className="px-6 py-5 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
            Application Progress Tracker
          </span>
          <span className="text-2xs font-semibold text-slate-600">
            {isRejected
              ? 'Application Closed'
              : isOffered
              ? 'Final Offer Stage 🎉'
              : `Stage ${currentStageIndex + 1} of 4: ${STAGES_ORDER[currentStageIndex]?.label}`}
          </span>
        </div>

        {/* Stepper Graphic */}
        <div className="relative flex items-center justify-between mt-3">
          {/* Background Connecting Line */}
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />

          {/* Active Filled Progress Line */}
          {!isRejected && (
            <div
              className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-brand-600 z-0 transition-all duration-500"
              style={{
                width: `${(currentStageIndex / (STAGES_ORDER.length - 1)) * 90}%`,
              }}
            />
          )}

          {/* Stepper Dots & Labels */}
          {STAGES_ORDER.map((stageStep, idx) => {
            const isCompleted = !isRejected && currentStageIndex > idx;
            const isCurrent = !isRejected && currentStageIndex === idx;
            const isStepRejected = isRejected && currentStageIndex === idx;

            return (
              <div key={stageStep.key} className="relative z-10 flex flex-col items-center group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isStepRejected
                      ? 'bg-rose-600 text-white shadow-sm ring-4 ring-rose-100'
                      : isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-brand-600 text-white shadow-md ring-4 ring-brand-100 animate-pulse'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isStepRejected ? (
                    <XCircle className="w-4 h-4" />
                  ) : isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="text-center mt-2">
                  <p
                    className={`text-2xs font-bold ${
                      isStepRejected
                        ? 'text-rose-700'
                        : isCurrent
                        ? 'text-brand-700'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {isStepRejected ? 'Declined' : stageStep.label}
                  </p>
                  <p className="text-3xs text-slate-400 hidden sm:block mt-0.5 max-w-[80px] leading-tight">
                    {stageStep.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* CONTEXTUAL NEXT ACTION / RECRUITER UPDATE BANNER */}
      {/* ------------------------------------------------------------------- */}
      <div className="p-6 space-y-4">
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
            isRejected
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : isOffered
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : application.interviewDate
              ? 'bg-purple-50/70 border-purple-200 text-purple-950'
              : 'bg-blue-50/70 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {isRejected ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : isOffered ? (
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : application.interviewDate ? (
              <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}

            <div className="space-y-0.5">
              <span className="font-bold uppercase tracking-wider text-2xs">
                {isRejected
                  ? 'Application Concluded'
                  : isOffered
                  ? 'Congratulations!'
                  : application.interviewDate
                  ? 'Upcoming Interview Scheduled'
                  : 'Current Status & Next Step'}
              </span>
              <p className="font-medium leading-relaxed">{application.nextAction}</p>

              {application.interviewDate && (
                <div className="pt-2 flex flex-wrap items-center gap-3 text-2xs font-semibold text-purple-800">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    {application.interviewDate}
                  </span>
                  {application.interviewer && (
                    <span>• With {application.interviewer}</span>
                  )}
                  {application.interviewType && (
                    <span>• {application.interviewType}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {application.interviewDate && (
            <Button
              variant="primary"
              size="sm"
              className="shrink-0 bg-purple-700 hover:bg-purple-800 text-xs"
              leftIcon={<Video className="w-3.5 h-3.5" />}
              onClick={() =>
                window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')
              }
            >
              Join Meet
            </Button>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SUBMITTED MATERIALS: Attached Resume & Cover Notes */}
        {/* ----------------------------------------------------------------- */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                {application.resumeFileName || 'Candidate_Resume.pdf'}
              </p>
              <div className="flex items-center gap-1.5 text-2xs text-slate-400">
                <span>{formatFileSize(application.resumeFileSize)}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">
                  ATS {application.atsScore || 95}% Match
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {application.coverNotes && (
              <button
                onClick={() => setIsCoverNotesExpanded(!isCoverNotesExpanded)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
              >
                {isCoverNotesExpanded ? 'Hide Cover Note' : 'View Cover Note'}
                {isCoverNotesExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadResume}
              isLoading={isDownloadingResume}
              disabled={!application.resumeId || isDownloadingResume}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Download Resume
            </Button>

            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Withdraw Application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Cover Notes Drawer */}
        {isCoverNotesExpanded && application.coverNotes && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 animate-fadeIn">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
              Submitted Cover Notes
            </span>
            <p className="italic leading-relaxed text-slate-800 whitespace-pre-line">
              "{application.coverNotes}"
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: Full Application Timeline & Details */}
      {/* ------------------------------------------------------------------- */}
      {isTimelineModalOpen && (
        <Modal
          isOpen={isTimelineModalOpen}
          onClose={() => setIsTimelineModalOpen(false)}
          title={application.jobTitle}
          subtitle={`${application.company} • ${application.location}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Application Requisition ID: {application.jobId}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTimelineModalOpen(false)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6 text-xs">
            {/* Status overview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-2xs text-slate-400 uppercase font-bold">Current Stage</span>
                <div className="mt-1">
                  <Badge variant={application.stage} size="md" dot>
                    {application.stage}
                  </Badge>
                </div>
              </div>

              {application.salaryRange && (
                <div className="text-right">
                  <span className="text-2xs text-slate-400 uppercase font-bold">Estimated Comp</span>
                  <p className="font-bold text-slate-900 mt-1">{application.salaryRange}</p>
                </div>
              )}
            </div>

            {/* Next Action */}
            <div className="p-4 rounded-xl bg-brand-50/60 border border-brand-200 text-brand-900 space-y-1">
              <h5 className="font-bold uppercase tracking-wider text-2xs text-brand-800">
                Recruitment Action Item
              </h5>
              <p className="font-medium">{application.nextAction}</p>
            </div>

            {/* Attached Materials */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-700 uppercase tracking-wider text-2xs">
                Attached Application Materials
              </h5>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-rose-500" />
                  <div>
                    <p className="font-bold text-slate-800">
                      {application.resumeFileName || 'Rekha_Sharma_Resume.pdf'}
                    </p>
                    <p className="text-2xs text-slate-400">
                      {formatFileSize(application.resumeFileSize)} • ATS Verified
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadResume}
                  isLoading={isDownloadingResume}
                  disabled={!application.resumeId || isDownloadingResume}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>
              </div>
            </div>

            {/* Submitted Cover Notes */}
            {application.coverNotes && (
              <div className="space-y-2">
                <h5 className="font-bold text-slate-700 uppercase tracking-wider text-2xs">
                  Submitted Cover Notes
                </h5>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed italic">
                  "{application.coverNotes}"
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL: Withdraw Confirmation */}
      {/* ------------------------------------------------------------------- */}
      {isWithdrawModalOpen && (
        <Modal
          isOpen={isWithdrawModalOpen}
          onClose={() => setIsWithdrawModalOpen(false)}
          title="Withdraw Application?"
          subtitle={`Are you sure you want to withdraw from ${application.jobTitle}?`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                Keep Application
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmWithdraw}
              >
                Withdraw
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              Withdrawing your application will notify the recruiting team at{' '}
              <strong className="text-slate-900">{application.company}</strong> that you are no longer
              actively seeking this role.
            </p>
            <p className="text-2xs text-slate-500">
              You may submit a new application in the future if this position remains open.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
