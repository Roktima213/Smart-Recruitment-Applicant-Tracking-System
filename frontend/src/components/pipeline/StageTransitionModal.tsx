import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  ApplicationStage,
  ALLOWED_NEXT_STAGES,
  PIPELINE_COLUMNS,
} from './types';

interface StageTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  jobTitle: string;
  currentStage: ApplicationStage;
  targetStage?: ApplicationStage | null;
  onConfirm: (targetStage: ApplicationStage, reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

const PRESET_REASONS: Record<ApplicationStage, string[]> = {
  SCREENING: [
    'Candidate resume strongly aligns with core job requirements',
    'Passed automated qualification check; scheduled recruiter call',
    'Exceptional prior company pedigree and engineering project background',
  ],
  INTERVIEW: [
    'Completed phone screen with high technical marks; advancing to loop',
    'Strong portfolio review; scheduled coding & systems interview',
    'Hiring manager recommendation based on initial conversation',
  ],
  SELECTED: [
    'Unanimous hire recommendation from panel interviewers',
    'Demonstrated mastery in system design and leadership values',
    'Final culture fit and architectural assessment passed',
  ],
  OFFERED: [
    'Competitive compensation package prepared and formal offer extended',
    'Offer approved by VP of Engineering and HR Director',
    'Candidate accepted verbal terms; issuing formal offer letter',
  ],
  REJECTED: [
    'Experience profile does not meet minimum technical bar for this level',
    'Role filled by another candidate; talent pool kept for future roles',
    'Candidate withdrew application due to competing offer',
    'Unsuccessful technical interview round performance',
  ],
  APPLIED: [],
};

export const StageTransitionModal: React.FC<StageTransitionModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  jobTitle,
  currentStage,
  targetStage: initialTargetStage,
  onConfirm,
  isSubmitting = false,
}) => {
  const allowedNext = ALLOWED_NEXT_STAGES[currentStage] || [];
  const [selectedTargetStage, setSelectedTargetStage] = useState<ApplicationStage>(
    initialTargetStage && allowedNext.includes(initialTargetStage)
      ? initialTargetStage
      : allowedNext[0] || 'REJECTED'
  );
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTargetStage && allowedNext.includes(initialTargetStage)) {
      setSelectedTargetStage(initialTargetStage);
    } else if (allowedNext.length > 0) {
      setSelectedTargetStage(allowedNext[0]);
    }
    setReason('');
    setValidationError(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, initialTargetStage, currentStage, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isRejecting = selectedTargetStage === 'REJECTED';
  const currentStageDef = PIPELINE_COLUMNS.find((c) => c.id === currentStage);
  const targetStageDef = PIPELINE_COLUMNS.find((c) => c.id === selectedTargetStage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 3) {
      setValidationError('Please enter a descriptive transition reason (at least 3 characters) for the audit log.');
      return;
    }
    setValidationError(null);
    await onConfirm(selectedTargetStage, trimmed);
  };

  const handleSelectPreset = (preset: string) => {
    setReason(preset);
    setValidationError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 id="transition-modal-title" className="text-base font-semibold text-slate-900">
              Stage Transition Confirmation
            </h3>
            <p className="text-xs text-slate-500">
              Immutable audit history will record this state change
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Candidate & Job Context */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">{candidateName}</span>
              <span className="text-[11px] font-medium text-slate-500">{jobTitle}</span>
            </div>
            {/* Visual stage transition badge */}
            <div className="pt-2 flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${currentStageDef?.badgeBg}`}>
                {currentStageDef?.name}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${targetStageDef?.badgeBg}`}>
                {targetStageDef?.name}
              </span>
            </div>
          </div>

          {/* Target Stage Selector (if multiple allowed next stages exist) */}
          {allowedNext.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Pipeline Stage
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allowedNext.map((stage) => {
                  const stageDef = PIPELINE_COLUMNS.find((c) => c.id === stage);
                  const isSelected = selectedTargetStage === stage;
                  const isTerminal = stage === 'REJECTED';

                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => {
                        setSelectedTargetStage(stage);
                        setReason('');
                      }}
                      className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition flex items-center justify-between ${
                        isSelected
                          ? isTerminal
                            ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-200'
                            : 'bg-brand-50 border-brand-400 text-brand-800 ring-2 ring-brand-200'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{stageDef?.name}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Terminal Warning if rejecting */}
          {isRejecting && (
            <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-0.5">
                <p className="font-semibold">Terminal State Warning</p>
                <p>
                  Marking an application as <strong>Rejected</strong> is permanent. Once rejected, the candidate cannot be moved back to active stages.
                </p>
              </div>
            </div>
          )}

          {/* Mandatory Reason Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Audit Reason <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.trim().length} chars (min 3)
              </span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={`Provide mandatory business justification for moving ${candidateName} to ${targetStageDef?.name}...`}
              className={`w-full px-3.5 py-2.5 text-xs text-slate-900 bg-white border rounded-xl shadow-xs focus:outline-hidden focus:ring-2 transition ${
                validationError
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200'
              }`}
              required
            />
            {validationError && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{validationError}</p>
            )}
          </div>

          {/* Preset Reason Suggestions */}
          {PRESET_REASONS[selectedTargetStage]?.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-1.5">
                <FileText className="w-3 h-3" />
                <span>Suggested quick reasons:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS[selectedTargetStage].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-md transition text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 3}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition flex items-center gap-1.5 ${
                isRejecting
                  ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-300'
                  : 'bg-brand-600 hover:bg-brand-700 focus:ring-2 focus:ring-brand-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Audit...</span>
                </>
              ) : (
                <>
                  <span>Confirm Move to {targetStageDef?.name}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
