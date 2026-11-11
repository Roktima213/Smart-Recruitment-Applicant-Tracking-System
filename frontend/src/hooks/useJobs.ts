import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useToast } from '../context/ToastContext';

export interface JobRecord {
  id: string;
  company_id: string;
  company_name?: string;
  company_logo?: string;
  title: string;
  description: string;
  department: string;
  location: string;
  employment_type: string;
  salary_min?: number | null;
  salary_max?: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  published_at?: string | null;
  closed_at?: string | null;
  created_by?: string | null;
  creator_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobFilters {
  status?: string;
  department?: string;
  location?: string;
  employment_type?: string;
  min_salary?: number;
  max_salary?: number;
  q?: string;
  page?: number;
  limit?: number;
}

export interface CreateJobInput {
  title: string;
  description: string;
  department?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
  company_id?: string | null;
}

export interface UpdateJobInput extends Partial<CreateJobInput> {}

export const useJobs = (initialFilters: JobFilters = {}) => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: initialFilters.page || 1,
    limit: initialFilters.limit || 20,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<JobFilters>(initialFilters);
  const toast = useToast();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (filters.q) params.q = filters.q;
      if (filters.status) params.status = filters.status;
      if (filters.department) params.department = filters.department;
      if (filters.location) params.location = filters.location;
      if (filters.employment_type) params.employment_type = filters.employment_type;
      if (filters.min_salary) params.min_salary = filters.min_salary;
      if (filters.max_salary) params.max_salary = filters.max_salary;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      const response = await apiClient.get('/jobs', { params });
      if (response.data?.jobs) {
        setJobs(response.data.jobs);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to fetch jobs';
      setError(msg);
      console.warn('[useJobs] Fetch warning, using fallback dataset:', msg);
      // Fallback demo data
      setJobs([
        {
          id: 'b0000000-0000-0000-0000-000000000001',
          company_id: 'a0000000-0000-0000-0000-000000000001',
          company_name: 'Acme Corporation',
          title: 'Senior Full Stack Engineer (TypeScript & React)',
          description: 'Lead design and development of scalable ATS workflows, APIs, and micro-frontends.',
          department: 'Engineering',
          location: 'Remote, US / EU',
          employment_type: 'Full-time',
          salary_min: 130000,
          salary_max: 175000,
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateFilters = useCallback((newFilters: Partial<JobFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const createJob = useCallback(
    async (payload: CreateJobInput): Promise<JobRecord | null> => {
      try {
        const response = await apiClient.post('/jobs', payload);
        const createdJob = response.data?.job;
        toast.success(`Job "${payload.title}" created successfully!`, 'Requisition Created');
        fetchJobs();
        return createdJob;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'Failed to create job';
        toast.error(msg, 'Creation Failed');
        throw new Error(msg);
      }
    },
    [toast, fetchJobs]
  );

  const updateJob = useCallback(
    async (id: string, payload: UpdateJobInput): Promise<JobRecord | null> => {
      try {
        const response = await apiClient.put(`/jobs/${id}`, payload);
        const updatedJob = response.data?.job;
        toast.success(`Job requisition updated successfully!`, 'Requisition Saved');
        fetchJobs();
        return updatedJob;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'Failed to update job';
        toast.error(msg, 'Update Failed');
        throw new Error(msg);
      }
    },
    [toast, fetchJobs]
  );

  const changeJobStatus = useCallback(
    async (id: string, newStatus: JobRecord['status']): Promise<JobRecord | null> => {
      try {
        const response = await apiClient.patch(`/jobs/${id}/status`, { status: newStatus });
        const updatedJob = response.data?.job;
        toast.success(`Job status transitioned to ${newStatus}`, 'Lifecycle State Updated');
        fetchJobs();
        return updatedJob;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'Failed to update job status';
        toast.error(msg, 'Transition Error');
        throw new Error(msg);
      }
    },
    [toast, fetchJobs]
  );

  const setPage = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }, []);

  const fetchJobById = useCallback(async (id: string): Promise<JobRecord | null> => {
    try {
      const response = await apiClient.get(`/jobs/${id}`);
      return response.data?.job || null;
    } catch {
      return null;
    }
  }, []);

  return {
    jobs,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    setPage,
    fetchJobById,
    fetchJobs,
    createJob,
    updateJob,
    changeJobStatus,
  };
};

export default useJobs;
