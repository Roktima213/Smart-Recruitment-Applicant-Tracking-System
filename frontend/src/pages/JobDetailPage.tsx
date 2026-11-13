import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Share2, 
  AlertCircle,
  Check,
  ArrowUpRight
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { ROUTES } from '../constants/routes';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { JobRecord } from '../hooks/useJobs';
import { JobApplicationModal } from '../components/candidate';

const STORAGE_APPLICATIONS_KEY = 'smart_ats_candidate_applications';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [job, setJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Application Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchJobDetail = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/jobs/${id}`);
        if (isMounted && response.data?.job) {
          setJob(response.data.job);
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.response?.data?.error?.message || err.message || 'Job requisition not found';
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchJobDetail();

    // Check if user has already applied for this job
    try {
      const stored = localStorage.getItem(STORAGE_APPLICATIONS_KEY);
      if (stored && id) {
        const list = JSON.parse(stored);
        const already = list.some((item: any) => item.jobId === id);
        if (already && isMounted) {
          setHasApplied(true);
        }
      }
    } catch {
      // ignore parse errors
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.info('Job posting URL copied to clipboard!', 'Link Copied');
    }
  };

  const handleApply = () => {
    if (!isAuthenticated) {
      toast.info('Please sign in or create an account to submit your application.', 'Candidate Portal');
      navigate(ROUTES.LOGIN);
    } else if (hasApplied) {
      toast.info('You have already submitted an application for this position.', 'Already Applied');
      navigate(ROUTES.CANDIDATE);
    } else {
      setIsApplyModalOpen(true);
    }
  };

  const formatSalary = (min?: number | null, max?: number | null) => {
    if (min == null && max == null) return 'Competitive / Unspecified';
    if (min === 0 && (max === 0 || max == null)) return 'Unpaid / Volunteer';
    if (min != null && max == null) return `From $${min.toLocaleString()}/yr`;
    if (min == null && max != null) return `Up to $${max.toLocaleString()}/yr`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}/yr`;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 space-y-4">
          <div className="h-8 w-2/3 bg-slate-200 rounded"></div>
          <div className="h-5 w-1/3 bg-slate-200 rounded"></div>
          <div className="h-20 w-full bg-slate-100 rounded-xl mt-6"></div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Job Not Found</h2>
          <p className="text-slate-600 text-sm">
            {error || 'This job requisition may have been closed or is not published yet.'}
          </p>
        </div>
        <Link
          to={ROUTES.JOBS}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Career Board
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          to={ROUTES.JOBS}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all openings
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              {job.company_name?.charAt(0) || 'J'}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {job.company_name || 'Hiring Company'}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {job.location}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  {job.employment_type}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleShare}
              className="p-2.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="Share posting"
            >
              <Share2 className="w-4 h-4" />
            </button>
            
            {hasApplied ? (
              <button
                onClick={() => navigate(ROUTES.CANDIDATE)}
                className="px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 font-semibold text-sm rounded-lg shadow-2xs transition inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Applied • View Status
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition"
              >
                Apply Now
              </button>
            )}
          </div>
        </div>

        {/* Highlight Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Estimated Compensation</p>
              <p className="text-sm font-bold text-slate-900">{formatSalary(job.salary_min, job.salary_max)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Department</p>
              <p className="text-sm font-bold text-slate-900">{job.department || 'General'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Published Date</p>
              <p className="text-sm font-bold text-slate-900">
                {job.published_at ? new Date(job.published_at).toLocaleDateString() : 'Recently'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Description and Responsibilities */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
              About the Role
            </h2>
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
              {job.description}
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h3 className="text-base font-bold text-slate-900">What We Offer</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Competitive compensation package with transparent salary tiers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Flexible work environment (Remote / Hybrid flexibility)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Comprehensive health coverage and continuous learning stipends
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column: Company & Application Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h3 className="font-bold text-slate-900 text-base">Hiring Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Role Title</span>
                <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">{job.title}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-800">{job.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-800">{job.location}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Employment Type</span>
                <span className="font-medium text-slate-800">{job.employment_type}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Requisition ID</span>
                <span className="font-mono text-xs text-slate-600 truncate max-w-[140px]">{job.id}</span>
              </div>
            </div>

            {hasApplied ? (
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Application Submitted
                  </span>
                  <p className="text-2xs text-emerald-700">
                    Your profile and resume are being reviewed.
                  </p>
                </div>
                <button
                  onClick={() => navigate(ROUTES.CANDIDATE)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  View in Candidate Dashboard
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleApply}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition"
              >
                Apply for this Position
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Job Application Modal Popup */}
      {job && (
        <JobApplicationModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          job={{
            id: job.id,
            title: job.title,
            company_name: job.company_name,
            location: job.location,
            department: job.department,
            employment_type: job.employment_type,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
          }}
          onApplicationSubmitted={() => {
            setHasApplied(true);
          }}
        />
      )}
    </div>
  );
};

export default JobDetailPage;
