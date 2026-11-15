import React from 'react';
import { Gift, Send, CheckCircle2, TrendingUp } from 'lucide-react';
import { OfferDetails } from './OfferTypes';

export interface OfferStatsCardProps {
  offers: OfferDetails[];
}

export const OfferStatsCard: React.FC<OfferStatsCardProps> = ({ offers }) => {
  const totalOffers = offers.length;
  const issuedOffers = offers.filter((o) => o.status === 'ISSUED').length;
  const acceptedOffers = offers.filter((o) => o.status === 'ACCEPTED').length;
  const draftOffers = offers.filter((o) => o.status === 'DRAFT').length;

  const totalDecided = offers.filter((o) => o.status === 'ACCEPTED' || o.status === 'DECLINED').length;
  const acceptanceRate = totalDecided > 0 ? Math.round((acceptedOffers / totalDecided) * 100) : 100;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Offers */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Offers
          </p>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Gift className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900">{totalOffers}</span>
          <span className="text-[11px] text-slate-400">generated</span>
        </div>
      </div>

      {/* Awaiting Signature */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
            Pending Signature
          </p>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <Send className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-amber-700">{issuedOffers}</span>
          <span className="text-[11px] text-amber-500">active</span>
        </div>
      </div>

      {/* Accepted & Hired */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Accepted & Hired
          </p>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-emerald-700">{acceptedOffers}</span>
          <span className="text-[11px] text-emerald-500">hired</span>
        </div>
      </div>

      {/* Acceptance Rate / In Draft */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">
            Acceptance Rate
          </p>
          <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-brand-700">{acceptanceRate}%</span>
          <span className="text-[11px] text-slate-400">({draftOffers} drafts)</span>
        </div>
      </div>
    </div>
  );
};
