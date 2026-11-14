import React, { useEffect, useRef, useState } from 'react';
import { X, Calendar, Clock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { InterviewEvent } from './InterviewTypes';

export interface InterviewRescheduleModalProps {
  isOpen: boolean;
  interview: InterviewEvent | null;
  onClose: () => void;
  onReschedule: (
    interviewId: string,
    newStart: string,
    newEnd: string,
    reason: string
  ) => Promise<void>;
}

export const InterviewRescheduleModal: React.FC<InterviewRescheduleModalProps> = ({
  isOpen,
  interview,
  onClose,
  onReschedule,
}) => {
  const [date, setDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:00');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Initialize form state when opened
  useEffect(() => {
    if (isOpen && interview) {
      setIsSuccess(false);
      setErrorMessage(null);
      setReason('');

      // Pre-fill date and times from existing schedule
      try {
        const start = new Date(interview.scheduledStart);
        const end = new Date(interview.scheduledEnd);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndTime(end.toTimeString().slice(0, 5));
      } catch {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split('T')[0]);
        setStartTime('10:00');
        setEndTime('11:00');
      }
    }
  }, [isOpen, interview]);

  // Capture-phase escape dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape, true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleEscape, true);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !interview) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!date || !startTime || !endTime) {
      setErrorMessage('Please select date, start time, and end time.');
      return;
    }

    if (reason.trim().length < 3) {
      setErrorMessage('Please provide a reason (minimum 3 characters).');
      return;
    }

    const isoStart = new Date(`${date}T${startTime}:00`).toISOString();
    const isoEnd = new Date(`${date}T${endTime}:00`).toISOString();

    if (new Date(isoEnd).getTime() <= new Date(isoStart).getTime()) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onReschedule(interview.id, isoStart, isoEnd, reason.trim());
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to reschedule interview. An interviewer conflict or error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation">
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
          aria-labelledby="reschedule-modal-title"
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-lg border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 id="reschedule-modal-title" className="text-base font-bold text-slate-900">
                  Reschedule Interview
                </h3>
                <p className="text-xs text-slate-500">
                  {interview.candidateName} • {interview.title}
                </p>
              </div>
            </div>

            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {isSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">Interview Rescheduled</h4>
                <p className="text-xs text-slate-500">
                  All parties have been notified and calendar events updated.
                </p>
              </div>
            ) : (
              <>
                {/* Current schedule banner */}
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/60 text-xs text-purple-900 space-y-1">
                  <span className="font-bold uppercase text-[10px] text-purple-700 tracking-wider">
                    Current Scheduled Time
                  </span>
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {new Date(interview.scheduledStart).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <Clock className="w-3.5 h-3.5 text-purple-600 ml-2" />
                    <span>
                      {interview.scheduledStart.split('T')[1]?.slice(0, 5)} -{' '}
                      {interview.scheduledEnd.split('T')[1]?.slice(0, 5)} UTC
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* New Date selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
                    required
                  />
                </div>

                {/* New Start / End times */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Start Time (UTC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      End Time (UTC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reason for Reschedule <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Candidate requested slot change due to flight delay..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    required
                    minLength={3}
                    maxLength={500}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    This reason will be logged in the immutable interview audit trail.
                  </p>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
