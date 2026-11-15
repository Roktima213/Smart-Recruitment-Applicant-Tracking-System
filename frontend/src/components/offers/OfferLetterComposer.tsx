import React, { useState } from 'react';
import {
  Layers,
  Send,
  Save,
  CheckSquare,
  Square,
  ChevronDown,
} from 'lucide-react';
import {
  OfferDetails,
  OfferCandidate,
  OfferTemplateId,
  OFFER_TEMPLATES,
  ELIGIBLE_CANDIDATES,
  PayFrequency,
  WorkplaceType,
} from './OfferTypes';
import { Button } from '../ui/Button';

export interface OfferLetterComposerProps {
  currentOffer: OfferDetails;
  onChange: (updated: OfferDetails) => void;
  onReviewAndIssue: () => void;
  onSaveDraft?: () => void;
  availableCandidates?: OfferCandidate[];
  className?: string;
}

const COMMON_BENEFITS = [
  'Comprehensive Medical, Dental, and Vision coverage (100% employer paid)',
  '401(k) retirement plan with 5% dollar-for-dollar employer match',
  'Unlimited Flexible Time Off (FTO) & 12 paid corporate holidays',
  'Annual $3,000 professional learning, certification, and tech budget',
  '$1,500 Home Office workstation ergonomic setup stipend',
  'Paid parental leave (16 weeks primary, 8 weeks secondary)',
  'Executive relocation assistance and temporary transition housing',
];

