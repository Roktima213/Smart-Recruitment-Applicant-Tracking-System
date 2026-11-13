import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useToast } from '../context/ToastContext';

export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFERED'
  | 'REJECTED'
  | 'HIRED';

export interface StageHistoryRecord {
  id: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  changedBy: string;
  reason?: string;
  changedAt: string;
}

export interface CandidateApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  location: string;
  employmentType: string;
  jobStatus: string;
  companyName: string;
  resumeId?: string;
  resumeFileName?: string;
  currentStage: ApplicationStage;
  coverLetter?: string;
  answers?: Record<string, any>;
  appliedAt: string;
  updatedAt: string;
  stageHistory?: StageHistoryRecord[];
}

export interface SubmitApplicationPayload {
  jobId: string;
  resumeId?: string;
  coverLetter?: string;
  answers?: Record<string, any>;
}

export const useApplications = () => {
  const toast = useToast();
  const [applications, setApplications] = useState<CandidateApplicationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/applications/me');
      if (res.data?.applications) {
        setApplications(res.data.applications);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load applications';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const applyToJob = async (payload: SubmitApplicationPayload): Promise<CandidateApplicationRecord> => {
    setSubmitting(true);
    try {
      const res = await apiClient.post('/applications', payload);
      toast.success('Your application has been received!', 'Application Submitted');
      await fetchApplications();
      return res.data?.application;
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.info('You have already applied for this opening.', 'Application Exists');
      } else {
        const msg = err.response?.data?.error?.message || err.message || 'Application submission failed';
        toast.error(msg, 'Submission Failed');
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const downloadResume = async (resumeId: string, fallbackFileName?: string) => {
    setDownloadingId(resumeId);
    try {
      const response = await apiClient.get(`/resumes/${resumeId}/download`, {
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header if available
      let filename = fallbackFileName || 'resume.pdf';
      const disposition = String(response.headers['content-disposition'] || '');
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1].replace(/["']/g, '').trim());
        }
      }

      const blob = new Blob([response.data], {
        type: String(response.headers['content-type'] || 'application/pdf'),
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Downloaded ${filename}`, 'Resume Streamed');
    } catch (err: any) {
      console.error('[Resume Download Error]', err);
      const msg =
        err.response?.status === 403
          ? 'Access denied: You do not have permission to download this resume.'
          : 'Failed to stream resume file from server.';
      toast.error(msg, 'Download Failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return {
    applications,
    loading,
    submitting,
    downloadingId,
    error,
    fetchApplications,
    applyToJob,
    downloadResume,
  };
};
