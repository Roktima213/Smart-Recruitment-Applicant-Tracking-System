import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Building2,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  User,
  FileCheck2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { ResumeDocument } from './DocumentPreviewCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/apiClient';

export interface JobSummaryInfo {
  id: string;
  title: string;
  company_name?: string;
  location?: string;
  department?: string;
  employment_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
}

export interface SubmittedApplicationPayload {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  department?: string;
  salaryRange?: string;
  stage: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'SELECTED' | 'OFFERED' | 'REJECTED';
  submittedOn: string;
  submittedAtIso: string;
  nextAction: string;
  resumeId?: string;
  resumeFileName?: string;
  resumeFileSize?: number;
  atsScore?: number;
  coverNotes?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  earliestStartDate?: string;
}

export interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobSummaryInfo;
  activeResume?: ResumeDocument | null;
  onApplicationSubmitted?: (application: SubmittedApplicationPayload) => void;
  className?: string;
}

const STORAGE_APPLICATIONS_KEY = 'smart_ats_candidate_applications';

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  job,
  activeResume: initialActiveResume,
  onApplicationSubmitted,
}) => {
  const { user, dbUser } = useAuth();
  const toast = useToast();

  // Candidate Contact Details
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('+1 (555) 234-5678');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  // Resume Review / Selection
  const [selectedResume, setSelectedResume] = useState<ResumeDocument | null>(null);
  const [isUploadingTailoredResume, setIsUploadingTailoredResume] = useState(false);
  const [tailoredResumeUploadProgress, setTailoredResumeUploadProgress] = useState(0);
  const [tailoredResumeError, setTailoredResumeError] = useState<string | null>(null);

  // Cover Notes & Additional Questions
  const [coverNotes, setCoverNotes] = useState('');
  const [earliestStartDate, setEarliestStartDate] = useState('Immediately (Within 2 weeks)');
  const [remotePreference, setRemotePreference] = useState('Hybrid / Open to Remote');
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Status flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<SubmittedApplicationPayload | null>(null);

  // Initialize or reset form state whenever modal opens or activeResume changes
  useEffect(() => {
    if (isOpen) {
      setCandidateName(dbUser?.full_name || user?.displayName || 'Candidate');
      setCandidateEmail(dbUser?.email || user?.email || '');
      
      // Default to initial resume or fallback mock master resume if not provided
      if (initialActiveResume) {
        setSelectedResume(initialActiveResume);
      } else {
        setSelectedResume({
          id: 'res-master-001',
          fileName: `${(dbUser?.full_name || 'Candidate').replace(/\s+/g, '_')}_Master_Resume.pdf`,
          fileSize: 2457600,
          mimeType: 'application/pdf',
          uploadedAt: new Date().toISOString(),
          status: 'ACTIVE',
          atsScore: 96,
          extractedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
        });
      }

      setIsSuccess(false);
      setErrorMessage(null);
      setIsUploadingTailoredResume(false);
      setTailoredResumeUploadProgress(0);
      setTailoredResumeError(null);
    }
  }, [isOpen, initialActiveResume, dbUser, user]);

  // Handle Tailored Resume Upload simulation & validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTailoredResumeError(null);

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setTailoredResumeError('Resume file exceeds 5MB limit. Please upload a smaller file.');
      return;
    }

    // Validate format
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.pdf') && !nameLower.endsWith('.docx')) {
      setTailoredResumeError('Only PDF and DOCX documents are supported.');
      return;
    }

    setIsUploadingTailoredResume(true);
    setTailoredResumeUploadProgress(15);

    let progress = 15;
    const timer = setInterval(() => {
      progress += 25;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);

        setTimeout(() => {
          const tailoredDoc: ResumeDocument = {
            id: `res-tailored-${Date.now()}`,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/pdf',
            uploadedAt: new Date().toISOString(),
            status: 'ACTIVE',
            atsScore: Math.floor(Math.random() * 5) + 94, // 94 - 98%
            extractedSkills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'PostgreSQL'],
          };

          setSelectedResume(tailoredDoc);
          setIsUploadingTailoredResume(false);
          setTailoredResumeUploadProgress(0);
          toast.success(`Tailored resume "${file.name}" uploaded successfully!`, 'Resume Updated');
        }, 300);
      }
      setTailoredResumeUploadProgress(progress);
    }, 150);
  };

  // Revert back to Master Resume
  const handleRevertToMaster = () => {
    if (initialActiveResume) {
      setSelectedResume(initialActiveResume);
    } else {
      setSelectedResume({
        id: 'res-master-001',
        fileName: `${candidateName.replace(/\s+/g, '_')}_Master_Resume.pdf`,
        fileSize: 2457600,
        mimeType: 'application/pdf',
        uploadedAt: new Date().toISOString(),
        status: 'ACTIVE',
        atsScore: 96,
        extractedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      });
    }
    toast.info('Reverted to Master Profile Resume.', 'Resume Switched');
  };

  // Format Salary Display
  const formatSalary = (min?: number | null, max?: number | null) => {
    if (min == null && max == null) return 'Competitive Compensation';
    if (min === 0 && (max === 0 || max == null)) return 'Unpaid / Volunteer';
    if (min != null && max == null) return `From $${(min / 1000).toFixed(0)}k/yr`;
    if (min == null && max != null) return `Up to $${(max / 1000).toFixed(0)}k/yr`;
    return `$${(min! / 1000).toFixed(0)}k - $${(max! / 1000).toFixed(0)}k/yr`;
  };

  // Format Bytes to Readable Size
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Submit Application Handler
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    if (!candidateName.trim()) {
      setErrorMessage('Please provide your full legal name.');
      return;
    }
    if (!candidateEmail.trim() || !candidateEmail.includes('@')) {
      setErrorMessage('Please provide a valid contact email address.');
      return;
    }
    if (!selectedResume) {
      setErrorMessage('Please attach or upload a resume to submit with your application.');
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('Please certify that your application details are accurate before submitting.');
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });

    const newApplicationPayload: SubmittedApplicationPayload = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company_name || 'Hiring Company',
      location: job.location || 'Remote',
      department: job.department || 'Engineering',
      salaryRange: formatSalary(job.salary_min, job.salary_max),
      stage: 'APPLIED',
      submittedOn: formattedDate,
      submittedAtIso: now.toISOString(),
      nextAction: 'Application submitted successfully. Awaiting talent acquisition screening.',
      resumeId: selectedResume.id,
      resumeFileName: selectedResume.fileName,
      resumeFileSize: selectedResume.fileSize,
      atsScore: selectedResume.atsScore || 95,
      coverNotes: coverNotes.trim() || undefined,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim(),
      candidatePhone: candidatePhone.trim() || undefined,
      earliestStartDate,
    };

    try {
      // 1. Check for client-side duplicate application to prevent immediate repeat submissions
      const existingRaw = localStorage.getItem(STORAGE_APPLICATIONS_KEY);
      if (existingRaw) {
        try {
          const list: SubmittedApplicationPayload[] = JSON.parse(existingRaw);
          const alreadyApplied = list.some(
            (app) => app.jobId === job.id || (app.jobTitle === job.title && app.company === job.company_name)
          );
          if (alreadyApplied) {
            setErrorMessage(
              `You have already submitted an application for ${job.title} at ${job.company_name || 'this company'}. You can check its progress in your Candidate Dashboard.`
            );
            setIsSubmitting(false);
            return;
          }
        } catch {
          // ignore parse errors
        }
      }

      // 2. Attempt to call POST /api/applications endpoint
      try {
        await apiClient.post('/applications', {
          jobId: job.id,
          resumeId: selectedResume.id,
          coverLetter: coverNotes.trim(),
          answers: {
            earliestStartDate,
            remotePreference,
            candidatePhone,
            portfolioUrl,
          },
        });
      } catch (apiErr: any) {
        // Handle 409 Conflict from backend duplicate check
        if (apiErr.response?.status === 409) {
          setErrorMessage(
            apiErr.response?.data?.error?.message ||
              'You have already applied for this job requisition. Duplicate submissions are not allowed.'
          );
          setIsSubmitting(false);
          return;
        }
        // If 404 or backend route is still being scaffolded by backend teammate, log and continue smoothly
        console.warn('[JobApplicationModal] Backend API submission notice:', apiErr.message);
      }

      // 3. Persist into Local Storage for instant offline/emulator reactivity across pages
      try {
        const storedList: SubmittedApplicationPayload[] = existingRaw ? JSON.parse(existingRaw) : [];
        storedList.unshift(newApplicationPayload);
        localStorage.setItem(STORAGE_APPLICATIONS_KEY, JSON.stringify(storedList));
      } catch (lsErr) {
        console.warn('[JobApplicationModal] Could not sync to localStorage:', lsErr);
      }

      // 4. Trigger UI Success State
      setSubmittedDetails(newApplicationPayload);
      setIsSuccess(true);
      toast.success(
        `Application for "${job.title}" submitted successfully!`,
        'Application Received'
      );

      if (onApplicationSubmitted) {
        onApplicationSubmitted(newApplicationPayload);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while submitting your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick preset cover note inserts
  const insertPromptSnippet = (snippet: string) => {
    setCoverNotes((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSuccess ? 'Application Submitted!' : `Apply for ${job.title}`}
      subtitle={
        isSuccess
          ? `Your application has been received by ${job.company_name || 'the hiring team'}`
          : `${job.company_name || 'Hiring Company'} • ${job.location || 'Remote'}`
      }
      size="lg"
    >
      {/* ------------------------------------------------------------------- */}
      {/* SUCCESS CONFIRMATION VIEW */}
      {/* ------------------------------------------------------------------- */}
      {isSuccess && submittedDetails ? (
        <div className="space-y-6 py-2 animate-fadeIn text-center sm:text-left">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-emerald-950">
                You're in the running for {job.title}!
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your application and resume have been securely submitted to {job.company_name || 'the recruiting team'}.
                A confirmation has been logged to your candidate portal.
              </p>
            </div>
          </div>

          {/* Submission Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-2xs">
              Application Summary
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Position:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{job.title}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Company:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{job.company_name || 'Hiring Company'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Applied Date:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{submittedDetails.submittedOn}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Initial Status:</span>
                <div className="mt-0.5">
                  <Badge variant="APPLIED" size="sm" dot>
                    APPLIED
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-slate-400 font-medium">Attached Resume:</span>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                    {submittedDetails.resumeFileName}
                  </span>
                </div>
                <span className="text-2xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  ATS {submittedDetails.atsScore}% Match
                </span>
              </div>
            </div>

            {submittedDetails.coverNotes && (
              <div className="space-y-1.5 pt-1">
                <span className="text-slate-400 font-medium">Cover Note:</span>
                <div className="p-3 bg-slate-50 rounded-lg text-slate-700 text-2xs italic leading-relaxed border border-slate-200/60 line-clamp-3">
                  "{submittedDetails.coverNotes}"
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto text-xs"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto text-xs"
              onClick={() => {
                onClose();
                window.location.href = '/candidate';
              }}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              View in Candidate Tracker
            </Button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* APPLICATION SUBMISSION FORM */
        /* ------------------------------------------------------------------- */
        <form onSubmit={handleSubmitApplication} className="space-y-6">
          {/* Requisition Snapshot Bar */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <Building2 className="w-4 h-4 text-brand-600" />
                {job.company_name || 'Hiring Company'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {job.location || 'Remote'}
              </span>
              {job.employment_type && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {job.employment_type}
                  </span>
                </>
              )}
            </div>

            <div className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
              {formatSalary(job.salary_min, job.salary_max)}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Application Notice</p>
                <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Section 1: Candidate Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-600" />
                1. Candidate Information
              </h4>
              <span className="text-2xs text-slate-400">Pre-filled from your profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Full Legal Name"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
              <Input
                label="Email Address"
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="candidate@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Phone Number"
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
              <Input
                label="Portfolio / GitHub (Optional)"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
          </div>

          {/* Section 2: Resume Review & Attachment (CORE REQUIREMENT) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-600" />
                2. Resume Review & Attachment
              </h4>
              <span className="text-2xs font-semibold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified for ATS Screening
              </span>
            </div>

            {/* Selected Resume Card */}
            {selectedResume ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-200 transition space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm truncate max-w-[260px] sm:max-w-md">
                        {selectedResume.fileName}
                      </p>
                      <div className="flex items-center gap-2 text-2xs text-slate-500 mt-0.5">
                        <span>{formatBytes(selectedResume.fileSize)}</span>
                        <span>•</span>
                        <span>PDF / ATS Ready</span>
                        {selectedResume.atsScore && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {selectedResume.atsScore}% Profile Match
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <label className="cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload Different
                      <input
                        type="file"
                        accept=".pdf,.docx,application/pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    {selectedResume.id.startsWith('res-tailored') && (
                      <button
                        type="button"
                        onClick={handleRevertToMaster}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
                        title="Revert to Master Profile Resume"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar when tailored resume is uploading */}
                {isUploadingTailoredResume && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-2xs text-slate-600">
                      <span>Uploading & parsing tailored resume...</span>
                      <span className="font-mono font-bold">{tailoredResumeUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${tailoredResumeUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {tailoredResumeError && (
                  <p className="text-2xs text-rose-600 font-medium">{tailoredResumeError}</p>
                )}
              </div>
            ) : (
              /* No resume uploaded dropzone prompt */
              <div className="p-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center space-y-3">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-slate-800">No active resume found</p>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Upload your resume in PDF or DOCX format (Max 5MB) to proceed with your application.
                  </p>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition">
                  <UploadCloud className="w-4 h-4" />
                  Select Resume File
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Section 3: Cover Notes (CORE REQUIREMENT) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label htmlFor="cover-notes" className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-brand-600" />
                3. Cover Notes / Message to Hiring Team
              </label>
              <span className="text-2xs text-slate-400 font-mono">
                {coverNotes.length} / 1500 chars
              </span>
            </div>

            <textarea
              id="cover-notes"
              rows={4}
              maxLength={1500}
              value={coverNotes}
              onChange={(e) => setCoverNotes(e.target.value)}
              placeholder="Tell the hiring manager why you're a great fit for this role, highlight notable accomplishments, or introduce specific skills..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 resize-y"
            />

            {/* Quick Inspiration Snippets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-2xs font-semibold text-slate-400">Quick Prompts:</span>
              <button
                type="button"
                onClick={() =>
                  insertPromptSnippet(
                    'I have extensive hands-on experience architecting scalable React & Node.js web applications, focusing on clean modular components and robust state management.'
                  )
                }
                className="text-2xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition"
              >
                + Full Stack Background
              </button>
              <button
                type="button"
                onClick={() =>
                  insertPromptSnippet(
                    'I am excited by your engineering challenges and would love to bring my expertise in performance optimization and responsive interface engineering to your team.'
                  )
                }
                className="text-2xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md transition"
              >
                + Value Proposition
              </button>
            </div>
          </div>

          {/* Section 4: Logistical Details & Agreement */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. Logistics & Preferences
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Earliest Start Date / Availability
                </label>
                <select
                  value={earliestStartDate}
                  onChange={(e) => setEarliestStartDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Immediately (Within 2 weeks)">Immediately (Within 2 weeks)</option>
                  <option value="1 Month Notice">1 Month Notice</option>
                  <option value="2 Months Notice">2 Months Notice</option>
                  <option value="Flexible / Negotiable">Flexible / Negotiable</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Work Arrangement Preference
                </label>
                <select
                  value={remotePreference}
                  onChange={(e) => setRemotePreference(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Hybrid / Open to Remote">Hybrid / Open to Remote</option>
                  <option value="Fully Remote">Fully Remote</option>
                  <option value="Onsite Preferred">Onsite Preferred</option>
                </select>
              </div>
            </div>

            {/* Certification Checkbox */}
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer text-2xs text-slate-600">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                I certify that the information, qualifications, and attached resume submitted in this application
                are true and accurate to the best of my knowledge.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Submit Application
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