export const OfferLetterComposer: React.FC<OfferLetterComposerProps> = ({
  currentOffer,
  onChange,
  onReviewAndIssue,
  onSaveDraft,
  availableCandidates = ELIGIBLE_CANDIDATES,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'candidate' | 'compensation' | 'dates' | 'terms'>('candidate');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    currentOffer.candidateId || availableCandidates[0]?.id || ''
  );

  // Quick field updates helper
  const updateField = <K extends keyof OfferDetails>(field: K, value: OfferDetails[K]) => {
    onChange({
      ...currentOffer,
      [field]: value,
    });
  };

  const updateCompensation = <K extends keyof OfferDetails['compensation']>(
    field: K,
    value: OfferDetails['compensation'][K]
  ) => {
    onChange({
      ...currentOffer,
      compensation: {
        ...currentOffer.compensation,
        [field]: value,
      },
    });
  };

  // When a candidate is selected from the dropdown
  const handleCandidateChange = (candId: string) => {
    setSelectedCandidateId(candId);
    const candidate = availableCandidates.find((c) => c.id === candId);
    if (candidate) {
      onChange({
        ...currentOffer,
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        candidatePhone: candidate.phone || currentOffer.candidatePhone,
        candidateAddress: candidate.address || currentOffer.candidateAddress,
        jobTitle: candidate.role || currentOffer.jobTitle,
        department: candidate.department || currentOffer.department,
      });
    }
  };

  // Toggle benefit
  const handleToggleBenefit = (benefitText: string) => {
    const existing = currentOffer.compensation.benefitsSummary || [];
    let updated: string[];
    if (existing.includes(benefitText)) {
      updated = existing.filter((b) => b !== benefitText);
    } else {
      updated = [...existing, benefitText];
    }
    updateCompensation('benefitsSummary', updated);
  };

  // Preset Date shortcuts
  const setStartDateShortcut = (weeksFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + weeksFromNow * 7);
    updateField('startDate', d.toISOString().split('T')[0]);
  };

  const setExpirationShortcut = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    updateField('expirationDate', d.toISOString().split('T')[0]);
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-700">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              HR Offer Letter Composer
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure candidate details, compensation structure, and milestone dates.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/70 text-slate-600 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('candidate')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'candidate' ? 'bg-white text-brand-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Candidate & Role
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compensation')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'compensation' ? 'bg-white text-brand-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Compensation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dates')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'dates' ? 'bg-white text-brand-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Dates & Deadlines
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'terms' ? 'bg-white text-brand-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Terms & Addendum
          </button>
        </div>
      </div>

      {/* Main Composer Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ================= SECTION: Candidate & Role ================= */}
        {activeTab === 'candidate' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Candidate Selector Dropdown */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Eligible Candidate
              </label>
              <div className="relative">
                <select
                  value={selectedCandidateId}
                  onChange={(e) => handleCandidateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:border-brand-500 appearance-none pr-10"
                >
                  {availableCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.role} ({c.currentStage})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecting a candidate automatically pre-fills contact information, department, and role.
              </p>
            </div>

            {/* Template Selector Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Offer Letter Template Model
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(OFFER_TEMPLATES) as OfferTemplateId[]).map((tId) => {
                  const tmpl = OFFER_TEMPLATES[tId];
                  const isSelected = currentOffer.templateId === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => updateField('templateId', tId)}
                      className={`text-left p-3 rounded-xl border transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-900">{tmpl.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tmpl.badgeColor}`}>
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                        {tmpl.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Candidate & Position Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Full Name
                </label>
                <input
                  type="text"
                  value={currentOffer.candidateName}
                  onChange={(e) => updateField('candidateName', e.target.value)}
                  placeholder="e.g. Carlos Mendez"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Candidate Email
                </label>
                <input
                  type="email"
                  value={currentOffer.candidateEmail}
                  onChange={(e) => updateField('candidateEmail', e.target.value)}
                  placeholder="e.g. carlos@example.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Position Title
                </label>
                <input
                  type="text"
                  value={currentOffer.jobTitle}
                  onChange={(e) => updateField('jobTitle', e.target.value)}
                  placeholder="e.g. DevOps & Cloud Architect"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Org Unit
                </label>
                <input
                  type="text"
                  value={currentOffer.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="e.g. Cloud Infrastructure & SRE"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reporting Manager Name
                </label>
                <input
                  type="text"
                  value={currentOffer.reportsTo}
                  onChange={(e) => updateField('reportsTo', e.target.value)}
                  placeholder="e.g. Ranadeep Saha"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reporting Manager Title
                </label>
                <input
                  type="text"
                  value={currentOffer.reportsToTitle}
                  onChange={(e) => updateField('reportsToTitle', e.target.value)}
                  placeholder="e.g. Engineering Director"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Arrangement
                </label>
                <select
                  value={currentOffer.workplaceType}
                  onChange={(e) => updateField('workplaceType', e.target.value as WorkplaceType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="HYBRID">Hybrid (Office + Remote)</option>
                  <option value="REMOTE">Fully Remote / Distributed</option>
                  <option value="ON_SITE">On-Site (Floor 15 HQ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Office Location
                </label>
                <input
                  type="text"
                  value={currentOffer.officeLocation}
                  onChange={(e) => updateField('officeLocation', e.target.value)}
                  placeholder="Floor 15 Headquarters - San Francisco, CA"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: Compensation ================= */}
        {activeTab === 'compensation' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Currency & Base Salary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Currency
                </label>
                <select
                  value={currentOffer.compensation.currency}
                  onChange={(e) => updateCompensation('currency', e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="USD">USD ($ - United States Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="CAD">CAD ($ - Canadian Dollar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Base Salary
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    {currentOffer.compensation.currency}
                  </div>
                  <input
                    type="number"
                    value={currentOffer.compensation.baseSalary || ''}
                    onChange={(e) => updateCompensation('baseSalary', Number(e.target.value))}
                    placeholder="145000"
                    step="1000"
                    min="0"
                    className="w-full pl-12 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Pay Frequency
                </label>
                <select
                  value={currentOffer.compensation.payFrequency}
                  onChange={(e) => updateCompensation('payFrequency', e.target.value as PayFrequency)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="ANNUAL">Annual (Per Year)</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                </select>
              </div>
            </div>

            {/* Quick Salary Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Presets:</span>
              {[95000, 120000, 135000, 145000, 165000, 185000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateCompensation('baseSalary', preset)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                    currentOffer.compensation.baseSalary === preset
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  ${(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>

            {/* Sign-on & Bonus Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sign-on Cash Bonus
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    {currentOffer.compensation.currency}
                  </div>
                  <input
                    type="number"
                    value={currentOffer.compensation.signOnBonus || ''}
                    onChange={(e) => updateCompensation('signOnBonus', Number(e.target.value))}
                    placeholder="12000"
                    step="500"
                    min="0"
                    className="w-full pl-12 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Annual Target Performance Bonus (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentOffer.compensation.performanceBonusPercent || ''}
                    onChange={(e) => updateCompensation('performanceBonusPercent', Number(e.target.value))}
                    placeholder="15"
                    step="1"
                    min="0"
                    max="100"
                    className="w-full pr-8 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    %
                  </div>
                </div>
              </div>
            </div>

            {/* Equity / Stock Options */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Long-Term Equity Incentive
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Number of Shares / Units
                  </label>
                  <input
                    type="number"
                    value={currentOffer.compensation.equityShares || ''}
                    onChange={(e) => updateCompensation('equityShares', Number(e.target.value))}
                    placeholder="8000"
                    step="500"
                    min="0"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Equity Vehicle Type
                  </label>
                  <select
                    value={currentOffer.compensation.equityType || 'RSU'}
                    onChange={(e) => updateCompensation('equityType', e.target.value as 'RSU' | 'ISO' | 'NSO')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="RSU">Restricted Stock Units (RSU)</option>
                    <option value="ISO">Incentive Stock Options (ISO)</option>
                    <option value="NSO">Non-Qualified Stock Options (NSO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Vesting Schedule Terms
                </label>
                <input
                  type="text"
                  value={currentOffer.compensation.equityVesting || ''}
                  onChange={(e) => updateCompensation('equityVesting', e.target.value)}
                  placeholder="4 years with 1-year cliff (25% at 12 months, quarterly thereafter)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Benefits Package Checkbox List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Included Benefits & Corporate Perks
              </label>
              <div className="space-y-2">
                {COMMON_BENEFITS.map((b, idx) => {
                  const isChecked = (currentOffer.compensation.benefitsSummary || []).includes(b);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleToggleBenefit(b)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs transition border ${
                        isChecked
                          ? 'bg-brand-50/50 border-brand-200 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <span>{b}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: Dates & Deadlines ================= */}
        {activeTab === 'dates' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Expected Employment Start Date
              </label>
              <input
                type="date"
                value={currentOffer.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-brand-500 focus:border-brand-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Start Shortcuts:</span>
                <button
                  type="button"
                  onClick={() => setStartDateShortcut(2)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  +2 Weeks
                </button>
                <button
                  type="button"
                  onClick={() => setStartDateShortcut(4)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  +1 Month
                </button>
              </div>
            </div>

            {/* Expiration Date */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Offer Expiration & Decision Deadline
              </label>
              <input
                type="date"
                value={currentOffer.expirationDate}
                onChange={(e) => updateField('expirationDate', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-brand-500 focus:border-brand-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Expiration Shortcuts:</span>
                <button
                  type="button"
                  onClick={() => setExpirationShortcut(7)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setExpirationShortcut(14)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  14 Days
                </button>
              </div>
            </div>

            {/* Issue Date */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Official Document Issue Date
              </label>
              <input
                type="date"
                value={currentOffer.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
        )}

        {/* ================= SECTION: Terms & Addendum ================= */}
        {activeTab === 'terms' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Executive Signer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorized Corporate Signer Name
                </label>
                <input
                  type="text"
                  value={currentOffer.executiveSignerName || ''}
                  onChange={(e) => updateField('executiveSignerName', e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Signer Title / Executive Role
                </label>
                <input
                  type="text"
                  value={currentOffer.executiveSignerTitle || ''}
                  onChange={(e) => updateField('executiveSignerTitle', e.target.value)}
                  placeholder="VP of People & Talent Operations"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Custom Addendum / Personal Note */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Personalized Welcome Note / Special Addendum
              </label>
              <textarea
                rows={4}
                value={currentOffer.customNotes || ''}
                onChange={(e) => updateField('customNotes', e.target.value)}
                placeholder="Include personalized remarks, relocation notes, or feedback from the interview panel..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-brand-500 focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-500">
                This note will be rendered directly inside the official offer letter in the Special Executive Addendum section.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={onReviewAndIssue}
          rightIcon={<Send className="w-4 h-4" />}
        >
          Review & Issue Offer
        </Button>
      </div>
    </div>
  );
};
