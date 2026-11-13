import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Video,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  InterviewEvent,
  InterviewCalendarView,
  InterviewListView,
  InterviewDetailModal,
} from '../components/interview';
import { useToast } from '../context/ToastContext';

// Candidate's own scheduled interviews
const CANDIDATE_INTERVIEWS: InterviewEvent[] = [
  {
    id: 'int-cand-1',
    candidateName: 'Alex Morgan',
    candidateRole: 'Senior Full Stack Engineer',
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
    notes: 'Discussion of distributed system design, caching topologies, and live schema trade-offs. Please have a quiet environment with a working microphone.',
  },
  {
    id: 'int-cand-2',
    candidateName: 'Alex Morgan',
    candidateRole: 'Senior Full Stack Engineer',
    jobTitle: 'Senior Full Stack Engineer',
    title: 'Screening Call: Career Background & Qualifications',
    type: 'SCREENING',
    scheduledStart: '2026-11-10T10:00:00Z',
    scheduledEnd: '2026-11-10T10:45:00Z',
    locationOrLink: 'https://meet.smart-ats.internal/room/int-alex-screen',
    status: 'COMPLETED',
    rescheduleCount: 0,
    interviewer: 'Sarah Connor',
    interviewerRole: 'Senior Technical Recruiter',
    notes: 'Recruiter phone screening passed with recommendation to move to technical round.',
  },
];

export const CandidateInterviewsPage: React.FC = () => {
  const { info } = useToast();
  const [interviews] = useState<InterviewEvent[]>(CANDIDATE_INTERVIEWS);
  const [layoutView, setLayoutView] = useState<'list' | 'calendar'>('list');
  const [selectedInterview, setSelectedInterview] = useState<InterviewEvent | null>(null);

  const nextInterview = interviews.find((i) => i.status === 'SCHEDULED');

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header & Layout Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">My Interview Schedule</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Candidate Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View your upcoming technical interviews, video call links, interviewer bios, and preparation guidelines.
          </p>
        </div>

        {/* Calendar / List Toggle */}
        <div
          className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs self-start sm:self-auto"
          role="group"
          aria-label="Candidate interview view layout"
        >
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
        </div>
      </div>

      {/* Hero: Next Upcoming Interview Highlight Card */}
      {nextInterview && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50/80 to-indigo-50/60 border border-purple-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Next Upcoming Interview
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">{nextInterview.title}</h2>
              <p className="text-xs text-slate-600">
                Position: <strong className="text-slate-800">{nextInterview.jobTitle}</strong>
              </p>
            </div>

            <a
              href={nextInterview.locationOrLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Video className="w-4 h-4" />
              <span>Join Video Call Bridge</span>
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-purple-200/60 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                {new Date(nextInterview.scheduledStart).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at {nextInterview.scheduledStart.split('T')[1]?.slice(0, 5)} UTC
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Interviewer: <strong className="text-slate-800">{nextInterview.interviewer}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-700 font-medium">Video Link Verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout View */}
      {layoutView === 'list' ? (
        <InterviewListView
          interviews={interviews}
          onSelectInterview={(inv) => setSelectedInterview(inv)}
        />
      ) : (
        <InterviewCalendarView
          interviews={interviews}
          onSelectInterview={(inv) => setSelectedInterview(inv)}
        />
      )}

      {/* Interview Detail Modal */}
      <InterviewDetailModal
        isOpen={!!selectedInterview}
        interview={selectedInterview}
        onClose={() => setSelectedInterview(null)}
      />
    </div>
  );
};
