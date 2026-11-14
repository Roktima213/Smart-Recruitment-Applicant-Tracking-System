import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useToast } from '../context/ToastContext';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface InterviewApplication {
  id: string;
  currentStage: string;
  candidate?: {
    name?: string;
    email?: string;
  };
  job?: {
    title?: string;
  };
}

export interface Interviewer {
  id: string;
  name: string;
  email: string;
}

export interface InterviewRecord {
  id: string;
  application_id: string;
  title: string;
  description?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  location_or_link?: string | null;
  status: string;
  interviewer_id?: string | null;
  interviewer_name?: string | null;
  candidate_name?: string;
  job_title?: string;
}

export interface ScheduleInterviewInput {
  applicationId: string;
  interviewerId: string;
  title: string;
  description?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  locationOrLink?: string | null;
}

export class InterviewRequestError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'InterviewRequestError';
    this.status = status;
    this.code = code;
  }
}

export const useInterviews = () => {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [applications, setApplications] = useState<InterviewApplication[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  const fetchInterviews = useCallback(async () => {
    try {
      const response = await apiClient.get('/interviews');
      setInterviews(Array.isArray(response.data?.data) ? response.data.data : []);
      setError(null);
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to fetch interviews';

      setError(message);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInterviewOptions = useCallback(async () => {
    setLoadingOptions(true);

    const [interviewerResult, applicationResult] = await Promise.allSettled([
      apiClient.get('/interviews/interviewers'),
      apiClient.get('/applications', { params: { page: 1, limit: 100 } }),
    ]);

    if (interviewerResult.status === 'fulfilled') {
      const interviewerData = interviewerResult.value.data?.data;
      setInterviewers(
        Array.isArray(interviewerData) ? interviewerData : []
      );
    } else {
      setInterviewers([]);
      console.error(
        'Failed to load interviewers:',
        interviewerResult.reason
      );
    }

    if (applicationResult.status === 'fulfilled') {
      const applicationData = applicationResult.value.data?.data;

      setApplications(
        Array.isArray(applicationData)
          ? applicationData.filter(
              (application: InterviewApplication) =>
                typeof application.id === 'string' &&
                UUID_REGEX.test(application.id)
            )
          : []
      );
    } else {
      setApplications([]);
      console.error(
        'Failed to load applications:',
        applicationResult.reason
      );
    }

    if (
      interviewerResult.status === 'rejected' ||
      applicationResult.status === 'rejected'
    ) {
      setError('Some interview scheduling options could not be loaded.');
    } else {
      setError(null);
    }

    setLoadingOptions(false);
  }, []);

  useEffect(() => {
    fetchInterviews();
    fetchInterviewOptions();
  }, [fetchInterviews, fetchInterviewOptions]);

  const scheduleInterview = useCallback(
    async (payload: ScheduleInterviewInput): Promise<InterviewRecord> => {
      try {
        const response = await apiClient.post('/interviews', payload);
        const createdInterview = response.data?.data;

        toast.success(
          'Interview scheduled successfully.',
          'Interview Scheduled'
        );

        await fetchInterviews();

        return createdInterview;
      } catch (err: any) {
        const message =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to schedule interview';

        throw new InterviewRequestError(
          message,
          err.response?.status,
          err.response?.data?.error?.code
        );
      }
    },
    [fetchInterviews, toast]
  );

  return {
    interviews,
    interviewers,
    applications,
    loading,
    loadingOptions,
    error,
    fetchInterviews,
    fetchInterviewOptions,
    scheduleInterview,
  };
};

export default useInterviews;
