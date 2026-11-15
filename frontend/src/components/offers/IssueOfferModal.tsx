import React, { useState } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  Mail,
  Calendar,
  Clock,
} from 'lucide-react';
import { OfferDetails } from './OfferTypes';
import { Button } from '../ui/Button';

export interface IssueOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferDetails;
  onConfirmIssue: (offer: OfferDetails) => Promise<void> | void;
}

export const IssueOfferModal: React.FC<IssueOfferModalProps> = ({
  isOpen,
  onClose,
  offer,
  onConfirmIssue,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);

  if (!isOpen) return null;

  const baseSalaryNum = Number(offer.compensation.baseSalary) || 0;
  const signOnNum = Number(offer.compensation.signOnBonus) || 0;
  const bonusPct = Number(offer.compensation.performanceBonusPercent) || 0;
  const totalTargetFirstYear = baseSalaryNum + signOnNum + (baseSalaryNum * bonusPct) / 100;

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: offer.compensation.currency || 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmIssue(offer);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleIn">
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-600 text-white shadow-sm">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Issue Formal Offer Letter</h3>
                <p className="text-xs text-slate-300">
                  REF: <span className="font-mono text-brand-300">{offer.id || 'OFF-2026-NEW'}</span> • Candidate Stage Transition to <span className="font-semibold text-emerald-300">OFFERED</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 text-xs text-slate-700">
            {/* Offer Summary Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Candidate & Role
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{offer.candidateName}</h4>
                  <p className="text-slate-500">{offer.jobTitle} • {offer.department}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Target Compensation
                  </span>
                  <p className="text-sm font-extrabold text-brand-700">
                    {formatCurrency(totalTargetFirstYear)}
                  </p>
                  <p className="text-[10px] text-slate-500">Year 1 Target</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Start Date: <strong className="text-slate-900">{offer.startDate || 'TBD'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Valid Until: <strong className="text-rose-700">{offer.expirationDate || 'TBD'}</strong></span>
                </div>
              </div>
            </div>

            {/* Email Notification Dispatch Preview */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-blue-600" /> Candidate Notification Dispatch
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmailNotification}
                    onChange={(e) => setSendEmailNotification(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-[11px] font-semibold text-blue-900">Send Email</span>
                </label>
              </div>

              {sendEmailNotification && (
                <div className="bg-white rounded-lg p-2.5 border border-blue-100 text-[11px] space-y-1 font-mono text-slate-600">
                  <p><span className="text-slate-400">To:</span> {offer.candidateEmail}</p>
                  <p><span className="text-slate-400">Subject:</span> Offer of Employment: {offer.jobTitle} at Smart ATS</p>
                  <p><span className="text-slate-400">Link:</span> https://smart-ats.internal/candidate/offers/{offer.id || 'OFF-NEW'}</p>
                </div>
              )}
            </div>

            {/* Stage Transition Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Pipeline Stage Update</p>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Issuing this offer will automatically transition <strong className="font-semibold">{offer.candidateName}</strong> to the <strong className="font-semibold text-emerald-800">`OFFERED`</strong> stage on the hiring pipeline kanban.
                </p>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer p-1">
              <input
                type="checkbox"
                checked={acceptedDisclaimer}
                onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500 mt-0.5"
              />
              <span className="text-[11px] text-slate-600 select-none">
                I confirm that this offer package has received required internal hiring executive approval and is authorized to be dispatched to the candidate.
              </span>
            </label>
          </div>

          {/* Footer Controls */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              isLoading={isSubmitting}
              disabled={!acceptedDisclaimer}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Confirm & Issue Offer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
