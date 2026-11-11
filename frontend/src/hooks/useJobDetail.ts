import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { JobRecord } from './useJobs';

export interface UseJobDetailResult {
  job: JobRecord | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to retrieve a single job requisition by UUID.
 */
export const useJobDetail = (jobId?: string): UseJobDetailResult => {
  const [job, setJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/jobs/${jobId}`);
      if (response.data?.job) {
        setJob(response.data.job);
      } else {
        setError('Job details not found');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Unable to load job requisition details';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  return {
    job,
    loading,
    error,
    refetch: fetchJob,
  };
};

export default useJobDetail;
