import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { useToast } from '../context/ToastContext';

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  headline?: string | null;
  summary?: string | null;
  skills: string[];
  experience_years: number;
  current_company?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeMetadata {
  id: string;
  file_name: string;
  stored_file_name: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  created_at: string;
}

export interface UpdateProfileInput {
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
  experience_years?: number;
  current_company?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

export const useCandidateProfile = () => {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [resume, setResume] = useState<ResumeMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/candidates/me');
      if (response.data?.profile) {
        setProfile(response.data.profile);
      }
      if (response.data?.resume) {
        setResume(response.data.resume);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to load candidate profile';
      setError(msg);
      // Fallback demo profile for local preview
      setProfile({
        id: 'cp-demo-0001',
        user_id: 'usr-demo-0001',
        full_name: 'Demo Candidate',
        email: 'candidate@ats.local',
        headline: 'Full-Stack Software Engineer',
        summary: 'Experienced developer specializing in React, Node.js, and high-reliability systems.',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
        experience_years: 4.5,
        current_company: 'Acme Systems',
        linkedin_url: 'https://linkedin.com/in/demo-candidate',
        github_url: 'https://github.com/demo-candidate',
        portfolio_url: 'https://demo-candidate.dev',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (payload: UpdateProfileInput): Promise<CandidateProfile | null> => {
      setSaving(true);
      try {
        const response = await apiClient.put('/candidates/me', payload);
        const updated = response.data?.profile;
        if (updated) {
          setProfile(updated);
          toast.success('Your profile details have been saved.', 'Profile Updated');
          return updated;
        }
        return null;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'Failed to update profile';
        toast.error(msg, 'Update Error');
        throw new Error(msg);
      } finally {
        setSaving(false);
      }
    },
    [toast]
  );

  const uploadResume = useCallback(
    async (file: File): Promise<ResumeMetadata | null> => {
      // 1. Client-Side Defensive Preflight Checks
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const errorMsg = `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum 5 MB limit.`;
        toast.error(errorMsg, 'Upload Rejected');
        throw new Error(errorMsg);
      }

      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension);
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type) || isValidExtension;

      if (!isValidMime) {
        const errorMsg = 'Invalid file format. Only PDF and DOCX files are permitted.';
        toast.error(errorMsg, 'Unsupported Format');
        throw new Error(errorMsg);
      }

      // 2. Multi-part Upload with Progress Bar
      setUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('resume', file);

        const response = await apiClient.post('/candidates/me/resume', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          },
        });

        const newResume = response.data?.resume;
        if (newResume) {
          setResume(newResume);
          toast.success(`Resume "${file.name}" uploaded and verified successfully!`, 'Resume Stored');
          return newResume;
        }
        return null;
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || err.message || 'Failed to upload resume file';
        toast.error(msg, 'Upload Failed');
        throw new Error(msg);
      } finally {
        setUploading(false);
      }
    },
    [toast]
  );

  return {
    profile,
    resume,
    loading,
    saving,
    uploading,
    uploadProgress,
    error,
    fetchProfile,
    updateProfile,
    uploadResume,
  };
};

export default useCandidateProfile;
