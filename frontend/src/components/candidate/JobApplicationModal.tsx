import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  MapPin, 
  Briefcase 
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { JobRecord } from '../../hooks/useJobs';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

export interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobRecord;
  onSuccess: (applicationId: string) => void;
}

export interface CandidateResumeInfo {
  id: string;
  fileName: string;
  storedFileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  createdAt: string;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  job,
  onSuccess,
}) => {
  const toast = useToast();

  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [activeResume, setActiveResume] = useState<CandidateResumeInfo | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState<boolean>(false);

  // Fetch candidate profile & active resume when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchCandidateData = async () => {
      setLoadingProfile(true);
      setSubmitError(null);
      try {
        const res = await apiClient.get('/candidates/me');
        if (!isMounted) return;

        const profileData = res.data?.profile;
        if (profileData?.resume) {
          setActiveResume(profileData.resume);
        } else {
          setActiveResume(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[Application Modal Fetch Candidate Error]', err);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    fetchCandidateData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, job.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResume) {
      toast.warning('Please upload your verified resume before submitting your application.', 'Missing Resume');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiClient.post('/applications', {
        jobId: job.id,
        resumeId: activeResume.id,
        coverLetter: coverLetter.trim() || null,
        answers: {
          submittedVia: 'Smart ATS Portal',
          appliedTimestamp: new Date().toISOString(),
        },
      });

      const newApp = response.data?.application;
      toast.success(`Application for "${job.title}" submitted successfully!`, 'Application Received');
      onSuccess(newApp?.id || '');
      onClose();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setAlreadyApplied(true);
        const msg = err.response?.data?.error?.message || 'You have already submitted an application for this position.';
        setSubmitError(msg);
        toast.info(msg, 'Duplicate Submission');
      } else {
        const msg = err.response?.data?.error?.message || err.message || 'Failed to submit job application';
        setSubmitError(msg);
        toast.error(msg, 'Submission Failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Job Application"
      subtitle={`${job.title} • ${job.department}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={submitting || !activeResume || alreadyApplied}
            leftIcon={alreadyApplied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Send className="w-4 h-4" />}
          >
            {alreadyApplied ? 'Already Applied' : 'Submit Application'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Brief Card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm">{job.title}</h4>
            <Badge variant="success" size="sm" dot>
              {job.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {job.company_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> {job.company_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {job.employment_type}
            </span>
          </div>
        </div>

        {/* Conflict / Error Banner */}
        {submitError && (
          <div className={`p-4 rounded-xl flex items-start gap-3 border ${alreadyApplied ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold">{alreadyApplied ? 'Application Already On File' : 'Unable to Submit Application'}</p>
              <p>{submitError}</p>
            </div>
          </div>
        )}

        {/* Attached Resume Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Verified Resume Document
          </label>

          {loadingProfile ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded"></div>
              <div className="space-y-1 flex-1">
                <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
              </div>
            </div>
          ) : activeResume ? (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <FileText className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    {activeResume.fileName}
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(activeResume.fileSizeBytes)} • SHA-256 Integrity Verified
                  </p>
                </div>
              </div>

              <Badge variant="success" size="sm">
                Ready to Attach
              </Badge>
            </div>
          ) : (
            <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-center">
              <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
              <p className="text-xs font-semibold text-amber-900">
                No verified resume attached to your candidate profile.
              </p>
              <p className="text-2xs text-amber-700">
                Please visit your Candidate Dashboard to upload your resume before submitting applications.
              </p>
            </div>
          )}
        </div>

        {/* Cover Letter / Note to Hiring Manager */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="coverLetter" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cover Letter & Note to Team (Optional)
            </label>
            <span className="text-2xs text-slate-400">
              {coverLetter.length} / 5,000
            </span>
          </div>

          <textarea
            id="coverLetter"
            rows={5}
            maxLength={5000}
            disabled={submitting || alreadyApplied}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Introduce yourself, highlight relevant experience, and share why you are excited to join this team..."
            className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-slate-400 text-slate-800"
          />
        </div>

        {/* Candidate Declaration */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-2xs text-slate-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>
            By submitting, your candidate profile details and verified resume will be shared directly with the hiring committee for this requisition.
          </span>
        </div>
      </form>
    </Modal>
  );
};
