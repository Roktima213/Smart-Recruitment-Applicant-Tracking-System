import React, { useState } from 'react';
import {
  Plus,
  List as ListIcon,
  Layers,
  X,
  FileText,
} from 'lucide-react';
import {
  OfferDetails,
  INITIAL_OFFERS,
  ELIGIBLE_CANDIDATES,
  OfferStatsCard,
  OfferListView,
  OfferLetterComposer,
  OfferTemplatePreview,
  IssueOfferModal,
} from '../../components/offers';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export const HrOffersPage: React.FC = () => {
  const { success, info } = useToast();

  const [offers, setOffers] = useState<OfferDetails[]>(INITIAL_OFFERS);
  const [activeOffer, setActiveOffer] = useState<OfferDetails>(INITIAL_OFFERS[2]); // Samira Khan draft default
  const [activeView, setActiveView] = useState<'list' | 'composer'>('list');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [modalPreviewOffer, setModalPreviewOffer] = useState<OfferDetails | null>(null);

  // Switch to composer for new offer
  const handleComposeNew = () => {
    const newOfferId = `OFF-2026-${Math.floor(100 + Math.random() * 900)}`;
    const firstCand = ELIGIBLE_CANDIDATES[0];
    const today = new Date().toISOString().split('T')[0];
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 28);

    const freshDraft: OfferDetails = {
      id: newOfferId,
      candidateId: firstCand.id,
      candidateName: firstCand.name,
      candidateEmail: firstCand.email,
      candidatePhone: firstCand.phone,
      candidateAddress: firstCand.address,
      jobTitle: firstCand.role,
      department: firstCand.department,
      employmentType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      officeLocation: 'Floor 15 Headquarters - San Francisco, CA',
      reportsTo: 'Ranadeep Saha',
      reportsToTitle: 'Engineering Director',
      templateId: 'STANDARD_FULLTIME',
      compensation: {
        currency: 'USD',
        baseSalary: 150000,
        payFrequency: 'ANNUAL',
        signOnBonus: 10000,
        performanceBonusPercent: 15,
        equityShares: 10000,
        equityType: 'RSU',
        equityVesting: '4 years with 1-year cliff (25% at 12 months, quarterly thereafter)',
        benefitsSummary: [
          'Comprehensive Medical, Dental, and Vision coverage (100% employer paid)',
          '401(k) retirement plan with 5% dollar-for-dollar employer match',
          'Unlimited Flexible Time Off (FTO) & 12 paid corporate holidays',
          'Annual $3,000 professional learning, certification, and tech budget',
        ],
      },
      startDate: startDate.toISOString().split('T')[0],
      expirationDate: expDate.toISOString().split('T')[0],
      issueDate: today,
      status: 'DRAFT',
      customNotes: 'Selected based on outstanding architectural design assessment and technical interviews.',
      executiveSignerName: 'Sarah Jenkins',
      executiveSignerTitle: 'VP of People & Talent Operations',
    };

    setActiveOffer(freshDraft);
    setActiveView('composer');
    info(`Initiated new offer composer for ${firstCand.name}.`, 'Composer Ready');
  };

  // Open modal preview from list
  const handleSelectPreview = (offer: OfferDetails) => {
    setModalPreviewOffer(offer);
  };

  // Edit draft in composer
  const handleSelectEdit = (offer: OfferDetails) => {
    setActiveOffer(offer);
    setActiveView('composer');
    info(`Editing draft ${offer.id} for ${offer.candidateName}.`, 'Composer Loaded');
  };

  // Open issue modal
  const handleSelectIssue = (offer: OfferDetails) => {
    setActiveOffer(offer);
    setIsIssueModalOpen(true);
  };

  // Confirm issue offer
  const handleConfirmIssue = async (offerToIssue: OfferDetails) => {
    const updatedOffer: OfferDetails = {
      ...offerToIssue,
      status: 'ISSUED',
      issuedAt: new Date().toISOString(),
    };

    setOffers((prev) => {
      const exists = prev.some((o) => o.id === updatedOffer.id);
      if (exists) {
        return prev.map((o) => (o.id === updatedOffer.id ? updatedOffer : o));
      }
      return [updatedOffer, ...prev];
    });

    setActiveOffer(updatedOffer);
    success(
      `Offer letter ${updatedOffer.id} issued to ${updatedOffer.candidateName}. Candidate stage transitioned to 'Offered' and dispatch notification sent.`,
      'Offer Issued Successfully'
    );
  };

  // Save draft
  const handleSaveDraft = () => {
    setOffers((prev) => {
      const exists = prev.some((o) => o.id === activeOffer.id);
      if (exists) {
        return prev.map((o) => (o.id === activeOffer.id ? activeOffer : o));
      }
      return [activeOffer, ...prev];
    });
    success(`Draft ${activeOffer.id} saved successfully.`, 'Draft Saved');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wide bg-brand-50 text-brand-700 border border-brand-200">
              Floor 18 &bull; Offer Management
            </span>
            <span className="text-xs text-slate-500 font-medium">Enterprise Onboarding Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Offers & Employment Contracts
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Author and issue legally validated, controlled employment offer letters with real-time live
            template canvas.
          </p>
        </div>

        {/* View Switcher and Action Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs"
            role="group"
            aria-label="Offers view selector"
          >
            <button
              type="button"
              onClick={() => {
                setActiveView('list');
                info('Switched to Offers Pipeline.');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === 'list'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Offers Pipeline</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView('composer');
                info('Switched to Live Composer & Preview.');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === 'composer'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Live Composer</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleComposeNew}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Compose New Offer
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <OfferStatsCard offers={offers} />

      {/* Main View Area */}
      {activeView === 'list' ? (
        <OfferListView
          offers={offers}
          onSelectPreview={handleSelectPreview}
          onSelectEdit={handleSelectEdit}
          onSelectIssue={handleSelectIssue}
          onComposeNew={handleComposeNew}
        />
      ) : (
        /* Dual-pane Live Composer & Template Preview Canvas */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[750px] items-stretch">
          {/* Left Column: Offer Letter Composer (5 cols on xl) */}
          <div className="xl:col-span-5 h-[800px]">
            <OfferLetterComposer
              currentOffer={activeOffer}
              onChange={setActiveOffer}
              onReviewAndIssue={() => setIsIssueModalOpen(true)}
              onSaveDraft={handleSaveDraft}
              className="h-full"
            />
          </div>

          {/* Right Column: Live Template Preview Canvas (7 cols on xl) */}
          <div className="xl:col-span-7 h-[800px]">
            <OfferTemplatePreview
              offer={activeOffer}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Issue Offer Dialog Modal */}
      <IssueOfferModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        offer={activeOffer}
        onConfirmIssue={handleConfirmIssue}
      />

      {/* Full-Screen Letter Preview Modal (When triggered from list view) */}
      {modalPreviewOffer && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setModalPreviewOffer(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden h-[90vh] flex flex-col animate-scaleIn">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-brand-400" />
                  <span className="font-bold text-sm">
                    Offer Document Preview: {modalPreviewOffer.candidateName} ({modalPreviewOffer.id})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalPreviewOffer(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-2">
                <OfferTemplatePreview offer={modalPreviewOffer} className="h-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrOffersPage;
