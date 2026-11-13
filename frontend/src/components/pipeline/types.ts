export type ApplicationStage =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFERED'
  | 'REJECTED';

export interface PipelineCandidate {
  id: string;
  name: string;
  email: string;
  headline?: string;
  skills?: string[];
  avatarUrl?: string;
}

export interface PipelineJob {
  id: string;
  title: string;
  department?: string;
  location?: string;
  companyName?: string;
}

export interface StageHistoryItem {
  id: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string | null;
  reason: string;
  changedAt: string;
}

export interface PipelineApplication {
  id: string;
  jobId: string;
  candidateId: string;
  resumeId: string | null;
  currentStage: ApplicationStage;
  coverLetter?: string | null;
  answers?: Record<string, any>;
  appliedAt: string;
  updatedAt: string;
  candidate: PipelineCandidate;
  job: PipelineJob;
  resumeFileName?: string | null;
  matchScore?: number;
  stageHistory?: StageHistoryItem[];
}

export interface StageColumnDef {
  id: ApplicationStage;
  name: string;
  accentColor: string;
  headerBg: string;
  badgeBg: string;
  borderColor: string;
  description: string;
}

export const PIPELINE_COLUMNS: StageColumnDef[] = [
  {
    id: 'APPLIED',
    name: 'Applied',
    accentColor: 'text-blue-700',
    headerBg: 'bg-blue-50/70',
    badgeBg: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-200',
    description: 'New incoming applications awaiting review',
  },
  {
    id: 'SCREENING',
    name: 'Screening',
    accentColor: 'text-amber-700',
    headerBg: 'bg-amber-50/70',
    badgeBg: 'bg-amber-100 text-amber-800',
    borderColor: 'border-amber-200',
    description: 'Resume review & preliminary phone screening',
  },
  {
    id: 'INTERVIEW',
    name: 'Interview',
    accentColor: 'text-indigo-700',
    headerBg: 'bg-indigo-50/70',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    borderColor: 'border-indigo-200',
    description: 'Technical loops & panel interviews scheduled',
  },
  {
    id: 'SELECTED',
    name: 'Selected',
    accentColor: 'text-teal-700',
    headerBg: 'bg-teal-50/70',
    badgeBg: 'bg-teal-100 text-teal-800',
    borderColor: 'border-teal-200',
    description: 'Final evaluation approved & candidate selected',
  },
  {
    id: 'OFFERED',
    name: 'Offered',
    accentColor: 'text-purple-700',
    headerBg: 'bg-purple-50/70',
    badgeBg: 'bg-purple-100 text-purple-800',
    borderColor: 'border-purple-200',
    description: 'Official employment offer extended',
  },
  {
    id: 'REJECTED',
    name: 'Rejected',
    accentColor: 'text-rose-700',
    headerBg: 'bg-rose-50/70',
    badgeBg: 'bg-rose-100 text-rose-800',
    borderColor: 'border-rose-200',
    description: 'Archived candidates (terminal stage)',
  },
];

/**
 * Valid allowed next stages for any given source stage
 */
export const ALLOWED_NEXT_STAGES: Record<ApplicationStage, ApplicationStage[]> = {
  APPLIED: ['SCREENING', 'REJECTED'],
  SCREENING: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['SELECTED', 'REJECTED'],
  SELECTED: ['OFFERED', 'REJECTED'],
  OFFERED: ['REJECTED'],
  REJECTED: [],
};
