import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
} from 'lucide-react';
import {
  InterviewEvent,
  InterviewSchedulingModal,
  InterviewCalendarView,
  InterviewListView,
  InterviewDetailModal,
  CandidateOption,
} from '../../components/interview';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useInterviews, InterviewRequestError } from '../../hooks/useInterviews';

// Synthetic realistic fallback interview schedule for Floor 15 demo / offline mode
const INITIAL_INTERVIEWS: InterviewEvent[] = [
  {
    id: 'int-1',
    applicationId: 'app-1',
    candidateId: 'c1',
    candidateName: 'Alex Morgan',
    candidateRole: 'Senior Full Stack Engineer',
    candidateEmail: 'alex.morgan@example.com',
    jobTitle: 'Senior Full Stack Engineer',
    title: 'Round 1: Technical System Design & Architecture',
    type: 'TECHNICAL',
    scheduledStart: '2026-11-14T14:00:00Z',
    scheduledEnd: '2026-11-14T15:00:00Z',
    locationOrLink: 'https://meet.smart-ats.internal/room/int-alex-tech',
    status: 'SCHEDULED',
    rescheduleCount: 0,
    interviewer: 'Ranadeep Saha',
    interviewerRole: 'Engineering Director',
    notes: 'Focus on distributed data ingestion, Redis caching layers, and high-concurrency PostgreSQL locking.',
  },
  {
    id: 'int-2',
    applicationId: 'app-2',
    candidateId: 'c2',
    candidateName: 'Samira Khan',
    candidateRole: 'DevOps & Cloud Architect',
    candidateEmail: 'samira.khan@example.com',
    jobTitle: 'DevOps & Cloud Architect',
    title: 'Round 2: Kubernetes Cluster & Cloud Security Audit',
    type: 'SYSTEM_DESIGN',
    scheduledStart: '2026-11-14T16:30:00Z',
    scheduledEnd: '2026-11-14T17:30:00Z',
    locationOrLink: 'https://meet.smart-ats.internal/room/int-samira-k8s',
    status: 'SCHEDULED',
    rescheduleCount: 0,
    interviewer: 'Alex Rivera',
    interviewerRole: 'Cloud Infrastructure Lead',
    notes: 'Terraform state management, multi-region failover, and Docker CIS benchmark compliance.',
  },
  {
    id: 'int-3',
    applicationId: 'app-3',
    candidateId: 'c4',
    candidateName: 'Elena Rostova',
    candidateRole: 'Lead Product Designer',
    candidateEmail: 'elena.rostova@example.com',
    jobTitle: 'Lead Product Designer',
    title: 'Round 2: Design Systems & Enterprise UX Critique',
    type: 'BEHAVIORAL',
    scheduledStart: '2026-11-15T11:00:00Z',
    scheduledEnd: '2026-11-15T12:00:00Z',
    locationOrLink: 'https://meet.smart-ats.internal/room/int-elena-ux',
    status: 'SCHEDULED',
    rescheduleCount: 0,
    interviewer: 'Elena Zhou',
    interviewerRole: 'VP of Product & Design',
    notes: 'Review Figma component libraries, design token governance, and user testing methodology.',
  },
  {
    id: 'int-4',
    applicationId: 'app-4',
    candidateId: 'c5',
    candidateName: 'Carlos Mendez',
    candidateRole: 'DevOps & Cloud Architect',
    candidateEmail: 'carlos.mendez@example.com',
    jobTitle: 'DevOps & Cloud Architect',
    title: 'Final Culture & Executive Leadership Round',
    type: 'FINAL',
    scheduledStart: '2026-11-16T15:00:00Z',
    scheduledEnd: '2026-11-16T16:00:00Z',
    locationOrLink: 'https://meet.smart-ats.internal/room/int-carlos-exec',
    status: 'SCHEDULED',
    rescheduleCount: 0,
    interviewer: 'Ranadeep Saha',
    interviewerRole: 'Engineering Director',
    notes: 'Executive alignment, team building vision, and compensation expectations.',
  },
  {
    id: 'int-5',
    applicationId: 'app-5',
    candidateId: 'c3',
    candidateName: 'David Lee',
    candidateRole: 'Full Stack Engineer',
    candidateEmail: 'david.lee@example.com',
    jobTitle: 'Senior Full Stack Engineer',
    title: 'Screening Call: Experience & Career Goals',
    type: 'SCREENING',
    scheduledStart: '2026-11-12T10:00:00Z',
    scheduledEnd: '2026-11-12T10:45:00Z',
    locationOrLink: 'https://meet.smart-ats.internal/room/int-david-screen',
    status: 'COMPLETED',
    rescheduleCount: 0,
    interviewer: 'Sarah Connor',
    interviewerRole: 'Senior Technical Recruiter',
    notes: 'Candidate passed initial recruiter screening with 5/5 score.',
    scorecard: {
      evaluatorId: 'eval-1',
      evaluatorName: 'Sarah Connor',
      rating: 5,
      recommendation: 'STRONG_HIRE',
      strengths: 'Clear communicator, passionate about modern React architecture and database scalability.',
      submittedAt: '2026-11-12T11:00:00Z',
    },
  },
];

