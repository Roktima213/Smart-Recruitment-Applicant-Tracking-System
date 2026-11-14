import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Video,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { InterviewEvent, InterviewRoundType } from './InterviewTypes';

export interface CandidateOption {
  id: string;
  name: string;
  role: string;
  email: string;
  jobTitle: string;
  jobId?: string;
}

export interface InterviewSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (eventData: Omit<InterviewEvent, 'id' | 'rescheduleCount'>) => Promise<void> | void;
  initialCandidate?: CandidateOption | null;
  existingInterviews?: InterviewEvent[];
  availableCandidates?: CandidateOption[];
}

const DEFAULT_CANDIDATES: CandidateOption[] = [
  {
    id: 'c1',
    name: 'Alex Morgan',
    role: 'Senior Full Stack Engineer',
    email: 'alex.morgan@example.com',
    jobTitle: 'Senior Full Stack Engineer',
  },
  {
    id: 'c2',
    name: 'Samira Khan',
    role: 'DevOps & Cloud Architect',
    email: 'samira.khan@example.com',
    jobTitle: 'DevOps & Cloud Architect',
  },
  {
    id: 'c3',
    name: 'David Lee',
    role: 'Full Stack Engineer',
    email: 'david.lee@example.com',
    jobTitle: 'Senior Full Stack Engineer',
  },
  {
    id: 'c4',
    name: 'Elena Rostova',
    role: 'Product Designer',
    email: 'elena.rostova@example.com',
    jobTitle: 'Lead Product Designer',
  },
  {
    id: 'c5',
    name: 'Carlos Mendez',
    role: 'Cloud Engineer',
    email: 'carlos.mendez@example.com',
    jobTitle: 'DevOps & Cloud Architect',
  },
];

const AVAILABLE_INTERVIEWERS = [
  { name: 'Ranadeep Saha', role: 'Engineering Director', email: 'ranadeep@smartats.com' },
  { name: 'Sarah Connor', role: 'Senior Technical Recruiter', email: 'sarah.c@smartats.com' },
  { name: 'Mike Vance', role: 'Staff Software Architect', email: 'mike.v@smartats.com' },
  { name: 'Elena Zhou', role: 'VP of Product & Design', email: 'elena.z@smartats.com' },
  { name: 'Alex Rivera', role: 'Cloud Infrastructure Lead', email: 'alex.r@smartats.com' },
];

