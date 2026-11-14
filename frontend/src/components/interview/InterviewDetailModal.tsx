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
    notes: string
  ) => Promise<void> | void;
}

export const InterviewDetailModal: React.FC<InterviewDetailModalProps> = ({
  isOpen,
  interview,
  onClose,
  onSubmitScorecard,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [scorecardRating, setScorecardRating] = useState<number>(4);
  const [recommendation, setRecommendation] = useState<
    'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE'
  >('HIRE');
  const [scorecardNotes, setScorecardNotes] = useState<string>('');
  const [isSubmittingScorecard, setIsSubmittingScorecard] = useState(false);
  const [scorecardSuccess, setScorecardSuccess] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

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
        scorecardNotes.trim()
      );
      setScorecardSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingScorecard(false);
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
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {interview.status}
                </span>
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

          <div className="p-6 space-y-5 text-xs">
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
                <span>{new Date(interview.scheduledStart).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition"
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

            {/* Scorecard Submission Section */}
            {onSubmitScorecard && (
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-purple-600" />
                    <span>Evaluator Scorecard</span>
                  </p>
                  {interview.scorecard ? (
                    <Badge variant="success" size="sm">Scorecard Logged</Badge>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pending Evaluation</span>
                  )}
                </div>

                {scorecardSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Scorecard recorded successfully. Thank you for your evaluation!</span>
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
                      <label className="font-medium text-slate-600">Recommendation:</label>
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
                      <label className="font-medium text-slate-600">Confidential Evaluation Feedback:</label>
                      <textarea
                        rows={2}
                        value={scorecardNotes}
                        onChange={(e) => setScorecardNotes(e.target.value)}
                        placeholder="Add candidate evaluation strengths, architecture gaps, or hiring recommendation..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmittingScorecard}
                      >
                        Submit Scorecard
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
