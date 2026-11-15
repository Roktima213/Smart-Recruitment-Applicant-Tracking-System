import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useToast } from '../context/ToastContext';

export interface OfferRecord {
  id: string;
  application_id: string;
  salary_amount: number;
  currency: string;
  start_date: string;
  status: 'DRAFT' | 'ISSUED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  issued_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  company_name?: string | null;
  offer_letter_html?: string;
}

export interface OfferApplication {
  id: string;
  currentStage?: string;
  candidate?: {
    name?: string;
    email?: string;
  };
  job?: {
    title?: string;
    companyName?: string;
  };
}

export interface CreateOfferInput {
  applicationId: string;
  salaryAmount: number;
  currency: string;
  startDate: string;
  expiryDate: string;
}

const getErrorMessage = (error: any): string =>
  error.response?.data?.error?.message ||
  error.response?.data?.message ||
  error.message ||
  'Something went wrong. Please try again.';

export const useOffers = () => {
  const { success: showSuccess, error: showError } = useToast();

  const [offers, setOffers] = useState<OfferRecord[]>([]);
  const [applications, setApplications] = useState<OfferApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/offers');
      setOffers(response.data?.data || []);
    } catch (err: any) {
      const message = getErrorMessage(err);
      setError(message);
      showError(message, 'Unable to load offers');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchApplications = useCallback(async () => {
    setLoadingApplications(true);

    try {
      const response = await apiClient.get('/applications', {
        params: { page: 1, limit: 100 },
      });

      setApplications(response.data?.data || []);
    } catch (err: any) {
      const message = getErrorMessage(err);
      setApplications([]);
      showError(message, 'Unable to load applications');
    } finally {
      setLoadingApplications(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchOffers();
    fetchApplications();
  }, [fetchOffers, fetchApplications]);

  const createOffer = useCallback(
    async (input: CreateOfferInput) => {
      setSubmitting(true);

      try {
        const response = await apiClient.post('/offers', input);
        showSuccess(
          response.data?.message || 'Offer draft created successfully.',
          'Offer saved'
        );
        await fetchOffers();
        return response.data?.data as OfferRecord;
      } catch (err: any) {
        const message = getErrorMessage(err);
        showError(message, 'Unable to create offer');
        throw new Error(message);
      } finally {
        setSubmitting(false);
      }
    },
    [fetchOffers, showSuccess, showError]
  );

  const issueOffer = useCallback(
    async (offerId: string) => {
      setIssuingId(offerId);

      try {
        const response = await apiClient.post(`/offers/${offerId}/issue`);
        showSuccess(
          response.data?.message || 'Offer issued successfully.',
          'Offer issued'
        );
        await fetchOffers();
        return response.data;
      } catch (err: any) {
        const message = getErrorMessage(err);
        showError(message, 'Unable to issue offer');
        throw new Error(message);
      } finally {
        setIssuingId(null);
      }
    },
    [fetchOffers, showSuccess, showError]
  );

  return {
    offers,
    applications,
    loading,
    loadingApplications,
    submitting,
    issuingId,
    error,
    fetchOffers,
    fetchApplications,
    createOffer,
    issueOffer,
  };
};


