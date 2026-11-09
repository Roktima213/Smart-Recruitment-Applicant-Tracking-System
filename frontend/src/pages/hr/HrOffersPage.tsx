import React from 'react';
import { Gift, FileCheck } from 'lucide-react';

export const HrOffersPage: React.FC = () => {
  const offers = [
    {
      id: 'OFF-301',
      candidate: 'Carlos Mendez',
      role: 'Cloud Engineer',
      salary: '$145,000 / year',
      status: 'Pending Candidate Signature',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      sentDate: '2026-11-06',
    },
    {
      id: 'OFF-300',
      candidate: 'Zack Taylor',
      role: 'Full Stack Engineer',
      salary: '$135,000 / year',
      status: 'Accepted & Hired',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      sentDate: '2026-11-01',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Offers & Approvals</h1>
        <p className="text-sm text-slate-500">
          Draft, approve, and send offer letters with compensation structures.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {offers.map((offer) => (
            <div key={offer.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{offer.candidate}</h3>
                    <p className="text-xs text-slate-500">{offer.role} • {offer.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 text-xs">
                  <span className="font-semibold text-slate-800">{offer.salary}</span>
                  <span className={`px-2 py-0.5 rounded-full border ${offer.statusColor}`}>
                    {offer.status}
                  </span>
                  <span className="text-slate-400">Sent on {offer.sentDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition">
                  <FileCheck className="w-3.5 h-3.5" />
                  View Letter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
