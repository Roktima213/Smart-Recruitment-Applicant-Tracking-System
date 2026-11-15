import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Printer,
  CheckCircle2,
  DollarSign,
  Briefcase,
  FileText,
  Award,
  Sparkles,
} from 'lucide-react';
import { OfferDetails, OFFER_TEMPLATES } from './OfferTypes';

export interface OfferTemplatePreviewProps {
  offer: OfferDetails;
  className?: string;
}

export const OfferTemplatePreview: React.FC<OfferTemplatePreviewProps> = ({
  offer,
  className = '',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  const templateDef = OFFER_TEMPLATES[offer.templateId] || OFFER_TEMPLATES.STANDARD_FULLTIME;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 10, 70));
  const handleResetZoom = () => setZoomLevel(100);

  const handlePrint = () => {
    window.print();
  };

  // Currency Formatter Helper
  const formatCurrency = (amount: number, currency = offer.compensation.currency) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate annual bonus & total target compensation
  const baseSalaryNum = Number(offer.compensation.baseSalary) || 0;
  const signOnNum = Number(offer.compensation.signOnBonus) || 0;
  const bonusPct = Number(offer.compensation.performanceBonusPercent) || 0;
  const estimatedBonusValue = (baseSalaryNum * bonusPct) / 100;
  const totalFirstYearTarget = baseSalaryNum + signOnNum + estimatedBonusValue;

  return (
    <div className={`flex flex-col h-full bg-slate-100/80 rounded-2xl border border-slate-200 overflow-hidden shadow-inner ${className}`}>
      {/* Top Preview Controls Toolbar */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-50 text-brand-700">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              Live Formal Document Canvas
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Sparkles className="w-3 h-3" /> Real-time
              </span>
            </span>
            <p className="text-[11px] text-slate-500">
              Ref: <span className="font-mono font-medium text-slate-700">{offer.id || 'OFF-DRAFT'}</span> • {templateDef.name}
            </p>
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-slate-600">
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom out"
              disabled={zoomLevel <= 70}
              className="p-1.5 hover:text-slate-900 hover:bg-white rounded transition disabled:opacity-40"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-semibold tabular-nums text-slate-700">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom in"
              disabled={zoomLevel >= 150}
              className="p-1.5 hover:text-slate-900 hover:bg-white rounded transition disabled:opacity-40"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Reset 100%"
              className="p-1.5 hover:text-slate-900 hover:bg-white rounded transition border-l border-slate-200 ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Watermark */}
          <button
            type="button"
            onClick={() => setShowWatermark(!showWatermark)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
              showWatermark
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showWatermark ? 'Watermark On' : 'Watermark Off'}
          </button>

          {/* Print/Download Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Canvas Paper Viewport Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200/90 text-slate-900 relative p-8 sm:p-12 transition-all print:shadow-none print:border-none print:p-0 print:m-0"
        >
          {/* Watermark Overlay */}
          {showWatermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10 select-none opacity-5">
              <div className="transform -rotate-45 text-7xl font-extrabold uppercase tracking-widest text-slate-900 whitespace-nowrap">
                {offer.status === 'DRAFT'
                  ? 'OFFICIAL DRAFT'
                  : offer.status === 'ACCEPTED'
                  ? 'ACCEPTED & SIGNED'
                  : 'SMART ATS OFFICIAL OFFER'}
              </div>
            </div>
          )}

          {/* Document Header with Corporate Branding */}
          <header className="border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    S
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      SMART SYSTEMS CORPORATION
                    </h1>
                    <p className="text-[11px] font-semibold text-brand-700 tracking-wider uppercase">
                      Talent Acquisition & People Operations
                    </p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 space-y-0.5 leading-tight">
                  <p>Floor 15 Headquarters • 100 California Street, Suite 1500</p>
                  <p>San Francisco, CA 94111 • USA • hr@smart-ats.internal</p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-[11px] font-mono font-bold text-slate-800">
                  REF: {offer.id || 'OFF-2026-DRAFT'}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  <p className="font-semibold text-slate-700">Date of Issuance:</p>
                  <p>{formatDateDisplay(offer.issueDate)}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Recipient Details Block */}
          <section className="mb-6 bg-slate-50/80 rounded-lg p-4 border border-slate-100 text-xs">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
              Private & Confidential • Addressee
            </p>
            <p className="text-sm font-bold text-slate-900">{offer.candidateName || '[Candidate Name]'}</p>
            <p className="text-slate-600">{offer.candidateEmail || '[Candidate Email]'}</p>
            {offer.candidatePhone && <p className="text-slate-600">{offer.candidatePhone}</p>}
            {offer.candidateAddress && <p className="text-slate-600">{offer.candidateAddress}</p>}
          </section>

          {/* Salutation */}
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Dear {offer.candidateName || '[Candidate Name]'},
            </h2>
          </div>

          {/* Opening Statement */}
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 space-y-3">
            <p>{templateDef.introClause}</p>
            <p>
              We are pleased to formally extend this offer of employment for the position of{' '}
              <strong className="text-slate-900 font-semibold">{offer.jobTitle || '[Job Title]'}</strong>{' '}
              within the{' '}
              <strong className="text-slate-900 font-semibold">{offer.department || '[Department]'}</strong>{' '}
              department at Smart ATS Inc.
            </p>
          </div>

          {/* Position & Reporting Structure Card */}
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 text-brand-700">
              <Briefcase className="w-3.5 h-3.5" /> Position & Operational Terms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Position Title</span>
                <span className="font-bold text-slate-900">{offer.jobTitle || 'Not Specified'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Department / Org</span>
                <span className="font-bold text-slate-900">{offer.department || 'Engineering'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Reporting Manager</span>
                <span className="font-bold text-slate-900">
                  {offer.reportsTo || 'Hiring Director'}
                  {offer.reportsToTitle ? ` (${offer.reportsToTitle})` : ''}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Work Arrangement</span>
                <span className="font-bold text-slate-900">
                  {offer.workplaceType} • {offer.officeLocation || 'Floor 15 HQ'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Employment Type</span>
                <span className="font-bold text-slate-900">{offer.employmentType.replace('_', ' ')}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium block text-[11px]">Anticipated Start Date</span>
                <span className="font-bold text-brand-700">{formatDateDisplay(offer.startDate)}</span>
              </div>
            </div>
          </section>

          {/* Compensation & Rewards Table */}
          <section className="mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="bg-slate-900 px-4 py-2.5 text-white flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Compensation & Total Rewards Structure
              </h3>
              <span className="text-[11px] font-mono text-slate-300">
                Currency: {offer.compensation.currency}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Base Salary Row */}
              <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition">
                <div>
                  <p className="font-bold text-slate-900">Base Salary</p>
                  <p className="text-[11px] text-slate-500">
                    Paid {offer.compensation.payFrequency.toLowerCase()} in accordance with company standard payroll practices.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatCurrency(baseSalaryNum)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">/ {offer.compensation.payFrequency.toLowerCase()}</span>
                </div>
              </div>

              {/* Sign-on Bonus Row (if applicable) */}
              {signOnNum > 0 && (
                <div className="p-3.5 flex items-center justify-between bg-emerald-50/30 hover:bg-emerald-50/50 transition">
                  <div>
                    <p className="font-bold text-emerald-900 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-600" /> Sign-On Incentive Bonus
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Disbursed on your first scheduled payroll cycle following commencement.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-700">
                      {formatCurrency(signOnNum)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block">one-time payment</span>
                  </div>
                </div>
              )}

              {/* Performance Bonus Row (if applicable) */}
              {bonusPct > 0 && (
                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition">
                  <div>
                    <p className="font-bold text-slate-900">Annual Discretionary Performance Target</p>
                    <p className="text-[11px] text-slate-500">
                      Target bonus of {bonusPct}% based on corporate milestone achievement and personal performance.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatCurrency(estimatedBonusValue)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">({bonusPct}% target)</span>
                  </div>
                </div>
              )}

              {/* Equity Grant Row */}
              {Boolean(offer.compensation.equityShares && offer.compensation.equityShares > 0) && (
                <div className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition">
                  <div className="pr-4">
                    <p className="font-bold text-slate-900">
                      Long-Term Equity Incentive ({offer.compensation.equityType || 'RSU'})
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Vesting Schedule: {offer.compensation.equityVesting || 'Standard 4-year schedule with 1-year cliff'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-purple-700">
                      {offer.compensation.equityShares?.toLocaleString()} {offer.compensation.equityType || 'RSUs'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">equity units</span>
                  </div>
                </div>
              )}

              {/* Total Estimated First Year Target Bar */}
              <div className="p-3.5 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
                    Total Estimated Year 1 Cash Target:
                  </span>
                  <p className="text-[10px] text-slate-500">Excludes long-term equity growth appreciation</p>
                </div>
                <span className="text-base font-black text-brand-700">
                  {formatCurrency(totalFirstYearTarget)}
                </span>
              </div>
            </div>
          </section>

          {/* Benefits & Perks Section */}
          {offer.compensation.benefitsSummary && offer.compensation.benefitsSummary.length > 0 && (
            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-brand-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Comprehensive Benefits Package
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {offer.compensation.benefitsSummary.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Duties, Terms & Contingencies */}
          <section className="text-xs text-slate-600 leading-relaxed mb-6 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Scope of Responsibilities</h4>
              <p>{templateDef.dutiesClause}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Employment At-Will & Terms</h4>
              <p>{templateDef.termsClause}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs mb-1">Contingencies & Background Verifications</h4>
              <p>{templateDef.contingencyClause}</p>
            </div>
            {offer.customNotes && (
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900">
                <h4 className="font-bold text-xs mb-0.5">Special Executive Addendum</h4>
                <p>{offer.customNotes}</p>
              </div>
            )}
          </section>

          {/* Expiration Clause */}
          <section className="mb-8 p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800">
            <p className="font-semibold text-slate-900 mb-0.5">Offer Validity & Expiration Period:</p>
            <p>
              This formal offer remains valid until{' '}
              <strong className="text-brand-700 font-bold">{formatDateDisplay(offer.expirationDate)}</strong> at
              5:00 PM Pacific Standard Time. To confirm your acceptance, please sign, date, and return this document
              through your candidate portal before the expiration deadline.
            </p>
          </section>

          {/* Signatures Block */}
          <footer className="pt-6 border-t-2 border-slate-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              {/* Authorized Company Signer */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  For Smart Systems Corporation
                </p>
                {/* Visual signature cursive font */}
                <div className="h-10 border-b border-slate-400 mb-1 flex items-end">
                  <span className="font-serif italic text-lg text-slate-800 tracking-wider">
                    {offer.executiveSignerName || 'Sarah Jenkins'}
                  </span>
                </div>
                <p className="font-bold text-slate-900">{offer.executiveSignerName || 'Sarah Jenkins'}</p>
                <p className="text-slate-500 text-[11px]">
                  {offer.executiveSignerTitle || 'VP of People & Talent Operations'}
                </p>
                <p className="text-[11px] text-slate-400">Date: {formatDateDisplay(offer.issueDate)}</p>
              </div>

              {/* Candidate Acceptance Block */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Candidate Acceptance
                </p>
                <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-between">
                  {offer.status === 'ACCEPTED' ? (
                    <span className="font-serif italic text-lg text-emerald-800 tracking-wider">
                      {offer.candidateName} (Digitally Signed)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      [Candidate Signature & Acceptance Stamp]
                    </span>
                  )}
                  {offer.status === 'ACCEPTED' && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      VERIFIED
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900">
                  {offer.candidateName || 'Candidate Name'}
                </p>
                <p className="text-slate-500 text-[11px]">
                  {offer.status === 'ACCEPTED'
                    ? `Accepted on: ${formatDateDisplay(offer.acceptedAt || offer.issueDate)}`
                    : 'Status: Pending Candidate Signature'}
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