export const InterviewSchedulingModal: React.FC<InterviewSchedulingModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  initialCandidate = null,
  existingInterviews = [],
  availableCandidates = DEFAULT_CANDIDATES,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    initialCandidate?.id || availableCandidates[0]?.id || ''
  );
  const [roundType, setRoundType] = useState<InterviewRoundType>('TECHNICAL');
  const [roundTitle, setRoundTitle] = useState<string>('Technical System Design & Architecture');
  const [date, setDate] = useState<string>('2026-11-14');
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [interviewerName, setInterviewerName] = useState<string>(AVAILABLE_INTERVIEWERS[0].name);
  const [meetingLink, setMeetingLink] = useState<string>(
    'https://meet.smart-ats.internal/room/int-' + Math.random().toString(36).substr(2, 7)
  );
  const [notes, setNotes] = useState<string>(
    'Please come prepared to discuss distributed systems tradeoffs, database sharding, and real-time synchronization patterns.'
  );
  const [sendInvite, setSendInvite] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Sync initial candidate if passed
  useEffect(() => {
    if (initialCandidate) {
      setSelectedCandidateId(initialCandidate.id);
    }
  }, [initialCandidate]);

  // Capture-phase Escape key dismissal for accessibility
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;

    const handleCaptureEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleCaptureEscape, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleCaptureEscape, true);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Trap focus inside modal
  const handleKeyDownModal = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusables = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  // Check for interviewer or candidate conflict
  useEffect(() => {
    if (!date || !startTime || !endTime) {
      setConflictWarning(null);
      return;
    }

    const proposedStart = new Date(`${date}T${startTime}:00Z`).getTime();
    const proposedEnd = new Date(`${date}T${endTime}:00Z`).getTime();

    if (proposedEnd <= proposedStart) {
      setConflictWarning('End time must be later than start time.');
      return;
    }

    // Check existing interviews for overlapping slots
    const conflict = existingInterviews.find((inv) => {
      if (inv.status === 'CANCELLED') return false;
      const invStart = new Date(inv.scheduledStart).getTime();
      const invEnd = new Date(inv.scheduledEnd).getTime();

      const timeOverlaps = proposedStart < invEnd && proposedEnd > invStart;
      const sameInterviewer = inv.interviewer.toLowerCase().includes(interviewerName.toLowerCase());
      const sameCandidate = inv.candidateId === selectedCandidateId;

      return timeOverlaps && (sameInterviewer || sameCandidate);
    });

    if (conflict) {
      const msg = `Conflict Detected: ${conflict.interviewer} or ${conflict.candidateName} already has an interview ("${conflict.title}") scheduled around this time.`;
      setConflictWarning(msg);
      setAriaAnnouncement(msg);
    } else {
      setConflictWarning(null);
    }
  }, [date, startTime, endTime, interviewerName, selectedCandidateId, existingInterviews]);

  // Handle round type auto-titling
  const handleRoundTypeChange = (type: InterviewRoundType) => {
    setRoundType(type);
    switch (type) {
      case 'SCREENING':
        setRoundTitle('Initial HR & Recruiter Qualification Screen');
        break;
      case 'TECHNICAL':
        setRoundTitle('Technical System Design & Architecture');
        break;
      case 'SYSTEM_DESIGN':
        setRoundTitle('Distributed Cloud Systems & Deep Dive');
        break;
      case 'BEHAVIORAL':
        setRoundTitle('Culture Fit, Collaboration & Values Assessment');
        break;
      case 'MANAGEMENT':
        setRoundTitle('Engineering Leadership & Cross-functional Sync');
        break;
      case 'FINAL':
        setRoundTitle('Final Executive Committee Review & Offer Alignment');
        break;
    }
  };

  const handleRegenerateLink = () => {
    const newLink = 'https://meet.smart-ats.internal/room/int-' + Math.random().toString(36).substr(2, 7);
    setMeetingLink(newLink);
    setAriaAnnouncement('Generated new video bridge link.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const chosenCandidate = availableCandidates.find((c) => c.id === selectedCandidateId);
    if (!chosenCandidate) {
      setValidationError('Please select a valid candidate.');
      return;
    }

    if (!roundTitle.trim()) {
      setValidationError('Please provide an interview round title.');
      return;
    }

    const startIso = new Date(`${date}T${startTime}:00Z`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00Z`).toISOString();

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setValidationError('Interview scheduled end time must be strictly after the start time.');
      return;
    }

    try {
      setIsSubmitting(true);
      setAriaAnnouncement('Scheduling interview session...');

      const selectedInterviewerObj = AVAILABLE_INTERVIEWERS.find(
        (i) => i.name === interviewerName
      );

      await onSchedule({
        candidateId: chosenCandidate.id,
        candidateName: chosenCandidate.name,
        candidateRole: chosenCandidate.role,
        candidateEmail: chosenCandidate.email,
        jobTitle: chosenCandidate.jobTitle,
        jobId: chosenCandidate.jobId,
        title: roundTitle.trim(),
        type: roundType,
        scheduledStart: startIso,
        scheduledEnd: endIso,
        locationOrLink: meetingLink.trim(),
        status: 'SCHEDULED',
        interviewer: interviewerName,
        interviewerRole: selectedInterviewerObj?.role || 'Lead Evaluator',
        interviewerEmail: selectedInterviewerObj?.email,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      });

      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to schedule interview. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="presentation"
      onKeyDown={handleKeyDownModal}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="interview-scheduling-modal-title"
          aria-describedby="interview-scheduling-modal-desc"
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-xl border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="interview-scheduling-modal-title"
                  className="text-lg font-bold text-slate-900 leading-6"
                >
                  Schedule Interview Round
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Calendar Sync
                </span>
              </div>
              <p id="interview-scheduling-modal-desc" className="mt-1 text-xs text-slate-500">
                Coordinate meeting slots, interviewer assignments, and video conference bridge.
              </p>
            </div>

            <button
              ref={firstFocusableRef}
              onClick={onClose}
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Close dialog (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ARIA Live Region */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {ariaAnnouncement}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Validation / Conflict Alerts */}
            {validationError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {conflictWarning && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{conflictWarning}</span>
              </div>
            )}

            {/* Candidate Selector */}
            <div className="space-y-1.5">
              <label htmlFor="candidate-select" className="block font-bold text-slate-700">
                Select Candidate
              </label>
              <select
                id="candidate-select"
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {availableCandidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.name} — {cand.role} ({cand.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            {/* Round Type Selector */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">Interview Stage / Round</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'SCREENING', label: 'Screening' },
                  { id: 'TECHNICAL', label: 'Technical' },
                  { id: 'SYSTEM_DESIGN', label: 'System Design' },
                  { id: 'BEHAVIORAL', label: 'Behavioral' },
                  { id: 'MANAGEMENT', label: 'Management' },
                  { id: 'FINAL', label: 'Final Round' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleRoundTypeChange(type.id as InterviewRoundType)}
                    className={`py-2 px-2.5 rounded-lg border text-center font-semibold transition ${
                      roundType === type.id
                        ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interview Title Input */}
            <div className="space-y-1.5">
              <label htmlFor="round-title" className="block font-bold text-slate-700">
                Round Title / Topic
              </label>
              <input
                id="round-title"
                type="text"
                value={roundTitle}
                onChange={(e) => setRoundTitle(e.target.value)}
                placeholder="e.g. Technical System Design & Architecture"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="interview-date" className="block font-bold text-slate-700">
                  Date
                </label>
                <input
                  id="interview-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="start-time" className="block font-bold text-slate-700">
                  Start Time (UTC)
                </label>
                <input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end-time" className="block font-bold text-slate-700">
                  End Time (UTC)
                </label>
                <input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Interviewer Assignment */}
            <div className="space-y-1.5">
              <label htmlFor="interviewer-select" className="block font-bold text-slate-700">
                Assigned Lead Interviewer
              </label>
              <select
                id="interviewer-select"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                {AVAILABLE_INTERVIEWERS.map((int) => (
                  <option key={int.name} value={int.name}>
                    {int.name} — {int.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Video Meeting Bridge URL */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="meeting-link" className="font-bold text-slate-700">
                  Video Bridge URL
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateLink}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
              <div className="relative">
                <Video className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="meeting-link"
                  type="text"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Agenda & Preparation Notes */}
            <div className="space-y-1.5">
              <label htmlFor="interview-notes" className="block font-bold text-slate-700">
                Agenda & Candidate Preparation Notes
              </label>
              <textarea
                id="interview-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add agenda instructions, problem statement topics, or preparation materials..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Calendar Notification Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="send-invite-checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
              />
              <label
                htmlFor="send-invite-checkbox"
                className="text-xs text-slate-700 cursor-pointer select-none"
              >
                Send calendar invitations (iCal/.ics) & automated email reminders
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                rightIcon={<Calendar className="w-3.5 h-3.5" />}
              >
                Confirm & Schedule Interview
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
