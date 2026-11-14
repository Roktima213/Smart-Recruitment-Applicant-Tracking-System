import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  Star,
  FileCheck2,
  RefreshCw,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InterviewEvent } from './InterviewTypes';

export interface InterviewDetailModalProps {
  isOpen: boolean;
  interview: InterviewEvent | null;
  onClose: () => void;
  onSubmitScorecard?: (
    interviewId: string,
    rating: number,
    recommendation: 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE',
    notes: string,
    strengths?: string,
    concerns?: string
  ) => Promise<void> | void;
  onOpenReschedule?: (interview: InterviewEvent) => void;
  onCancelInterview?: (interviewId: string, reason: string) => Promise<void>;
  isCandidateView?: boolean;
}

export const InterviewDetailModal: React.FC<InterviewDetailModalProps> = ({
  isOpen,
  interview,
  onClose,
  onSubmitScorecard,
  onOpenReschedule,
  onCancelInterview,
  isCandidateView = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [scorecardRating, setScorecardRating] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<
    'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE'
  >('HIRE');
  const [strengths, setStrengths] = useState<string>('');
  const [concerns, setConcerns] = useState<string>('');
  const [scorecardNotes, setScorecardNotes] = useState<string>('');
  const [isSubmittingScorecard, setIsSubmittingScorecard] = useState(false);
  const [scorecardSuccess, setScorecardSuccess] = useState(false);

  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Capture-phase escape dismissal
  useEffect(() => {
    if (!isOpen) return;

    setShowCancelPrompt(false);
    setCancelReason('');
    setScorecardSuccess(false);

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

  const handleCopyLink = () => {
    if (interview.locationOrLink) {
      navigator.clipboard.writeText(interview.locationOrLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleScorecardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitScorecard) return;

    try {
      setIsSubmittingScorecard(true);
      await onSubmitScorecard(
        interview.id,
        scorecardRating,
        recommendation,
        scorecardNotes.trim(),
        strengths.trim(),
        concerns.trim()
      );
      setScorecardSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingScorecard(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!onCancelInterview || cancelReason.trim().length < 3) return;

    try {
      setIsCancelling(true);
      await onCancelInterview(interview.id, cancelReason.trim());
      setShowCancelPrompt(false);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancelling(false);
    }
  };

  const isTerminal = interview.status === 'CANCELLED' || interview.status === 'COMPLETED';

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
          aria-labelledby="interview-detail-title"
          className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-lg border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {interview.type}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    interview.status === 'CANCELLED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : interview.status === 'COMPLETED'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : interview.status === 'RESCHEDULED'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {interview.status}
                </span>
                {interview.rescheduleCount > 0 && (
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Rescheduled ({interview.rescheduleCount}x)
                  </span>
                )}
              </div>
              <h3 id="interview-detail-title" className="text-base font-bold text-slate-900 mt-1.5">
                {interview.title}
              </h3>
            </div>

            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Close interview details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
            {/* Candidate & Interviewer Cards */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Candidate</p>
                <p className="font-bold text-slate-900 mt-0.5">{interview.candidateName}</p>
                <p className="text-slate-500 text-[11px]">{interview.candidateRole}</p>
                {interview.candidateEmail && (
                  <p className="text-slate-400 text-[10px] truncate">{interview.candidateEmail}</p>
                )}
              </div>

              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Lead Evaluator</p>
                <p className="font-bold text-slate-900 mt-0.5">{interview.interviewer}</p>
                <p className="text-slate-500 text-[11px]">{interview.interviewerRole || 'Lead Interviewer'}</p>
              </div>
            </div>

            {/* Date & Time Info */}
            <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>
                  {new Date(interview.scheduledStart).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {interview.scheduledStart.split('T')[1]?.slice(0, 5)} - {interview.scheduledEnd.split('T')[1]?.slice(0, 5)} UTC
                </span>
              </div>
            </div>

            {/* Video Meeting Bridge */}
            <div className="space-y-1.5">
              <p className="font-bold text-slate-700">Video Bridge Link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 truncate">
                  {interview.locationOrLink}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Copy meeting link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={interview.locationOrLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition"
                >
                  <Video className="w-4 h-4" />
                  Join
                </a>
              </div>
            </div>

            {/* Agenda Notes */}
            {interview.notes && (
              <div className="space-y-1">
                <p className="font-bold text-slate-700">Preparation & Agenda Notes</p>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  {interview.notes}
                </p>
              </div>
            )}

            {/* Reschedule & Cancel Controls (Restricted to internal staff) */}
            {!isCandidateView && !isTerminal && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Interview Management</span>
                  <div className="flex items-center gap-2">
                    {onOpenReschedule && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenReschedule(interview)}
                        className="text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Reschedule
                      </Button>
                    )}
                    {onCancelInterview && !showCancelPrompt && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancelPrompt(true)}
                        className="text-red-700 border-red-200 hover:bg-red-50"
                      >
                        <Ban className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cancel confirmation inline */}
                {showCancelPrompt && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-1.5 text-red-800 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Confirm Cancellation</span>
                    </div>
                    <p className="text-[11px] text-red-700">
                      Please enter a reason for cancelling this interview event:
                    </p>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Candidate withdrew or role put on hold"
                      className="w-full text-xs p-2 rounded-lg border border-red-300 bg-white"
                      minLength={3}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancelPrompt(false)}
                      >
                        Nevermind
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={cancelReason.trim().length < 3 || isCancelling}
                        onClick={handleConfirmCancel}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scorecard Submission Section (STRICTLY HIDDEN from Candidates) */}
            {!isCandidateView && onSubmitScorecard && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-purple-600" />
                    <span>Evaluator Structured Scorecard</span>
                  </p>
                  {interview.scorecard || interview.status === 'COMPLETED' ? (
                    <Badge variant="success" size="sm">Scorecard Recorded</Badge>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pending Evaluation</span>
                  )}
                </div>

                {scorecardSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Scorecard recorded successfully. Interview has been marked as Completed.</span>
                  </div>
                ) : interview.scorecard ? (
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Recommendation:</span>
                      <span className="font-bold text-purple-700">{interview.scorecard.recommendation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Rating:</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= interview.scorecard!.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {interview.scorecard.confidentialNotes && (
                      <div className="pt-1 border-t border-purple-100 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-700">Notes: </span>
                        {interview.scorecard.confidentialNotes}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleScorecardSubmit} className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Rating (1-5):</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setScorecardRating(star)}
                            className="p-1 focus:outline-none"
                            aria-label={`${star} stars`}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= scorecardRating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-slate-600">Hire Recommendation:</label>
                      <select
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value as any)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="STRONG_HIRE">Strong Hire</option>
                        <option value="HIRE">Hire</option>
                        <option value="NO_HIRE">No Hire</option>
                        <option value="STRONG_NO_HIRE">Strong No Hire</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-slate-600">Candidate Strengths:</label>
                      <input
                        type="text"
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="e.g. Excellent concurrency mastery, clean code patterns..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-slate-600">Concerns / Gaps:</label>
                      <input
                        type="text"
                        value={concerns}
                        onChange={(e) => setConcerns(e.target.value)}
                        placeholder="e.g. Light on Kubernetes operations experience..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-slate-600">Confidential Hiring Team Notes:</label>
                      <textarea
                        rows={2}
                        value={scorecardNotes}
                        onChange={(e) => setScorecardNotes(e.target.value)}
                        placeholder="Confidential evaluation visible only to internal hiring committee..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSubmittingScorecard}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isSubmittingScorecard ? 'Submitting...' : 'Submit Scorecard'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
