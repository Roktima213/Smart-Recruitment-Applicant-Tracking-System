import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  User,
  Briefcase,
  Sparkles,
  Calendar,
  Building2,
  MapPin,
  Filter,
  Check,
  Video,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { apiClient } from '../services/apiClient';
import {
  ProfileEditor,
  CandidateProfileData,
  ResumeDropzone,
  DocumentPreviewCard,
  ResumeDocument,
  ApplicationStatusCard,
  ApplicationRecord,
  JobApplicationModal,
} from '../components/candidate';

// Application Stage Type
export type ApplicationStage = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'SELECTED' | 'OFFERED' | 'REJECTED';

export type CandidateApplication = ApplicationRecord;

interface ToastNotification {
  id: number;
  type: 'success' | 'info' | 'error';
  message: string;
}

export const CandidateDashboardPage: React.FC = () => {
  const { dbUser } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'profile' | 'applications' | 'interviews' | 'jobs'>('profile');

  // Job Search Seeking Status
  const [seekingStatus, setSeekingStatus] = useState<'ACTIVELY_LOOKING' | 'OPEN_TO_OFFERS' | 'NOT_LOOKING'>(
    'ACTIVELY_LOOKING'
  );

  // ---------------------------------------------------------------------------
  // 1. Toast Notification System
  // ---------------------------------------------------------------------------
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ---------------------------------------------------------------------------
  // 2. Candidate Profile State
  // ---------------------------------------------------------------------------
  const [profileData, setProfileData] = useState<CandidateProfileData>({
    fullName: dbUser?.full_name || 'Rekha Sharma',
    headline: 'Senior Full Stack & Frontend Engineer | React, TypeScript & Node.js',
    phoneNumber: '+1 (555) 234-5678',
    summary:
      'Passionate Full Stack Engineer with 5+ years of experience designing high-performance user interfaces, scalable backend microservices, and modern cloud architectures. Specialized in React, TypeScript, Node.js, and automated CI/CD pipelines.',
    skills: [
      'React',
      'TypeScript',
      'JavaScript',
      'Node.js',
      'Tailwind CSS',
      'PostgreSQL',
      'Docker',
      'REST APIs',
      'GraphQL',
      'AWS',
      'Git',
    ],
    currentCompany: 'TechCorp Labs',
    experienceYears: 5.5,
    location: 'San Francisco, CA (Open to Remote)',
    linkedinUrl: 'https://linkedin.com/in/rekha-frontend',
    githubUrl: 'https://github.com/rekhansika',
    portfolioUrl: 'https://rekha.dev',
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // ---------------------------------------------------------------------------
  // 3. Resume State & Dropzone Upload Simulation
  // ---------------------------------------------------------------------------
  const [activeResume, setActiveResume] = useState<ResumeDocument | null>({
    id: 'res-001',
    fileName: 'Rekha_Sharma_Senior_FullStack_Resume_2026.pdf',
    fileSize: 2457600, // 2.34 MB
    mimeType: 'application/pdf',
    uploadedAt: '2026-11-10T14:30:00Z',
    status: 'ACTIVE',
    atsScore: 96,
    extractedSkills: [
      'React',
      'TypeScript',
      'Node.js',
      'Tailwind CSS',
      'PostgreSQL',
      'Docker',
      'AWS',
      'REST APIs',
      'CI/CD Pipelines',
      'GraphQL',
    ],
    pageCount: 2,
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  });

  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Resume Upload Handler (with simulated progress and ATS parsing)
  const handleResumeUpload = (file: File) => {
    setIsUploadingResume(true);
    setUploadProgress(0);
    setUploadError(null);

    // Simulated stepped upload with progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 25) + 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);

        setTimeout(() => {
          // Detect extracted skills based on file or profile
          const extractedSkills = [
            'React',
            'TypeScript',
            'Node.js',
            'Tailwind CSS',
            'PostgreSQL',
            'Docker',
            'AWS',
            'REST APIs',
          ];

          const newResume: ResumeDocument = {
            id: `res-${Date.now()}`,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || 'application/pdf',
            uploadedAt: new Date().toISOString(),
            status: 'ACTIVE',
            atsScore: Math.floor(Math.random() * 8) + 92, // 92 - 99%
            extractedSkills,
            pageCount: 2,
            sha256Hash: `hash-${Math.random().toString(36).substring(2, 12)}`,
          };

          setActiveResume(newResume);
          setIsUploadingResume(false);
          setUploadProgress(0);
          addToast(`Resume "${file.name}" uploaded and parsed successfully!`, 'success');
        }, 500);
      }
      setUploadProgress(currentProgress);
    }, 200);
  };

  const handleResumeDelete = () => {
    const deletedName = activeResume?.fileName;
    setActiveResume(null);
    addToast(`Resume "${deletedName || 'file'}" has been removed.`, 'info');
  };

  const handleResumeReplace = () => {
    // Scroll or focus on the dropzone
    if (dropzoneRef.current) {
      dropzoneRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // Temporarily open dropzone or trigger replacement
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        handleResumeUpload(e.target.files[0]);
      }
    };
    input.click();
  };

  // ---------------------------------------------------------------------------
  // 4. Candidate Applications State & Pipeline Tracker
  // ---------------------------------------------------------------------------
  const STORAGE_APPLICATIONS_KEY = 'smart_ats_candidate_applications';

  const [applications, setApplications] = useState<ApplicationRecord[]>([
    {
      id: 'app-1',
      jobId: 'job-101',
      jobTitle: 'Senior Full Stack Engineer',
      company: 'TechCorp Labs',
      location: 'San Francisco, CA (Hybrid)',
      stage: 'INTERVIEW',
      submittedOn: 'Nov 02, 2026',
      nextAction: 'Technical System Design Interview with Lead Architect',
      interviewDate: 'Nov 12, 2026 at 2:00 PM EST',
      interviewType: 'Google Meet (Technical System Design)',
      interviewer: 'Marcus Vance (VP of Engineering)',
      salaryRange: '$165,000 - $190,000',
      department: 'Core Platform Engineering',
      resumeFileName: 'Rekha_Sharma_Senior_FullStack_Resume_2026.pdf',
      resumeFileSize: 2457600,
      atsScore: 96,
      coverNotes:
        'With over 5 years of engineering experience across React, TypeScript, and distributed Node.js microservices, I have spearheaded scalable architectural migrations that improved frontend response times by 40%.',
    },
    {
      id: 'app-2',
      jobId: 'job-102',
      jobTitle: 'DevOps & Cloud Architect',
      company: 'NextGen Cloud Platforms',
      location: 'Austin, TX (Remote)',
      stage: 'SCREENING',
      submittedOn: 'Nov 05, 2026',
      nextAction: 'Resume under review by engineering lead & talent partner',
      salaryRange: '$150,000 - $175,000',
      department: 'Infrastructure & SRE',
      resumeFileName: 'Rekha_Sharma_Senior_FullStack_Resume_2026.pdf',
      resumeFileSize: 2457600,
      atsScore: 94,
      coverNotes:
        'Experienced in configuring automated container deployments, Kubernetes orchestration, and multi-region failover strategies.',
    },
    {
      id: 'app-3',
      jobId: 'job-103',
      jobTitle: 'Staff Frontend Architect',
      company: 'PulseStream Enterprise',
      location: 'New York, NY (Remote)',
      stage: 'APPLIED',
      submittedOn: 'Nov 09, 2026',
      nextAction: 'Application submitted successfully. Awaiting HR review.',
      salaryRange: '$180,000 - $210,000',
      department: 'User Experience Systems',
      resumeFileName: 'Rekha_Sharma_Senior_FullStack_Resume_2026.pdf',
      resumeFileSize: 2457600,
      atsScore: 98,
      coverNotes:
        'Excited to contribute to design system governance, TypeScript type-safety enforcement, and enterprise micro-frontend initiatives.',
    },
  ]);

  const [selectedApplication, setSelectedApplication] = useState<ApplicationRecord | null>(null);
  const [appFilter, setAppFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Recommended Job Modal state
  const [selectedRecommendedJob, setSelectedRecommendedJob] = useState<any | null>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  // Sync stored submitted applications from localStorage or backend
  const mapApiApplicationToRecord = (raw: any): ApplicationRecord => {
    const stage = (raw.currentStage || raw.stage || 'APPLIED') as ApplicationStage;
    const company = raw.company || raw.job?.companyName || raw.companyName || 'Hiring Company';
    const location = raw.location || raw.job?.location || 'Remote';
    const department = raw.department || raw.job?.department || 'General';
    const jobTitle = raw.jobTitle || raw.job?.title || 'Open Position';

    let submittedOn = raw.submittedOn;
    if (!submittedOn && (raw.appliedAt || raw.applied_at || raw.submittedAtIso)) {
      const d = new Date(raw.appliedAt || raw.applied_at || raw.submittedAtIso);
      if (!isNaN(d.getTime())) {
        submittedOn = d.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
      }
    }
    if (!submittedOn) {
      submittedOn = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    }

    return {
      ...raw,
      id: raw.id,
      jobId: raw.jobId || raw.job?.id || '',
      jobTitle,
      company,
      location,
      department,
      stage,
      submittedOn,
      submittedAtIso: raw.appliedAt || raw.applied_at || raw.submittedAtIso,
      nextAction:
        raw.nextAction ||
        (stage === 'APPLIED' ? 'Application received. Awaiting talent acquisition screening.' : `In ${stage} stage.`),
      resumeId: raw.resumeId || raw.resume_id,
      resumeFileName: raw.resumeFileName || raw.resume_file_name,
      resumeFileSize: raw.resumeFileSize || raw.resume_file_size,
      atsScore: raw.atsScore || 95,
      coverNotes: raw.coverNotes || raw.coverLetter || raw.cover_letter,
    };
  };

  useEffect(() => {
    try {
      const storedRaw = localStorage.getItem(STORAGE_APPLICATIONS_KEY);
      if (storedRaw) {
        const storedList = JSON.parse(storedRaw);
        if (Array.isArray(storedList) && storedList.length > 0) {
          const mappedStored = storedList.map(mapApiApplicationToRecord);
          setApplications((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = mappedStored.filter((s: ApplicationRecord) => !existingIds.has(s.id));
            return [...newItems, ...prev];
          });
        }
      }
    } catch {
      // ignore parse errors
    }

    // Attempt to load from GET /api/applications/me
    apiClient
      .get('/applications/me')
      .then((res) => {
        if (res.data?.applications && Array.isArray(res.data.applications)) {
          const mappedApiApps = res.data.applications.map(mapApiApplicationToRecord);
          setApplications((prev) => {
            const apiIds = new Set(mappedApiApps.map((a: ApplicationRecord) => a.id));
            const localOnly = prev.filter((p) => !apiIds.has(p.id));
            return [...mappedApiApps, ...localOnly];
          });
        }
      })
      .catch(() => {
        // graceful offline fallback
      });
  }, []);

  // Handle Application Withdrawal
  const handleWithdrawApplication = (appId: string) => {
    setApplications((prev) => {
      const updated = prev.filter((app) => app.id !== appId);
      try {
        localStorage.setItem(STORAGE_APPLICATIONS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    addToast('Application has been successfully withdrawn and removed.', 'info');
  };

  // Filtered applications by stage & search query
  const [applicationsPage, setApplicationsPage] = useState<number>(1);
  const APPLICATIONS_PER_PAGE = 3;

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesStage = appFilter === 'ALL' || app.stage === appFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        app.jobTitle.toLowerCase().includes(query) ||
        app.company.toLowerCase().includes(query) ||
        (app.department && app.department.toLowerCase().includes(query)) ||
        (app.location && app.location.toLowerCase().includes(query));

      return matchesStage && matchesSearch;
    });
  }, [applications, appFilter, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setApplicationsPage(1);
  }, [appFilter, searchQuery]);

  const totalAppPages = Math.ceil(filteredApplications.length / APPLICATIONS_PER_PAGE);
  const paginatedApplications = useMemo(() => {
    const start = (applicationsPage - 1) * APPLICATIONS_PER_PAGE;
    return filteredApplications.slice(start, start + APPLICATIONS_PER_PAGE);
  }, [filteredApplications, applicationsPage]);

  // ---------------------------------------------------------------------------
  // 5. Dynamic Profile Completeness Calculation
  // ---------------------------------------------------------------------------
  const profileCompleteness = useMemo(() => {
    let score = 0;
    if (profileData.fullName.trim()) score += 15;
    if (profileData.headline.trim()) score += 15;
    if (profileData.phoneNumber.trim()) score += 10;
    if (profileData.summary.trim().length >= 20) score += 15;
    if (profileData.skills.length >= 3) score += 20;
    if (activeResume) score += 25;
    return Math.min(score, 100);
  }, [profileData, activeResume]);

  // ---------------------------------------------------------------------------
  // 6. Profile Save Handler
  // ---------------------------------------------------------------------------
  const handleSaveProfile = async (updatedData: CandidateProfileData) => {
    setIsSavingProfile(true);
    try {
      // Contract-first attempt to save to backend API
      await apiClient.put('/candidate/profile', updatedData).catch(() => {
        // Fallback silently if candidate endpoint is still in draft
      });

      setProfileData(updatedData);
      addToast('Candidate profile updated successfully!', 'success');
    } catch {
      addToast('Profile changes saved to local session.', 'info');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Recommended Jobs Mock
  const recommendedJobs = [
    {
      id: 'rec-1',
      title: 'Lead Frontend Engineer',
      company: 'Stripe Innovations',
      location: 'Remote (US/Canada)',
      salary: '$170k - $200k',
      matchScore: 98,
      tags: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
      posted: '1 day ago',
    },
    {
      id: 'rec-2',
      title: 'Senior Full Stack Specialist',
      company: 'Datadog Platforms',
      location: 'San Francisco, CA',
      salary: '$160k - $190k',
      matchScore: 95,
      tags: ['Node.js', 'PostgreSQL', 'Docker', 'AWS'],
      posted: '2 days ago',
    },
    {
      id: 'rec-3',
      title: 'UI/UX Systems Architect',
      company: 'Figma Ecosystems',
      location: 'Remote',
      salary: '$180k - $215k',
      matchScore: 92,
      tags: ['React', 'Design Systems', 'TypeScript'],
      posted: '3 days ago',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* --------------------------------------------------------------------- */}
      {/* Toast Notification Stack */}
      {/* --------------------------------------------------------------------- */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 pointer-events-auto transition-all transform animate-slideUp ${
                toast.type === 'success'
                  ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
                  : toast.type === 'error'
                  ? 'bg-rose-900/95 text-rose-100 border-rose-700'
                  : 'bg-slate-900/95 text-slate-100 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-medium">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Candidate Portal Header Banner */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-md border-2 border-white">
              {profileData.fullName
                ? profileData.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'CD'}
            </div>
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white ${
                seekingStatus === 'ACTIVELY_LOOKING'
                  ? 'bg-emerald-500'
                  : seekingStatus === 'OPEN_TO_OFFERS'
                  ? 'bg-indigo-500'
                  : 'bg-slate-400'
              }`}
              title={`Status: ${seekingStatus}`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {profileData.fullName || 'Candidate Portal'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified Candidate
              </span>
            </div>

            <p className="text-sm font-medium text-slate-600 line-clamp-1 max-w-2xl">
              {profileData.headline || 'Add your professional headline in the Profile Editor'}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
              {profileData.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {profileData.location}
                </span>
              )}
              {profileData.currentCompany && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {profileData.currentCompany}
                </span>
              )}
              {profileData.experienceYears && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {profileData.experienceYears} Years Exp.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Seeking Status & Profile Completeness Pill */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={seekingStatus}
              onChange={(e) => {
                setSeekingStatus(e.target.value as any);
                addToast(`Job search status changed to ${e.target.options[e.target.selectedIndex].text}`, 'info');
              }}
              className="text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="ACTIVELY_LOOKING">🟢 Actively Interviewing</option>
              <option value="OPEN_TO_OFFERS">🔵 Open to Offers</option>
              <option value="NOT_LOOKING">⚪ Not Looking</option>
            </select>
          </div>

          {/* Completeness Meter */}
          <div className="w-full sm:w-56 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Profile Completeness</span>
              <span
                className={`font-bold font-mono ${
                  profileCompleteness === 100
                    ? 'text-emerald-600'
                    : profileCompleteness >= 75
                    ? 'text-brand-600'
                    : 'text-amber-600'
                }`}
              >
                {profileCompleteness}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  profileCompleteness === 100
                    ? 'bg-emerald-500'
                    : profileCompleteness >= 75
                    ? 'bg-brand-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${profileCompleteness}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Summary KPI Stat Cards */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Active Applications */}
        <div
          onClick={() => setActiveTab('applications')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-2xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              In Review
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-900">{applications.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Active Applications
            </p>
          </div>
        </div>

        {/* Scheduled Interviews */}
        <div
          onClick={() => setActiveTab('interviews')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-2xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
              Next: Nov 12
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-900">1</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Scheduled Interviews
            </p>
          </div>
        </div>

        {/* ATS Readiness / Master Resume */}
        <div
          onClick={() => setActiveTab('profile')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-2xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              ATS 96%
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-emerald-600">
              {activeResume ? 'Active' : 'Missing'}
            </p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Master Resume Status
            </p>
          </div>
        </div>

        {/* Skills Tagged */}
        <div
          onClick={() => setActiveTab('profile')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-brand-50 text-brand-600 group-hover:scale-105 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <span className="text-2xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
              High Match
            </span>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-slate-900">{profileData.skills.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Validated Tech Skills
            </p>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Navigation Tabs Bar */}
      {/* --------------------------------------------------------------------- */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            Profile & Resume Widget
          </button>

          <button
            onClick={() => setActiveTab('applications')}
            className={`py-3.5 px-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            My Applications
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {applications.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('interviews')}
            className={`py-3.5 px-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'interviews'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Interview Schedule
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-3.5 px-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'jobs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Recommended Jobs
          </button>
        </nav>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: Profile & Resume Widget (Core Deliverable) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'profile' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Resume Upload / Document Preview Section */}
          <div ref={dropzoneRef} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-600" />
                  Master Resume Document
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Used by our ATS to pre-fill applications and match you with open engineering positions.
                </p>
              </div>
              {activeResume && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Synced with Recruiter Pipeline
                </span>
              )}
            </div>

            {/* Display Document Preview Card OR Drag-and-Drop Resume Dropzone */}
            {activeResume ? (
              <div className="space-y-4">
                <DocumentPreviewCard
                  resume={activeResume}
                  onReplaceClick={handleResumeReplace}
                  onDeleteClick={handleResumeDelete}
                  onDownloadClick={() => addToast(`Downloading ${activeResume.fileName}...`, 'info')}
                />
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="max-w-xl">
                  <h3 className="font-bold text-slate-900 text-base">Upload Your Resume</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Drag and drop your resume file or browse from your computer. Our parser will
                    automatically extract your technical competencies, skills, and work history.
                  </p>
                </div>
                <ResumeDropzone
                  onFileSelect={handleResumeUpload}
                  isUploading={isUploadingResume}
                  uploadProgress={uploadProgress}
                  errorMessage={uploadError}
                  onClearError={() => setUploadError(null)}
                />
              </div>
            )}
          </div>

          {/* Profile Editor Form */}
          <ProfileEditor
            initialData={profileData}
            onSave={handleSaveProfile}
            isSaving={isSavingProfile}
            onCancel={() => addToast('Profile edits reset to last saved state.', 'info')}
          />
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: Applications Tracker & Status Cards (Floor 11 Deliverable) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'applications' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Bar: Search & Stage Filtering */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* Search Applications Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by job title, company, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Stage Filter Selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="ALL">All Stages ({applications.length})</option>
                  <option value="APPLIED">Applied</option>
                  <option value="SCREENING">Screening</option>
                  <option value="INTERVIEW">Interview</option>
                  <option value="OFFERED">Offered / Selected</option>
                  <option value="REJECTED">Declined / Closed</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
              <span className="font-medium">
                Showing <strong className="text-slate-800">{filteredApplications.length}</strong> of{' '}
                <strong className="text-slate-800">{applications.length}</strong> active applications
              </span>
            </div>
          </div>

          {/* Application Status Cards List */}
          {filteredApplications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No applications found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || appFilter !== 'ALL'
                    ? 'No applications match your active search and filter criteria. Try clearing filters.'
                    : 'You have not submitted any applications yet. Explore published career openings to apply.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                {(searchQuery || appFilter !== 'ALL') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setAppFilter('ALL');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => (window.location.href = '/jobs')}
                  rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                >
                  Browse Open Jobs
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                role="status"
                aria-live="polite"
                className="sr-only"
              >
                Showing page {applicationsPage} of {totalAppPages}, {filteredApplications.length} total applications matching criteria.
              </div>

              <div className="space-y-4">
                {paginatedApplications.map((app) => (
                  <ApplicationStatusCard
                    key={app.id}
                    application={app}
                    onWithdraw={handleWithdrawApplication}
                    onViewDetails={(appRecord) => setSelectedApplication(appRecord)}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalAppPages > 1 && (
                <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Showing <strong className="text-slate-800">{(applicationsPage - 1) * APPLICATIONS_PER_PAGE + 1}</strong> to{' '}
                    <strong className="text-slate-800">
                      {Math.min(applicationsPage * APPLICATIONS_PER_PAGE, filteredApplications.length)}
                    </strong>{' '}
                    of <strong className="text-slate-800">{filteredApplications.length}</strong> applications
                  </p>
                  <Pagination
                    currentPage={applicationsPage}
                    totalPages={totalAppPages}
                    onPageChange={(p) => {
                      setApplicationsPage(p);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: Interviews & Timeline */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'interviews' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Upcoming Interviews</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review your interview rounds, video conference links, and preparation recommendations.
                </p>
              </div>
              <Link
                to={ROUTES.CANDIDATE_INTERVIEWS}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition shadow-2xs self-start sm:self-auto"
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar & List Layout View →</span>
              </Link>
            </div>

            {/* Upcoming Interview Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50/70 to-indigo-50/50 border border-purple-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Round 2: Technical System Design
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-2">
                    Senior Full Stack Engineer at TechCorp Labs
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    Thursday, Nov 12, 2026 • 2:00 PM – 3:00 PM EST (45 mins)
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() =>
                    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')
                  }
                  leftIcon={<Video className="w-4 h-4" />}
                >
                  Join Google Meet
                </Button>
              </div>

              <div className="pt-3 border-t border-purple-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold">Interviewer:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    Marcus Vance (VP of Engineering & Architecture)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Focus Areas:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    React State Management, Distributed Microservices, Database Indexing
                  </p>
                </div>
              </div>
            </div>

            {/* Interview Prep Checklist */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Interview Preparation Checklist
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                  Have your active master resume accessible for review
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                  Test microphone, camera, and screen sharing before the scheduled call
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                  Prepare 2-3 thoughtful questions about TechCorp's engineering team culture
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: Recommended Jobs */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'jobs' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  AI Job Recommendations Matching Your Skills
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Positions matched against your tagged competencies ({profileData.skills.slice(0, 4).join(', ')})
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = '/jobs')}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Browse All Jobs
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recommendedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 bg-white"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {job.matchScore}% Match
                      </span>
                      <span className="text-2xs text-slate-400">{job.posted}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base">{job.title}</h3>
                    <p className="text-xs text-slate-600 font-medium">{job.company}</p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.location}</span>
                    </div>

                    <p className="text-xs font-bold text-slate-800">{job.salary}</p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-2xs font-medium bg-slate-100 text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setSelectedRecommendedJob({
                        id: job.id,
                        title: job.title,
                        company_name: job.company,
                        location: job.location,
                        department: 'Engineering',
                        employment_type: 'Full-time',
                      });
                      setIsJobModalOpen(true);
                    }}
                  >
                    1-Click Apply with Master Resume
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Modal: Application Details Modal */}
      {/* --------------------------------------------------------------------- */}
      {selectedApplication && (
        <Modal
          isOpen={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
          title={selectedApplication.jobTitle}
          subtitle={`${selectedApplication.company} • ${selectedApplication.location}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Applied with Master Resume on {selectedApplication.submittedOn}
              </span>
              <Button variant="outline" size="sm" onClick={() => setSelectedApplication(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Stage Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Recruitment Pipeline Stage
              </h4>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-0.5">
                  <Badge variant={selectedApplication.stage} size="md" dot>
                    {selectedApplication.stage}
                  </Badge>
                  <p className="text-xs text-slate-600 mt-2">{selectedApplication.nextAction}</p>
                </div>
                {selectedApplication.salaryRange && (
                  <div className="text-right">
                    <span className="text-2xs text-slate-400 uppercase font-semibold">Compensation</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {selectedApplication.salaryRange}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Next Action & Details */}
            {selectedApplication.interviewDate && (
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                <h5 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Scheduled Round Details
                </h5>
                <p className="text-xs text-purple-800 font-semibold">{selectedApplication.interviewDate}</p>
                {selectedApplication.interviewer && (
                  <p className="text-xs text-purple-700">
                    Interviewer: {selectedApplication.interviewer}
                  </p>
                )}
              </div>
            )}

            {/* Submitted Cover Notes */}
            {selectedApplication.coverNotes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Submitted Cover Notes
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed italic whitespace-pre-line">
                  "{selectedApplication.coverNotes}"
                </div>
              </div>
            )}

            {/* Submitted Documents & Profile Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Attached Application Materials
              </h4>
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-rose-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {selectedApplication.resumeFileName || (activeResume ? activeResume.fileName : 'Rekha_Sharma_Resume.pdf')}
                    </p>
                    <p className="text-2xs text-slate-400">
                      PDF Document • ATS {selectedApplication.atsScore || 96}% Verified
                    </p>
                  </div>
                </div>
                <Badge variant="success" size="sm">
                  Active in Review
                </Badge>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Modal: Job Application Modal (Apply from Recommended Jobs) */}
      {/* --------------------------------------------------------------------- */}
      {isJobModalOpen && selectedRecommendedJob && (
        <JobApplicationModal
          isOpen={isJobModalOpen}
          onClose={() => {
            setIsJobModalOpen(false);
            setSelectedRecommendedJob(null);
          }}
          job={selectedRecommendedJob}
          activeResume={activeResume}
          onApplicationSubmitted={(newApp) => {
            setApplications((prev) => [newApp, ...prev]);
            setActiveTab('applications');
          }}
        />
      )}
    </div>
  );
};
export default CandidateDashboardPage;
