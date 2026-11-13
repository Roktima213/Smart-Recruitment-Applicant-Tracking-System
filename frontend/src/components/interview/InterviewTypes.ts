export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export type InterviewRoundType =
  | 'SCREENING'
  | 'TECHNICAL'
  | 'SYSTEM_DESIGN'
  | 'BEHAVIORAL'
  | 'MANAGEMENT'
  | 'FINAL';

export interface EvaluatorScorecard {
  evaluatorId: string;
  evaluatorName: string;
  rating: number; // 1 to 5
  recommendation: 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE';
  strengths?: string;
  concerns?: string;
  confidentialNotes?: string;
  submittedAt?: string;
}

export interface InterviewEvent {
  id: string;
  applicationId?: string;
  candidateId?: string;
  candidateName: string;
  candidateRole: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateAvatar?: string;
  jobTitle: string;
  jobId?: string;
  title: string;
  type: InterviewRoundType;
  scheduledStart: string; // ISO 8601 string, e.g. "2026-11-14T14:00:00Z"
  scheduledEnd: string;   // ISO 8601 string, e.g. "2026-11-14T15:00:00Z"
  locationOrLink: string;
  status: InterviewStatus;
  rescheduleCount: number;
  interviewer: string;
  interviewerRole?: string;
  interviewerEmail?: string;
  interviewerAvatar?: string;
  notes?: string;
  scorecard?: EvaluatorScorecard;
  createdAt?: string;
}
