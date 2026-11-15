import React, { useState } from 'react';
import {
  Search,
  FileCheck,
  Send,
  Edit3,
  Calendar,
  DollarSign,
  Gift,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';
import { OfferDetails, OfferStatus } from './OfferTypes';
import { Button } from '../ui/Button';

export interface OfferListViewProps {
  offers: OfferDetails[];
  onSelectPreview: (offer: OfferDetails) => void;
  onSelectEdit: (offer: OfferDetails) => void;
  onSelectIssue: (offer: OfferDetails) => void;
  onComposeNew: () => void;
}

export const OfferListView: React.FC<OfferListViewProps> = ({
  offers,
  onSelectPreview,
  onSelectEdit,
  onSelectIssue,
  onComposeNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOffers = offers.filter((offer) => {
    if (statusFilter !== 'ALL' && offer.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = offer.candidateName.toLowerCase().includes(q);
      const matchRole = offer.jobTitle.toLowerCase().includes(q);
      const matchId = offer.id.toLowerCase().includes(q);
      return matchName || matchRole || matchId;
    }
    return true;
  });

  const getStatusBadge = (status: OfferStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Draft Composer
          </span>
        );
      case 'ISSUED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Awaiting Signature
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Accepted & Hired
          </span>
        );
      case 'DECLINED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
            Declined
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by candidate name, role, or offer ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden lg:inline">
            Filter:
          </span>
          {['ALL', 'DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Offers' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Offers List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {filteredOffers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No offers found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No offer records match your current search criteria. Try modifying your filter or compose a new offer letter.
            </p>
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={onComposeNew}>
                Compose New Offer
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOffers.map((offer) => {
              const baseSalaryNum = Number(offer.compensation.baseSalary) || 0;
              const signOnNum = Number(offer.compensation.signOnBonus) || 0;
              const bonusPct = Number(offer.compensation.performanceBonusPercent) || 0;
              const totalTarget = baseSalaryNum + signOnNum + (baseSalaryNum * bonusPct) / 100;

              return (
                <div
                  key={offer.id}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-50 to-indigo-50 text-brand-700 border border-brand-100 shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900">{offer.candidateName}</h3>
                          <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {offer.id}
                          </span>
                          {getStatusBadge(offer.status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {offer.jobTitle} • {offer.department} • Reports to {offer.reportsTo}
                        </p>
                      </div>
                    </div>

                    {/* Compensation details bar */}
                    <div className="flex items-center gap-4 flex-wrap text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Base: {formatCurrency(baseSalaryNum, offer.compensation.currency)} / yr</span>
                      </div>

                      {totalTarget > baseSalaryNum && (
                        <div className="text-slate-500 text-[11px]">
                          Target OTE: <strong className="text-brand-700">{formatCurrency(totalTarget, offer.compensation.currency)}</strong>
                        </div>
                      )}

                      {Boolean(offer.compensation.equityShares && offer.compensation.equityShares > 0) && (
                        <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-semibold">
                          {offer.compensation.equityShares?.toLocaleString()} {offer.compensation.equityType || 'RSUs'}
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Start: {offer.startDate || 'TBD'}</span>
                      </div>

                      {offer.expirationDate && (
                        <div className="text-slate-400 text-[11px]">
                          Expires: {offer.expirationDate}
                        </div>
                      )}

                      {/* Onboarding progress if accepted */}
                      {offer.status === 'ACCEPTED' && offer.onboardingTasksCount && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <UserCheck className="w-3 h-3" />
                          <span>Onboarding: {offer.onboardingCompletedCount || 0}/{offer.onboardingTasksCount} Tasks</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => onSelectPreview(offer)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition shadow-2xs"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-brand-600" />
                      <span>View Letter</span>
                    </button>

                    {offer.status === 'DRAFT' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectEdit(offer)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit Draft</span>
                        </button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onSelectIssue(offer)}
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          Issue Offer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