export const HrInterviewsPage: React.FC = () => {
  const { success, error: toastError, info } = useToast();
  const [interviews, setInterviews] = useState<InterviewEvent[]>(INITIAL_INTERVIEWS);
  const [layoutView, setLayoutView] = useState<'calendar' | 'list'>('calendar');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedInterviewForDetail, setSelectedInterviewForDetail] = useState<InterviewEvent | null>(null);

  const {
    interviews: apiInterviews,
    interviewers,
    applications,
    fetchInterviews,
    fetchInterviewOptions,
    scheduleInterview,
  } = useInterviews();

  useEffect(() => {
    fetchInterviews();
    fetchInterviewOptions();
  }, [fetchInterviews, fetchInterviewOptions]);

  // Synchronize API interviews into calendar events
  useEffect(() => {
    if (apiInterviews && apiInterviews.length > 0) {
      const liveEvents: InterviewEvent[] = apiInterviews.map((item) => ({
        id: item.id,
        applicationId: item.application_id,
        candidateName: item.candidate_name || 'Candidate',
        candidateRole: item.job_title || 'Applicant',
        jobTitle: item.job_title || 'Engineering',
        title: item.title,
        type: 'TECHNICAL',
        scheduledStart: item.scheduled_start,
        scheduledEnd: item.scheduled_end,
        locationOrLink: item.location_or_link || 'https://meet.google.com',
        status: (item.status as any) || 'SCHEDULED',
        rescheduleCount: 0,
        interviewer: item.interviewer_name || 'Assigned Recruiter',
        notes: item.description || '',
      }));
      setInterviews(liveEvents);
    }
  }, [apiInterviews]);

  // Transform candidates from available applications
  const candidateOptions: CandidateOption[] = useMemo(() => {
    if (!applications || applications.length === 0) return [];
    return applications.map((app) => ({
      id: app.id,
      name: app.candidate?.name || 'Applicant',
      role: app.job?.title || app.currentStage || 'Candidate',
      email: app.candidate?.email || 'applicant@example.com',
      jobTitle: app.job?.title || 'Open Position',
    }));
  }, [applications]);

  // Metric aggregates
  const stats = useMemo(() => {
    const total = interviews.length;
    const scheduled = interviews.filter((i) => i.status === 'SCHEDULED').length;
    const completed = interviews.filter((i) => i.status === 'COMPLETED').length;
    const pendingScorecard = interviews.filter(
      (i) => i.status === 'COMPLETED' && !i.scorecard
    ).length;

    return { total, scheduled, completed, pendingScorecard };
  }, [interviews]);

  const handleScheduleNew = async (
    eventData: Omit<InterviewEvent, 'id' | 'rescheduleCount'>
  ) => {
    try {
      if (eventData.applicationId && interviewers && interviewers.length > 0) {
        const interviewerId = interviewers[0]?.id;
        await scheduleInterview({
          applicationId: eventData.applicationId,
          interviewerId,
          title: eventData.title,
          description: eventData.notes || null,
          scheduledStart: eventData.scheduledStart,
          scheduledEnd: eventData.scheduledEnd,
          locationOrLink: eventData.locationOrLink || null,
        });
      }

      const newInterview: InterviewEvent = {
        ...eventData,
        id: `int-${Date.now()}`,
        rescheduleCount: 0,
      };

      setInterviews((prev) => [newInterview, ...prev]);
      success(
        `Scheduled "${newInterview.title}" for ${newInterview.candidateName}. Invitations dispatched.`,
        'Interview Created'
      );
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      if (err instanceof InterviewRequestError && err.status === 409) {
        toastError(
          'Scheduling conflict: this interviewer already has an interview during the selected time.',
          'Conflict Detected'
        );
      } else {
        toastError(err?.message || 'Unable to schedule interview', 'Scheduling Error');
      }
    }
  };

  const handleScorecardSubmit = async (
    interviewId: string,
    rating: number,
    recommendation: 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE',
    notes: string
  ) => {
    setInterviews((prev) =>
      prev.map((inv) => {
        if (inv.id === interviewId) {
          return {
            ...inv,
            status: 'COMPLETED',
            scorecard: {
              evaluatorId: 'eval-user',
              evaluatorName: inv.interviewer,
              rating,
              recommendation,
              strengths: notes,
              submittedAt: new Date().toISOString(),
            },
          };
        }
        return inv;
      })
    );
    success('Candidate scorecard successfully submitted.', 'Scorecard Recorded');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header & Layout Toggle Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Interview Schedules</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Page 5 • Floor 15
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coordinate interview rounds, interviewer assignments, meeting links, and evaluator scorecards.
          </p>
        </div>

        {/* Action Controls & Layout Toggle */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Calendar / List View Toggle */}
          <div
            className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs"
            role="group"
            aria-label="Interview layout view selector"
          >
            <button
              type="button"
              onClick={() => {
                setLayoutView('calendar');
                info('Switched to Calendar layout.');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                layoutView === 'calendar'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={layoutView === 'calendar'}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLayoutView('list');
                info('Switched to List layout.');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                layoutView === 'list'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-pressed={layoutView === 'list'}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          {/* Schedule Interview Action Button */}
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsScheduleModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Schedule Interview
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Rounds
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.total}</span>
            <span className="text-[11px] text-slate-400">sessions</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">
            Upcoming & Confirmed
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-purple-700">{stats.scheduled}</span>
            <span className="text-[11px] text-purple-400">active</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Completed Rounds
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">{stats.completed}</span>
            <span className="text-[11px] text-emerald-400">conducted</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Pending Scorecards
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">{stats.pendingScorecard}</span>
            <span className="text-[11px] text-amber-400">awaiting notes</span>
          </div>
        </div>
      </div>

      {/* Main Layout View (Calendar vs List Layout Toggle) */}
      {layoutView === 'calendar' ? (
        <InterviewCalendarView
          interviews={interviews}
          onSelectInterview={(inv) => setSelectedInterviewForDetail(inv)}
          onScheduleSlot={() => setIsScheduleModalOpen(true)}
        />
      ) : (
        <InterviewListView
          interviews={interviews}
          onSelectInterview={(inv) => setSelectedInterviewForDetail(inv)}
          onScheduleNew={() => setIsScheduleModalOpen(true)}
          onOpenScorecard={(inv) => setSelectedInterviewForDetail(inv)}
        />
      )}

      {/* Interview Scheduling Modal */}
      <InterviewSchedulingModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSchedule={handleScheduleNew}
        existingInterviews={interviews}
        availableCandidates={candidateOptions.length > 0 ? candidateOptions : undefined}
      />

      {/* Interview Detail & Scorecard Modal */}
      <InterviewDetailModal
        isOpen={!!selectedInterviewForDetail}
        interview={selectedInterviewForDetail}
        onClose={() => setSelectedInterviewForDetail(null)}
        onSubmitScorecard={handleScorecardSubmit}
      />
    </div>
  );
};

export default HrInterviewsPage;
